import type { Destete } from '../domain/destete'

import type { CorreccionDeDesteteGuardada } from './repositorio-destete'

/**
 * Un destete tal como sale del módulo. La fecha es el día del destete;
 * `recordedAt` es cuándo se anotó. El peso no viaja en kilos: solo su id,
 * porque los kilos son de Growth.
 */
export type DestetePublico = {
  readonly id: string
  readonly animalId: string
  readonly fecha: string | null
  readonly precisionFecha: 'exact' | 'approximate' | null
  readonly nota: string | null
  readonly reportedBy: string | null
  readonly pesoId: string | null
  readonly version: number
  readonly recordedBy: string
  readonly recordedAt: string
}

export type CorreccionDeDestetePublica = {
  readonly campo: CorreccionDeDesteteGuardada['campo']
  readonly valorAnterior: string | null
  readonly motivo: string
  readonly correctedBy: string
  readonly correctedAt: string
}

export type DesteteConHistoria = DestetePublico & {
  readonly correcciones: readonly CorreccionDeDestetePublica[]
}

export function publicarDestete(destete: Destete): DestetePublico {
  return {
    id: destete.id,
    animalId: destete.animalId,
    fecha: destete.fecha,
    precisionFecha: destete.precision,
    nota: destete.nota,
    reportedBy: destete.reportedBy,
    pesoId: destete.pesoId,
    version: destete.version,
    recordedBy: destete.recordedBy,
    recordedAt: destete.recordedAt.toISOString(),
  }
}

export function publicarCorreccionDeDestete(
  correccion: CorreccionDeDesteteGuardada,
): CorreccionDeDestetePublica {
  return {
    campo: correccion.campo,
    valorAnterior: correccion.valorAnterior,
    motivo: correccion.motivo,
    correctedBy: correccion.correctedBy,
    correctedAt: correccion.correctedAt.toISOString(),
  }
}
