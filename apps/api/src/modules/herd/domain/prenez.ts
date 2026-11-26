import { reportedBySchema, type RecordedBy, type ReportedBy } from '../../../shared-kernel/actores'
import type { AnimalId, RanchId } from '../../../shared-kernel/ids'

import { diaDeCalendario } from './dia'
import { RechazoDeHerd } from './errores'
import { textoDeVisto, vistoElegido } from './salud'
import {
  LARGO_MAXIMO_MOTIVO,
  LARGO_MAXIMO_NOTA,
  LARGO_MAXIMO_REPORTED_BY,
  type Categoria,
  type Sexo,
} from './valores'

/**
 * Un diagnóstico de preñez: lo que alguien dijo de una hembra en un día.
 *
 * Es un registro hermano de la ficha, no una columna de `Animal`. Un
 * diagnóstico a un grupo es uno por animal, escritos en la misma captura.
 * No hay calendario, intervalo meta ni días abiertos meta. Si alguien viene
 * a palpar o a hacer ultrasonido, y cada cuándo, queda abierto
 * (`OQ-REPRO-003`): aquí solo se guarda lo que se dijo.
 *
 * El resultado no tiene valor por omisión. `prenada` es Preñada, `vacia` es
 * Vacía y `no_se` es «No sé», elegido. `vioAlAnimal` es el mismo patrón que
 * la sanidad: alguien lo elige, y solo `true` cuenta como observación.
 */

export const RESULTADOS_DE_PRENEZ = ['prenada', 'vacia', 'no_se'] as const
export type ResultadoDePrenez = (typeof RESULTADOS_DE_PRENEZ)[number]

export function esResultadoDePrenez(valor: string): valor is ResultadoDePrenez {
  return (RESULTADOS_DE_PRENEZ as readonly string[]).includes(valor)
}

/**
 * Macho conocido: el sexo dice macho, o la categoría es toro. Un sexo que no
 * se sabe no se trata como macho. Una vaca con sexo desconocido sigue siendo
 * hembra para este hecho.
 */
export function esMachoConocido(sexo: Sexo, categoria: Categoria): boolean {
  return sexo === 'male' || categoria === 'bull'
}

