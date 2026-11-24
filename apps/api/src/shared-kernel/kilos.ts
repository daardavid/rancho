import { z } from 'zod'

declare const marcaGramos: unique symbol

/**
 * Un peso en gramos enteros.
 *
 * Nunca es un `number` de JavaScript con decimales: los gramos son la unidad
 * autoritativa en memoria. Un peso viaja como texto validado y se convierte a
 * gramos con aritmética entera.
 */
export type Gramos = number & { readonly [marcaGramos]: 'Gramos' }

const GRAMOS_POR_KILO = 1000n
const CERO = 0n

/**
 * Máximo de la columna `numeric(12,3)`: nueve dígitos enteros y tres decimales.
 * No es una regla del rancho, es el ancho del campo.
 */
const MAXIMO_GRAMOS = 999_999_999_999n

/**
 * Texto de un peso: dígitos, punto y hasta tres decimales.
 *
 * Se rechazan a propósito la notación científica (`1e3`), la coma decimal
 * (`351,5`), el signo (`+3`, `-3`), el punto suelto (`351.`) o sin entero
 * (`.5`) y los espacios interiores. Todo eso es una forma de decir «no pude
 * leer el peso» sin decirlo.
 */
const PATRON_PESO = /^(\d+)(?:\.(\d{1,3}))?$/

export type LecturaDePeso =
  | { readonly ok: true; readonly gramos: Gramos }
  | { readonly ok: false; readonly motivo: string }

/**
 * Revisa el texto y devuelve los gramos exactos, o el motivo del rechazo.
 *
 * Los kilómetros enteros y los decimales se convierten con `BigInt` y se suman
 * como enteros: el valor autoritativo nunca pasa por un número de coma flotante.
 */
export function interpretarKilos(valor: string): LecturaDePeso {
  const texto = valor.trim()
  const partes = PATRON_PESO.exec(texto)

  if (partes === null) {
    return {
      ok: false,
      motivo: 'Escribe el peso en kilos con punto decimal y hasta 3 decimales, por ejemplo 351.5',
    }
  }

  const enteros = partes[1] ?? ''
  const decimales = (partes[2] ?? '').padEnd(3, '0')
  const gramos = BigInt(enteros) * GRAMOS_POR_KILO + BigInt(decimales)

  if (gramos <= CERO) {
    return { ok: false, motivo: 'El peso tiene que ser mayor que cero' }
  }

  if (gramos > MAXIMO_GRAMOS) {
    return { ok: false, motivo: 'El peso es más grande de lo que cabe en el campo' }
  }

  return { ok: true, gramos: Number(gramos) as Gramos }
}

/**
 * El contrato del texto de un peso.
 *
 * Valida la forma **y** el rango, no solo la forma: `"0"` y `"9999999999999"`
 * tienen forma de número y no son un peso anotable.
 */
export const kilosTextoSchema = z.string().superRefine((valor, contexto) => {
  const lectura = interpretarKilos(valor)
  if (!lectura.ok) {
    contexto.addIssue({ code: 'custom', message: lectura.motivo })
  }
})

/** El texto de un peso ya revisado. */
export type KilosTexto = z.infer<typeof kilosTextoSchema>

/** Igual que `interpretarKilos`, pero lanza un `RangeError` con el motivo. */
export function parsearKilosAGramos(texto: string): Gramos {
  const lectura = interpretarKilos(texto)
  if (!lectura.ok) {
    throw new RangeError(lectura.motivo)
  }

  return lectura.gramos
}

/**
 * Devuelve el texto de un peso con exactamente tres decimales: `8200` gramos es
 * `"8.200"`, no `"8.2"`.
 *
 * Así dos pesos del mismo campo se comparan como texto sin sorpresas y no hay
 * redondeo escondido al leer. Se usa aritmética entera, sin coma flotante.
 */
export function formatearGramosATexto(gramos: Gramos): string {
  if (!Number.isInteger(gramos) || gramos <= 0) {
    throw new RangeError('Los gramos tienen que ser un entero mayor que cero')
  }

  const total = BigInt(gramos)
  const enteros = total / GRAMOS_POR_KILO
  const decimales = total % GRAMOS_POR_KILO

  return `${enteros}.${decimales.toString().padStart(3, '0')}`
}
