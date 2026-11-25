import {
  anotarSaludSchema,
  codigoDeErrorDeSaludSchema,
  correccionDeNotaSchema,
  errorDeSaludSchema,
  notaConHistoriaSchema,
  notasAnotadasSchema,
  notasDeAnimalesSchema,
  notasDelAnimalSchema,
  type ErrorDeSalud,
} from '@rancho/api-contracts'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { RechazoDeHerd, type EntradaCorregirNota, type Herd } from '../../modules/herd'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../shared-kernel/conflictos'
import { exigirRol } from '../guardia'

const ROLES = ['owner', 'support'] as const

const paramsDeNota = z.strictObject({ id: z.uuid() })
const paramsDeAnimal = z.strictObject({ id: z.uuid() })
const consultaDeAnimales = z.strictObject({
  animales: z.string().trim().min(1),
})

/**
 * Notas de sanidad. El rancho y quién registra salen de la sesión, no del
 * cuerpo. Sin sesión: 401 y el comando no corre.
 *
 * Anotar sanidad no es observar: la nota solo cuenta como avistamiento cuando
 * dice que el animal se vio. Estas rutas no escriben pesos ni tocan la última
 * observación.
 */
export function registrarRutasDeSalud(app: FastifyInstance, herd: Herd): void {
  app.post('/api/health-notes', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const cuerpo = anotarSaludSchema.safeParse(peticion.body)
    if (!cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }

    const datos = cuerpo.data
    return enviar(respuesta, 201, notasAnotadasSchema, () =>
      herd.anotarSalud({
        commandId: datos.commandId,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        tipo: datos.tipo,
        detalle: datos.detalle,
        fecha: datos.fecha,
        ...(datos.producto !== undefined ? { producto: datos.producto } : {}),
        ...(datos.evidenciaId !== undefined ? { evidenciaId: datos.evidenciaId } : {}),
        vioAlAnimal: datos.vioAlAnimal === true,
        animales: datos.animales,
      }),
    )
  })

  app.post(
    '/api/health-notes/:id/corrections',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeNota.safeParse(peticion.params)
      const cuerpo = correccionDeNotaSchema.safeParse(peticion.body)
      if (!params.success || !cuerpo.success) {
        return cuerpoInvalido(respuesta)
      }

      const datos = cuerpo.data
      return enviar(respuesta, 200, notaConHistoriaSchema, () =>
        herd.corregirNota({
          commandId: datos.commandId,
          ranchId: sesion.ranchId,
          recordedBy: sesion.recordedBy,
          notaId: params.data.id,
          version: datos.version,
          motivo: datos.motivo,
          cambios: cambiosDe(datos),
        }),
      )
    },
  )

  app.get(
    '/api/animals/:id/health-notes',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeAnimal.safeParse(peticion.params)
      if (!params.success) {
        return cuerpoInvalido(respuesta)
      }

      return enviar(respuesta, 200, notasDelAnimalSchema, async () => {
        const notas = await herd.notasDeAnimal(sesion.ranchId, params.data.id)
        if (notas === null) {
          throw new RechazoDeHerd('no_encontrado')
        }
        return notas
      })
    },
  )

  /**
   * Las notas de varios animales, incluidos los que ya salieron: la nota es
   * historia. Los ids viajan separados por coma en la consulta.
   */
  app.get('/api/health-notes', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const consulta = consultaDeAnimales.safeParse(peticion.query)
    if (!consulta.success) {
      return cuerpoInvalido(respuesta)
    }

    const ids = consulta.data.animales
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== '')

    return enviar(respuesta, 200, notasDeAnimalesSchema, () =>
      herd.notasDeAnimales(sesion.ranchId, ids),
    )
  })
}

function cambiosDe(cuerpo: z.infer<typeof correccionDeNotaSchema>): EntradaCorregirNota['cambios'] {
  return {
    ...(cuerpo.tipo !== undefined ? { tipo: cuerpo.tipo } : {}),
    ...(cuerpo.detalle !== undefined ? { detalle: cuerpo.detalle } : {}),
    ...(cuerpo.fecha !== undefined ? { fecha: cuerpo.fecha } : {}),
    ...(cuerpo.producto !== undefined ? { producto: cuerpo.producto } : {}),
    ...(cuerpo.evidenciaId !== undefined ? { evidenciaId: cuerpo.evidenciaId } : {}),
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
    .send(errorDeSaludSchema.parse({ codigo: 'cuerpo_invalido' }))
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
      .send(errorDeSaludSchema.parse({ codigo: traducido.codigo }))
  }
}

function traducir(error: unknown): { codigo: ErrorDeSalud['codigo']; estado: number } | null {
  if (error instanceof ConflictoDeVersion) {
    return { codigo: 'version_conflict', estado: 409 }
  }
  if (error instanceof ConflictoDeIdempotencia) {
    return { codigo: 'idempotency_mismatch', estado: 409 }
  }
  if (error instanceof RechazoDeHerd) {
    const codigo = codigoDeErrorDeSaludSchema.safeParse(error.codigo)
    if (!codigo.success) {
      return null
    }
    return { codigo: codigo.data, estado: estadoDe(codigo.data) }
  }
  return null
}

function estadoDe(codigo: ErrorDeSalud['codigo']): number {
  if (codigo === 'no_encontrado') {
    return 404
  }
  if (codigo === 'nota_ya_existe') {
    return 409
  }
  return 422
}