export type DiagnosticoDePrenez = {
  readonly id: string
  readonly ranchId: RanchId
  readonly animalId: AnimalId
  /** El día del diagnóstico, no el día en que se anotó. */
  readonly fecha: string
  readonly resultado: ResultadoDePrenez
  /** Quién lo dijo. `null` es «no se anotó». No es un usuario. */
  readonly reportedBy: ReportedBy | null
  readonly nota: string | null
  /** `true` se vio, `false` no se vio, `null` es «No sé». Alguien lo eligió. */
  readonly vioAlAnimal: boolean | null
  readonly version: number
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

export type RegistroDeDiagnostico = {
  readonly id: string
  readonly ranchId: RanchId
  readonly animalId: AnimalId
  readonly fecha: string
  readonly resultado: string
  readonly reportedBy?: string | null
  readonly nota?: string | null
  /** Obligatorio. Omitirlo no se guarda como «no se vio». `null` es «No sé». */
  readonly vioAlAnimal?: boolean | null
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

export const CAMPOS_DE_DIAGNOSTICO = [
  'resultado',
  'fecha',
  'reportedBy',
  'nota',
  'vioAlAnimal',
] as const
export type CampoDeDiagnostico = (typeof CAMPOS_DE_DIAGNOSTICO)[number]

export type CambiosDeDiagnostico = {
  readonly resultado?: ResultadoDePrenez
  readonly fecha?: string
  readonly reportedBy?: string | null
  readonly nota?: string | null
  readonly vioAlAnimal?: boolean | null
}

export type ValorAnteriorDeDiagnostico = {
  readonly campo: CampoDeDiagnostico
  readonly valorAnterior: string | null
}

export type DiagnosticoCorregido = {
  readonly diagnostico: DiagnosticoDePrenez
  readonly anteriores: readonly ValorAnteriorDeDiagnostico[]
  readonly motivo: string
}

const VERSION_INICIAL = 1

/** Abre el diagnóstico. El resultado y si se vio al animal los elige quien anota. */
export function abrirDiagnostico(entrada: RegistroDeDiagnostico): DiagnosticoDePrenez {
  return {
    id: entrada.id,
    ranchId: entrada.ranchId,
    animalId: entrada.animalId,
    fecha: diaDeCalendario(entrada.fecha),
    resultado: resultadoDe(entrada.resultado),
    reportedBy: quienLoDijo(entrada.reportedBy),
    nota: textoOpcional(entrada.nota, LARGO_MAXIMO_NOTA),
    vioAlAnimal: vistoElegido(entrada.vioAlAnimal),
    version: VERSION_INICIAL,
    recordedBy: entrada.recordedBy,
    recordedAt: entrada.recordedAt,
  }
}

/**
 * Corrige el diagnóstico que ya está. Lo anterior queda en la historia con
 * quién, cuándo y por qué. Si nada cambió, no hay corrección. El animal no
 * cambia: un resultado equivocado no es otra hembra.
 */
export function corregirDiagnostico(
  actual: DiagnosticoDePrenez,
  cambios: CambiosDeDiagnostico,
  motivo: string,
): DiagnosticoCorregido {
  const motivoLimpio = motivoDe(motivo)
  const anteriores: ValorAnteriorDeDiagnostico[] = []

  let resultado = actual.resultado
  if (cambios.resultado !== undefined && cambios.resultado !== actual.resultado) {
    anteriores.push({ campo: 'resultado', valorAnterior: actual.resultado })
    resultado = resultadoDe(cambios.resultado)
  }

  let fecha = actual.fecha
  if (cambios.fecha !== undefined) {
    const nueva = diaDeCalendario(cambios.fecha)
    if (nueva !== actual.fecha) {
      anteriores.push({ campo: 'fecha', valorAnterior: actual.fecha })
      fecha = nueva
    }
  }

  let reportedBy = actual.reportedBy
  if (cambios.reportedBy !== undefined) {
    const nuevo = quienLoDijo(cambios.reportedBy)
    if (nuevo !== actual.reportedBy) {
      anteriores.push({ campo: 'reportedBy', valorAnterior: actual.reportedBy })
      reportedBy = nuevo
    }
  }

  let nota = actual.nota
  if (cambios.nota !== undefined) {
    const nueva = textoOpcional(cambios.nota, LARGO_MAXIMO_NOTA)
    if (nueva !== actual.nota) {
      anteriores.push({ campo: 'nota', valorAnterior: actual.nota })
      nota = nueva
    }
  }

  let vioAlAnimal = actual.vioAlAnimal
  if (cambios.vioAlAnimal !== undefined && cambios.vioAlAnimal !== actual.vioAlAnimal) {
    anteriores.push({ campo: 'vioAlAnimal', valorAnterior: textoDeVisto(actual.vioAlAnimal) })
    vioAlAnimal = vistoElegido(cambios.vioAlAnimal)
  }

  if (anteriores.length === 0) {
    throw new RechazoDeHerd('correccion_vacia')
  }

  return {
    diagnostico: {
      ...actual,
      resultado,
      fecha,
      reportedBy,
      nota,
      vioAlAnimal,
      version: actual.version + 1,
    },
    anteriores,
    motivo: motivoLimpio,
  }
}

function resultadoDe(valor: string): ResultadoDePrenez {
  if (!esResultadoDePrenez(valor)) {
    throw new RechazoDeHerd('resultado_invalido')
  }
  return valor
}

function quienLoDijo(valor: string | null | undefined): ReportedBy | null {
  if (valor === undefined || valor === null) {
    return null
  }
  const limpio = valor.trim()
  if (limpio === '' || limpio.length > LARGO_MAXIMO_REPORTED_BY) {
    throw new RechazoDeHerd('texto_invalido')
  }
  return reportedBySchema.parse(limpio)
}

function motivoDe(motivo: string): string {
  const limpio = motivo.trim()
  if (limpio === '') {
    throw new RechazoDeHerd('motivo_vacio')
  }
  if (limpio.length > LARGO_MAXIMO_MOTIVO) {
    throw new RechazoDeHerd('texto_invalido')
  }
  return limpio
}

function textoOpcional(valor: string | null | undefined, maximo: number): string | null {
  if (valor === undefined || valor === null) {
    return null
  }
  const limpio = valor.trim()
  if (limpio === '' || limpio.length > maximo) {
    throw new RechazoDeHerd('texto_invalido')
  }
  return limpio
}
