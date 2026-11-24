import { healthResponseSchema, readinessResponseSchema } from '@rancho/api-contracts'
import type { FastifyInstance } from 'fastify'

/**
 * Las dos comprobaciones de salud del despliegue.
 *
 * `GET /api/health` existe para que la web y el despliegue sepan si el proceso
 * responde. No consulta la base ni ninguna verdad del rancho: `ok: true`
 * significa «la API contesta», no «los datos están bien».
 *
 * `GET /api/health/ready` además pregunta si la base contesta, que es lo que
 * mira un despliegue antes de mandarle tráfico
 * ([deployment-strategy.md](../../../../docs/architecture/deployment-strategy.md)).
 * Si la base no responde, contesta 503 y `ok: false`: un proceso listo para
 * escuchar pero sin base no está listo para el rancho. La respuesta no lleva la
 * cadena de conexión, el usuario ni el nombre de la base
 * ([security-baseline.md](../../../../docs/architecture/security-baseline.md)).
 */

/**
 * Lo que la ruta de preparación necesita de la base.
 *
 * Es una función y no el cliente de Drizzle: el borde HTTP no conoce la
 * persistencia, solo pregunta «¿contesta?». La implementación vive en
 * `infrastructure/`.
 */
export type ComprobacionDeBase = () => Promise<boolean>

export function registrarRutaDeSalud(app: FastifyInstance, base?: ComprobacionDeBase): void {
  app.get('/api/health', async (_peticion, respuesta) => {
    // El contrato es la fuente del cuerpo: no se manda un objeto escrito a mano
    // que pueda dejar de coincidir con `packages/api-contracts`.
    const cuerpo = healthResponseSchema.parse({ ok: true })

    return respuesta.header('cache-control', 'no-store').code(200).send(cuerpo)
  })

  // Sin una comprobación de base montada (las pruebas del borde sin base), la
  // ruta no existe: es mejor un 404 que un «listo» que no revisó nada.
  if (base === undefined) {
    return
  }

  app.get('/api/health/ready', async (_peticion, respuesta) => {
    let responde = false
    try {
      responde = await base()
    } catch {
      responde = false
    }

    const cuerpo = readinessResponseSchema.parse({
      ok: responde,
      base: responde ? 'responde' : 'no_responde',
    })

    return respuesta
      .header('cache-control', 'no-store')
      .code(responde ? 200 : 503)
      .send(cuerpo)
  })
}
