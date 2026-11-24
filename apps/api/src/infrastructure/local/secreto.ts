import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { LARGO_MINIMO_DEL_SECRETO } from '../configuracion'
import { escribirVariable, leerVariable } from './archivo-env'

/**
 * 32 bytes en base64: 44 caracteres, por encima del mínimo del proceso.
 * Sale de `crypto`, no de un generador propio.
 */
export function generarSecretoDeSesion(): string {
  return randomBytes(32).toString('base64')
}

export type SecretoAsegurado = {
  readonly texto: string
  readonly secreto: string
  readonly generado: boolean
}

/**
 * Deja un `SESSION_SECRET` usable en el texto del `.env`.
 *
 * Si ya hay uno del largo que pide el proceso, se queda: la segunda corrida
 * no lo regenera. Uno corto no se reemplaza en silencio; hay que borrarlo o
 * poner otro. Un valor vacío cuenta como faltante.
 */
export function asegurarSecreto(
  texto: string,
  generar: () => string = generarSecretoDeSesion,
): SecretoAsegurado {
  const actual = leerVariable(texto, 'SESSION_SECRET')
  if (actual !== undefined && actual.trim() !== '') {
    if (actual.length < LARGO_MINIMO_DEL_SECRETO) {
      throw new Error(
        `SESSION_SECRET tiene ${String(actual.length)} caracteres y necesita al menos ${String(LARGO_MINIMO_DEL_SECRETO)}. No lo reemplazo solo: genera uno con «openssl rand -base64 32» o borra la línea para que npm run local cree otro.`,
      )
    }
    return { texto, secreto: actual, generado: false }
  }

  const secreto = generar()
  if (secreto.length < LARGO_MINIMO_DEL_SECRETO || /[\r\n"]/.test(secreto)) {
    throw new Error(
      'El secreto generado no sirve. Tiene que tener al menos 32 caracteres y una sola línea.',
    )
  }

  return {
    texto: escribirVariable(texto, 'SESSION_SECRET', secreto),
    secreto,
    generado: true,
  }
}

/** Lee el `.env` en `ruta`, genera el secreto si falta y lo escribe una sola vez. */
export function asegurarSecretoEnArchivo(
  ruta: string,
  generar: () => string = generarSecretoDeSesion,
): { readonly secreto: string; readonly generado: boolean } {
  const texto = existsSync(ruta) ? readFileSync(ruta, 'utf8') : ''
  const resultado = asegurarSecreto(texto, generar)
  if (resultado.generado) {
    writeFileSync(ruta, resultado.texto, 'utf8')
  }
  return { secreto: resultado.secreto, generado: resultado.generado }
}
