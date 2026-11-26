import { reportedBySchema, type RecordedBy, type ReportedBy } from '../../../shared-kernel/actores'
import type { AnimalId, RanchId } from '../../../shared-kernel/ids'

import { diaDeCalendario } from './dia'
import { RechazoDeHerd } from './errores'
import {
  LARGO_MAXIMO_MOTIVO,
  LARGO_MAXIMO_NOTA,
  LARGO_MAXIMO_REPORTED_BY,
} from './valores'

/**
 * El destete de una cría. Es un registro hermano de la ficha, no una columna
 * de `Animal` y no una salida: la cría sigue en el hato.
 *
 * El día lo elige quien anota: exacto, aproximado o «No sé». No hay valor por
 * omisión. Una cría tiene un destete; si el día estaba mal, se corrige y lo
 * anterior queda. El peso, si se anotó, no vive aquí: es un peso de Growth y
 * este hecho solo guarda su id.
 *
 * A qué edad o en qué temporada se desteta, y si se pesa, queda abierto
 * (`OQ-WEAN-001`). Aquí no se calcula un peso ajustado ni una meta.
 */

export const PRECISIONES_DE_DESTETE = ['exact', 'approximate'] as const
export type PrecisionDeDestete = (typeof PRECISIONES_DE_DESTETE)[number]

/** Lo que alguien eligió. `no_se` es «No sé» y no trae día. */
export type EleccionDeFecha = {
  readonly precision: PrecisionDeDestete | 'no_se'
  readonly fecha: string | null
}

export type Destete = {
  readonly id: string
  readonly ranchId: RanchId
  readonly animalId: AnimalId
  /** `null` cuando eligieron «No sé». */
  readonly fecha: string | null
  /** `null` junto con la fecha cuando eligieron «No sé». */
  readonly precision: PrecisionDeDestete | null
  readonly nota: string | null
  /** Quién lo dijo. `null` es «no se anotó». No es un usuario. */
  readonly reportedBy: ReportedBy | null
  /** Id del peso en Growth. `null` es un destete sin peso. Herd no guarda los kilos. */
  readonly pesoId: string | null
  readonly version: number
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

export type RegistroDeDestete = {
  readonly id: string
  readonly ranchId: RanchId
  readonly animalId: AnimalId
  readonly cuando: EleccionDeFecha
  readonly nota?: string | null
  readonly reportedBy?: string | null
  readonly pesoId?: string | null
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

export const CAMPOS_DE_DESTETE = ['fecha', 'precision', 'nota', 'reportedBy'] as const
export type CampoDeDestete = (typeof CAMPOS_DE_DESTETE)[number]

export type CambiosDeDestete = {
  readonly cuando?: EleccionDeFecha
  readonly nota?: string | null
  readonly reportedBy?: string | null
}

export type ValorAnteriorDeDestete = {
  readonly campo: CampoDeDestete
  readonly valorAnterior: string | null
}

export type DesteteCorregido = {
  readonly destete: Destete
  readonly anteriores: readonly ValorAnteriorDeDestete[]
  readonly motivo: string
}

const VERSION_INICIAL = 1

/**
 * El día elegido. Exacto o aproximado exigen una fecha de calendario. «No sé»
 * no acepta una fecha al lado: no se guarda un día que dijeron no saber.
 */
export function fechaElegida(eleccion: EleccionDeFecha): {
  fecha: string | null
  precision: PrecisionDeDestete | null
} {
  if (eleccion.precision === 'no_se') {
    if (eleccion.fecha !== null) {
      throw new RechazoDeHerd('fecha_incoherente')
    }
    return { fecha: null, precision: null }
  }
  if (eleccion.precision !== 'exact' && eleccion.precision !== 'approximate') {
    throw new RechazoDeHerd('fecha_sin_elegir')
  }
  if (eleccion.fecha === null) {
    throw new RechazoDeHerd('fecha_sin_elegir')
  }
  return { fecha: diaDeCalendario(eleccion.fecha), precision: eleccion.precision }
}

/** Abre el destete. No toca si el animal sigue en el hato: eso no es de este hecho. */
export function abrirDestete(entrada: RegistroDeDestete): Destete {
  const cuando = fechaElegida(entrada.cuando)
  return {
    id: entrada.id,
    ranchId: entrada.ranchId,
    animalId: entrada.animalId,
    fecha: cuando.fecha,
    precision: cuando.precision,
    nota: textoOpcional(entrada.nota, LARGO_MAXIMO_NOTA),
    reportedBy: quienLoDijo(entrada.reportedBy),
    pesoId: entrada.pesoId ?? null,
    version: VERSION_INICIAL,
    recordedBy: entrada.recordedBy,
    recordedAt: entrada.recordedAt,
  }
}

/**
 * Corrige el destete que ya está. Lo anterior queda con quién, cuándo y por
 * qué. El animal y el peso no cambian: un día equivocado no es otra cría ni
 * otro pesaje.
 */
export function corregirDestete(
  actual: Destete,
  cambios: CambiosDeDestete,
  motivo: string,
): DesteteCorregido {
  const motivoLimpio = motivoDe(motivo)
  const anteriores: ValorAnteriorDeDestete[] = []

  let fecha = actual.fecha
  let precision = actual.precision
  if (cambios.cuando !== undefined) {
    const nuevo = fechaElegida(cambios.cuando)
    if (nuevo.fecha !== actual.fecha) {
      anteriores.push({ campo: 'fecha', valorAnterior: actual.fecha })
      fecha = nuevo.fecha
    }
    const antes = actual.precision ?? 'no_se'
    const despues = nuevo.precision ?? 'no_se'
    if (antes !== despues) {
      anteriores.push({ campo: 'precision', valorAnterior: antes })
      precision = nuevo.precision
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

  let reportedBy = actual.reportedBy
  if (cambios.reportedBy !== undefined) {
    const nuevo = quienLoDijo(cambios.reportedBy)
    if (nuevo !== actual.reportedBy) {
      anteriores.push({ campo: 'reportedBy', valorAnterior: actual.reportedBy })
      reportedBy = nuevo
    }
  }

  if (anteriores.length === 0) {
    throw new RechazoDeHerd('correccion_vacia')
  }

  return {
    destete: { ...actual, fecha, precision, nota, reportedBy, version: actual.version + 1 },
    anteriores,
    motivo: motivoLimpio,
  }
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
