import { LARGO_MAXIMO_CONTRASENA, usuarioSchema } from '@rancho/api-contracts'
import { sql } from 'drizzle-orm'
import type { PgliteDatabase } from 'drizzle-orm/pglite'

import { filasDe } from '../db/filas'
import { hashDeContrasena } from '../identity/contrasena'
import { LARGO_MINIMO_CONTRASENA } from '../identity/parametros'

type BaseLocal = PgliteDatabase<Record<string, never>>

export type CuentaNombrada = {
  readonly usuario: string
}

/**
 * Qué cuenta cambia la contraseña.
 *
 * Con una sola no se pregunta. Con varias, `elegida` tiene que ser uno de los
 * usuarios: si no coincide, no se toca ninguna. El orden no inventa una.
 */
export function cuentaParaCambiar(
  cuentas: readonly CuentaNombrada[],
  elegida: string | null,
): string {
  const primera = cuentas[0]
  if (primera === undefined) {
    throw new Error(
      'No hay cuentas en la base local. Corre npm run local para crear la primera. No se cambió ninguna contraseña.',
    )
  }
  if (cuentas.length === 1) {
    return primera.usuario
  }

  const nombre = elegida?.trim() ?? ''
  const encontrada = cuentas.find((cuenta) => cuenta.usuario === nombre)
  if (encontrada === undefined) {
    const lista = cuentas.map((cuenta) => cuenta.usuario).join(', ')
    throw new Error(
      `Hay varias cuentas (${lista}). Indica cuál. No se cambió ninguna contraseña.`,
    )
  }
  return encontrada.usuario
}

/**
 * Cambia la contraseña de una cuenta que ya existe.
 *
 * No crea cuentas y no pide la contraseña anterior: es para quien la olvidó
 * en esta laptop. En la misma transacción cierra las sesiones de esa cuenta
 * (la cookie vieja deja de servir) y borra sus intentos fallidos, que son
 * filas técnicas, no hechos del rancho. Las otras cuentas no se tocan.
 */
export async function cambiarContrasenaDeCuenta(
  db: BaseLocal,
  usuario: string,
  contrasena: string,
): Promise<void> {
  exigirContrasena(contrasena)
  const nombre = usuarioSchema.safeParse(usuario)
  if (!nombre.success) {
    throw new Error('El usuario tiene que ser un texto de 1 a 64 caracteres.')
  }

  const hash = await hashDeContrasena(contrasena)
  try {
    await db.transaction(async (tx) => {
      const filas = filasDe<{ id: string }>(
        await tx.execute(sql`
          SELECT id
          FROM identity.account
          WHERE usuario = ${nombre.data}
        `),
      )
      const id = filas[0]?.id
      if (id === undefined) {
        throw new Error(
          `No hay una cuenta con el usuario «${nombre.data}». No se cambió la contraseña.`,
        )
      }

      await tx.execute(sql`
        UPDATE identity.account
        SET password_hash = ${hash}
        WHERE id = ${id}
      `)
      await tx.execute(sql`
        DELETE FROM identity.session
        WHERE account_id = ${id}
      `)
      await tx.execute(sql`
        DELETE FROM identity.login_attempt
        WHERE usuario = ${nombre.data}
      `)
    })
  } catch (error) {
    throw sinSecreto(error, contrasena)
  }
}

function exigirContrasena(contrasena: string): void {
  if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
    throw new Error(
      `La contraseña tiene que tener al menos ${String(LARGO_MINIMO_CONTRASENA)} caracteres.`,
    )
  }
  if (contrasena.length > LARGO_MAXIMO_CONTRASENA) {
    throw new Error('La contraseña es demasiado larga.')
  }
}

/** Un fallo del motor no debe imprimir la contraseña ni el hash. */
function sinSecreto(error: unknown, contrasena: string): Error {
  if (error instanceof Error && !revelaSecreto(error.message, contrasena)) {
    return error
  }
  return new Error('No se pudo cambiar la contraseña.')
}

function revelaSecreto(texto: string, contrasena: string): boolean {
  return texto.includes(contrasena) || texto.includes('$argon2')
}
