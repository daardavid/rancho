import { rolDeCuentaSchema, usuarioSchema, type RolDeCuenta } from '@rancho/api-contracts'
import { sql } from 'drizzle-orm'

import { recordedBySchema, type RecordedBy } from '../../shared-kernel/actores'
import { nuevoId, ranchIdSchema, type RanchId } from '../../shared-kernel/ids'
import { filasDe, type EjecutorSql } from '../db/filas'
import { contrasenaCoincide, hashDeRelleno } from './contrasena'
import { buscarCuentaPorUsuario, type CuentaCargada } from './cuentas'
import { DURACION_DE_SESION_MS, MAX_INTENTOS_FALLIDOS, VENTANA_DE_INTENTOS_MS } from './parametros'
import { huellaDeToken, nuevoTokenDeSesion } from './tokens'

export type SesionActiva = {
  readonly cuentaId: string
  readonly ranchId: RanchId
  readonly rol: RolDeCuenta
  readonly recordedBy: RecordedBy
}

export type ResultadoDeInicio =
  | { readonly tipo: 'ok'; readonly token: string; readonly sesion: SesionActiva }
  | { readonly tipo: 'credenciales_invalidas' }
  | { readonly tipo: 'demasiados_intentos' }

type FilaSesion = {
  id: string
  account_id: string
  ranch_id: string
  rol: string
  expires_at: unknown
}

/**
 * Abre una sesión para la cuenta del usuario.
 *
 * El rancho y el rol salen de la fila de la cuenta, nunca del que llama.
 * Un usuario que no existe y una contraseña mal puesta responden igual.
 */
export async function iniciarSesion(
  db: EjecutorSql,
  entrada: { usuario: string; contrasena: string },
  ahora: Date = new Date(),
): Promise<ResultadoDeInicio> {
  const usuario = usuarioSchema.parse(entrada.usuario)

  if ((await intentosRecientes(db, usuario, ahora)) >= MAX_INTENTOS_FALLIDOS) {
    return { tipo: 'demasiados_intentos' }
  }

  const cuenta = await buscarCuentaPorUsuario(db, usuario)
  const hash = cuenta?.passwordHash ?? (await hashDeRelleno())
  const coincide = await contrasenaCoincide(hash, entrada.contrasena)
  if (cuenta === null || !coincide) {
    await registrarIntento(db, usuario, ahora)
    return { tipo: 'credenciales_invalidas' }
  }

  await olvidarIntentos(db, usuario)
  const token = nuevoTokenDeSesion()
  const sesion = await guardarSesion(db, cuenta, token, ahora)
  return { tipo: 'ok', token, sesion }
}

export async function cerrarSesion(db: EjecutorSql, token: string): Promise<void> {
  if (token === '') {
    return
  }

  await db.execute(sql`
    DELETE FROM identity.session
    WHERE token_hash = ${huellaDeToken(token)}
  `)
}

export async function resolverSesion(
  db: EjecutorSql,
  token: string,
  ahora: Date = new Date(),
): Promise<SesionActiva | null> {
  if (token === '') {
    return null
  }

  const filas = filasDe<FilaSesion>(
    await db.execute(sql`
      SELECT id, account_id, ranch_id, rol, expires_at
      FROM identity.session
      WHERE token_hash = ${huellaDeToken(token)}
    `),
  )
  const fila = filas[0]
  if (fila === undefined) {
    return null
  }

  const vence = instante(fila.expires_at)
  if (vence === null || vence.getTime() <= ahora.getTime()) {
    await db.execute(sql`DELETE FROM identity.session WHERE id = ${fila.id}`)
    return null
  }

  return sesionDesde(fila)
}

async function intentosRecientes(db: EjecutorSql, usuario: string, ahora: Date): Promise<number> {
  const desde = new Date(ahora.getTime() - VENTANA_DE_INTENTOS_MS)
  await db.execute(sql`
    DELETE FROM identity.login_attempt
    WHERE occurred_at <= ${desde}
  `)
  const filas = filasDe<{ total: unknown }>(
    await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM identity.login_attempt
      WHERE usuario = ${usuario}
        AND occurred_at > ${desde}
    `),
  )
  const total = filas[0]?.total
  const numero = typeof total === 'number' ? total : Number(total)
  if (!Number.isFinite(numero)) {
    return MAX_INTENTOS_FALLIDOS
  }
  return numero
}

async function registrarIntento(db: EjecutorSql, usuario: string, ahora: Date): Promise<void> {
  await db.execute(sql`
    INSERT INTO identity.login_attempt (id, usuario, occurred_at)
    VALUES (${nuevoId()}, ${usuario}, ${ahora})
  `)
}

async function olvidarIntentos(db: EjecutorSql, usuario: string): Promise<void> {
  await db.execute(sql`
    DELETE FROM identity.login_attempt
    WHERE usuario = ${usuario}
  `)
}

async function guardarSesion(
  db: EjecutorSql,
  cuenta: CuentaCargada,
  token: string,
  ahora: Date,
): Promise<SesionActiva> {
  const id = nuevoId()
  const vence = new Date(ahora.getTime() + DURACION_DE_SESION_MS)
  await db.execute(sql`
    INSERT INTO identity.session (
      id, account_id, ranch_id, rol, token_hash, expires_at, created_at
    )
    VALUES (
      ${id},
      ${cuenta.id},
      ${cuenta.ranchId},
      ${cuenta.rol},
      ${huellaDeToken(token)},
      ${vence},
      ${ahora}
    )
  `)

  return {
    cuentaId: cuenta.id,
    ranchId: cuenta.ranchId,
    rol: cuenta.rol,
    recordedBy: recordedBySchema.parse(cuenta.id),
  }
}

function sesionDesde(fila: FilaSesion): SesionActiva | null {
  const rol = rolDeCuentaSchema.safeParse(fila.rol)
  const ranchId = ranchIdSchema.safeParse(fila.ranch_id)
  const recordedBy = recordedBySchema.safeParse(fila.account_id)
  if (!rol.success || !ranchId.success || !recordedBy.success) {
    return null
  }

  return {
    cuentaId: fila.account_id,
    ranchId: ranchId.data,
    rol: rol.data,
    recordedBy: recordedBy.data,
  }
}

function instante(valor: unknown): Date | null {
  if (valor instanceof Date) {
    return valor
  }
  if (typeof valor === 'string' || typeof valor === 'number') {
    const fecha = new Date(valor)
    return Number.isNaN(fecha.getTime()) ? null : fecha
  }
  return null
}
