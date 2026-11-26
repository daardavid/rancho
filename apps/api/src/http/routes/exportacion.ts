import type { FastifyInstance } from 'fastify'

import { disposicion } from '../../read-models/csv'
import type { ArchivoCsv, ModelosDeExportacion } from '../../read-models'
import type { RanchId } from '../../shared-kernel/ids'
import { exigirRol } from '../guardia'

/**
 * Bajar el hato, los pesos o los eventos.
 *
 * ADR-010: `owner` y `support` leen los hechos del rancho. Sin sesión, 401.
 * El archivo no lleva la cuenta ni la sesión: el nombre sale de la ficha del
 * rancho y el día es el de `America/Mexico_City`.
 */
const ROLES = ['owner', 'support'] as const

export function registrarRutasDeExportacion(
  app: FastifyInstance,
  modelos: ModelosDeExportacion,
): void {
  registrar(app, '/api/exports/herd', (ranchId) => modelos.hato(ranchId))
  registrar(app, '/api/exports/weights', (ranchId) => modelos.pesos(ranchId))
  registrar(app, '/api/exports/events', (ranchId) => modelos.eventos(ranchId))
}

function registrar(
  app: FastifyInstance,
  url: string,
  leer: (ranchId: RanchId) => Promise<ArchivoCsv>,
): void {
  app.get(url, { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = peticion.sesionActiva
    if (sesion === null) {
      throw new Error('La guardia dejó pasar una petición sin sesión.')
    }

    const archivo = await leer(sesion.ranchId)
    return respuesta
      .header('cache-control', 'no-store')
      .header('content-disposition', disposicion(archivo.nombre))
      .type('text/csv; charset=utf-8')
      .send(archivo.cuerpo)
  })
}
