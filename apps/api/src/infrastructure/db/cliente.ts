import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

/** Cliente de PostgreSQL para los comandos. El servidor HTTP no lo abre. */
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
