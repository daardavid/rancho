import { pgSchema, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Esquemas del primer incremento. Herd y Growth se crean vacíos: las tablas de
 * animales y de pesos llegan en sus tareas. Identity no es un módulo de dominio.
 */
export const esquemaHerd = pgSchema('herd')
export const esquemaGrowth = pgSchema('growth')
export const esquemaIdentity = pgSchema('identity')

/** El único rancho de la instalación. La semilla lo crea; no es un agregado de Herd. */
export const ranch = esquemaIdentity.table('ranch', {
  id: uuid('id').primaryKey(),
  nombre: text('nombre').notNull(),
  creadoEn: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
})

/**
 * Recibo técnico de un comando.
 *
 * No es un hecho del rancho ni lleva `ranch_id`: correlaciona un id de comando
 * con la huella de su contenido y el resultado ya guardado, para reintentar sin
 * duplicar. El diario de migraciones es el otro ejemplo de fila técnica.
 */
export const reciboDeComando = pgTable('command_idempotency', {
  commandId: uuid('command_id').primaryKey(),
  huella: text('fingerprint').notNull(),
  resultado: text('result').notNull(),
  creadoEn: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
})
