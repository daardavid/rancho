import { sql } from 'drizzle-orm'
import { check, index, integer, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { esquemaEvidence } from '../db/esquema'

/**
 * Metadatos de un archivo. Los bytes no viven aquí.
 *
 * La llave es `{ranchId}/{evidenceId}`: el nombre original es un dato, no un
 * tramo de la ruta. No hay kilos ni pesos en esta fila.
 */
export const archivoDeEvidencia = esquemaEvidence.table(
  'file',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    clave: text('storage_key').notNull(),
    tipo: text('content_type').notNull(),
    tamano: integer('byte_size').notNull(),
    sha256: text('sha256').notNull(),
    nombreOriginal: text('original_filename'),
  },
  (tabla) => [
    uniqueIndex('evidence_file_clave').on(tabla.clave),
    index('evidence_file_ranch').on(tabla.ranchId, tabla.id),
    check(
      'evidence_file_clave_forma',
      sql`${tabla.clave} = (${tabla.ranchId})::text || '/' || (${tabla.id})::text`,
    ),
    check(
      'evidence_file_tipo_imagen',
      sql`${tabla.tipo} in ('image/jpeg', 'image/png', 'image/webp')`,
    ),
    check('evidence_file_tamano', sql`${tabla.tamano} > 0 and ${tabla.tamano} <= 26214400`),
    check('evidence_file_sha', sql`${tabla.sha256} ~ '^[0-9a-f]{64}$'`),
    check(
      'evidence_file_nombre',
      sql`${tabla.nombreOriginal} is null or length(btrim(${tabla.nombreOriginal})) > 0`,
    ),
  ],
)
