import { sql, type SQL } from 'drizzle-orm'

import { ConflictoDeVersion } from '../../shared-kernel/conflictos'
import { filasDe, type EjecutorSql } from './filas'

const IDENTIFICADOR = /^[a-z_][a-z0-9_]*$/

export type CambioConVersion = {
  readonly esquema: string
  readonly tabla: string
  readonly id: string
  readonly version: number
  /** El valor nuevo de cada columna. `boolean` entra por las banderas de la ficha. */
  readonly cambios: Readonly<Record<string, string | number | boolean | null>>
}

/**
 * `UPDATE ... SET version = version + 1 WHERE id = ? AND version = ?`.
 *
 * Cero filas es `version_conflict`: el WHERE no coincidió, así que la sentencia
 * no escribió. La tabla tiene que tener columnas `id` y `version`.
 */
export async function actualizarConVersion(db: EjecutorSql, cambio: CambioConVersion): Promise<void> {
  const esquema = identificador(cambio.esquema)
  const tabla = identificador(cambio.tabla)
  const asignaciones: SQL[] = [
    sql`${sql.identifier('version')} = ${sql.identifier('version')} + ${1}`,
  ]

  for (const [columna, valor] of Object.entries(cambio.cambios)) {
    if (columna === 'id' || columna === 'version') {
      throw new Error(`La columna «${columna}» no se asigna como cambio.`)
    }
    identificador(columna)
    asignaciones.push(sql`${sql.identifier(columna)} = ${valor}`)
  }

  const resultado = await db.execute(sql`
    UPDATE ${sql.identifier(esquema)}.${sql.identifier(tabla)}
    SET ${sql.join(asignaciones, sql`, `)}
    WHERE ${sql.identifier('id')} = ${cambio.id}
      AND ${sql.identifier('version')} = ${cambio.version}
    RETURNING ${sql.identifier('id')}
  `)

  if (filasDe(resultado).length === 0) {
    throw new ConflictoDeVersion()
  }
}

function identificador(nombre: string): string {
  if (!IDENTIFICADOR.test(nombre)) {
    throw new Error(`Identificador SQL no permitido: ${nombre}`)
  }
  return nombre
}
