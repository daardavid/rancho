import type { RecordedBy } from '../../../shared-kernel/actores'
import type { RanchId } from '../../../shared-kernel/ids'

import type { NotaDeSalud, ValorAnteriorDeNota } from '../domain/salud'

/** La nota con su historia de correcciones. */
export type NotaConHistoriaGuardada = {
  readonly nota: NotaDeSalud
  readonly correcciones: readonly CorreccionDeNotaGuardada[]
}

export type CorreccionDeNotaGuardada = ValorAnteriorDeNota & {
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

export type GuardarCorreccionDeNota = {
  readonly nota: NotaDeSalud
  readonly versionLeida: number
  readonly anteriores: readonly ValorAnteriorDeNota[]
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

/**
 * Lo que la aplicación pide de la sanidad. No recibe la transacción: quien abre
 * el comando ata esta interfaz a una sola transacción de Herd.
 */
export type RepositorioDeSalud = {
  insertarNota(nota: NotaDeSalud): Promise<void>
  obtenerNota(ranchId: RanchId, notaId: string, bloquear: boolean): Promise<NotaDeSalud | null>
  guardarCorreccionDeNota(entrada: GuardarCorreccionDeNota): Promise<void>
  correccionesDeNota(ranchId: RanchId, notaId: string): Promise<CorreccionDeNotaGuardada[]>
  /** Las notas de un animal, de la más vieja a la más nueva. */
  notasDeAnimal(ranchId: RanchId, animalId: string): Promise<NotaDeSalud[]>
  /** Las notas de varios animales, en el mismo orden. */
  notasDeAnimales(ranchId: RanchId, animalIds: readonly string[]): Promise<NotaDeSalud[]>
  /** Las últimas notas del rancho, de la más nueva a la más vieja. */
  notasDelRancho(ranchId: RanchId, limite: number): Promise<NotaDeSalud[]>
}
