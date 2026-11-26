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
    motivoSalida: text('exit_reason'),
    fechaSalida: date('exit_known_on', { mode: 'string' }),
    notaSalida: text('exit_note'),
    evidenciaSalida: uuid('exit_evidence_id'),
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
    check(
      'animal_detalle_presente',
      sql`${tabla.detalleCategoria} is null or length(btrim(${tabla.detalleCategoria})) > 0`,
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
    check(
      'animal_motivo_salida',
      sql`${tabla.motivoSalida} is null or ${tabla.motivoSalida} in ('sale', 'death', 'confirmed_missing', 'other', 'unknown')`,
    ),
    check(
      'animal_nota_salida_presente',
      sql`${tabla.notaSalida} is null or length(btrim(${tabla.notaSalida})) > 0`,
    ),
    check(
      'animal_salida_coherente',
      sql`(
        ${tabla.activo} = true
        and ${tabla.motivoSalida} is null
        and ${tabla.fechaSalida} is null
        and ${tabla.notaSalida} is null
        and ${tabla.evidenciaSalida} is null
      ) or (
        ${tabla.activo} = false
        and ${tabla.motivoSalida} is not null
        and ${tabla.fechaSalida} is not null
      )`,
    ),
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
 * Salida anterior, cuando se corrige. Una fila por corrección, con el motivo
 * que tenía, el día en que se supo, la nota, la foto, quién corrigió, cuándo
 * y por qué. No se borra al volver a activo.
 */
export const correccionDeSalida = esquemaHerd.table(
  'animal_exit_correction',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    animalId: uuid('animal_id')
      .notNull()
      .references(() => animal.id, { onDelete: 'restrict' }),
    motivoAnterior: text('previous_reason').notNull(),
    fechaAnterior: date('previous_known_on', { mode: 'string' }).notNull(),
    notaAnterior: text('previous_note'),
    evidenciaAnterior: uuid('previous_evidence_id'),
    motivo: text('reason').notNull(),
    correctedBy: text('corrected_by').notNull(),
    correctedAt: timestamp('corrected_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('animal_exit_correction_animal').on(tabla.animalId, tabla.correctedAt),
    check(
      'animal_exit_correction_motivo_anterior',
      sql`${tabla.motivoAnterior} in ('sale', 'death', 'confirmed_missing', 'other', 'unknown')`,
    ),
    check('animal_exit_correction_motivo', sql`length(btrim(${tabla.motivo})) > 0`),
    check(
      'animal_exit_correction_nota',
      sql`${tabla.notaAnterior} is null or length(btrim(${tabla.notaAnterior})) > 0`,
    ),
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

/**
 * Filiación vigente de una cría. Hermana de `animal`: no hay madre ni padre en
 * la ficha. La fecha de nacimiento, exacta o aproximada, es del parto.
 */
export const filiacion = esquemaHerd.table(
  'parentage_record',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    criaId: uuid('offspring_id')
      .notNull()
      .references(() => animal.id, { onDelete: 'restrict' }),
    certezaMadre: text('dam_certainty').notNull(),
    madreId: uuid('dam_id').references(() => animal.id, { onDelete: 'restrict' }),
    motivoMadre: text('dam_reason'),
    certezaPadre: text('sire_certainty').notNull(),
    padreId: uuid('sire_id').references(() => animal.id, { onDelete: 'restrict' }),
    motivoPadre: text('sire_reason'),
    nota: text('note'),
    fechaNacimiento: date('birth_date', { mode: 'string' }),
    precisionFecha: text('birth_date_precision'),
    version: integer('version').notNull(),
    recordedBy: text('recorded_by').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    uniqueIndex('parentage_offspring').on(tabla.criaId),
    index('parentage_ranch_dam').on(tabla.ranchId, tabla.madreId),
    index('parentage_ranch_sire').on(tabla.ranchId, tabla.padreId),
    check(
      'parentage_dam_certainty',
      sql`${tabla.certezaMadre} in ('observed', 'inferred', 'unknown')`,
    ),
    check(
      'parentage_sire_certainty',
      sql`${tabla.certezaPadre} in ('observed', 'inferred', 'unknown')`,
    ),
    check(
      'parentage_dam_unknown_id',
      sql`(${tabla.certezaMadre} = 'unknown') = (${tabla.madreId} is null)`,
    ),
    check(
      'parentage_sire_unknown_id',
      sql`(${tabla.certezaPadre} = 'unknown') = (${tabla.padreId} is null)`,
    ),
    check(
      'parentage_dam_inferred_reason',
      sql`(${tabla.certezaMadre} = 'inferred') = (${tabla.motivoMadre} is not null)`,
    ),
    check(
      'parentage_sire_inferred_reason',
      sql`(${tabla.certezaPadre} = 'inferred') = (${tabla.motivoPadre} is not null)`,
    ),
    check(
      'parentage_dam_reason_valida',
      sql`${tabla.motivoMadre} is null or ${tabla.motivoMadre} in ('parto_visto', 'dicho_de_trabajador', 'otro')`,
    ),
    check(
      'parentage_sire_reason_valida',
      sql`${tabla.motivoPadre} is null or ${tabla.motivoPadre} in ('parto_visto', 'dicho_de_trabajador', 'unico_toro', 'otro')`,
    ),
    check(
      'parentage_birth_date_pair',
      sql`(${tabla.fechaNacimiento} is null) = (${tabla.precisionFecha} is null)`,
    ),
    check(
      'parentage_birth_precision',
      sql`${tabla.precisionFecha} is null or ${tabla.precisionFecha} in ('exact', 'approximate')`,
    ),
    check('parentage_version_positiva', sql`${tabla.version} >= 1`),
    check(
      'parentage_note_presente',
      sql`${tabla.nota} is null or length(btrim(${tabla.nota})) > 0`,
    ),
    check(
      'parentage_not_self_dam',
      sql`${tabla.madreId} is null or ${tabla.madreId} <> ${tabla.criaId}`,
    ),
    check(
      'parentage_not_self_sire',
      sql`${tabla.padreId} is null or ${tabla.padreId} <> ${tabla.criaId}`,
    ),
    check(
      'parentage_parents_differ',
      sql`${tabla.madreId} is null or ${tabla.padreId} is null or ${tabla.madreId} <> ${tabla.padreId}`,
    ),
  ],
)

/**
 * Potrero: una referencia viva del rancho, no un agregado de tierra.
 *
 * No hay hectáreas, carga animal, agua, pasto, arrendamiento ni geometría: eso
 * no está aceptado (`docs/architecture/domain-boundaries.md`, «Paddock
 * reference and expected location»). El nombre puede faltar: el potrero se
 * identifica por su id aunque el rancho todavía no le ponga nombre.
 */
export const potrero = esquemaHerd.table(
  'paddock',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    nombre: text('name'),
    nota: text('note'),
    version: integer('version').notNull(),
    recordedBy: text('recorded_by').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('paddock_ranch').on(tabla.ranchId),
    check('paddock_version_positiva', sql`${tabla.version} >= 1`),
    check('paddock_nombre_presente', sql`${tabla.nombre} is null or length(btrim(${tabla.nombre})) > 0`),
    check('paddock_nota_presente', sql`${tabla.nota} is null or length(btrim(${tabla.nota})) > 0`),
  ],
)

/**
 * Nombre o nota anteriores del potrero. Una fila por campo que cambió, con
 * quién, cuándo y por qué. Renombrar no borra cómo se llamaba.
 */
export const correccionDePotrero = esquemaHerd.table(
  'paddock_correction',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    potreroId: uuid('paddock_id')
      .notNull()
      .references(() => potrero.id, { onDelete: 'restrict' }),
    campo: text('field').notNull(),
    valorAnterior: text('previous_value'),
    motivo: text('reason').notNull(),
    correctedBy: text('corrected_by').notNull(),
    correctedAt: timestamp('corrected_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('paddock_correction_potrero').on(tabla.potreroId, tabla.correctedAt),
    check('paddock_correction_campo_valido', sql`${tabla.campo} in ('nombre', 'nota')`),
    check('paddock_correction_motivo_presente', sql`length(btrim(${tabla.motivo})) > 0`),
  ],
)

/**
 * Dónde se espera a un animal desde un día. Se agrega y no se edita: el lugar
 * vigente es la última asignación.
 *
 * `paddock_id` nulo es «no sé»: una asignación desconocida es un hecho, no la
 * falta de una asignación. No es una observación del animal y no toca ninguna
 * tabla de crecimiento.
 *
 * `reported_by` es quién lo dijo (`TGT-MOVE-001`: «Evidencia que produce: quién
 * lo dijo»). Es texto libre, no una cuenta: el trabajador que avisó del
 * movimiento no es un usuario de la app. `recorded_by` es otra cosa y se queda
 * aparte.
 */
export const asignacionDeLugar = esquemaHerd.table(
  'location_assignment',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    animalId: uuid('animal_id')
      .notNull()
      .references(() => animal.id, { onDelete: 'restrict' }),
    potreroId: uuid('paddock_id').references(() => potrero.id, { onDelete: 'restrict' }),
    desde: date('valid_from', { mode: 'string' }).notNull(),
    nota: text('note'),
    reportedBy: text('reported_by'),
    recordedBy: text('recorded_by').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('location_assignment_animal').on(tabla.animalId, tabla.desde),
    index('location_assignment_ranch_potrero').on(tabla.ranchId, tabla.potreroId),
    check('location_assignment_nota_presente', sql`${tabla.nota} is null or length(btrim(${tabla.nota})) > 0`),
    check(
      'location_assignment_reported_presente',
      sql`${tabla.reportedBy} is null or length(btrim(${tabla.reportedBy})) > 0`,
    ),
  ],
)

