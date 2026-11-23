import type { RecordedBy } from '../../../shared-kernel/actores'
import { formatearGramosATexto, type Gramos } from '../../../shared-kernel/kilos'
import type { SourceQuality } from '../../../shared-kernel/source-quality'

import { RechazoDeGrowth } from './errores'
import type { FilaDeSesion, FilaPesada } from './sesion'
import { LARGO_MAXIMO_MOTIVO, type CampoDePeso } from './valores'

/** Una fila de historia: el valor que estaba, quién lo cambió, cuándo y por qué. */
export type CorreccionDePeso = {
  readonly campo: CampoDePeso
  readonly valorAnterior: string
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

export type ValorAnteriorDePeso = {
  readonly campo: CampoDePeso
  readonly valorAnterior: string
}

/** Cada clave presente es un cambio. Omitir es no tocarlo. */
export type CambiosDePeso = {
  readonly kilos?: Gramos
  readonly calidad?: SourceQuality
}

export type PesoCorregido = {
  readonly fila: FilaPesada
  readonly anteriores: readonly ValorAnteriorDePeso[]
  readonly motivo: string
}

/**
 * Corrige un peso ya asentado. Un hueco no es un peso: no se convierte en
 * kilos por esta vía. La fecha de la sesión no entra aquí, así que no se mueve.
 * Solo quedan en la historia los campos que de verdad cambian.
 */
export function corregirPeso(fila: FilaDeSesion, cambios: CambiosDePeso, motivo: string): PesoCorregido {
  if (fila.resultado !== 'pesado') {
    throw new RechazoDeGrowth('no_es_peso')
  }

  const motivoLimpio = motivoDe(motivo)
  const anteriores: ValorAnteriorDePeso[] = []
  let kilos = fila.kilos
  let calidad = fila.calidad

  if (cambios.kilos !== undefined && cambios.kilos !== fila.kilos) {
    anteriores.push({ campo: 'kilos', valorAnterior: formatearGramosATexto(fila.kilos) })
    kilos = cambios.kilos
  }
  if (cambios.calidad !== undefined && cambios.calidad !== fila.calidad) {
    anteriores.push({ campo: 'calidad', valorAnterior: fila.calidad })
    calidad = cambios.calidad
  }
  if (anteriores.length === 0) {
    throw new RechazoDeGrowth('correccion_vacia')
  }

  return {
    fila: {
      ...fila,
      kilos,
      calidad,
      version: fila.version + 1,
    },
    anteriores,
    motivo: motivoLimpio,
  }
}

function motivoDe(motivo: string): string {
  const limpio = motivo.trim()
  if (limpio === '') {
    throw new RechazoDeGrowth('motivo_vacio')
  }
  if (limpio.length > LARGO_MAXIMO_MOTIVO) {
    throw new RechazoDeGrowth('texto_invalido')
  }
  return limpio
}
