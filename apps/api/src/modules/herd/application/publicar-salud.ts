import type { NotaDeSalud, TipoDeNotaDeSalud } from '../domain/salud'

import type { CorreccionDeNotaGuardada } from './repositorio-salud'

/**
 * Una nota tal como sale del módulo. La fecha es el día en que se hizo o se vio;
 * `recordedAt` es cuándo se anotó. No son lo mismo.
 *
 * No viaja ni un calendario, ni una dosis, ni un retiro: el rancho no los tiene
 * y la nota no los inventa.
 */
export type NotaDeSaludPublica = {
  readonly id: string
  readonly animalId: string
  readonly tipo: TipoDeNotaDeSalud
  readonly detalle: string
  readonly fecha: string
  readonly producto: string | null
  readonly evidenciaId: string | null
  /** La nota dice que el animal se vio. Si es falso, no cuenta como observación. */
  readonly vioAlAnimal: boolean | null
  readonly version: number
  readonly recordedBy: string
  readonly recordedAt: string
}

export type CorreccionDeNotaPublica = {
  readonly campo: CorreccionDeNotaGuardada['campo']
  readonly valorAnterior: string | null
  readonly motivo: string
  readonly correctedBy: string
  readonly correctedAt: string
}

export type NotaDeSaludConHistoria = NotaDeSaludPublica & {
  readonly correcciones: readonly CorreccionDeNotaPublica[]
}

export type NotasDelAnimalPublicas = {
  readonly animalId: string
  readonly notas: readonly NotaDeSaludConHistoria[]
}

export type NotasAnotadasPublicas = {
  readonly notas: readonly NotaDeSaludConHistoria[]
}

export function publicarNota(nota: NotaDeSalud): NotaDeSaludPublica {
  return {
    id: nota.id,
    animalId: nota.animalId,
    tipo: nota.tipo,
    detalle: nota.detalle,
    fecha: nota.fecha,
    producto: nota.producto,
    evidenciaId: nota.evidenciaId,
    vioAlAnimal: nota.vioAlAnimal,
    version: nota.version,
    recordedBy: nota.recordedBy,
    recordedAt: nota.recordedAt.toISOString(),
  }
}

export function publicarCorreccionDeNota(
  correccion: CorreccionDeNotaGuardada,
): CorreccionDeNotaPublica {
  return {
    campo: correccion.campo,
    valorAnterior: correccion.valorAnterior,
    motivo: correccion.motivo,
    correctedBy: correccion.correctedBy,
    correctedAt: correccion.correctedAt.toISOString(),
  }
}
