import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

/**
 * Cliente de PostgreSQL. Lo abren los comandos de base y el proceso HTTP.
 * Abrirlo no migra.
 *
 * `maxConexiones` es el tamaño del pool. El despliegue habla de «el pool
 * pequeño» ([deployment-strategy.md](../../../../docs/architecture/deployment-strategy.md))
 * y a este tamaño de rancho no hace falta más. También sirve para una base que
 * atiende una sola conexión a la vez, como el motor embebido de las pruebas.
 */
export function abrirCliente(url: string, maxConexiones = 10) {
  const pool = new Pool({ connectionString: url, max: maxConexiones })
  const db = drizzle(pool)

  return {
    db,
    cerrar: async () => {
      await pool.end()
    },
  }
}
