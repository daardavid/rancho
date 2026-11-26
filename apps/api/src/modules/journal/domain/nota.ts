import type { RecordedBy } from '../../../shared-kernel/actores'
import type { RanchId } from '../../../shared-kernel/ids'

import { diaDeCalendario } from './dia'
import { RechazoDeJournal } from './errores'
import { LARGO_MAXIMO_MOTIVO, LARGO_MAXIMO_QUIEN, LARGO_MAXIMO_TEXTO } from './valores'

/**
 * Nota de bitácora: algo con fecha que no es de un animal (lluvia, quema,
 * agua, cerca). Vive en `journal`, no en la ficha.
 *
 * El tipo y si el día es exacto o aproximado los elige quien anota. No hay
 * valor por omisión: si no elige, la nota no se abre. Así no se guarda
 * «Otro» ni «fecha exacta» porque nadie lo tocó.
 *
 * `OQ-FIRE-001` y `OQ-ENV-001` siguen abiertas. Anotar «hubo quema» o
 * «llovió» no dice la causa, la frecuencia, el daño ni una lluvia medida.
 * El potrero, si viene, es una referencia a uno que ya existe; esta nota no
 * lo crea. Quién lo dijo no es un usuario.
 */

export const TIPOS_DE_BITACORA = ['lluvia', 'quema', 'agua', 'cerca', 'otro'] as const
export type TipoDeBitacora = (typeof TIPOS_DE_BITACORA)[number]

export const PRECISIONES_DE_NOTA = ['exact', 'approximate'] as const
export type PrecisionDeNota = (typeof PRECISIONES_DE_NOTA)[number]

export function esTipoDeBitacora(valor: string): valor is TipoDeBitacora {
  return (TIPOS_DE_BITACORA as readonly string[]).includes(valor)
}

export function esPrecisionDeNota(valor: string): valor is PrecisionDeNota {
  return (PRECISIONES_DE_NOTA as readonly string[]).includes(valor)
}

