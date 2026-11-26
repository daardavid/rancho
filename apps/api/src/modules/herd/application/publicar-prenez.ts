import type { DiagnosticoDePrenez, ResultadoDePrenez } from '../domain/prenez'

import type { CorreccionDeDiagnosticoGuardada } from './repositorio-prenez'

/**
 * Un diagnóstico tal como sale del módulo. La fecha es el día del diagnóstico;
 * `recordedAt` es cuándo se anotó. No son lo mismo.
 *
 * No viaja un calendario ni una meta de días: el rancho no los tiene y este
 * hecho no los inventa.
 */
export type DiagnosticoPublico = {
  readonly id: string
  readonly animalId: string
  readonly fecha: string
  readonly resultado: ResultadoDePrenez
  readonly reportedBy: string | null
  readonly nota: string | null
  readonly vioAlAnimal: boolean | null
  readonly version: number
  readonly recordedBy: string
  readonly recordedAt: string
}

export type CorreccionDeDiagnosticoPublica = {
  readonly campo: CorreccionDeDiagnosticoGuardada['campo']
  readonly valorAnterior: string | null
  readonly motivo: string
  readonly correctedBy: string
  readonly correctedAt: string
}

export type DiagnosticoConHistoria = DiagnosticoPublico & {
  readonly correcciones: readonly CorreccionDeDiagnosticoPublica[]
}

export type DiagnosticosAnotadosPublicos = {
  readonly diagnosticos: readonly DiagnosticoConHistoria[]
}

export function publicarDiagnostico(diagnostico: DiagnosticoDePrenez): DiagnosticoPublico {
  return {
    id: diagnostico.id,
    animalId: diagnostico.animalId,
    fecha: diagnostico.fecha,
    resultado: diagnostico.resultado,
    reportedBy: diagnostico.reportedBy,
    nota: diagnostico.nota,
    vioAlAnimal: diagnostico.vioAlAnimal,
    version: diagnostico.version,
    recordedBy: diagnostico.recordedBy,
    recordedAt: diagnostico.recordedAt.toISOString(),
  }
}

export function publicarCorreccionDeDiagnostico(
  correccion: CorreccionDeDiagnosticoGuardada,
): CorreccionDeDiagnosticoPublica {
  return {
    campo: correccion.campo,
    valorAnterior: correccion.valorAnterior,
    motivo: correccion.motivo,
    correctedBy: correccion.correctedBy,
    correctedAt: correccion.correctedAt.toISOString(),
  }
}
