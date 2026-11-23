import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { esquemaHerd } from '../../../infrastructure/db/esquema'

/**
 * Ficha del animal. `ranch_id` es el alcance; no hay llave a `identity.ranch`
 * porque Herd no depende de Identity hacia arriba. No hay columna numérica de
 * participación: «a la parte» no se convierte en un porcentaje.
 */
export const animal = esquemaHerd.table(
  'animal',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    nombre: text('name'),
    sexo: text('sex').notNull(),
    categoria: text('category').notNull(),
    detalleCategoria: text('category_detail'),
    tenencia: text('tenure').notNull(),
    participacionEconomica: text('economic_participation').notNull(),
    notaDelArreglo: text('arrangement_note'),
    nota: text('note'),
    activo: boolean('active').notNull(),
    version: integer('version').notNull(),
    recordedBy: text('recorded_by').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('animal_ranch_activo').on(tabla.ranchId, tabla.activo),
    check('animal_sexo_valido', sql`${tabla.sexo} in ('female', 'male', 'unknown')`),
    check(
      'animal_categoria_valida',
      sql`${tabla.categoria} in ('calf', 'cow', 'bull', 'other', 'unknown')`,
    ),
    check(
      'animal_tenencia_valida',
      sql`${tabla.tenencia} in ('ranch', 'a_la_parte', 'third_party', 'unknown')`,
    ),
    check(
      'animal_participacion_valida',
      sql`${tabla.participacionEconomica} in ('known', 'partially_known', 'unknown')`,
    ),
    check(
      'animal_detalle_solo_en_other',
      sql`${tabla.detalleCategoria} is null or ${tabla.categoria} = 'other'`,
    ),
    check('animal_version_positiva', sql`${tabla.version} >= 1`),
    check(
      'animal_nombre_presente',
      sql`${tabla.nombre} is null or length(btrim(${tabla.nombre})) > 0`,
    ),
    check(
      'animal_nota_arreglo_presente',
      sql`${tabla.notaDelArreglo} is null or length(btrim(${tabla.notaDelArreglo})) > 0`,
    ),
    check('animal_nota_presente', sql`${tabla.nota} is null or length(btrim(${tabla.nota})) > 0`),
  ],
)

/**
 * Valor anterior de una corrección de ficha. Una fila por campo que cambió,
 * con quién, cuándo y por qué. El id del animal no se guarda aquí como dato
 * corregible: no cambia.
 */
export const correccionDeAnimal = esquemaHerd.table(
  'animal_correction',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    animalId: uuid('animal_id')
      .notNull()
      .references(() => animal.id, { onDelete: 'restrict' }),
    campo: text('field').notNull(),
    valorAnterior: text('previous_value'),
    motivo: text('reason').notNull(),
    correctedBy: text('corrected_by').notNull(),
    correctedAt: timestamp('corrected_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('animal_correction_animal').on(tabla.animalId, tabla.correctedAt),
    check(
      'animal_correction_campo_valido',
      sql`${tabla.campo} in ('nombre', 'sexo', 'categoria', 'detalleCategoria', 'tenencia', 'participacionEconomica', 'notaDelArreglo', 'nota')`,
    ),
    check('animal_correction_motivo_presente', sql`length(btrim(${tabla.motivo})) > 0`),
  ],
)

/**
 * Marca hermana de la ficha. `replaced` y `lost` siguen en la tabla: una marca
 * anterior todavía encuentra al animal. Dos SINIIGA vigentes con el mismo
 * valor no caben en el mismo rancho.
 */
export const marcaDeAnimal = esquemaHerd.table(
  'animal_mark',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    animalId: uuid('animal_id')
      .notNull()
      .references(() => animal.id, { onDelete: 'restrict' }),
    tipo: text('type').notNull(),
    valor: text('value').notNull(),
    desde: date('valid_from', { mode: 'string' }),
    estado: text('status').notNull(),
    cambiadaEl: date('changed_on', { mode: 'string' }),
    recordedBy: text('recorded_by').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('animal_mark_ranch_valor').on(tabla.ranchId, tabla.valor),
    index('animal_mark_animal').on(tabla.animalId),
    uniqueIndex('animal_mark_siniiga_activa')
      .on(tabla.ranchId, tabla.valor)
      .where(sql`${tabla.tipo} = 'siniiga' and ${tabla.estado} = 'active'`),
    check('animal_mark_tipo_valido', sql`${tabla.tipo} in ('siniiga', 'other')`),
    check('animal_mark_estado_valido', sql`${tabla.estado} in ('active', 'replaced', 'lost')`),
    check('animal_mark_valor_presente', sql`length(btrim(${tabla.valor})) > 0`),
    check(
      'animal_mark_vigente_sin_cierre',
      sql`${tabla.estado} <> 'active' or ${tabla.cambiadaEl} is null`,
    ),
  ],
)
