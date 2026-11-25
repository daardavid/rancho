import type { RecordedBy } from '../../../shared-kernel/actores'

import type { Animal } from './animal'
import { diaDeCalendario } from './dia'
import { RechazoDeHerd } from './errores'
import {
  LARGO_MAXIMO_MOTIVO,
  LARGO_MAXIMO_NOTA,
  esMotivoDeSalida,
  type MotivoDeSalida,
} from './valores'

/**
 * La salida vigente de un animal que ya no está activo.
 *
 * `fecha` es el día en que se supo, no una hora. `unknown` es un motivo
 * válido. No hay precio, reposición ni parte.
 */
export type Salida = {
  readonly motivo: MotivoDeSalida
  readonly fecha: string
  readonly nota: string | null
  readonly evidenciaId: string | null
}

export type RegistroDeSalida = {
  readonly motivo: MotivoDeSalida
  readonly fecha: string
  readonly nota?: string | null
  readonly evidenciaId?: string | null
}

/**
 * Cada clave presente es un cambio. `activo: true` deshace la salida y no se
 * combina con un cambio de motivo, fecha, nota o foto: o se corrige, o vuelve
 * al hato.
 */
export type CambiosDeSalida = {
  readonly motivo?: MotivoDeSalida
  readonly fecha?: string
  readonly nota?: string | null
  readonly evidenciaId?: string | null
  readonly activo?: true
}

export type SalidaCorregida = {
  readonly animal: Animal
  readonly anterior: Salida
  readonly motivo: string
}

/** La salida que estaba, cuando se corrige. No se borra al volver a activo. */
export type CorreccionDeSalida = {
  readonly motivoAnterior: MotivoDeSalida
  readonly fechaAnterior: string
  readonly notaAnterior: string | null
  readonly evidenciaIdAnterior: string | null
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

/**
 * Da de baja. El animal deja de estar activo y la ficha se queda.
 * Quien ya está inactivo se corrige, no se vuelve a dar de baja.
 */
export function registrarSalida(animal: Animal, entrada: RegistroDeSalida): Animal {
  exigirCoherente(animal)
  if (!animal.activo) {
    throw new RechazoDeHerd('ya_inactivo')
  }

  return {
    ...animal,
    activo: false,
    salida: armarSalida(entrada),
    version: animal.version + 1,
  }
}

/**
 * Corrige la salida que está vigente. Guarda el valor anterior entero.
 * Volver a activo vacía la salida vigente; la historia no se borra.
 */
export function corregirSalida(
  animal: Animal,
  cambios: CambiosDeSalida,
  motivo: string,
): SalidaCorregida {
  const motivoLimpio = motivoDe(motivo)
  exigirCoherente(animal)
  if (animal.salida === null) {
    throw new RechazoDeHerd('sin_salida')
  }

  const anterior = animal.salida
  if (cambios.activo === true) {
    if (traeOtroCambio(cambios)) {
      throw new RechazoDeHerd('salida_incoherente')
    }
    return {
      animal: { ...animal, activo: true, salida: null, version: animal.version + 1 },
      anterior,
      motivo: motivoLimpio,
    }
  }

  const siguiente = aplicarCambios(anterior, cambios)
  if (iguales(anterior, siguiente)) {
    throw new RechazoDeHerd('correccion_vacia')
  }

  return {
    animal: { ...animal, activo: false, salida: siguiente, version: animal.version + 1 },
    anterior,
    motivo: motivoLimpio,
  }
}

function exigirCoherente(animal: Animal): void {
  if (animal.activo !== (animal.salida === null)) {
    throw new Error('La ficha trae un activo que no coincide con su salida.')
  }
}

function traeOtroCambio(cambios: CambiosDeSalida): boolean {
  return (
    cambios.motivo !== undefined ||
    cambios.fecha !== undefined ||
    cambios.nota !== undefined ||
    cambios.evidenciaId !== undefined
  )
}

function aplicarCambios(actual: Salida, cambios: CambiosDeSalida): Salida {
  return {
    motivo: cambios.motivo ?? actual.motivo,
    fecha: cambios.fecha !== undefined ? diaDeCalendario(cambios.fecha) : actual.fecha,
    nota: cambios.nota !== undefined ? textoOpcional(cambios.nota, LARGO_MAXIMO_NOTA) : actual.nota,
    evidenciaId:
      cambios.evidenciaId !== undefined ? evidenciaDe(cambios.evidenciaId) : actual.evidenciaId,
  }
}

function armarSalida(entrada: RegistroDeSalida): Salida {
  if (!esMotivoDeSalida(entrada.motivo)) {
    throw new RechazoDeHerd('texto_invalido')
  }
  return {
    motivo: entrada.motivo,
    fecha: diaDeCalendario(entrada.fecha),
    nota: textoOpcional(entrada.nota, LARGO_MAXIMO_NOTA),
    evidenciaId: evidenciaDe(entrada.evidenciaId),
  }
}

function iguales(a: Salida, b: Salida): boolean {
  return (
    a.motivo === b.motivo &&
    a.fecha === b.fecha &&
    a.nota === b.nota &&
    a.evidenciaId === b.evidenciaId
  )
}

function motivoDe(motivo: string): string {
  const limpio = motivo.trim()
  if (limpio === '') {
    throw new RechazoDeHerd('motivo_vacio')
  }
  if (limpio.length > LARGO_MAXIMO_MOTIVO) {
    throw new RechazoDeHerd('texto_invalido')
  }
  return limpio
}

function textoOpcional(valor: string | null | undefined, maximo: number): string | null {
  if (valor === undefined || valor === null) {
    return null
  }
  const limpio = valor.trim()
  if (limpio === '' || limpio.length > maximo) {
    throw new RechazoDeHerd('texto_invalido')
  }
  return limpio
}

function evidenciaDe(valor: string | null | undefined): string | null {
  if (valor === undefined || valor === null) {
    return null
  }
  const limpio = valor.trim()
  if (limpio === '') {
    throw new RechazoDeHerd('texto_invalido')
  }
  return limpio
}
