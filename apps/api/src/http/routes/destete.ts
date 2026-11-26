import {
  anotarDesteteSchema,
  codigoDeErrorDeDesteteSchema,
  correccionDeDesteteComandoSchema,
  desteteAnotadoPublicoSchema,
  destetesAnotadosSchema,
  errorDeDesteteSchema,
  type ErrorDeDestete,
} from '@rancho/api-contracts'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import type { CapturaDeDestete } from '../../application/destete'
import { RechazoDeGrowth } from '../../modules/growth'
import { RechazoDeHerd, type EntradaCorregirDestete, type Herd } from '../../modules/herd'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../shared-kernel/conflictos'
import { exigirRol } from '../guardia'

const ROLES = ['owner', 'support'] as const
const paramsDeDestete = z.strictObject({ id: z.uuid() })

/**
 * Destete. El rancho y quién registra salen de la sesión.
 *
 * Con peso, el orquestador escribe el destete y el peso en una sola
 * transacción. Sin peso, igual hay un solo comando. Corregir el día no toca
 * el peso y no saca a la cría del hato.
 */
export function registrarRutasDeDestete(
  app: FastifyInstance,
  captura: CapturaDeDestete,
  herd: Herd,
): void {
  app.post('/api/weanings', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const cuerpo = anotarDesteteSchema.safeParse(peticion.body)
    if (!cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }

    const datos = cuerpo.data
    return enviar(respuesta, 201, destetesAnotadosSchema, () =>
      captura.registrar({
        commandId: datos.commandId,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        precisionFecha: datos.precisionFecha,
        fecha: datos.fecha,
        ...(datos.reportedBy !== undefined ? { reportedBy: datos.reportedBy } : {}),
        ...(datos.nota !== undefined ? { nota: datos.nota } : {}),
        ...(datos.fechaDelPeso !== undefined ? { fechaDelPeso: datos.fechaDelPeso } : {}),
        animales: datos.animales.map((animal) => ({
          animalId: animal.animalId,
          desteteId: animal.desteteId,
          ...(animal.peso === undefined
            ? {}
            : {
                peso: {
                  id: animal.peso.id,
                  kilos: animal.peso.kilos,
                  calidad: animal.peso.calidad,
                  ...(animal.peso.evidenciaId !== undefined
                    ? { evidenciaId: animal.peso.evidenciaId }
                    : {}),
                },
              }),
        })),
      }),
    )
  })

  app.post(
    '/api/weanings/:id/corrections',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeDestete.safeParse(peticion.params)
      const cuerpo = correccionDeDesteteComandoSchema.safeParse(peticion.body)
      if (!params.success || !cuerpo.success) {
        return cuerpoInvalido(respuesta)
      }

      const datos = cuerpo.data
      return enviar(respuesta, 200, desteteAnotadoPublicoSchema, () =>
        herd.corregirDestete({
          commandId: datos.commandId,
          ranchId: sesion.ranchId,
          recordedBy: sesion.recordedBy,
          desteteId: params.data.id,
          version: datos.version,
          motivo: datos.motivo,
          cambios: cambiosDe(datos),
        }),
      )
    },
  )
}

function cambiosDe(
  cuerpo: z.infer<typeof correccionDeDesteteComandoSchema>,
): EntradaCorregirDestete['cambios'] {
  return {
    ...(cuerpo.precisionFecha !== undefined
      ? { cuando: { precision: cuerpo.precisionFecha, fecha: cuerpo.fecha ?? null } }
      : {}),
    ...(cuerpo.nota !== undefined ? { nota: cuerpo.nota } : {}),
    ...(cuerpo.reportedBy !== undefined ? { reportedBy: cuerpo.reportedBy } : {}),
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
    .send(errorDeDesteteSchema.parse({ codigo: 'cuerpo_invalido' }))
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
      .send(errorDeDesteteSchema.parse({ codigo: traducido.codigo }))
  }
}

function traducir(error: unknown): { codigo: ErrorDeDestete['codigo']; estado: number } | null {
  if (error instanceof ConflictoDeVersion) {
    return { codigo: 'version_conflict', estado: 409 }
  }
  if (error instanceof ConflictoDeIdempotencia) {
    return { codigo: 'idempotency_mismatch', estado: 409 }
  }
  if (error instanceof RechazoDeHerd || error instanceof RechazoDeGrowth) {
    const codigo = codigoDeErrorDeDesteteSchema.safeParse(error.codigo)
    if (!codigo.success) {
      return null
    }
    return { codigo: codigo.data, estado: estadoDe(codigo.data) }
  }
  return null
}

function estadoDe(codigo: ErrorDeDestete['codigo']): number {
  if (codigo === 'no_encontrado') {
    return 404
  }
  if (
    codigo === 'destete_ya_existe' ||
    codigo === 'version_conflict' ||
    codigo === 'idempotency_mismatch' ||
    codigo === 'fila_ya_existe' ||
    codigo === 'sesion_ya_existe'
  ) {
    return 409
  }
  return 422
}
