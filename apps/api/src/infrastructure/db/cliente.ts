import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

/** Cliente de PostgreSQL. Lo abren los comandos de base y el proceso HTTP. Abrirlo no migra. */
export function abrirCliente(url: string) {
  const pool = new Pool({ connectionString: url })
  const db = drizzle(pool)

  return {
    db,
    cerrar: async () => {
      await pool.end()
    },
  }
}
