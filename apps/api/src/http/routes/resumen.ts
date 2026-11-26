import { diaSchema, errorDeResumenSchema, resumenSemanalSchema } from '@rancho/api-contracts'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import type { ModelosDeResumen } from '../../read-models'
import { exigirRol } from '../guardia'

const ROLES = ['owner', 'support'] as const
const consultaDelResumen = z.strictObject({
  // `diaSchema` no solo mira la forma: el 31 de febrero se rechaza aquí y no
  // llega a PostgreSQL como un `::date` que revienta con un 500.
  desde: diaSchema.optional(),
})

/**
 * El resumen de la semana. Es una consulta: no hay cuerpo, no hay comando y no
 * se escribe nada. El rancho sale de la sesión y el nombre del rancho se lee de
 * su ficha, no de la sesión.
 */
export function registrarRutasDeResumen(app: FastifyInstance, modelos: ModelosDeResumen): void {
  app.get(
    '/api/read-models/resumen',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = peticion.sesionActiva
      if (sesion === null) {
        throw new Error('La guardia dejó pasar una petición sin sesión.')
      }

      const consulta = consultaDelResumen.safeParse(peticion.query)
      if (!consulta.success) {
        return cuerpoInvalido(respuesta)
      }

      const hoy = await modelos.hoy()
      if (consulta.data.desde !== undefined && consulta.data.desde > hoy) {
        return cuerpoInvalido(respuesta)
      }

      const vista = await modelos.semanal(sesion.ranchId, {
        ...(consulta.data.desde === undefined ? {} : { desde: consulta.data.desde }),
        hoy,
      })
      return respuesta
        .header('cache-control', 'no-store')
        .code(200)
        .send(resumenSemanalSchema.parse(vista))
    },
  )
}

function cuerpoInvalido(respuesta: FastifyReply) {
  return respuesta
    .header('cache-control', 'no-store')
    .code(400)
    .send(errorDeResumenSchema.parse({ codigo: 'cuerpo_invalido' }))
}
