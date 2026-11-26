import { tendenciasSchema } from '@rancho/api-contracts'
import type { FastifyInstance } from 'fastify'

import type { ModelosDeTendencias } from '../../read-models'
import { exigirRol } from '../guardia'

const ROLES = ['owner', 'support'] as const

/**
 * La lectura de tendencias. No hay cuerpo, no hay comando y no se escribe nada.
 * El rancho sale de la sesión.
 */
export function registrarRutasDeTendencias(app: FastifyInstance, modelos: ModelosDeTendencias): void {
  app.get(
    '/api/read-models/tendencias',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = peticion.sesionActiva
      if (sesion === null) {
        throw new Error('La guardia dejó pasar una petición sin sesión.')
      }

      const vista = await modelos.vista(sesion.ranchId)

      return respuesta.header('cache-control', 'no-store').code(200).send(tendenciasSchema.parse(vista))
    },
  )
}