/**
 * Certeza anterior de una corrección de filiación. Una fila por corrección,
 * con quién, cuándo y por qué. La ficha del animal no se toca.
 */export const correccionDeFiliacion = esquemaHerd.table(
  'parentage_correction',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    filiacionId: uuid('parentage_id')
      .notNull()
      .references(() => filiacion.id, { onDelete: 'restrict' }),
    criaId: uuid('offspring_id')
      .notNull()
      .references(() => animal.id, { onDelete: 'restrict' }),
    certezaMadre: text('previous_dam_certainty').notNull(),
    madreId: uuid('previous_dam_id'),
    motivoMadre: text('previous_dam_reason'),
    certezaPadre: text('previous_sire_certainty').notNull(),
    padreId: uuid('previous_sire_id'),
    motivoPadre: text('previous_sire_reason'),
    nota: text('previous_note'),
    fechaNacimiento: date('previous_birth_date', { mode: 'string' }),
    precisionFecha: text('previous_birth_date_precision'),
    motivo: text('reason').notNull(),
    correctedBy: text('corrected_by').notNull(),
    correctedAt: timestamp('corrected_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('parentage_correction_record').on(tabla.filiacionId, tabla.correctedAt),
    check('parentage_correction_motivo', sql`length(btrim(${tabla.motivo})) > 0`),
    check(
      'parentage_correction_dam_certainty',
      sql`${tabla.certezaMadre} in ('observed', 'inferred', 'unknown')`,
    ),
    check(
      'parentage_correction_sire_certainty',
      sql`${tabla.certezaPadre} in ('observed', 'inferred', 'unknown')`,
    ),
  ],
)

