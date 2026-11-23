import { errorDeSesionSchema, type RolDeCuenta } from '@rancho/api-contracts'
import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify'

import type { IdentidadHttp, SesionActiva } from '../infrastructure/identity/identidad'
import { NOMBRE_COOKIE_DE_SESION, leerCookie } from './cookie'

declare module 'fastify' {
  interface FastifyRequest {
    sesionActiva: SesionActiva | null
  }
}

/**
 * Resuelve la cookie una vez por petición y la deja en `sesionActiva`.
 *
 * Los módulos no ven esta cookie. Un comando posterior lee `recordedBy` de aquí.
 */
export function registrarResolucionDeSesion(
  app: FastifyInstance,
  identidad: IdentidadHttp | undefined,
): void {
  app.decorateRequest('sesionActiva', null)

  app.addHook('onRequest', async (peticion) => {
    peticion.sesionActiva = null
    if (identidad === undefined) {
      return
    }

    const token = leerCookie(peticion.headers.cookie, NOMBRE_COOKIE_DE_SESION)
    if (token === null) {
      return
    }

    peticion.sesionActiva = await identidad.resolver(token)
  })
}

/** Sin sesión: 401. Con sesión de un rol que la ruta no admite: 403. */
export function exigirRol(roles: readonly RolDeCuenta[]): preHandlerHookHandler {
  return async (peticion: FastifyRequest, respuesta: FastifyReply) => {
    const sesion = peticion.sesionActiva
    if (sesion === null) {
      await respuesta
        .header('cache-control', 'no-store')
        .code(401)
        .send(errorDeSesionSchema.parse({ codigo: 'no_autenticado' }))
      return
    }

    if (!roles.includes(sesion.rol)) {
      await respuesta
        .header('cache-control', 'no-store')
        .code(403)
        .send(errorDeSesionSchema.parse({ codigo: 'prohibido' }))
      return
    }
  }
}
