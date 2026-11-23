import type { EjecutorSql } from './filas'

/**
 * Abre una transacción y construye los repositorios atados a ella.
 *
 * `construirRepositorios` es la fábrica de persistencia: es el único callback
 * que ve la transacción. `trabajo` recibe esas interfaces y no el objeto de
 * Drizzle (ADR-008). No hay Unit of Work ni `AsyncLocalStorage`. Si `trabajo`
 * lanza, Drizzle revierte la transacción.
 */
export async function enTransaccion<Tx extends EjecutorSql, Repos, Resultado>(
  db: {
    transaction: (correr: (tx: Tx) => Promise<Resultado>) => Promise<Resultado>
  },
  construirRepositorios: (tx: Tx) => Repos,
  trabajo: (repositorios: Repos) => Promise<Resultado>,
): Promise<Resultado> {
  return db.transaction(async (tx) => trabajo(construirRepositorios(tx)))
}