/**
 * Nota de sanidad de un animal. Hermana de la ficha: no hay nota en columnas de
 * `Animal`, y una nota a un grupo es una fila por animal, no un tipo «grupo».
 *
 * No hay calendario, dosis, retiro ni veterinario: eso no está aceptado
 * (`OQ-HEALTH-001`, [domain-boundaries](../../../../../../docs/architecture/domain-boundaries.md),
 * «Health, inside Herd»). `saw_animal` es explícito: `true` se vio, `false` no
 * se vio y `null` es «No sé». No hay omisión ni valor por defecto. Una nota
 * no es un avistamiento salvo que diga que sí se vio.
 *
 * `evidence_id` es el id de `evidence.file`, sin llave foránea: Herd no escribe
 * esa tabla y no guarda una ruta.
 */
export const notaDeSalud = esquemaHerd.table(
  'health_event',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    animalId: uuid('animal_id')
      .notNull()
      .references(() => animal.id, { onDelete: 'restrict' }),
    tipo: text('type').notNull(),
    detalle: text('detail').notNull(),
    fecha: date('occurred_on', { mode: 'string' }).notNull(),
    producto: text('product'),
    evidenciaId: uuid('evidence_id'),
    vioAlAnimal: boolean('saw_animal'),
    version: integer('version').notNull(),
    recordedBy: text('recorded_by').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('health_event_animal').on(tabla.animalId, tabla.fecha),
    index('health_event_ranch_fecha').on(tabla.ranchId, tabla.fecha),
    check(
      'health_event_tipo_valido',
      sql`${tabla.tipo} in ('vacuna', 'medicamento', 'bano', 'problema', 'otro')`,
    ),
    check('health_event_detalle_presente', sql`length(btrim(${tabla.detalle})) > 0`),
    check(
      'health_event_producto_presente',
      sql`${tabla.producto} is null or length(btrim(${tabla.producto})) > 0`,
    ),
    check('health_event_version_positiva', sql`${tabla.version} >= 1`),
  ],
)

/**
 * Valor anterior de una corrección de nota. Una fila por campo que cambió, con
 * quién, cuándo y por qué. Corregir no borra la nota: agrega historia.
 */
export const correccionDeNotaDeSalud = esquemaHerd.table(
  'health_event_correction',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id').notNull(),
    notaId: uuid('health_event_id')
      .notNull()
      .references(() => notaDeSalud.id, { onDelete: 'restrict' }),
    campo: text('field').notNull(),
    valorAnterior: text('previous_value'),
    motivo: text('reason').notNull(),
    correctedBy: text('corrected_by').notNull(),
    correctedAt: timestamp('corrected_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    index('health_event_correction_nota').on(tabla.notaId, tabla.correctedAt),
    check(
      'health_event_correction_campo_valido',
      sql`${tabla.campo} in ('tipo', 'detalle', 'fecha', 'producto', 'evidencia', 'vioAlAnimal')`,
    ),
    check('health_event_correction_motivo_presente', sql`length(btrim(${tabla.motivo})) > 0`),
  ],
)