export type NotaDeBitacora = {
  readonly id: string
  readonly ranchId: RanchId
  readonly tipo: TipoDeBitacora
  readonly texto: string
  /** El día del que habla la nota, no el día en que se anotó. */
  readonly fecha: string
  readonly precision: PrecisionDeNota
  /** Potrero ya existente. `null` es «no es de un potrero». */
  readonly potreroId: string | null
  /** Quién lo dijo. `null` es «no se anotó». No es un id de usuario. */
  readonly reportedBy: string | null
  readonly evidenciaId: string | null
  readonly version: number
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

export type RegistroDeNota = {
  readonly id: string
  readonly ranchId: RanchId
  readonly tipo: string
  readonly texto: string
  readonly fecha: string
  readonly precision: string
  readonly potreroId?: string | null
  readonly reportedBy?: string | null
  readonly evidenciaId?: string | null
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

export const CAMPOS_DE_NOTA = [
  'tipo',
  'texto',
  'fecha',
  'precision',
  'potrero',
  'reportedBy',
  'evidencia',
] as const
export type CampoDeNota = (typeof CAMPOS_DE_NOTA)[number]

export type CambiosDeNota = {
  readonly tipo?: string
  readonly texto?: string
  readonly fecha?: string
  readonly precision?: string
  readonly potreroId?: string | null
  readonly reportedBy?: string | null
  readonly evidenciaId?: string | null
}

export type ValorAnteriorDeNota = {
  readonly campo: CampoDeNota
  readonly valorAnterior: string | null
}

export type NotaCorregida = {
  readonly nota: NotaDeBitacora
  readonly anteriores: readonly ValorAnteriorDeNota[]
  readonly motivo: string
}

const VERSION_INICIAL = 1

/** Abre la nota. Sin tipo o sin precisión elegida, no se abre. */
export function abrirNota(entrada: RegistroDeNota): NotaDeBitacora {
  return {
    id: entrada.id,
    ranchId: entrada.ranchId,
    tipo: tipoDe(entrada.tipo),
    texto: textoObligatorio(entrada.texto),
    fecha: diaDeCalendario(entrada.fecha),
    precision: precisionDe(entrada.precision),
    potreroId: idOpcional(entrada.potreroId),
    reportedBy: quienLoDijo(entrada.reportedBy),
    evidenciaId: idOpcional(entrada.evidenciaId),
    version: VERSION_INICIAL,
    recordedBy: entrada.recordedBy,
    recordedAt: entrada.recordedAt,
  }
}

/**
 * Corrige la nota que ya está. Lo anterior queda, con quién, cuándo y por qué.
 * Si nada cambió, no hay corrección.
 */
export function corregirNota(
  actual: NotaDeBitacora,
  cambios: CambiosDeNota,
  motivo: string,
): NotaCorregida {
  const motivoLimpio = motivoDe(motivo)
  const anteriores: ValorAnteriorDeNota[] = []

  let tipo = actual.tipo
  if (cambios.tipo !== undefined && cambios.tipo !== actual.tipo) {
    anteriores.push({ campo: 'tipo', valorAnterior: actual.tipo })
    tipo = tipoDe(cambios.tipo)
  }

  let texto = actual.texto
  if (cambios.texto !== undefined) {
    const nuevo = textoObligatorio(cambios.texto)
    if (nuevo !== actual.texto) {
      anteriores.push({ campo: 'texto', valorAnterior: actual.texto })
      texto = nuevo
    }
  }

  let fecha = actual.fecha
  if (cambios.fecha !== undefined) {
    const nueva = diaDeCalendario(cambios.fecha)
    if (nueva !== actual.fecha) {
      anteriores.push({ campo: 'fecha', valorAnterior: actual.fecha })
      fecha = nueva
    }
  }

  let precision = actual.precision
  if (cambios.precision !== undefined && cambios.precision !== actual.precision) {
    anteriores.push({ campo: 'precision', valorAnterior: actual.precision })
    precision = precisionDe(cambios.precision)
  }

  let potreroId = actual.potreroId
  if (cambios.potreroId !== undefined) {
    const nuevo = idOpcional(cambios.potreroId)
    if (nuevo !== actual.potreroId) {
      anteriores.push({ campo: 'potrero', valorAnterior: actual.potreroId })
      potreroId = nuevo
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

  let evidenciaId = actual.evidenciaId
  if (cambios.evidenciaId !== undefined) {
    const nueva = idOpcional(cambios.evidenciaId)
    if (nueva !== actual.evidenciaId) {
      anteriores.push({ campo: 'evidencia', valorAnterior: actual.evidenciaId })
      evidenciaId = nueva
    }
  }

  if (anteriores.length === 0) {
    throw new RechazoDeJournal('correccion_vacia')
  }

  return {
    nota: {
      ...actual,
      tipo,
      texto,
      fecha,
      precision,
      potreroId,
      reportedBy,
      evidenciaId,
      version: actual.version + 1,
    },
    anteriores,
    motivo: motivoLimpio,
  }
}

function tipoDe(valor: string): TipoDeBitacora {
  if (!esTipoDeBitacora(valor)) {
    throw new RechazoDeJournal('tipo_de_bitacora_invalido')
  }
  return valor
}

function precisionDe(valor: string): PrecisionDeNota {
  if (!esPrecisionDeNota(valor)) {
    throw new RechazoDeJournal('precision_sin_elegir')
  }
  return valor
}

function motivoDe(motivo: string): string {
  const limpio = motivo.trim()
  if (limpio === '') {
    throw new RechazoDeJournal('motivo_vacio')
  }
  if (limpio.length > LARGO_MAXIMO_MOTIVO) {
    throw new RechazoDeJournal('texto_invalido')
  }
  return limpio
}

function textoObligatorio(valor: string): string {
  const limpio = valor.trim()
  if (limpio === '' || limpio.length > LARGO_MAXIMO_TEXTO) {
    throw new RechazoDeJournal('texto_invalido')
  }
  return limpio
}

/** Vacío o ausente es «no se anotó». Un texto solo de espacios no es un quién. */
function quienLoDijo(valor: string | null | undefined): string | null {
  if (valor === undefined || valor === null) {
    return null
  }
  const limpio = valor.trim()
  if (limpio === '') {
    return null
  }
  if (limpio.length > LARGO_MAXIMO_QUIEN) {
    throw new RechazoDeJournal('texto_invalido')
  }
  return limpio
}

/** Sin referencia es `null`. Un texto vacío no es un id. */
function idOpcional(valor: string | null | undefined): string | null {
  if (valor === undefined || valor === null) {
    return null
  }
  const limpio = valor.trim()
  if (limpio === '') {
    throw new RechazoDeJournal('texto_invalido')
  }
  return limpio
}
