import { fileURLToPath } from 'node:url'

import { is } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate as migrarPostgres } from 'drizzle-orm/node-postgres/migrator'
import { PgliteDatabase } from 'drizzle-orm/pglite'
import { migrate as migrarPglite } from 'drizzle-orm/pglite/migrator'

const CARPETA = fileURLToPath(new URL('../../../drizzle', import.meta.url))

/**
 * Las dos bases que el repo usa: el PostgreSQL de node-postgres y la PGlite de
 * las pruebas ([ADR-014](../../../../../docs/architecture/adr/ADR-014-local-test-database.md)).
 *
 * El tipo es estrecho a propósito: no entra cualquier objeto ni se tocan las
 * piezas internas de Drizzle (`dialect`, `session`). Quien migra tiene que
 * pasar un cliente de uno de los dos drivers, y el que no lo sea no compila.
 */
export type BaseMigrable =
  | NodePgDatabase<Record<string, never>>
  | PgliteDatabase<Record<string, never>>

/** Carpeta del SQL generado. El comando y las pruebas leen esta misma ruta. */
export function carpetaDeMigraciones(): string {
  return CARPETA
}

/**
 * Qué driver hay detrás del cliente.
 *
 * Se pregunta a Drizzle con `is()`, no se adivina. Un objeto que no sea de
 * ninguno de los dos se rechaza aquí, en vez de mandarlo a node-postgres y
 * dejar salir un error de una pieza que no existe.
 */
export function motorDe(db: BaseMigrable): 'pglite' | 'postgres' {
  if (is(db, PgliteDatabase)) {
    return 'pglite'
  }
  if (is(db, NodePgDatabase)) {
    return 'postgres'
  }
  throw new Error(
    'aplicarMigraciones solo acepta un cliente de drizzle-orm/node-postgres o de drizzle-orm/pglite.',
  )
}

/**
 * Aplica la secuencia de `drizzle/` con el `migrate` público del driver.
 *
 * La llama `db:migrate` y la fábrica de pruebas. Ningún arranque del servidor
 * la llama: el proceso HTTP no migra.
 */
export async function aplicarMigraciones(db: BaseMigrable): Promise<void> {
  const config = { migrationsFolder: CARPETA }
  if (motorDe(db) === 'pglite') {
    await migrarPglite(db as PgliteDatabase<Record<string, never>>, config)
    return
  }
  await migrarPostgres(db as NodePgDatabase<Record<string, never>>, config)
}
