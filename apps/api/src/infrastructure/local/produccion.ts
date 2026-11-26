import { existsSync, readFileSync } from 'node:fs'

import { leerVariable } from './archivo-env'

/** `NODE_ENV` escrito en un `.env`, si el archivo existe. */
export function nodeEnvEscrito(rutaEnv: string): string | undefined {
  if (!existsSync(rutaEnv)) {
    return undefined
  }
  return leerVariable(readFileSync(rutaEnv, 'utf8'), 'NODE_ENV')?.trim()
}

/**
 * El modo local no arranca con `NODE_ENV=production`.
 *
 * En producción la cookie lleva `Secure` sin excepción. Se mira el proceso y
 * el `.env`, porque el servidor carga el archivo después. Un solo `production`
 * basta para negarse.
 */
export function afirmarModoLocalPermitido(
  nodeEnv: string | undefined,
  enArchivo: string | undefined,
): void {
  if (nodeEnv === 'production' || enArchivo === 'production') {
    throw new Error(
      'NODE_ENV=production no puede combinarse con el modo local. En producción la cookie lleva Secure, sin excepción.',
    )
  }
}
