import { createHash, randomBytes } from 'node:crypto'

/** Token opaco de la cookie. 32 bytes salen de `crypto`, no de un generador propio. */
export function nuevoTokenDeSesion(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Huella que se guarda en la fila. SHA-256 identifica el token; no es el hash
 * de la contraseña. Si alguien copia la base, no se lleva una cookie viva.
 */
export function huellaDeToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
