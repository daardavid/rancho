import { errorDeSesionSchema, iniciarSesionSchema, sesionActualSchema } from '@rancho/api-contracts'
import type { FastifyInstance } from 'fastify'

import type { IdentidadHttp } from '../../infrastructure/identity/identidad'
import { DURACION_DE_SESION_MS } from '../../infrastructure/identity/parametros'
import { cookieDeCierre, cookieDeSesion, leerCookie, NOMBRE_COOKIE_DE_SESION } from '../cookie'
import { exigirRol } from '../guardia'

const ROLES_DE_ESTA_INSTALACION = ['owner', 'support'] as const

/**
 * Entrar, salir y ver quién está. No hay registro abierto: la cuenta se crea
 * con `cuenta:crear`.
 */
export function registrarRutasDeSesion(
  app: FastifyInstance,
  opciones: { identidad: IdentidadHttp; produccion: boolean },
): void {
  const { identidad, produccion } = opciones

  app.post('/api/session', async (peticion, respuesta) => {
    const cuerpo = iniciarSesionSchema.safeParse(peticion.body)
    if (!cuerpo.success) {
      return respuesta
        .header('cache-control', 'no-store')
        .code(400)
        .send(errorDeSesionSchema.parse({ codigo: 'cuerpo_invalido' }))
    }

    const resultado = await identidad.iniciar(cuerpo.data)
    if (resultado.tipo === 'demasiados_intentos') {
      return respuesta
        .header('cache-control', 'no-store')
        .code(429)
        .send(errorDeSesionSchema.parse({ codigo: 'demasiados_intentos' }))
    }
    if (resultado.tipo !== 'ok') {
      return respuesta
        .header('cache-control', 'no-store')
        .code(401)
        .send(errorDeSesionSchema.parse({ codigo: 'credenciales_invalidas' }))
    }

    const sesion = sesionActualSchema.parse({
      cuentaId: resultado.sesion.cuentaId,
      rol: resultado.sesion.rol,
      ranchId: resultado.sesion.ranchId,
    })
    return respuesta
      .header('cache-control', 'no-store')
      .header(
        'set-cookie',
        cookieDeSesion(resultado.token, produccion, Math.floor(DURACION_DE_SESION_MS / 1000)),
      )
      .code(200)
      .send(sesion)
  })

  app.get(
    '/api/session',
    { preHandler: exigirRol(ROLES_DE_ESTA_INSTALACION) },
    async (peticion, respuesta) => {
      const sesion = peticion.sesionActiva
      if (sesion === null) {
        throw new Error('La guardia dejó pasar una petición sin sesión.')
      }

      return respuesta
        .header('cache-control', 'no-store')
        .code(200)
        .send(
          sesionActualSchema.parse({
            cuentaId: sesion.cuentaId,
            rol: sesion.rol,
            ranchId: sesion.ranchId,
          }),
        )
    },
  )

  app.delete('/api/session', async (peticion, respuesta) => {
    const token = leerCookie(peticion.headers.cookie, NOMBRE_COOKIE_DE_SESION)
    if (token !== null) {
      await identidad.cerrar(token)
    }

    return respuesta
      .header('cache-control', 'no-store')
      .header('set-cookie', cookieDeCierre(produccion))
      .code(204)
      .send()
  })
}
