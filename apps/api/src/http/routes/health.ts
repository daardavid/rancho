import { healthResponseSchema } from '@rancho/api-contracts'
import type { FastifyInstance } from 'fastify'

/**
 * `GET /api/health` existe para que la web y el despliegue sepan si el proceso
 * responde. No consulta la base ni ninguna verdad del rancho: `ok: true` significa
 * «la API contesta», no «los datos están bien».
 */
export function registrarRutaDeSalud(app: FastifyInstance): void {
  app.get('/api/health', async (_peticion, respuesta) => {
    // El contrato es la fuente del cuerpo: no se manda un objeto escrito a mano
    // que pueda dejar de coincidir con `packages/api-contracts`.
    const cuerpo = healthResponseSchema.parse({ ok: true })

    return respuesta.header('cache-control', 'no-store').code(200).send(cuerpo)
  })
}
