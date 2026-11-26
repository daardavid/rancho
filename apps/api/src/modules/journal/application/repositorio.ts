import type { RecordedBy } from '../../../shared-kernel/actores'
import type { RanchId } from '../../../shared-kernel/ids'

import type { NotaDeBitacora, ValorAnteriorDeNota } from '../domain/nota'
import type { Pendiente, SujetoDePendiente, ValorAnteriorDePendiente } from '../domain/pendiente'

export type CorreccionDeNotaGuardada = {
  readonly campo: ValorAnteriorDeNota['campo']
  readonly valorAnterior: string | null
  readonly motivo: string
  readonly correctedBy: string
  readonly correctedAt: Date
}

export type GuardarCorreccionDeNota = {
  readonly nota: NotaDeBitacora
  readonly versionLeida: number
  readonly anteriores: readonly ValorAnteriorDeNota[]
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

export type CorreccionDePendienteGuardada = {
  readonly campo: ValorAnteriorDePendiente['campo']
  readonly valorAnterior: string | null
  readonly motivo: string
  readonly correctedBy: string
  readonly correctedAt: Date
}

export type GuardarCorreccionDePendiente = {
  readonly pendiente: Pendiente
  readonly versionLeida: number
  readonly anteriores: readonly ValorAnteriorDePendiente[]
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

export type CambioDeEstadoGuardado = {
  readonly estadoAnterior: Pendiente['estado']
  readonly estadoNuevo: Pendiente['estado']
  readonly changedBy: string
  readonly changedAt: Date
}

export type GuardarEstado = {
  readonly pendiente: Pendiente
  readonly versionLeida: number
  readonly estadoAnterior: Pendiente['estado']
  readonly changedBy: RecordedBy
  readonly changedAt: Date
}

export type RepositorioDeJournal = {
  insertarNota(nota: NotaDeBitacora): Promise<void>
  obtenerNota(ranchId: RanchId, notaId: string, bloquear: boolean): Promise<NotaDeBitacora | null>
  guardarCorreccionDeNota(entrada: GuardarCorreccionDeNota): Promise<void>
  correccionesDeNota(ranchId: RanchId, notaId: string): Promise<readonly CorreccionDeNotaGuardada[]>
  listarNotas(ranchId: RanchId): Promise<readonly NotaDeBitacora[]>

  insertarPendiente(pendiente: Pendiente): Promise<void>
  obtenerPendiente(
    ranchId: RanchId,
    pendienteId: string,
    bloquear: boolean,
  ): Promise<Pendiente | null>
  guardarCorreccionDePendiente(entrada: GuardarCorreccionDePendiente): Promise<void>
  guardarEstado(entrada: GuardarEstado): Promise<void>
  correccionesDePendiente(
    ranchId: RanchId,
    pendienteId: string,
  ): Promise<readonly CorreccionDePendienteGuardada[]>
  cambiosDeEstado(
    ranchId: RanchId,
    pendienteId: string,
  ): Promise<readonly CambioDeEstadoGuardado[]>
  listarPendientes(ranchId: RanchId): Promise<readonly Pendiente[]>
}

export type { SujetoDePendiente }
