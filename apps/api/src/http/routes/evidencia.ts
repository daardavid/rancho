import { errorDeEvidenciaSchema, evidenciaCreadaSchema, type ErrorDeEvidencia } from '@rancho/api-contracts'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import {
  MENSAJE_FOTO_GRANDE,
  RechazoDeEvidencia,
  TAMANO_MAXIMO_DE_FOTO,
} from '../../infrastructure/evidence/imagen'
import type { PuertoDeEvidencia } from '../../infrastructure/evidence/puerto'
import { ranchIdSchema } from '../../shared-kernel/ids'
import { exigirRol } from '../guardia'

const ROLES = ['owner', 'support'] as const
const paramsDeId = z.strictObject({ id: z.uuid() })

const MENSAJE_NO_ENCONTRADA = 'No hay esa foto en este rancho.'
const MENSAJE_CUERPO = 'La foto no llegó. Tómala otra vez desde el celular.'
const MENSAJE_ARCHIVO_AUSENTE = 'La foto se registró, pero el archivo no está.'

/**
 * Sube y sirve la foto del indicador.
 *
 * El navegador manda los bytes. El puerto decide si son una imagen y los
 * escribe fuera de la base. Ver la foto exige la sesión del mismo rancho:
 * otro rancho recibe el mismo «no está», sin saber si el id existe.
 */
export function registrarRutasDeEvidencia(app: FastifyInstance, evidencia: PuertoDeEvidencia): void {
  app.register((instancia, _opciones, listo) => {
    instancia.setErrorHandler((error, _peticion, respuesta) => {
      if (esCuerpoDemasiadoGrande(error)) {
        void responderError(respuesta, 413, 'foto_demasiado_grande', MENSAJE_FOTO_GRANDE)
        return
      }
      respuesta.send(error instanceof Error ? error : new Error('La subida de la foto falló.'))
    })

    instancia.addHook('onRequest', async (peticion, respuesta) => {
      if (peticion.method !== 'POST' || rutaDe(peticion.url) !== '/api/evidencia') {
        return
      }
      const largo = peticion.headers['content-length']
      if (typeof largo === 'string' && Number(largo) > TAMANO_MAXIMO_DE_FOTO) {
        return responderError(respuesta, 413, 'foto_demasiado_grande', MENSAJE_FOTO_GRANDE)
      }
    })

    instancia.post('/api/evidencia', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const bytes = bytesDe(peticion.body)
      if (bytes === null) {
        return responderError(respuesta, 400, 'cuerpo_invalido', MENSAJE_CUERPO)
      }

      try {
        const guardada = await evidencia.guardar({
          ranchId: ranchIdSchema.parse(sesion.ranchId),
          bytes,
          nombreOriginal: nombreDe(peticion.headers['x-nombre-original']),
        })
        return respuesta.header('cache-control', 'no-store').code(201).send(
          evidenciaCreadaSchema.parse({
            id: guardada.id,
            tipo: guardada.tipo,
            tamano: guardada.tamano,
          }),
        )
      } catch (error) {
        if (error instanceof RechazoDeEvidencia) {
          const estado = error.codigo === 'foto_demasiado_grande' ? 413 : 422
          return responderError(respuesta, estado, error.codigo, error.mensaje)
        }
        throw error
      }
    })

    instancia.get('/api/evidencia/:id', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeId.safeParse(peticion.params)
      if (!params.success) {
        return responderError(respuesta, 400, 'cuerpo_invalido', MENSAJE_CUERPO)
      }

      const lectura = await evidencia.leer(ranchIdSchema.parse(sesion.ranchId), params.data.id)
      if (lectura === null || lectura.bytes === null) {
        const mensaje = lectura === null ? MENSAJE_NO_ENCONTRADA : MENSAJE_ARCHIVO_AUSENTE
        return responderError(respuesta, 404, 'no_encontrado', mensaje)
      }

      return respuesta
        .header('cache-control', 'private, no-store')
        .header('x-content-type-options', 'nosniff')
        .header('content-disposition', 'inline')
        .type(lectura.metadatos.tipo)
        .code(200)
        .send(Buffer.from(lectura.bytes))
    })

    listo()
  })
}

/** Parsers de los bytes. El tipo declarado no alcanza para aceptar la foto. */
export function registrarParserDeFotos(app: FastifyInstance): void {
  const opciones = { parseAs: 'buffer' as const, bodyLimit: TAMANO_MAXIMO_DE_FOTO }
  const parser = (_peticion: unknown, cuerpo: unknown, done: (error: null, cuerpo: unknown) => void) => {
    done(null, cuerpo)
  }
  for (const tipo of [
    'application/octet-stream',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
  ]) {
    app.addContentTypeParser(tipo, opciones, parser)
  }
}

function bytesDe(cuerpo: unknown): Uint8Array | null {
  if (Buffer.isBuffer(cuerpo)) {
    return cuerpo
  }
  if (cuerpo instanceof Uint8Array) {
    return cuerpo
  }
  return null
}

function nombreDe(valor: unknown): string | null {
  if (typeof valor === 'string') {
    return valor
  }
  if (Array.isArray(valor) && typeof valor[0] === 'string') {
    return valor[0]
  }
  return null
}

function esCuerpoDemasiadoGrande(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'FST_ERR_CTP_BODY_TOO_LARGE'
  )
}

function rutaDe(url: string): string {
  const sinConsulta = url.split('?')[0] ?? url
  return sinConsulta
}

function exigirSesion<T extends { ranchId: string } | null>(sesion: T): NonNullable<T> {
  if (sesion === null) {
    throw new Error('La guardia dejó pasar una petición sin sesión.')
  }
  return sesion
}

function responderError(
  respuesta: FastifyReply,
  estado: number,
  codigo: ErrorDeEvidencia['codigo'],
  mensaje: string,
) {
  return respuesta
    .header('cache-control', 'no-store')
    .code(estado)
    .send(errorDeEvidenciaSchema.parse({ codigo, mensaje }))
}
