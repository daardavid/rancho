import type { RecordedBy } from '../../../shared-kernel/actores'
import type { RanchId } from '../../../shared-kernel/ids'

import type { DiagnosticoDePrenez, ValorAnteriorDeDiagnostico } from '../domain/prenez'

export type CorreccionDeDiagnosticoGuardada = ValorAnteriorDeDiagnostico & {
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

export type GuardarCorreccionDeDiagnostico = {
  readonly diagnostico: DiagnosticoDePrenez
  readonly versionLeida: number
  readonly anteriores: readonly ValorAnteriorDeDiagnostico[]
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

/**
 * Lo que la aplicación pide del diagnóstico. No recibe la transacción: quien
 * abre el comando ata esta interfaz a una sola transacción de Herd.
 */
export type RepositorioDePrenez = {
  insertar(diagnostico: DiagnosticoDePrenez): Promise<void>
  obtener(
    ranchId: RanchId,
    diagnosticoId: string,
    bloquear: boolean,
  ): Promise<DiagnosticoDePrenez | null>
  guardarCorreccion(entrada: GuardarCorreccionDeDiagnostico): Promise<void>
  correcciones(ranchId: RanchId, diagnosticoId: string): Promise<CorreccionDeDiagnosticoGuardada[]>
}
