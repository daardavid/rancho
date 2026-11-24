import type { SQL } from 'drizzle-orm'

/** Lo mínimo que comparten el cliente de node-postgres y el de PGlite. */
export type EjecutorSql = {
  execute: (query: SQL) => Promise<unknown>
}

/**
 * Filas de un `execute`. Los dos drivers devuelven `{ rows }` (PGlite a veces
 * el arreglo directo). Si no hay filas, el arreglo va vacío: un conflicto de
 * versión se decide con esa longitud.
 */
export function filasDe<T>(resultado: unknown): T[] {
  if (Array.isArray(resultado)) {
    return resultado as T[]
  }

  if (typeof resultado === 'object' && resultado !== null && 'rows' in resultado) {
    const filas = resultado.rows
    if (Array.isArray(filas)) {
      return filas as T[]
    }
  }

  return []
}
