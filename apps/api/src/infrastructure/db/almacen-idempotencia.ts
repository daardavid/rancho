import { sql } from 'drizzle-orm'

import type { AlmacenDeIdempotencia } from '../../shared-kernel/idempotencia'
import { filasDe, type EjecutorSql } from './filas'

/**
 * Recibos atados al ejecutor que le pasen. Si ese ejecutor es una transacción,
 * el recibo se confirma o se revierte con ella.
 */
export function crearAlmacenDeIdempotencia(db: EjecutorSql): AlmacenDeIdempotencia {
  return {
    async buscar(commandId) {
      const filas = filasDe<{ fingerprint: string; result: string }>(
        await db.execute(sql`
          SELECT fingerprint, result
          FROM command_idempotency
          WHERE command_id = ${commandId}
          LIMIT 1
        `),
      )
      const fila = filas[0]
      if (fila === undefined) {
        return null
      }
      return { huella: fila.fingerprint, resultado: fila.result }
    },

    async guardar(commandId, huella, resultado) {
      await db.execute(sql`
        INSERT INTO command_idempotency (command_id, fingerprint, result, created_at)
        VALUES (${commandId}, ${huella}, ${resultado}, ${new Date()})
      `)
    },
  }
}
