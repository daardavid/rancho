import type { RecordedBy } from '../../../shared-kernel/actores'
import type { RanchId } from '../../../shared-kernel/ids'

import type { Destete, ValorAnteriorDeDestete } from '../domain/destete'

export type CorreccionDeDesteteGuardada = ValorAnteriorDeDestete & {
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

export type GuardarCorreccionDeDestete = {
  readonly destete: Destete
  readonly versionLeida: number
  readonly anteriores: readonly ValorAnteriorDeDestete[]
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

/**
 * Lo que la aplicación pide del destete. No recibe la transacción: quien abre
 * el comando ata esta interfaz a esa transacción.
 */
export type RepositorioDeDestete = {
  insertar(destete: Destete): Promise<void>
  obtener(ranchId: RanchId, desteteId: string, bloquear: boolean): Promise<Destete | null>
  guardarCorreccion(entrada: GuardarCorreccionDeDestete): Promise<void>
  correcciones(ranchId: RanchId, desteteId: string): Promise<CorreccionDeDesteteGuardada[]>
}
