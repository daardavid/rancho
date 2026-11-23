import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { aplicarMigraciones } from '../../src/infrastructure/db/migrar'

/**
 * El secreto de sesión de las pruebas.
 *
 * No es un secreto: la prueba necesita uno del largo que exige
 * [`cargarConfiguracion`](../../src/infrastructure/configuracion.ts) para poder
 * armar la identidad. Cualquier valor sirve mientras todas las pruebas que
 * comparten una base usen el mismo, porque la huella guardada depende de él.
 */
export const SECRETO_DE_PRUEBA = 'secreto-de-prueba-para-la-fabrica-0001'

/**
 * Una sola fábrica para las pruebas de persistencia (ADR-014).
 *
 * Con `TEST_DATABASE_URL` se conecta a ese PostgreSQL. Sin ella arranca PGlite
 * en este proceso. En los dos casos aplica las migraciones con `aplicarMigraciones`,
 * el mismo código que `db:migrate`. Si no puede, lanza: la prueba falla, no se salta.
 */
export async function abrirBaseDePruebas() {
  const url = process.env['TEST_DATABASE_URL']
  if (url !== undefined && url.trim() !== '') {
    return abrirPostgres(url)
  }
  return abrirPglite()
}

async function abrirPostgres(url: string) {
  const pool = new Pool({ connectionString: url })
  const db = drizzlePg(pool)
  try {
    await aplicarMigraciones(db)
  } catch (error) {
    await pool.end()
    throw new Error(
      `TEST_DATABASE_URL está definida y no se pudo preparar la base: ${texto(error)}`,
    )
  }
  return { db, cerrar: () => pool.end() }
}

async function abrirPglite() {
  const cliente = new PGlite()
  try {
    await cliente.waitReady
    const db = drizzlePglite(cliente)
    await aplicarMigraciones(db)
    return { db, cerrar: () => cliente.close() }
  } catch (error) {
    await cliente.close().catch(() => undefined)
    throw new Error(
      `No se pudo arrancar la base de pruebas. Sin TEST_DATABASE_URL, PGlite tiene que arrancar en el proceso: ${texto(error)}`,
    )
  }
}

function texto(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
