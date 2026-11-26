import {
  anotarBitacoraSchema,
  anotarPendienteSchema,
  cambiarEstadoDePendienteSchema,
  codigoDeErrorDeBitacoraSchema,
  correccionDeNotaDeBitacoraSchema,
  correccionDePendienteSchema,
  errorDeBitacoraSchema,
  notaDeBitacoraConHistoriaSchema,
  notasDeBitacoraSchema,
  pendienteConHistoriaSchema,
  pendientesSchema,
  type ErrorDeBitacora,
} from '@rancho/api-contracts'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import {
  RechazoDeJournal,
  type EntradaCorregirNota,
  type EntradaCorregirPendiente,
  type Journal,
} from '../../modules/journal'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../shared-kernel/conflictos'
import { exigirRol } from '../guardia'

const ROLES = ['owner', 'support'] as const
const paramsDeId = z.strictObject({ id: z.uuid() })

/**
 * Bitácora y pendientes. El rancho y quién registra salen de la sesión.
 * Sin sesión: 401 y el comando no corre.
 *
 * Marcar un pendiente hecho no escribe una nota de sanidad ni ningún otro
 * hecho del hato. La pantalla ofrece el atajo; esta ruta no lo toma.
 */
export function registrarRutasDeBitacora(app: FastifyInstance, journal: Journal): void {
  app.post('/api/journal-notes', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const cuerpo = anotarBitacoraSchema.safeParse(peticion.body)
    if (!cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }
    const datos = cuerpo.data
    return enviar(respuesta, 201, notaDeBitacoraConHistoriaSchema, () =>
      journal.anotarNota({
        commandId: datos.commandId,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        id: datos.id,
        tipo: datos.tipo,
        texto: datos.texto,
        fecha: datos.fecha,
        precision: datos.precision,
        ...(datos.potreroId !== undefined ? { potreroId: datos.potreroId } : {}),
        ...(datos.reportedBy !== undefined ? { reportedBy: datos.reportedBy } : {}),
        ...(datos.evidenciaId !== undefined ? { evidenciaId: datos.evidenciaId } : {}),
      }),
    )
  })

  app.post(
    '/api/journal-notes/:id/corrections',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeId.safeParse(peticion.params)
      const cuerpo = correccionDeNotaDeBitacoraSchema.safeParse(peticion.body)
      if (!params.success || !cuerpo.success) {
        return cuerpoInvalido(respuesta)
      }
      const datos = cuerpo.data
      return enviar(respuesta, 200, notaDeBitacoraConHistoriaSchema, () =>
        journal.corregirNota({
          commandId: datos.commandId,
          ranchId: sesion.ranchId,
          recordedBy: sesion.recordedBy,
          notaId: params.data.id,
          version: datos.version,
          motivo: datos.motivo,
          cambios: cambiosDeNota(datos),
        }),
      )
    },
  )

  app.get('/api/journal-notes', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    return enviar(respuesta, 200, notasDeBitacoraSchema, () => journal.notas(sesion.ranchId))
  })

  app.post('/api/reminders', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const cuerpo = anotarPendienteSchema.safeParse(peticion.body)
    if (!cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }
    const datos = cuerpo.data
    return enviar(respuesta, 201, pendienteConHistoriaSchema, () =>
      journal.anotarPendiente({
        commandId: datos.commandId,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        id: datos.id,
        texto: datos.texto,
        fecha: datos.fecha,
        ...(datos.sujeto !== undefined ? { sujeto: datos.sujeto } : {}),
      }),
    )
  })

  app.post(
    '/api/reminders/:id/corrections',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeId.safeParse(peticion.params)
      const cuerpo = correccionDePendienteSchema.safeParse(peticion.body)
      if (!params.success || !cuerpo.success) {
        return cuerpoInvalido(respuesta)
      }
      const datos = cuerpo.data
      return enviar(respuesta, 200, pendienteConHistoriaSchema, () =>
        journal.corregirPendiente({
          commandId: datos.commandId,
          ranchId: sesion.ranchId,
          recordedBy: sesion.recordedBy,
          pendienteId: params.data.id,
          version: datos.version,
          motivo: datos.motivo,
          cambios: cambiosDePendiente(datos),
        }),
      )
    },
  )

  app.post(
    '/api/reminders/:id/status',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeId.safeParse(peticion.params)
      const cuerpo = cambiarEstadoDePendienteSchema.safeParse(peticion.body)
      if (!params.success || !cuerpo.success) {
        return cuerpoInvalido(respuesta)
      }
      const datos = cuerpo.data
      return enviar(respuesta, 200, pendienteConHistoriaSchema, () =>
        journal.cambiarEstado({
          commandId: datos.commandId,
          ranchId: sesion.ranchId,
          recordedBy: sesion.recordedBy,
          pendienteId: params.data.id,
          version: datos.version,
          estado: datos.estado,
        }),
      )
    },
  )

  app.get('/api/reminders', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    return enviar(respuesta, 200, pendientesSchema, () => journal.pendientes(sesion.ranchId))
  })
}

function cambiosDeNota(
  cuerpo: z.infer<typeof correccionDeNotaDeBitacoraSchema>,
): EntradaCorregirNota['cambios'] {
  return {
    ...(cuerpo.tipo !== undefined ? { tipo: cuerpo.tipo } : {}),
    ...(cuerpo.texto !== undefined ? { texto: cuerpo.texto } : {}),
    ...(cuerpo.fecha !== undefined ? { fecha: cuerpo.fecha } : {}),
    ...(cuerpo.precision !== undefined ? { precision: cuerpo.precision } : {}),
    ...(cuerpo.potreroId !== undefined ? { potreroId: cuerpo.potreroId } : {}),
    ...(cuerpo.reportedBy !== undefined ? { reportedBy: cuerpo.reportedBy } : {}),
    ...(cuerpo.evidenciaId !== undefined ? { evidenciaId: cuerpo.evidenciaId } : {}),
  }
}

function cambiosDePendiente(
  cuerpo: z.infer<typeof correccionDePendienteSchema>,
): EntradaCorregirPendiente['cambios'] {
  return {
    ...(cuerpo.texto !== undefined ? { texto: cuerpo.texto } : {}),
    ...(cuerpo.fecha !== undefined ? { fecha: cuerpo.fecha } : {}),
    ...(cuerpo.sujeto !== undefined ? { sujeto: cuerpo.sujeto } : {}),
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
    .send(errorDeBitacoraSchema.parse({ codigo: 'cuerpo_invalido' }))
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
      .send(errorDeBitacoraSchema.parse({ codigo: traducido.codigo }))
  }
}

function traducir(error: unknown): { codigo: ErrorDeBitacora['codigo']; estado: number } | null {
  if (error instanceof ConflictoDeVersion) {
    return { codigo: 'version_conflict', estado: 409 }
  }
  if (error instanceof ConflictoDeIdempotencia) {
    return { codigo: 'idempotency_mismatch', estado: 409 }
  }
  if (error instanceof RechazoDeJournal) {
    const codigo = codigoDeErrorDeBitacoraSchema.safeParse(error.codigo)
    if (!codigo.success) {
      return null
    }
    return { codigo: codigo.data, estado: estadoDe(codigo.data) }
  }
  return null
}

function estadoDe(codigo: ErrorDeBitacora['codigo']): number {
  if (codigo === 'no_encontrado') {
    return 404
  }
  if (codigo === 'bitacora_ya_existe' || codigo === 'pendiente_ya_existe') {
    return 409
  }
  return 422
}
