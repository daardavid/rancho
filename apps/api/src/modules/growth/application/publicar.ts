import type { SourceQuality } from '../../../shared-kernel/source-quality'
import { formatearGramosATexto } from '../../../shared-kernel/kilos'

import type { CorreccionDePeso } from '../domain/correccion'
import type { CampoDePeso } from '../domain/valores'
import type { FilaDeSesion, SesionDePesaje } from '../domain/sesion'
import type { PesoConHistoria } from './repositorio'

/** Lo que sale del módulo. Fechas en texto para que el reintento idempotente no las pierda. */
export type FilaPublica =
  | {
      readonly id: string
      readonly animalId: string
      readonly resultado: 'pesado'
      readonly kilos: string
      readonly calidad: SourceQuality
      readonly version: number
      readonly evidenciaId: string | null
    }
  | {
      readonly id: string
      readonly animalId: string
      readonly resultado: 'hueco'
    }

export type SesionPublica = {
  readonly id: string
  readonly fecha: string
  readonly nota: string | null
  readonly reportedBy: string | null
  readonly commandId: string
  readonly recordedBy: string
  readonly recordedAt: string
  readonly filas: readonly FilaPublica[]
}

export type CorreccionPublica = {
  readonly campo: CampoDePeso
  readonly valorAnterior: string
  readonly motivo: string
  readonly correctedBy: string
  readonly correctedAt: string
}

export type PesoPublico = {
  readonly id: string
  readonly animalId: string
  readonly sesionId: string
  readonly fecha: string
  readonly kilos: string
  readonly calidad: SourceQuality
  readonly version: number
  readonly evidenciaId: string | null
  readonly correcciones: readonly CorreccionPublica[]
}

export type PesosDelAnimal = {
  readonly animalId: string
  readonly pesos: readonly PesoPublico[]
}

export function publicarSesion(sesion: SesionDePesaje): SesionPublica {
  return {
    id: sesion.id,
    fecha: sesion.fecha,
    nota: sesion.nota,
    reportedBy: sesion.reportedBy,
    commandId: sesion.commandId,
    recordedBy: sesion.recordedBy,
    recordedAt: sesion.recordedAt.toISOString(),
    filas: sesion.filas.map(publicarFila),
  }
}

export function publicarPeso(peso: PesoConHistoria): PesoPublico {
  return {
    id: peso.fila.id,
    animalId: peso.fila.animalId,
    sesionId: peso.sesionId,
    fecha: peso.fecha,
    kilos: formatearGramosATexto(peso.fila.kilos),
    calidad: peso.fila.calidad,
    version: peso.fila.version,
    evidenciaId: peso.fila.evidenciaId,
    correcciones: peso.correcciones.map(publicarCorreccion),
  }
}

function publicarFila(fila: FilaDeSesion): FilaPublica {
  if (fila.resultado === 'hueco') {
    return { id: fila.id, animalId: fila.animalId, resultado: 'hueco' }
  }

  return {
    id: fila.id,
    animalId: fila.animalId,
    resultado: 'pesado',
    kilos: formatearGramosATexto(fila.kilos),
    calidad: fila.calidad,
    version: fila.version,
    evidenciaId: fila.evidenciaId,
  }
}

function publicarCorreccion(correccion: CorreccionDePeso): CorreccionPublica {
  return {
    campo: correccion.campo,
    valorAnterior: correccion.valorAnterior,
    motivo: correccion.motivo,
    correctedBy: correccion.correctedBy,
    correctedAt: correccion.correctedAt.toISOString(),
  }
}
