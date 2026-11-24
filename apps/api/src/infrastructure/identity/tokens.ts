import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/** Token opaco de la cookie. 32 bytes salen de `crypto`, no de un generador propio. */
export function nuevoTokenDeSesion(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Huella que se guarda en la fila: HMAC-SHA256 del token con el secreto de la
 * instalación.
 *
 * Por qué HMAC y no un SHA-256 pelado: así la tabla `identity.session` no basta
 * para fabricar una cookie viva. Quien lea la base no aprende el secreto, y
 * quien pueda escribir una fila sin conocerlo no puede calcular la huella de un
 * token que él eligió. El token sigue siendo aleatorio de 256 bits, así que la
 * huella no es el hash de una contraseña y no se estira con argon2.
 *
 * El secreto llega del entorno (`SESSION_SECRET`) y vive en el proceso. No se
 * guarda en la base ni viaja al navegador ([ADR-010](../../../../docs/architecture/adr/ADR-010-authentication.md)).
 */
export function huellaDeToken(token: string, secreto: string): string {
  return createHmac('sha256', secreto).update(token).digest('hex')
}

/**
 * Compara dos huellas sin cortar en el primer byte distinto.
 *
 * Se usa donde la huella no viaja a un `WHERE` de SQL (que compara por su
 * cuenta); aquí no hay una consulta que haga ese trabajo.
 */
export function huellasIguales(izquierda: string, derecha: string): boolean {
  const a = Buffer.from(izquierda, 'utf8')
  const b = Buffer.from(derecha, 'utf8')
  if (a.length !== b.length) {
    return false
  }
  return timingSafeEqual(a, b)
}
