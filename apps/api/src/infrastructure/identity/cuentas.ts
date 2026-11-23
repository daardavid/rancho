import {
  LARGO_MAXIMO_CONTRASENA,
  rolDeCuentaSchema,
  usuarioSchema,
  type RolDeCuenta,
} from '@rancho/api-contracts'
import { sql } from 'drizzle-orm'

import { nuevoId, ranchIdSchema, type RanchId } from '../../shared-kernel/ids'
import { filasDe, type EjecutorSql } from '../db/filas'
import { hashDeContrasena } from './contrasena'
import { LARGO_MINIMO_CONTRASENA } from './parametros'

export type MotivoDeRechazo =
  | 'sin_rancho'
  | 'usuario_duplicado'
  | 'rol_no_permitido'
  | 'contrasena_corta'
  | 'contrasena_larga'
  | 'usuario_invalido'

export class NoSePudoCrearLaCuenta extends Error {
  readonly motivo: MotivoDeRechazo

  constructor(motivo: MotivoDeRechazo, mensaje: string) {
    super(mensaje)
    this.name = 'NoSePudoCrearLaCuenta'
    this.motivo = motivo
  }
}

export type CuentaCreada = {
  readonly id: string
  readonly ranchId: RanchId
  readonly rol: RolDeCuenta
}

export type CuentaCargada = {
  readonly id: string
  readonly ranchId: RanchId
  readonly rol: RolDeCuenta
  readonly passwordHash: string
}

type FilaCuenta = {
  id: string
  ranch_id: string
  password_hash: string
  rol: string
}

/**
 * Crea la cuenta del rancho que ya sembró `db:seed`.
 *
 * No abre un registro público y no inventa un rancho si la semilla no corrió.
 * Si el usuario ya existe, no toca la contraseña.
 */
export async function crearCuenta(
  db: EjecutorSql,
  entrada: { rol: string; usuario: string; contrasena: string },
): Promise<CuentaCreada> {
  const rol = rolDeCuentaSchema.safeParse(entrada.rol)
  if (!rol.success) {
    throw new NoSePudoCrearLaCuenta(
      'rol_no_permitido',
      `El rol «${entrada.rol}» no se crea. Solo owner y support. worker, veterinarian y partner-readonly quedan reservados.`,
    )
  }

  const usuario = usuarioSchema.safeParse(entrada.usuario)
  if (!usuario.success) {
    throw new NoSePudoCrearLaCuenta(
      'usuario_invalido',
      'El usuario tiene que ser un texto de 1 a 64 caracteres.',
    )
  }

  if (entrada.contrasena.length < LARGO_MINIMO_CONTRASENA) {
    throw new NoSePudoCrearLaCuenta(
      'contrasena_corta',
      `La contraseña tiene que tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
    )
  }
  if (entrada.contrasena.length > LARGO_MAXIMO_CONTRASENA) {
    throw new NoSePudoCrearLaCuenta('contrasena_larga', 'La contraseña es demasiado larga.')
  }

  const ranchId = await ranchoSembrado(db)
  const passwordHash = await hashDeContrasena(entrada.contrasena)
  const id = nuevoId()

  try {
    await db.execute(sql`
      INSERT INTO identity.account (id, ranch_id, usuario, password_hash, rol, created_at)
      VALUES (${id}, ${ranchId}, ${usuario.data}, ${passwordHash}, ${rol.data}, ${new Date()})
    `)
  } catch (error) {
    if (esUsuarioDuplicado(error)) {
      throw new NoSePudoCrearLaCuenta(
        'usuario_duplicado',
        'Ya existe una cuenta con ese usuario. No se cambió la contraseña.',
      )
    }
    throw error
  }

  return { id, ranchId, rol: rol.data }
}

export async function buscarCuentaPorUsuario(
  db: EjecutorSql,
  usuario: string,
): Promise<CuentaCargada | null> {
  const filas = filasDe<FilaCuenta>(
    await db.execute(sql`
      SELECT id, ranch_id, password_hash, rol
      FROM identity.account
      WHERE usuario = ${usuario}
    `),
  )
  const fila = filas[0]
  if (fila === undefined) {
    return null
  }

  const rol = rolDeCuentaSchema.safeParse(fila.rol)
  const ranchId = ranchIdSchema.safeParse(fila.ranch_id)
  if (!rol.success || !ranchId.success) {
    return null
  }

  return {
    id: fila.id,
    ranchId: ranchId.data,
    rol: rol.data,
    passwordHash: fila.password_hash,
  }
}

async function ranchoSembrado(db: EjecutorSql): Promise<RanchId> {
  const filas = filasDe<{ id: string }>(
    await db.execute(sql`
      SELECT id
      FROM identity.ranch
      ORDER BY created_at
      LIMIT 1
    `),
  )
  const fila = filas[0]
  if (fila === undefined) {
    throw new NoSePudoCrearLaCuenta(
      'sin_rancho',
      'No hay un rancho sembrado. La cuenta no inventa uno; primero corre la semilla.',
    )
  }

  return ranchIdSchema.parse(fila.id)
}

function esUsuarioDuplicado(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    if ('code' in error && error.code === '23505') {
      return true
    }
    if ('cause' in error && esUsuarioDuplicado(error.cause)) {
      return true
    }
  }

  const texto = error instanceof Error ? error.message : String(error)
  return texto.includes('account_usuario_unique') || texto.includes('duplicate key')
}
