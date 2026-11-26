import {
  diaSchema,
  errorDeInicioSchema,
  inicioSchema,
  ultimaObservacionSchema,
} from '@rancho/api-contracts'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import type { ModelosDePresencia } from '../../read-models'
import { exigirRol } from '../guardia'

const ROLES = ['owner', 'support'] as const
const paramsDeAnimal = z.strictObject({ id: z.uuid() })
const consultaDeInicio = z.strictObject({
  // El 31 de febrero se rechaza aquí y no llega a PostgreSQL como un `::date`
  // que revienta con un 500 (la misma regla que el resumen).
  desde: diaSchema.optional(),
})

/**
 * La última observación y la pantalla de Inicio. Son consultas: no hay cuerpo,
 * no hay comando y no se escribe nada. El rancho sale de la sesión.
 */
export function registrarRutasDePresencia(app: FastifyInstance, modelos: ModelosDePresencia): void {
  app.get(
    '/api/read-models/ultima-observacion/:id',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeAnimal.safeParse(peticion.params)
      if (!params.success) {
        return cuerpoInvalido(respuesta)
      }

      const vista = await modelos.ultimaObservacion(sesion.ranchId, params.data.id)
      if (vista === null) {
        return respuesta
          .header('cache-control', 'no-store')
          .code(404)
          .send(errorDeInicioSchema.parse({ codigo: 'no_encontrado' }))
      }

      return respuesta
        .header('cache-control', 'no-store')
        .code(200)
        .send(ultimaObservacionSchema.parse(vista))
    },
  )

  app.get(
    '/api/read-models/inicio',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const consulta = consultaDeInicio.safeParse(peticion.query)
      if (!consulta.success) {
        return cuerpoInvalido(respuesta)
      }

      const hoy = await modelos.hoy()
      if (consulta.data.desde !== undefined && consulta.data.desde > hoy) {
        return cuerpoInvalido(respuesta)
      }

      const vista = await modelos.inicio(sesion.ranchId, {
        ...(consulta.data.desde === undefined ? {} : { desde: consulta.data.desde }),
        hoy,
      })
      return respuesta.header('cache-control', 'no-store').code(200).send(inicioSchema.parse(vista))
    },
  )
}

function exigirSesion<T extends { ranchId: string } | null>(sesion: T): NonNullable<T> {
  if (sesion === null) {
    throw new Error('La guardia dejó pasar una petición sin sesión.')
  }
  return sesion
}

function cuerpoInvalido(respuesta: FastifyReply) {
  return respuesta
    .header('cache-control', 'no-store')
    .code(400)
    .send(errorDeInicioSchema.parse({ codigo: 'cuerpo_invalido' }))
}
