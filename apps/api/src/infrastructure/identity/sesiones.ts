import { rolDeCuentaSchema, usuarioSchema, type RolDeCuenta } from '@rancho/api-contracts'
import { sql } from 'drizzle-orm'

import { recordedBySchema, type RecordedBy } from '../../shared-kernel/actores'
import { nuevoId, ranchIdSchema, type RanchId } from '../../shared-kernel/ids'
import { filasDe, type EjecutorSql } from '../db/filas'
import { contrasenaCoincide, hashDeRelleno } from './contrasena'
import { buscarCuentaPorUsuario, type CuentaCargada } from './cuentas'
import { esperarHasta, segundosDeEspera, type Fallos } from './limite'
import {
  DURACION_DE_SESION_MS,
  VENTANA_DE_INTENTOS_MS,
} from './parametros'
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
  | { readonly tipo: 'esperar'; readonly segundos: number }

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
 *
 * `direccion` es la IP desde la que llega el intento. Se guarda con cada fallo
 * para poder esperar por pareja usuario + IP sin cerrarle la puerta al
 * propietario que entra desde otro aparato. Es un dato técnico del intento, no
 * del rancho.
 *
 * `secreto` es el de la instalación (`SESSION_SECRET`): con él se calcula la
 * huella que se guarda. Sin secreto no se abre ni se resuelve ninguna sesión,
 * porque una huella sin secreto se podría fabricar con solo leer la base.
 */
export async function iniciarSesion(
  db: EjecutorSql,
  secreto: string,
  entrada: { usuario: string; contrasena: string },
  direccion: string,
  ahora: Date = new Date(),
): Promise<ResultadoDeInicio> {
  const usuario = usuarioSchema.parse(entrada.usuario)

  const castigo = esperarHasta(await fallosRecientes(db, usuario, direccion, ahora))
  if (castigo !== null && castigo.getTime() > ahora.getTime()) {
    return { tipo: 'esperar', segundos: segundosDeEspera(castigo, ahora) }
  }

  const cuenta = await buscarCuentaPorUsuario(db, usuario)
  const hash = cuenta?.passwordHash ?? (await hashDeRelleno())
  const coincide = await contrasenaCoincide(hash, entrada.contrasena)
  if (cuenta === null || !coincide) {
    await registrarIntento(db, usuario, direccion, ahora)
    return { tipo: 'credenciales_invalidas' }
  }

  // Un ingreso bueno olvida lo que esta IP falló con este usuario; lo que falló
  // con otros nombres se queda y se vence solo.
  await olvidarIntentos(db, usuario, direccion)
  const token = nuevoTokenDeSesion()
  const sesion = await guardarSesion(db, secreto, cuenta, token, ahora)
  return { tipo: 'ok', token, sesion }
}

export async function cerrarSesion(db: EjecutorSql, secreto: string, token: string): Promise<void> {
  if (token === '') {
    return
  }

  await db.execute(sql`
    DELETE FROM identity.session
    WHERE token_hash = ${huellaDeToken(token, secreto)}
  `)
}

export async function resolverSesion(
  db: EjecutorSql,
  secreto: string,
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
      WHERE token_hash = ${huellaDeToken(token, secreto)}
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

/**
 * Los fallos que todavía cuentan para la espera.
 *
 * De paso tira los de fuera de la ventana: son filas técnicas, no historia del
 * rancho, y sin este barrido crecerían sin fin.
 */
async function fallosRecientes(
  db: EjecutorSql,
  usuario: string,
  direccion: string,
  ahora: Date,
): Promise<Fallos> {
  const desde = new Date(ahora.getTime() - VENTANA_DE_INTENTOS_MS)
  await db.execute(sql`
    DELETE FROM identity.login_attempt
    WHERE occurred_at <= ${desde}
  `)

  const filas = filasDe<{
    del_usuario_en_esta_direccion: unknown
    de_esta_direccion: unknown
    ultimo: unknown
  }>(
    await db.execute(sql`
      SELECT
        COUNT(*) FILTER (
          WHERE usuario = ${usuario} AND direccion = ${direccion}
        )::int AS del_usuario_en_esta_direccion,
        COUNT(*)::int AS de_esta_direccion,
        MAX(occurred_at) AS ultimo
      FROM identity.login_attempt
      WHERE direccion = ${direccion}
        AND occurred_at > ${desde}
    `),
  )
  const fila = filas[0]
  return {
    delUsuarioEnEstaDireccion: numero(fila?.del_usuario_en_esta_direccion),
    deEstaDireccion: numero(fila?.de_esta_direccion),
    ultimoFallo: instante(fila?.ultimo),
  }
}

async function registrarIntento(
  db: EjecutorSql,
  usuario: string,
  direccion: string,
  ahora: Date,
): Promise<void> {
  await db.execute(sql`
    INSERT INTO identity.login_attempt (id, usuario, direccion, occurred_at)
    VALUES (${nuevoId()}, ${usuario}, ${direccion}, ${ahora})
  `)
}

async function olvidarIntentos(
  db: EjecutorSql,
  usuario: string,
  direccion: string,
): Promise<void> {
  await db.execute(sql`
    DELETE FROM identity.login_attempt
    WHERE usuario = ${usuario} AND direccion = ${direccion}
  `)
}

async function guardarSesion(
  db: EjecutorSql,
  secreto: string,
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
      ${huellaDeToken(token, secreto)},
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

/** Un contador que el driver no devuelva como número se lee como cero, no como bloqueo. */
function numero(valor: unknown): number {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : 0
  }
  if (typeof valor === 'string') {
    const leido = Number(valor)
    return Number.isFinite(leido) ? leido : 0
  }
  return 0
}
