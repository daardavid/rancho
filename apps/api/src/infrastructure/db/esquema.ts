import { sql } from 'drizzle-orm'
import { check, index, pgSchema, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

/**
 * Esquemas del primer incremento. Las tablas de la ficha viven en
 * `modules/herd/persistence` y las del pesaje en `modules/growth/persistence`.
 * Identity no es un módulo de dominio.
 */
export const esquemaHerd = pgSchema('herd')
export const esquemaGrowth = pgSchema('growth')
export const esquemaIdentity = pgSchema('identity')
/** Metadatos del puerto de archivos. No es un módulo de dominio. */
export const esquemaEvidence = pgSchema('evidence')

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

/**
 * Cuenta técnica de quien entra a la aplicación.
 *
 * No es un actor del rancho: `ReportedBy` no sale de aquí. El `ranch_id` es el
 * rancho sembrado, copiado a la sesión al entrar. El cliente no lo elige.
 * Solo `owner` y `support`; los otros nombres de ADR-010 quedan sin fila.
 */
export const cuenta = esquemaIdentity.table(
  'account',
  {
    id: uuid('id').primaryKey(),
    ranchId: uuid('ranch_id')
      .notNull()
      .references(() => ranch.id),
    usuario: text('usuario').notNull(),
    passwordHash: text('password_hash').notNull(),
    rol: text('rol').notNull(),
    creadoEn: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    uniqueIndex('account_usuario_unique').on(tabla.usuario),
    check('account_rol_valido', sql`${tabla.rol} in ('owner', 'support')`),
  ],
)

/**
 * Sesión opaca. La cookie lleva el token; aquí solo está su huella.
 * `ranch_id` y `rol` viajan en la fila: no se vuelven a pedir al cliente.
 * Cerrar sesión borra la fila. Una fila vencida tampoco autentica.
 */
export const sesion = esquemaIdentity.table(
  'session',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => cuenta.id),
    ranchId: uuid('ranch_id')
      .notNull()
      .references(() => ranch.id),
    rol: text('rol').notNull(),
    tokenHash: text('token_hash').notNull(),
    venceEn: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    creadoEn: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [
    uniqueIndex('session_token_hash_unique').on(tabla.tokenHash),
    check('session_rol_valido', sql`${tabla.rol} in ('owner', 'support')`),
  ],
)

/**
 * Intentos fallidos de entrada, contados por el usuario escrito.
 *
 * Es fila técnica: no lleva `ranch_id` porque el usuario puede no existir y
 * el rechazo no es un hecho del rancho. Sirve para el límite simple de entrada.
 */
export const intentoFallido = esquemaIdentity.table(
  'login_attempt',
  {
    id: uuid('id').primaryKey(),
    usuario: text('usuario').notNull(),
    ocurridoEn: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (tabla) => [index('login_attempt_usuario_ocurrido').on(tabla.usuario, tabla.ocurridoEn)],
)
