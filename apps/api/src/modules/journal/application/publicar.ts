import type { NotaDeBitacora, TipoDeBitacora, PrecisionDeNota } from '../domain/nota'
import type { Pendiente, SujetoDePendiente } from '../domain/pendiente'

import type {
  CambioDeEstadoGuardado,
  CorreccionDeNotaGuardada,
  CorreccionDePendienteGuardada,
} from './repositorio'

/**
 * La nota tal como sale del módulo. `fecha` es el día del que habla;
 * `recordedAt` es cuándo se anotó.
 *
 * No dice la causa de una quema ni mide la lluvia: eso sigue abierto.
 */
export type NotaPublica = {
  readonly id: string
  readonly tipo: TipoDeBitacora
  readonly texto: string
  readonly fecha: string
  readonly precision: PrecisionDeNota
  readonly potreroId: string | null
  readonly reportedBy: string | null
  readonly evidenciaId: string | null
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

export type NotaConHistoria = NotaPublica & {
  readonly correcciones: readonly CorreccionDeNotaPublica[]
}

export type NotasPublicas = {
  readonly notas: readonly NotaConHistoria[]
}

export type PendientePublico = {
  readonly id: string
  readonly texto: string
  readonly fecha: string
  readonly estado: Pendiente['estado']
  readonly sujeto: SujetoDePendiente
  readonly estadoPor: string
  readonly estadoEn: string
  readonly version: number
  readonly recordedBy: string
  readonly recordedAt: string
}

export type CorreccionDePendientePublica = {
  readonly campo: CorreccionDePendienteGuardada['campo']
  readonly valorAnterior: string | null
  readonly motivo: string
  readonly correctedBy: string
  readonly correctedAt: string
}

export type CambioDeEstadoPublico = {
  readonly estadoAnterior: CambioDeEstadoGuardado['estadoAnterior']
  readonly estadoNuevo: CambioDeEstadoGuardado['estadoNuevo']
  readonly changedBy: string
  readonly changedAt: string
}

export type PendienteConHistoria = PendientePublico & {
  readonly correcciones: readonly CorreccionDePendientePublica[]
  readonly cambiosDeEstado: readonly CambioDeEstadoPublico[]
}

export type PendientesPublicos = {
  readonly pendientes: readonly PendienteConHistoria[]
}

export function publicarNota(
  nota: NotaDeBitacora,
  correcciones: readonly CorreccionDeNotaGuardada[],
): NotaConHistoria {
  return {
    id: nota.id,
    tipo: nota.tipo,
    texto: nota.texto,
    fecha: nota.fecha,
    precision: nota.precision,
    potreroId: nota.potreroId,
    reportedBy: nota.reportedBy,
    evidenciaId: nota.evidenciaId,
    version: nota.version,
    recordedBy: nota.recordedBy,
    recordedAt: nota.recordedAt.toISOString(),
    correcciones: correcciones.map((correccion) => ({
      campo: correccion.campo,
      valorAnterior: correccion.valorAnterior,
      motivo: correccion.motivo,
      correctedBy: correccion.correctedBy,
      correctedAt: correccion.correctedAt.toISOString(),
    })),
  }
}

export function publicarPendiente(
  pendiente: Pendiente,
  correcciones: readonly CorreccionDePendienteGuardada[],
  cambios: readonly CambioDeEstadoGuardado[],
): PendienteConHistoria {
  return {
    id: pendiente.id,
    texto: pendiente.texto,
    fecha: pendiente.fecha,
    estado: pendiente.estado,
    sujeto: pendiente.sujeto,
    estadoPor: pendiente.estadoPor,
    estadoEn: pendiente.estadoEn.toISOString(),
    version: pendiente.version,
    recordedBy: pendiente.recordedBy,
    recordedAt: pendiente.recordedAt.toISOString(),
    correcciones: correcciones.map((correccion) => ({
      campo: correccion.campo,
      valorAnterior: correccion.valorAnterior,
      motivo: correccion.motivo,
      correctedBy: correccion.correctedBy,
      correctedAt: correccion.correctedAt.toISOString(),
    })),
    cambiosDeEstado: cambios.map((cambio) => ({
      estadoAnterior: cambio.estadoAnterior,
      estadoNuevo: cambio.estadoNuevo,
      changedBy: cambio.changedBy,
      changedAt: cambio.changedAt.toISOString(),
    })),
  }
}
