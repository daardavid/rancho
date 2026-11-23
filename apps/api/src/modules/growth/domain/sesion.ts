import { reportedBySchema, type RecordedBy, type ReportedBy } from '../../../shared-kernel/actores'
import type { AnimalId, RanchId } from '../../../shared-kernel/ids'
import type { Gramos } from '../../../shared-kernel/kilos'
import type { SourceQuality } from '../../../shared-kernel/source-quality'

import { diaDeCalendario } from './dia'
import { RechazoDeGrowth } from './errores'
import { LARGO_MAXIMO_NOTA, LARGO_MAXIMO_REPORTED_BY } from './valores'

/**
 * Una sesión de pesaje. La fecha es el día en que se pesó, no el instante
 * en que se anotó. La lista de filas es la que mandaron: la sesión no inventa
 * qué animales entran a la rutina.
 *
 * Cada fila es un pesado o un hueco. Un hueco es «esperado y no pasó»: no es
 * una baja y no es una verificación del hato. No hay columna de ganancia.
 */
export type FilaPesada = {
  readonly id: string
  readonly animalId: AnimalId
  readonly resultado: 'pesado'
  readonly kilos: Gramos
  readonly calidad: SourceQuality
  readonly version: number
}

export type FilaHueco = {
  readonly id: string
  readonly animalId: AnimalId
  readonly resultado: 'hueco'
}

export type FilaDeSesion = FilaPesada | FilaHueco

export type SesionDePesaje = {
  readonly id: string
  readonly ranchId: RanchId
  readonly fecha: string
  readonly nota: string | null
  readonly reportedBy: ReportedBy | null
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
  readonly commandId: string
  readonly filas: readonly FilaDeSesion[]
}

export type EntradaDeFila =
  | {
      readonly id: string
      readonly animalId: AnimalId
      readonly resultado: 'pesado'
      readonly kilos: Gramos
      readonly calidad?: SourceQuality
    }
  | {
      readonly id: string
      readonly animalId: AnimalId
      readonly resultado: 'hueco'
    }

export type EntradaDeSesion = {
  readonly id: string
  readonly ranchId: RanchId
  readonly fecha: string
  readonly nota?: string
  readonly reportedBy?: ReportedBy
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
  readonly commandId: string
  readonly filas: readonly EntradaDeFila[]
}

/**
 * Lo que un hueco le hace al hato: nada. El animal sigue, y la sesión no
 * afirma que el resto del ganado fue visto.
 */
export type EfectoDeHueco = {
  readonly animalId: AnimalId
  readonly clase: 'esperado_y_no_pesado'
  readonly daDeBaja: false
  readonly verificaElHato: false
}

const VERSION_INICIAL = 1

export function registrarSesion(entrada: EntradaDeSesion): SesionDePesaje {
  const fecha = diaDeCalendario(entrada.fecha)
  const vistos = new Set<string>()
  const filasUsadas = new Set<string>()
  const filas: FilaDeSesion[] = []

  for (const fila of entrada.filas) {
    if (filasUsadas.has(fila.id)) {
      throw new RechazoDeGrowth('fila_repetida')
    }
    filasUsadas.add(fila.id)

    if (vistos.has(fila.animalId)) {
      throw new RechazoDeGrowth('animal_repetido')
    }
    vistos.add(fila.animalId)
    filas.push(filaDe(fila))
  }

  return {
    id: entrada.id,
    ranchId: entrada.ranchId,
    fecha,
    nota: textoOpcional(entrada.nota, LARGO_MAXIMO_NOTA),
    reportedBy: quienReporto(entrada.reportedBy),
    recordedBy: entrada.recordedBy,
    recordedAt: entrada.recordedAt,
    commandId: entrada.commandId,
    filas,
  }
}

export function efectoDeHueco(fila: FilaHueco): EfectoDeHueco {
  return {
    animalId: fila.animalId,
    clase: 'esperado_y_no_pesado',
    daDeBaja: false,
    verificaElHato: false,
  }
}

function filaDe(entrada: EntradaDeFila): FilaDeSesion {
  if (entrada.resultado === 'hueco') {
    return { id: entrada.id, animalId: entrada.animalId, resultado: 'hueco' }
  }

  if (entrada.calidad === undefined) {
    throw new RechazoDeGrowth('peso_sin_calidad')
  }

  return {
    id: entrada.id,
    animalId: entrada.animalId,
    resultado: 'pesado',
    kilos: entrada.kilos,
    calidad: entrada.calidad,
    version: VERSION_INICIAL,
  }
}

function quienReporto(valor: ReportedBy | undefined): ReportedBy | null {
  if (valor === undefined) {
    return null
  }
  return reportedBySchema.parse(textoObligatorio(valor, LARGO_MAXIMO_REPORTED_BY))
}

function textoOpcional(valor: string | undefined, maximo: number): string | null {
  if (valor === undefined) {
    return null
  }
  return textoObligatorio(valor, maximo)
}

function textoObligatorio(valor: string, maximo: number): string {
  const limpio = valor.trim()
  if (limpio === '' || limpio.length > maximo) {
    throw new RechazoDeGrowth('texto_invalido')
  }
  return limpio
}
