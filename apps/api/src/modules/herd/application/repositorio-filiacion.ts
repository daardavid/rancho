import type { RecordedBy } from '../../../shared-kernel/actores'
import type { AnimalId, RanchId } from '../../../shared-kernel/ids'

import type {
  CertezaDeFiliacion,
  Filiacion,
  FiliacionAnterior,
  MotivoDeInferencia,
} from '../domain/filiacion'

export type CorreccionDeFiliacionGuardada = FiliacionAnterior & {
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

export type GuardarCorreccionDeFiliacion = {
  readonly filiacion: Filiacion
  readonly versionLeida: number
  readonly anterior: FiliacionAnterior
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

/** Una cría cuyo padre o madre vigente es este animal. */
export type CriaGuardada = {
  readonly criaId: string
  readonly como: 'madre' | 'padre'
  readonly certeza: CertezaDeFiliacion
  readonly motivo: MotivoDeInferencia | null
}

/**
 * Lo que la aplicación pide de la filiación. No recibe la transacción: quien
 * abre el comando ata esta interfaz a la misma transacción que la ficha.
 */
export type RepositorioDeFiliacion = {
  insertar(filiacion: Filiacion): Promise<void>
  obtenerPorCria(ranchId: RanchId, criaId: AnimalId, bloquear: boolean): Promise<Filiacion | null>
  guardarCorreccion(entrada: GuardarCorreccionDeFiliacion): Promise<void>
  correccionesDe(ranchId: RanchId, filiacionId: string): Promise<CorreccionDeFiliacionGuardada[]>
  criasDe(ranchId: RanchId, animalId: AnimalId): Promise<CriaGuardada[]>
}
