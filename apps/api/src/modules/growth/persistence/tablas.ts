import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { esquemaGrowth } from '../../../infrastructure/db/esquema'

/**
 * Sesión de pesaje. `ranch_id` es el alcance; no hay llave a `identity.ranch`.
 * `weighed_on` es el día en que se pesó. `reported_by` es texto libre, no una
 * cuenta. `command_id` es el id que mandó el cliente. `kind` distingue la
 * vuelta del hato de un peso suelto.
 */
export const sesionDePesaje = esquemaGrowth.table(
  'weighing_session',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    fecha: date('weighed_on', { mode: 'string' }).notNull(),
    nota: text('note'),
    reportedBy: text('reported_by'),
    recordedBy: text('recorded_by').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
    commandId: uuid('command_id').notNull(),
    /**
     * `vuelta` es el paso del hato por la báscula. `suelto` es un peso tomado
     * aparte —hoy, el del destete—. Por omisión es vuelta: Pesaje no lo manda.
     */
    clase: text('kind').notNull().default('vuelta'),
  },
  (tabla) => [
    uniqueIndex('weighing_session_command').on(tabla.commandId),
    index('weighing_session_ranch_fecha').on(tabla.ranchId, tabla.fecha),
    check('weighing_session_clase_valida', sql`${tabla.clase} in ('vuelta', 'suelto')`),
    check('weighing_session_nota_presente', sql`${tabla.nota} is null or length(btrim(${tabla.nota})) > 0`),
    check(
      'weighing_session_reported_presente',
      sql`${tabla.reportedBy} is null or length(btrim(${tabla.reportedBy})) > 0`,
    ),
  ],
)

/**
 * Una fila por animal. `weighed` trae kilos y calidad; `gap` es el hueco y
 * deja las dos vacías. La versión solo vive en el peso, que es lo que se corrige.
 *
 * La llave a `herd.animal` no se declara aquí: importar la tabla de Herd
 * cruzaría la persistencia de los dos módulos. La migración la agrega con
 * `ON DELETE RESTRICT`. No hay otra referencia entre esquemas.
 */
export const filaDePesaje = esquemaGrowth.table(
  'weighing_line',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sesionDePesaje.id, { onDelete: 'restrict' }),
    animalId: uuid('animal_id').notNull(),
    position: integer('position').notNull(),
    result: text('result').notNull(),
    kilos: numeric('kilos', { precision: 12, scale: 3 }),
    quality: text('quality'),
    version: integer('version'),
    /**
     * Foto del indicador. Es el id de `evidence.file`, sin llave foránea:
     * Growth no escribe esa tabla y no guarda una ruta.
     */
    evidenceId: uuid('evidence_id'),
  },
  (tabla) => [
    uniqueIndex('weighing_line_session_animal').on(tabla.sessionId, tabla.animalId),
    uniqueIndex('weighing_line_session_position').on(tabla.sessionId, tabla.position),
    index('weighing_line_animal').on(tabla.ranchId, tabla.animalId),
    check('weighing_line_resultado_valido', sql`${tabla.result} in ('weighed', 'gap')`),
    check('weighing_line_posicion_valida', sql`${tabla.position} >= 0`),
    check(
      'weighing_line_forma_valida',
      sql`(
        ${tabla.result} = 'weighed'
        and ${tabla.kilos} is not null
        and ${tabla.quality} in ('measured', 'observed', 'declared')
        and ${tabla.version} >= 1
      ) or (
        ${tabla.result} = 'gap'
        and ${tabla.kilos} is null
        and ${tabla.quality} is null
        and ${tabla.version} is null
        and ${tabla.evidenceId} is null
      )`,
    ),
  ],
)

/** Valor anterior de una corrección de peso. Una fila por campo que cambió. */
export const correccionDePeso = esquemaGrowth.table(
  'weight_correction',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    lineId: uuid('line_id')
      .notNull()
      .references(() => filaDePesaje.id, { onDelete: 'restrict' }),
    campo: text('field').notNull(),
    valorAnterior: text('previous_value').notNull(),
    motivo: text('reason').notNull(),
    correctedBy: text('corrected_by').notNull(),
    correctedAt: timestamp('corrected_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('weight_correction_line').on(tabla.lineId, tabla.correctedAt),
    check(
      'weight_correction_campo_valido',
      sql`${tabla.campo} in ('kilos', 'calidad', 'evidencia')`,
    ),
    check('weight_correction_valor_presente', sql`length(btrim(${tabla.valorAnterior})) > 0`),
    check('weight_correction_motivo_presente', sql`length(btrim(${tabla.motivo})) > 0`),
  ],
)
