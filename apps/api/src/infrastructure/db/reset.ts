import { sql } from 'drizzle-orm'

import type { EjecutorSql } from './filas'
import { aplicarMigraciones, type BaseMigrable } from './migrar'

const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1'])

/**
 * `db:reset` borra los esquemas y los vuelve a crear. Se niega en producción
 * y contra un host que no sea esta máquina.
 */
export function afirmarResetPermitido(url: string): void {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('db:reset no corre cuando NODE_ENV=production.')
  }

  const host = hostDe(url)
  if (!HOSTS_LOCALES.has(host)) {
    throw new Error(`db:reset solo corre contra una base local. El host «${host}» no lo es.`)
  }
}

/** Node incluye los corchetes de IPv6 en `hostname` (`[::1]`). */
function hostDe(url: string): string {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    throw new Error('DATABASE_URL no es una URL que se pueda leer.')
  }

  if (host.startsWith('[') && host.endsWith(']')) {
    return host.slice(1, -1)
  }
  return host
}

/** Tira los esquemas de esta tarea y vuelve a aplicar la misma secuencia de migraciones. */
export async function restablecerEsquemas(db: BaseMigrable & EjecutorSql): Promise<void> {
  await db.execute(sql`DROP SCHEMA IF EXISTS herd CASCADE`)
  await db.execute(sql`DROP SCHEMA IF EXISTS growth CASCADE`)
  await db.execute(sql`DROP SCHEMA IF EXISTS identity CASCADE`)
  await db.execute(sql`DROP SCHEMA IF EXISTS evidence CASCADE`)
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`)
  await db.execute(sql`DROP TABLE IF EXISTS command_idempotency`)
  await aplicarMigraciones(db)
}
