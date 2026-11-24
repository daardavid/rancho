import { hash, verify } from '@node-rs/argon2'

/**
 * Argon2id con los parámetros que la librería documenta como recomendación
 * (19 MiB, 2 pasadas, 1 hilo). No se pasa el algoritmo: el de la librería ya
 * es Argon2id, y su `const enum` no se puede importar con verbatimModuleSyntax.
 * El hash sale en el formato de la librería; la prueba mira el prefijo `$argon2id$`.
 */
const OPCIONES = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const

export async function hashDeContrasena(contrasena: string): Promise<string> {
  return hash(contrasena, OPCIONES)
}

export async function contrasenaCoincide(hashGuardado: string, contrasena: string): Promise<boolean> {
  try {
    return await verify(hashGuardado, contrasena)
  } catch {
    return false
  }
}

let relleno: Promise<string> | undefined

/**
 * Hash de una contraseña que nadie eligió, para verificar igual cuando el
 * usuario no existe. Así el tiempo no dice si la cuenta está o no.
 */
export function hashDeRelleno(): Promise<string> {
  relleno ??= hashDeContrasena(`relleno-${crypto.randomUUID()}`)
  return relleno
}
