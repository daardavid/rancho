import { fileURLToPath } from 'node:url'

import { readMigrationFiles, type MigrationConfig, type MigrationMeta } from 'drizzle-orm/migrator'

const CARPETA = fileURLToPath(new URL('../../../drizzle', import.meta.url))

/**
 * `dialect` y `session` existen en el cliente de Drizzle. El tipo público los
 * marca internos; node-postgres y PGlite aplican las migraciones por el mismo
 * `PgDialect.migrate`, que es lo que hace el `migrate()` de cada driver.
 */
type BaseMigrable = {
  dialect: {
    migrate: (
      migrations: MigrationMeta[],
      session: unknown,
      config: MigrationConfig,
    ) => Promise<void>
  }
  session: unknown
}

/** Carpeta del SQL generado. El comando y las pruebas leen esta misma ruta. */
export function carpetaDeMigraciones(): string {
  return CARPETA
}

/**
 * Aplica la secuencia de `drizzle/` .
 *
 * La llama `db:migrate` y la fábrica de pruebas. Ningún arranque del servidor
 * la llama: el proceso HTTP no migra.
 */
export async function aplicarMigraciones(db: object): Promise<void> {
  const base = db as BaseMigrable
  const config: MigrationConfig = { migrationsFolder: CARPETA }
  const migraciones = readMigrationFiles(config)
  await base.dialect.migrate(migraciones, base.session, config)
}
