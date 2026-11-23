import type { RecordedBy } from '../../../shared-kernel/actores'
import type { RanchId } from '../../../shared-kernel/ids'

import type { CorreccionDePeso, ValorAnteriorDePeso } from '../domain/correccion'
import type { FilaPesada, SesionDePesaje } from '../domain/sesion'

export type GuardarCorreccionDePeso = {
  readonly ranchId: RanchId
  readonly fila: FilaPesada
  readonly versionLeida: number
  readonly anteriores: readonly ValorAnteriorDePeso[]
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

export type PesoConHistoria = {
  readonly fila: FilaPesada
  readonly sesionId: string
  readonly fecha: string
  readonly correcciones: readonly CorreccionDePeso[]
}

export type LineaGuardada =
  | ({ readonly resultado: 'pesado' } & PesoConHistoria)
  | {
      readonly resultado: 'hueco'
      readonly id: string
      readonly animalId: FilaPesada['animalId']
      readonly sesionId: string
      readonly fecha: string
    }

/**
 * Lo que la aplicación pide. No recibe la transacción de Drizzle: quien abre
 * el comando ata esta interfaz a una transacción antes de llamarla.
 */
export type RepositorioDePesajes = {
  insertar(sesion: SesionDePesaje): Promise<void>
  obtener(ranchId: RanchId, id: string): Promise<SesionDePesaje | null>
  ultima(ranchId: RanchId): Promise<SesionDePesaje | null>
  pesosDe(ranchId: RanchId, animalId: string): Promise<PesoConHistoria[]>
  obtenerLinea(ranchId: RanchId, id: string, bloquear: boolean): Promise<LineaGuardada | null>
  guardarCorreccion(entrada: GuardarCorreccionDePeso): Promise<void>
}
