import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Esquema `journal`. La bitácora y los pendientes no son hechos de un animal,
 * así que no viven en `herd` ni en `growth`
 * ([ADR-018](../../../../../../docs/architecture/adr/ADR-018-bitacora.md)).
 *
 * Un id de potrero o de animal es una referencia, sin llave al otro esquema:
 * esta persistencia no importa las tablas de Herd. Quien escribe pregunta
 * antes, por el índice público de Herd, si existen.
 */
export const esquemaJournal = pgSchema('journal')

/**
 * Nota con fecha que no es de un animal. El tipo y la precisión no tienen
 * valor por omisión en la base: los dos son NOT NULL y el dominio no abre
 * la nota si nadie los eligió.
 *
 * `evidence_id` es el id de `evidence.file`, sin llave foránea: Journal no
 * escribe esa tabla y no guarda una ruta.
 */
export const notaDeBitacora = esquemaJournal.table(
  'note',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    tipo: text('type').notNull(),
    texto: text('body').notNull(),
    fecha: date('occurred_on', { mode: 'string' }).notNull(),
    precision: text('date_precision').notNull(),
    potreroId: uuid('paddock_id'),
    reportedBy: text('reported_by'),
    evidenciaId: uuid('evidence_id'),
    version: integer('version').notNull(),
    recordedBy: text('recorded_by').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('note_ranch_fecha').on(tabla.ranchId, tabla.fecha),
    check('note_tipo_valido', sql`${tabla.tipo} in ('lluvia', 'quema', 'agua', 'cerca', 'otro')`),
    check('note_precision_valida', sql`${tabla.precision} in ('exact', 'approximate')`),
    check('note_texto_presente', sql`length(btrim(${tabla.texto})) > 0`),
    check(
      'note_reported_by_presente',
      sql`${tabla.reportedBy} is null or length(btrim(${tabla.reportedBy})) > 0`,
    ),
    check('note_version_positiva', sql`${tabla.version} >= 1`),
  ],
)

/** Valor anterior de una corrección de nota. Una fila por campo que cambió. */
export const correccionDeNota = esquemaJournal.table(
  'note_correction',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    notaId: uuid('note_id')
      .notNull()
      .references(() => notaDeBitacora.id, { onDelete: 'restrict' }),
    campo: text('field').notNull(),
    valorAnterior: text('previous_value'),
    motivo: text('reason').notNull(),
    correctedBy: text('corrected_by').notNull(),
    correctedAt: timestamp('corrected_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('note_correction_nota').on(tabla.notaId, tabla.correctedAt),
    check(
      'note_correction_campo_valido',
      sql`${tabla.campo} in ('tipo', 'texto', 'fecha', 'precision', 'potrero', 'reportedBy', 'evidencia')`,
    ),
    check('note_correction_motivo_presente', sql`length(btrim(${tabla.motivo})) > 0`),
  ],
)

/**
 * Pendiente del dueño. Nace en `pendiente`. `status_changed_by` y
 * `status_changed_at` son quién dejó el estado actual y cuándo. En el alta
 * son quien lo anotó y el instante del alta.
 *
 * `subject_kind` nulo es «no es de un animal ni de un potrero». El grupo no
 * es una entidad del hato: sus animales están en `reminder_animal`.
 */
export const pendiente = esquemaJournal.table(
  'reminder',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    texto: text('body').notNull(),
    fecha: date('due_on', { mode: 'string' }).notNull(),
    estado: text('status').notNull(),
    sujeto: text('subject_kind'),
    potreroId: uuid('paddock_id'),
    estadoPor: text('status_changed_by').notNull(),
    estadoEn: timestamp('status_changed_at', { withTimezone: true, mode: 'date' }).notNull(),
    version: integer('version').notNull(),
    recordedBy: text('recorded_by').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('reminder_ranch_estado_fecha').on(tabla.ranchId, tabla.estado, tabla.fecha),
    check(
      'reminder_estado_valido',
      sql`${tabla.estado} in ('pendiente', 'hecho', 'ya_no_aplica')`,
    ),
    check('reminder_texto_presente', sql`length(btrim(${tabla.texto})) > 0`),
    check(
      'reminder_sujeto_valido',
      sql`${tabla.sujeto} is null or ${tabla.sujeto} in ('animal', 'grupo', 'potrero')`,
    ),
    check(
      'reminder_sujeto_coherente',
      sql`(
        (${tabla.sujeto} is null and ${tabla.potreroId} is null)
        or (${tabla.sujeto} = 'potrero' and ${tabla.potreroId} is not null)
        or (${tabla.sujeto} in ('animal', 'grupo') and ${tabla.potreroId} is null)
      )`,
    ),
    check('reminder_version_positiva', sql`${tabla.version} >= 1`),
  ],
)

/** Animales de un pendiente de un animal o de un grupo. Sin llave a `herd`. */
export const animalDePendiente = esquemaJournal.table(
  'reminder_animal',
  {
    pendienteId: uuid('reminder_id')
      .notNull()
      .references(() => pendiente.id, { onDelete: 'restrict' }),
    animalId: uuid('animal_id').notNull(),
    ranchId: uuid('ranch_id').notNull(),
  },
  (tabla) => [
    primaryKey({ columns: [tabla.pendienteId, tabla.animalId] }),
    index('reminder_animal_ranch').on(tabla.ranchId, tabla.animalId),
  ],
)

/** Cada cambio de estado, con el estado que dejó atrás, quién y cuándo. */
export const cambioDeEstado = esquemaJournal.table(
  'reminder_status_change',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    pendienteId: uuid('reminder_id')
      .notNull()
      .references(() => pendiente.id, { onDelete: 'restrict' }),
    estadoAnterior: text('previous_status').notNull(),
    estadoNuevo: text('new_status').notNull(),
    changedBy: text('changed_by').notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('reminder_status_change_pendiente').on(tabla.pendienteId, tabla.changedAt),
    check(
      'reminder_status_change_anterior',
      sql`${tabla.estadoAnterior} in ('pendiente', 'hecho', 'ya_no_aplica')`,
    ),
    check(
      'reminder_status_change_nuevo',
      sql`${tabla.estadoNuevo} in ('pendiente', 'hecho', 'ya_no_aplica')`,
    ),
  ],
)

/** Valor anterior de una corrección de texto, día o sujeto. El estado no va aquí. */
export const correccionDePendiente = esquemaJournal.table(
  'reminder_correction',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    pendienteId: uuid('reminder_id')
      .notNull()
      .references(() => pendiente.id, { onDelete: 'restrict' }),
    campo: text('field').notNull(),
    valorAnterior: text('previous_value'),
    motivo: text('reason').notNull(),
    correctedBy: text('corrected_by').notNull(),
    correctedAt: timestamp('corrected_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('reminder_correction_pendiente').on(tabla.pendienteId, tabla.correctedAt),
    check(
      'reminder_correction_campo_valido',
      sql`${tabla.campo} in ('texto', 'fecha', 'sujeto')`,
    ),
    check('reminder_correction_motivo_presente', sql`length(btrim(${tabla.motivo})) > 0`),
  ],
)
