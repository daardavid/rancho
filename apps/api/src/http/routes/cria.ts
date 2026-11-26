import {
  anotarDiagnosticoSchema,
  codigoDeErrorDePrenezSchema,
  correccionDeDiagnosticoComandoSchema,
  diagnosticoConHistoriaSchema,
  diagnosticosAnotadosSchema,
  errorDeCriaSchema,
  errorDePrenezSchema,
  historialDeCriaSchema,
  listaDeVacasSchema,
  type ErrorDePrenez,
} from '@rancho/api-contracts'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { RechazoDeHerd, type EntradaCorregirDiagnostico, type Herd } from '../../modules/herd'
import type { ModelosDeCria } from '../../read-models'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../shared-kernel/conflictos'
import { exigirRol } from '../guardia'

const ROLES = ['owner', 'support'] as const
const paramsDeDiagnostico = z.strictObject({ id: z.uuid() })
const paramsDeAnimal = z.strictObject({ id: z.uuid() })

/**
 * Diagnóstico de preñez. El rancho y quién registra salen de la sesión.
 *
 * Anotar no es observar: el diagnóstico solo cuenta como avistamiento cuando
 * dice que el animal se vio. Estas rutas no escriben pesos ni filiación.
 */
export function registrarRutasDePrenez(app: FastifyInstance, herd: Herd): void {
  app.post('/api/pregnancy-checks', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const cuerpo = anotarDiagnosticoSchema.safeParse(peticion.body)
    if (!cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }

    const datos = cuerpo.data
    return enviar(respuesta, 201, diagnosticosAnotadosSchema, () =>
      herd.anotarDiagnostico({
        commandId: datos.commandId,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        fecha: datos.fecha,
        resultado: datos.resultado,
        ...(datos.reportedBy !== undefined ? { reportedBy: datos.reportedBy } : {}),
        ...(datos.nota !== undefined ? { nota: datos.nota } : {}),
        vioAlAnimal: datos.vioAlAnimal,
        animales: datos.animales,
      }),
    )
  })

  app.post(
    '/api/pregnancy-checks/:id/corrections',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeDiagnostico.safeParse(peticion.params)
      const cuerpo = correccionDeDiagnosticoComandoSchema.safeParse(peticion.body)
      if (!params.success || !cuerpo.success) {
        return cuerpoInvalido(respuesta)
      }

      const datos = cuerpo.data
      return enviar(respuesta, 200, diagnosticoConHistoriaSchema, () =>
        herd.corregirDiagnostico({
          commandId: datos.commandId,
          ranchId: sesion.ranchId,
          recordedBy: sesion.recordedBy,
          diagnosticoId: params.data.id,
          version: datos.version,
          motivo: datos.motivo,
          cambios: cambiosDe(datos),
        }),
      )
    },
  )
}

/**
 * El historial de una hembra y la lista de vacas. Son consultas: los días se
 * calculan aquí y no se guardan.
 */
export function registrarRutasDeCria(app: FastifyInstance, modelos: ModelosDeCria): void {
  app.get(
    '/api/read-models/cria/:id',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeAnimal.safeParse(peticion.params)
      if (!params.success) {
        return cuerpoInvalidoDeCria(respuesta)
      }

      const vista = await modelos.historial(sesion.ranchId, params.data.id)
      if (vista === null) {
        return respuesta
          .header('cache-control', 'no-store')
          .code(404)
          .send(errorDeCriaSchema.parse({ codigo: 'no_encontrado' }))
      }
      return respuesta.header('cache-control', 'no-store').code(200).send(historialDeCriaSchema.parse(vista))
    },
  )

  app.get('/api/read-models/vacas', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const lista = await modelos.vacas(sesion.ranchId)
    return respuesta.header('cache-control', 'no-store').code(200).send(listaDeVacasSchema.parse(lista))
  })
}

function cambiosDe(
  cuerpo: z.infer<typeof correccionDeDiagnosticoComandoSchema>,
): EntradaCorregirDiagnostico['cambios'] {
  return {
    ...(cuerpo.resultado !== undefined ? { resultado: cuerpo.resultado } : {}),
    ...(cuerpo.fecha !== undefined ? { fecha: cuerpo.fecha } : {}),
    ...(cuerpo.reportedBy !== undefined ? { reportedBy: cuerpo.reportedBy } : {}),
    ...(cuerpo.nota !== undefined ? { nota: cuerpo.nota } : {}),
    ...(cuerpo.vioAlAnimal !== undefined ? { vioAlAnimal: cuerpo.vioAlAnimal } : {}),
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
    .send(errorDePrenezSchema.parse({ codigo: 'cuerpo_invalido' }))
}

function cuerpoInvalidoDeCria(respuesta: FastifyReply) {
  return respuesta
    .header('cache-control', 'no-store')
    .code(400)
    .send(errorDeCriaSchema.parse({ codigo: 'cuerpo_invalido' }))
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
      .send(errorDePrenezSchema.parse({ codigo: traducido.codigo }))
  }
}

function traducir(error: unknown): { codigo: ErrorDePrenez['codigo']; estado: number } | null {
  if (error instanceof ConflictoDeVersion) {
    return { codigo: 'version_conflict', estado: 409 }
  }
  if (error instanceof ConflictoDeIdempotencia) {
    return { codigo: 'idempotency_mismatch', estado: 409 }
  }
  if (error instanceof RechazoDeHerd) {
    const codigo = codigoDeErrorDePrenezSchema.safeParse(error.codigo)
    if (!codigo.success) {
      return null
    }
    return { codigo: codigo.data, estado: estadoDe(codigo.data) }
  }
  return null
}

function estadoDe(codigo: ErrorDePrenez['codigo']): number {
  if (codigo === 'no_encontrado') {
    return 404
  }
  if (codigo === 'diagnostico_ya_existe') {
    return 409
  }
  return 422
}
