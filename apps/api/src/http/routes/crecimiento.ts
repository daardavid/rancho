import {
  animalGrowthViewSchema,
  crecimientoDelHatoSchema,
  errorDeCrecimientoSchema,
  pesosConocidosSchema,
} from '@rancho/api-contracts'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import type { ModelosDeCrecimiento } from '../../read-models'
import { exigirRol } from '../guardia'

const ROLES = ['owner', 'support'] as const
const paramsDeAnimal = z.strictObject({ id: z.uuid() })

/**
 * Las vistas de crecimiento. Son consultas: no hay cuerpo, no hay comando y no
 * se escribe nada. El rancho sale de la sesión.
 *
 * Un animal que no existe en este rancho responde 404. Un animal que existe y no
 * tiene ningún peso responde 200 con la serie vacía: no saber su peso no es un
 * error.
 */
export function registrarRutasDeCrecimiento(app: FastifyInstance, modelos: ModelosDeCrecimiento): void {
  app.get(
    '/api/read-models/animal-growth/:id',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeAnimal.safeParse(peticion.params)
      if (!params.success) {
        return cuerpoInvalido(respuesta)
      }

      const vista = await modelos.vistaDeAnimal(sesion.ranchId, params.data.id)
      if (vista === null) {
        return respuesta
          .header('cache-control', 'no-store')
          .code(404)
          .send(errorDeCrecimientoSchema.parse({ codigo: 'no_encontrado' }))
      }

      return respuesta
        .header('cache-control', 'no-store')
        .code(200)
        .send(animalGrowthViewSchema.parse(vista))
    },
  )

  app.get(
    '/api/read-models/growth-overview',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const resumen = await modelos.resumenDelHato(sesion.ranchId)

      return respuesta
        .header('cache-control', 'no-store')
        .code(200)
        .send(crecimientoDelHatoSchema.parse(resumen))
    },
  )

  app.get(
    '/api/read-models/known-weights',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const pesos = await modelos.pesosConocidos(sesion.ranchId)

      return respuesta
        .header('cache-control', 'no-store')
        .code(200)
        .send(pesosConocidosSchema.parse({ pesos }))
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
    .send(errorDeCrecimientoSchema.parse({ codigo: 'cuerpo_invalido' }))
}
