import {
  asignacionesDeLugarSchema,
  asignarLugarSchema,
  codigoDeErrorDeLugarSchema,
  corregirPotreroSchema,
  errorDeLugarSchema,
  lugarDelAnimalSchema,
  lugaresDelHatoSchema,
  potreroConHistoriaSchema,
  potrerosDelRanchoSchema,
  registrarPotreroSchema,
  type ErrorDeLugar,
} from '@rancho/api-contracts'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { RechazoDeHerd, type EntradaCorregirPotrero, type Herd } from '../../modules/herd'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../shared-kernel/conflictos'
import { exigirRol } from '../guardia'

const ROLES = ['owner', 'support'] as const

const paramsDePotrero = z.strictObject({ id: z.uuid() })
const paramsDeAnimal = z.strictObject({ id: z.uuid() })

/**
 * Potreros y lugar esperado. El rancho y quién registra salen de la sesión, no
 * del cuerpo. Sin sesión: 401, y el comando no corre.
 *
 * Asignar un lugar no es observar: estas rutas no escriben ningún peso ni
 * tocan la última observación del animal.
 */
export function registrarRutasDeLugar(app: FastifyInstance, herd: Herd): void {
  app.post('/api/paddocks', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const cuerpo = registrarPotreroSchema.safeParse(peticion.body)
    if (!cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 201, potreroConHistoriaSchema, () =>
      herd.registrarPotrero({
        commandId: cuerpo.data.commandId,
        id: cuerpo.data.id,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        ...(cuerpo.data.nombre !== undefined ? { nombre: cuerpo.data.nombre } : {}),
        ...(cuerpo.data.nota !== undefined ? { nota: cuerpo.data.nota } : {}),
      }),
    )
  })

  app.post(
    '/api/paddocks/:id/corrections',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDePotrero.safeParse(peticion.params)
      const cuerpo = corregirPotreroSchema.safeParse(peticion.body)
      if (!params.success || !cuerpo.success) {
        return cuerpoInvalido(respuesta)
      }

      return enviar(respuesta, 200, potreroConHistoriaSchema, () =>
        herd.corregirPotrero({
          commandId: cuerpo.data.commandId,
          ranchId: sesion.ranchId,
          recordedBy: sesion.recordedBy,
          potreroId: params.data.id,
          version: cuerpo.data.version,
          motivo: cuerpo.data.motivo,
          cambios: cambiosDePotrero(cuerpo.data),
        }),
      )
    },
  )

  app.get('/api/paddocks', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    return enviar(respuesta, 200, potrerosDelRanchoSchema, () => herd.potrerosDelRancho(sesion.ranchId))
  })

  app.get('/api/paddocks/:id', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const params = paramsDePotrero.safeParse(peticion.params)
    if (!params.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 200, potreroConHistoriaSchema, async () => {
      const potrero = await herd.potrero(sesion.ranchId, params.data.id)
      if (potrero === null) {
        throw new RechazoDeHerd('no_encontrado')
      }
      return potrero
    })
  })

  app.post('/api/locations', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const cuerpo = asignarLugarSchema.safeParse(peticion.body)
    if (!cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 201, asignacionesDeLugarSchema, () =>
      herd.asignarLugar({
        commandId: cuerpo.data.commandId,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        potreroId: cuerpo.data.potreroId,
        desde: cuerpo.data.desde,
        ...(cuerpo.data.nota !== undefined ? { nota: cuerpo.data.nota } : {}),
        ...(cuerpo.data.reportedBy !== undefined ? { reportedBy: cuerpo.data.reportedBy } : {}),
        animales: cuerpo.data.animales,
      }),
    )
  })

  /** El lugar vigente del hato, para filtrar y contar. Los sin lugar no salen. */
  app.get('/api/locations', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    return enviar(respuesta, 200, lugaresDelHatoSchema, () => herd.lugaresDelHato(sesion.ranchId))
  })

  app.get(
    '/api/animals/:id/location',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeAnimal.safeParse(peticion.params)
      if (!params.success) {
        return cuerpoInvalido(respuesta)
      }

      return enviar(respuesta, 200, lugarDelAnimalSchema, async () => {
        const lugar = await herd.lugarDe(sesion.ranchId, params.data.id)
        if (lugar === null) {
          throw new RechazoDeHerd('no_encontrado')
        }
        return lugar
      })
    },
  )
}

/** El hato con su lugar vigente no es una ruta aparte: es la lista de activos. */

function cambiosDePotrero(cuerpo: z.infer<typeof corregirPotreroSchema>): EntradaCorregirPotrero['cambios'] {
  return {
    ...(cuerpo.nombre !== undefined ? { nombre: cuerpo.nombre } : {}),
    ...(cuerpo.nota !== undefined ? { nota: cuerpo.nota } : {}),
  }
}

function exigirSesion<T extends { ranchId: string; recordedBy: string } | null>(
  sesion: T,
): NonNullable<T> {
  if (sesion === null) {
    throw new Error('La guardia dejó pasar una petición sin sesión.')
  }
  return sesion
}

function cuerpoInvalido(respuesta: FastifyReply) {
  return respuesta
    .header('cache-control', 'no-store')
    .code(400)
    .send(errorDeLugarSchema.parse({ codigo: 'cuerpo_invalido' }))
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
      .send(errorDeLugarSchema.parse({ codigo: traducido.codigo }))
  }
}

function traducir(error: unknown): { codigo: ErrorDeLugar['codigo']; estado: number } | null {
  if (error instanceof ConflictoDeVersion) {
    return { codigo: 'version_conflict', estado: 409 }
  }
  if (error instanceof ConflictoDeIdempotencia) {
    return { codigo: 'idempotency_mismatch', estado: 409 }
  }
  if (error instanceof RechazoDeHerd) {
    const codigo = codigoDeErrorDeLugarSchema.safeParse(error.codigo)
    if (!codigo.success) {
      return null
    }
    return { codigo: codigo.data, estado: estadoDe(codigo.data) }
  }
  return null
}

function estadoDe(codigo: ErrorDeLugar['codigo']): number {
  if (codigo === 'no_encontrado') {
    return 404
  }
  if (codigo === 'potrero_ya_existe' || codigo === 'asignacion_ya_existe') {
    return 409
  }
  return 422
}
