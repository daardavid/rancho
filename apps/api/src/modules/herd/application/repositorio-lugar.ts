import type { RecordedBy } from '../../../shared-kernel/actores'
import type { RanchId } from '../../../shared-kernel/ids'

import type { AsignacionDeLugar } from '../domain/lugar'
import type { Potrero, ValorAnteriorDePotrero } from '../domain/potrero'

/** El potrero con su historia de nombres y notas. */
export type PotreroConHistoria = {
  readonly potrero: Potrero
  readonly correcciones: readonly CorreccionDePotreroGuardada[]
}

export type CorreccionDePotreroGuardada = ValorAnteriorDePotrero & {
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

export type GuardarCorreccionDePotrero = {
  readonly potrero: Potrero
  readonly versionLeida: number
  readonly anteriores: readonly ValorAnteriorDePotrero[]
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

/**
 * Lo que la aplicación pide del lugar. No recibe la transacción: quien abre el
 * comando ata esta interfaz a la misma transacción que la ficha o el potrero.
 */
export type RepositorioDeLugar = {
  insertarPotrero(potrero: Potrero): Promise<void>
  obtenerPotrero(ranchId: RanchId, potreroId: string, bloquear: boolean): Promise<Potrero | null>
  guardarCorreccionDePotrero(entrada: GuardarCorreccionDePotrero): Promise<void>
  correccionesDePotrero(ranchId: RanchId, potreroId: string): Promise<CorreccionDePotreroGuardada[]>
  listarPotreros(ranchId: RanchId): Promise<Potrero[]>
  insertarAsignacion(asignacion: AsignacionDeLugar): Promise<void>
  /** De la más vieja a la más nueva, para que la última sea la vigente. */
  asignacionesDeAnimal(ranchId: RanchId, animalId: string): Promise<AsignacionDeLugar[]>
  /** Las asignaciones de un conjunto de animales, todas, en el mismo orden. */
  asignacionesDeAnimales(
    ranchId: RanchId,
    animalIds: readonly string[],
  ): Promise<AsignacionDeLugar[]>
  asignacionesDelRancho(ranchId: RanchId): Promise<AsignacionDeLugar[]>
}
