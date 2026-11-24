import {
  crearCorregirPesoSchema,
  crearRegistrarSesionSchema,
  errorDePesajeSchema,
  pesoSchema,
  pesosDeAnimalSchema,
  sesionDePesajeSchema,
  type ErrorDePesaje,
} from '@rancho/api-contracts'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { RechazoDeGrowth, type EntradaRegistrar, type Growth } from '../../modules/growth'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../shared-kernel/conflictos'
import { kilosTextoSchema } from '../../shared-kernel/kilos'
import { exigirRol } from '../guardia'

const ROLES = ['owner', 'support'] as const
const registrarSesionSchema = crearRegistrarSesionSchema(kilosTextoSchema)
const corregirPesoSchema = crearCorregirPesoSchema(kilosTextoSchema)
const paramsDeId = z.strictObject({ id: z.uuid() })

/**
 * Sesión de pesaje, corrección de un peso y las lecturas para la próxima
 * captura. El rancho y quién registra salen de la sesión, no del cuerpo.
 */
export function registrarRutasDePesaje(app: FastifyInstance, growth: Growth): void {
  app.post('/api/weighing-sessions', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const cuerpo = registrarSesionSchema.safeParse(peticion.body)
    if (!cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 201, sesionDePesajeSchema, () =>
      growth.registrar({
        commandId: cuerpo.data.commandId,
        id: cuerpo.data.id,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        fecha: cuerpo.data.fecha,
        filas: cuerpo.data.filas.map(filaDe),
        ...(cuerpo.data.nota !== undefined ? { nota: cuerpo.data.nota } : {}),
        ...(cuerpo.data.reportedBy !== undefined ? { reportedBy: cuerpo.data.reportedBy } : {}),
      }),
    )
  })

  app.get('/api/weighing-sessions/latest', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    return enviar(respuesta, 200, sesionDePesajeSchema, async () => {
      const ultima = await growth.ultima(sesion.ranchId)
      if (ultima === null) {
        throw new RechazoDeGrowth('no_encontrado')
      }
      return ultima
    })
  })

  app.get('/api/weighing-sessions/:id', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const params = paramsDeId.safeParse(peticion.params)
    if (!params.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 200, sesionDePesajeSchema, async () => {
      const hallada = await growth.obtener(sesion.ranchId, params.data.id)
      if (hallada === null) {
        throw new RechazoDeGrowth('no_encontrado')
      }
      return hallada
    })
  })

  app.post('/api/weights/:id/corrections', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const params = paramsDeId.safeParse(peticion.params)
    const cuerpo = corregirPesoSchema.safeParse(peticion.body)
    if (!params.success || !cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 200, pesoSchema, () =>
      growth.corregir({
        commandId: cuerpo.data.commandId,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        pesoId: params.data.id,
        version: cuerpo.data.version,
        motivo: cuerpo.data.motivo,
        ...(cuerpo.data.kilos !== undefined ? { kilos: cuerpo.data.kilos } : {}),
        ...(cuerpo.data.calidad !== undefined ? { calidad: cuerpo.data.calidad } : {}),
        ...(cuerpo.data.evidenciaId !== undefined ? { evidenciaId: cuerpo.data.evidenciaId } : {}),
      }),
    )
  })

  app.get('/api/animals/:id/weights', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const params = paramsDeId.safeParse(peticion.params)
    if (!params.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 200, pesosDeAnimalSchema, () =>
      growth.pesosDe(sesion.ranchId, params.data.id),
    )
  })
}

function filaDe(fila: {
  id: string
  animalId: string
  resultado: 'pesado' | 'hueco'
  kilos?: string
  calidad?: 'measured' | 'observed' | 'declared'
  evidenciaId?: string | undefined
}): EntradaRegistrar['filas'][number] {
  if (fila.resultado === 'hueco') {
    return { id: fila.id, animalId: fila.animalId, resultado: 'hueco' }
  }
  if (fila.kilos === undefined || fila.calidad === undefined) {
    throw new RechazoDeGrowth('peso_sin_calidad')
  }
  return {
    id: fila.id,
    animalId: fila.animalId,
    resultado: 'pesado',
    kilos: fila.kilos,
    calidad: fila.calidad,
    ...(fila.evidenciaId !== undefined ? { evidenciaId: fila.evidenciaId } : {}),
  }
}

function exigirSesion<T extends { ranchId: string } | null>(sesion: T): NonNullable<T> {
  if (sesion === null) {
    throw new Error('La guardia dejó pasar una petición sin sesión.')
  }
  return sesion
}

function cuerpoInvalido(respuesta: FastifyReply) {
  return respuesta
    .header('cache-control', 'no-store')
    .code(400)
    .send(errorDePesajeSchema.parse({ codigo: 'cuerpo_invalido' }))
}

async function enviar(
  respuesta: FastifyReply,
  estado: number,
  esquema: { parse: (valor: unknown) => unknown },
  trabajo: () => Promise<unknown>,
) {
  try {
    const cuerpo = esquema.parse(await trabajo())
    return respuesta.header('cache-control', 'no-store').code(estado).send(cuerpo)
  } catch (error) {
    const traducido = traducir(error)
    if (traducido === null) {
      throw error
    }
    return respuesta
      .header('cache-control', 'no-store')
      .code(traducido.estado)
      .send(errorDePesajeSchema.parse({ codigo: traducido.codigo }))
  }
}

function traducir(error: unknown): { codigo: ErrorDePesaje['codigo']; estado: number } | null {
  if (error instanceof ConflictoDeVersion) {
    return { codigo: 'version_conflict', estado: 409 }
  }
  if (error instanceof ConflictoDeIdempotencia) {
    return { codigo: 'idempotency_mismatch', estado: 409 }
  }
  if (error instanceof RechazoDeGrowth) {
    return { codigo: error.codigo, estado: estadoDe(error.codigo) }
  }
  return null
}

function estadoDe(codigo: RechazoDeGrowth['codigo']): number {
  if (codigo === 'no_encontrado') {
    return 404
  }
  if (codigo === 'sesion_ya_existe' || codigo === 'fila_ya_existe') {
    return 409
  }
  return 422
}
