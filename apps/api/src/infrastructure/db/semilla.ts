import { sql } from 'drizzle-orm'

import { nuevoId } from '../../shared-kernel/ids'
import { filasDe, type EjecutorSql } from './filas'

export type RanchoSembrado = {
  readonly creado: boolean
  readonly id: string
}

/**
 * Crea el único rancho si todavía no hay uno.
 *
 * El nombre tiene que venir de quien corre el comando (`RANCH_NAME`). Si falta,
 * no se inventa. Si ya hay un rancho, se deja como está: no se renombra ni se
 * agrega otro.
 */
export async function sembrarRancho(db: EjecutorSql, nombre: string): Promise<RanchoSembrado> {
  const limpio = nombre.trim()
  if (limpio === '') {
    throw new Error('Falta RANCH_NAME. La semilla no inventa el nombre del rancho.')
  }

  const existentes = filasDe<{ id: string }>(
    await db.execute(sql`
      SELECT id
      FROM identity.ranch
      ORDER BY created_at
      LIMIT 1
    `),
  )
  const existente = existentes[0]
  if (existente !== undefined) {
    return { creado: false, id: existente.id }
  }

  const id = nuevoId()
  await db.execute(sql`
    INSERT INTO identity.ranch (id, nombre, created_at)
    VALUES (${id}, ${limpio}, ${new Date()})
  `)
  return { creado: true, id }
}
