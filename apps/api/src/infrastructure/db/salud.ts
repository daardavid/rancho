import { sql } from 'drizzle-orm'

import type { EjecutorSql } from './filas'

/**
 * ¿Contesta la base?
 *
 * Es la comprobación de preparación del despliegue
 * ([deployment-strategy.md](../../../../docs/architecture/deployment-strategy.md)).
 * Una consulta trivial, sin tablas de negocio: no cuenta cabezas ni afirma nada
 * del rancho. Devuelve `false` en vez de lanzar, porque un proceso que no llega
 * a la base tiene que contestar 503, no morir en la petición de salud.
 *
 * No imprime ni devuelve el error: el mensaje de PostgreSQL puede traer el
 * usuario y el nombre de la base
 * ([security-baseline.md](../../../../docs/architecture/security-baseline.md)).
 */
export function comprobacionDeBase(db: EjecutorSql): () => Promise<boolean> {
  return async () => {
    try {
      await db.execute(sql`SELECT 1`)
      return true
    } catch {
      return false
    }
  }
}
