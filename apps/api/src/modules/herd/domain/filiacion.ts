import type { RecordedBy } from '../../../shared-kernel/actores'
import type { AnimalId, RanchId } from '../../../shared-kernel/ids'

import { diaDeCalendario } from './dia'
import { RechazoDeHerd } from './errores'
import { LARGO_MAXIMO_MOTIVO, LARGO_MAXIMO_NOTA } from './valores'

/**
 * Filiación de una cría. Es un registro hermano de la ficha: la madre y el
 * padre no son columnas de `Animal`.
 *
 * Cada lado es observado, inferido o desconocido. Inferido no es confirmado.
 * `unico_toro` es un motivo del padre inferido: nunca se guarda como observado
 * y nunca es motivo de la madre. La fecha de nacimiento vive aquí, exacta o
 * aproximada, porque es del parto y corregirla no reescribe la ficha.
 */

export const CERTEZAS_DE_FILIACION = ['observed', 'inferred', 'unknown'] as const
export type CertezaDeFiliacion = (typeof CERTEZAS_DE_FILIACION)[number]

export const MOTIVOS_DE_INFERENCIA = [
  'parto_visto',
  'dicho_de_trabajador',
  'unico_toro',
  'otro',
] as const
export type MotivoDeInferencia = (typeof MOTIVOS_DE_INFERENCIA)[number]

export const PRECISIONES_DE_FECHA = ['exact', 'approximate'] as const
export type PrecisionDeFecha = (typeof PRECISIONES_DE_FECHA)[number]

/** Un lado de la filiación. Desconocido no apunta a un animal ni trae motivo. */
export type LadoDeFiliacion = {
  readonly certeza: CertezaDeFiliacion
  readonly animalId: string | null
  readonly motivo: MotivoDeInferencia | null
}

export type Filiacion = {
  readonly id: string
  readonly ranchId: RanchId
  readonly criaId: AnimalId
  readonly madre: LadoDeFiliacion
  readonly padre: LadoDeFiliacion
  readonly nota: string | null
  readonly fechaNacimiento: string | null
  readonly precisionFecha: PrecisionDeFecha | null
  readonly version: number
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

/** Lo que estaba antes de corregir: la certeza, a quién apuntaba y la fecha. */
export type FiliacionAnterior = {
  readonly madre: LadoDeFiliacion
  readonly padre: LadoDeFiliacion
  readonly nota: string | null
  readonly fechaNacimiento: string | null
  readonly precisionFecha: PrecisionDeFecha | null
}

export type FiliacionCorregida = {
  readonly filiacion: Filiacion
  readonly anterior: FiliacionAnterior
  readonly motivo: string
}

export type AltaDeFiliacion = {
  readonly id: string
  readonly ranchId: RanchId
  readonly criaId: AnimalId
  readonly madre: LadoDeFiliacion
  readonly padre: LadoDeFiliacion
  readonly nota?: string | null
  readonly fechaNacimiento?: string | null
  readonly precisionFecha?: PrecisionDeFecha | null
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

/** Lo que la corrección propone. Lo que no viene, se queda. */
export type CambiosDeFiliacion = {
  readonly madre?: LadoDeFiliacion
  readonly padre?: LadoDeFiliacion
  readonly nota?: string | null
  readonly fechaNacimiento?: string | null
  readonly precisionFecha?: PrecisionDeFecha | null
}

const VERSION_INICIAL = 1

export function esCertezaDeFiliacion(valor: string): valor is CertezaDeFiliacion {
  return (CERTEZAS_DE_FILIACION as readonly string[]).includes(valor)
}

export function esMotivoDeInferencia(valor: string): valor is MotivoDeInferencia {
  return (MOTIVOS_DE_INFERENCIA as readonly string[]).includes(valor)
}

export function esPrecisionDeFecha(valor: string): valor is PrecisionDeFecha {
  return (PRECISIONES_DE_FECHA as readonly string[]).includes(valor)
}

/** Abre la filiación de una cría. Desconocido es un valor válido en los dos lados. */
export function abrirFiliacion(entrada: AltaDeFiliacion): Filiacion {
  const madre = ladoDe(entrada.madre, 'madre', entrada.criaId)
  const padre = ladoDe(entrada.padre, 'padre', entrada.criaId)
  exigirPadresDistintos(madre, padre)
  const fecha = fechaDe(entrada.fechaNacimiento, entrada.precisionFecha)

  return {
    id: entrada.id,
    ranchId: entrada.ranchId,
    criaId: entrada.criaId,
    madre,
    padre,
    nota: textoOpcional(entrada.nota, LARGO_MAXIMO_NOTA),
    fechaNacimiento: fecha.fechaNacimiento,
    precisionFecha: fecha.precisionFecha,
    version: VERSION_INICIAL,
    recordedBy: entrada.recordedBy,
    recordedAt: entrada.recordedAt,
  }
}

/**
 * Corrige la filiación que ya está. La cría no cambia: un padre equivocado no
 * es otro animal. Si nada cambió, no hay corrección.
 */
export function corregirFiliacion(
  actual: Filiacion,
  cambios: CambiosDeFiliacion,
  motivo: string,
): FiliacionCorregida {
  const motivoLimpio = motivoDe(motivo)
  const madre = cambios.madre === undefined ? actual.madre : ladoDe(cambios.madre, 'madre', actual.criaId)
  const padre = cambios.padre === undefined ? actual.padre : ladoDe(cambios.padre, 'padre', actual.criaId)
  exigirPadresDistintos(madre, padre)

  const fecha =
    cambios.fechaNacimiento === undefined && cambios.precisionFecha === undefined
      ? { fechaNacimiento: actual.fechaNacimiento, precisionFecha: actual.precisionFecha }
      : fechaDe(
          cambios.fechaNacimiento === undefined ? actual.fechaNacimiento : cambios.fechaNacimiento,
          cambios.precisionFecha === undefined ? actual.precisionFecha : cambios.precisionFecha,
        )

  const nota =
    cambios.nota === undefined ? actual.nota : textoOpcional(cambios.nota, LARGO_MAXIMO_NOTA)

  const siguiente: Filiacion = {
    ...actual,
    madre,
    padre,
    nota,
    fechaNacimiento: fecha.fechaNacimiento,
    precisionFecha: fecha.precisionFecha,
    version: actual.version + 1,
  }

  if (mismaDeclaracion(actual, siguiente)) {
    throw new RechazoDeHerd('correccion_vacia')
  }

  return {
    filiacion: siguiente,
    anterior: {
      madre: actual.madre,
      padre: actual.padre,
      nota: actual.nota,
      fechaNacimiento: actual.fechaNacimiento,
      precisionFecha: actual.precisionFecha,
    },
    motivo: motivoLimpio,
  }
}

/**
 * `unico_toro` solo aplica si ese toro es el único toro activo y es el padre
 * que se está infiriendo. Cero o varios toros no alcanzan para ese motivo.
 */
export function exigirUnicoToro(padre: LadoDeFiliacion, idsDeTorosActivos: readonly string[]): void {
  if (padre.motivo !== 'unico_toro') {
    return
  }
  const unico = idsDeTorosActivos.length === 1 ? idsDeTorosActivos[0] : undefined
  if (unico === undefined || unico !== padre.animalId) {
    throw new RechazoDeHerd('unico_toro_no_aplica')
  }
}

function ladoDe(lado: LadoDeFiliacion, rol: 'madre' | 'padre', criaId: string): LadoDeFiliacion {
  if (lado.certeza === 'unknown') {
    if (lado.animalId !== null || lado.motivo !== null) {
      throw new RechazoDeHerd('filiacion_incoherente')
    }
    return { certeza: 'unknown', animalId: null, motivo: null }
  }

  if (lado.animalId === null || lado.animalId === criaId) {
    throw new RechazoDeHerd('filiacion_incoherente')
  }

  if (lado.certeza === 'observed') {
    // Observado no lleva motivo. `unico_toro` tampoco se guarda como observado.
    if (lado.motivo !== null) {
      throw new RechazoDeHerd('filiacion_incoherente')
    }
    return { certeza: 'observed', animalId: lado.animalId, motivo: null }
  }

  if (lado.motivo === null || (rol === 'madre' && lado.motivo === 'unico_toro')) {
    throw new RechazoDeHerd('filiacion_incoherente')
  }

  return { certeza: 'inferred', animalId: lado.animalId, motivo: lado.motivo }
}

function exigirPadresDistintos(madre: LadoDeFiliacion, padre: LadoDeFiliacion): void {
  if (madre.animalId !== null && madre.animalId === padre.animalId) {
    throw new RechazoDeHerd('filiacion_incoherente')
  }
}

function fechaDe(
  fecha: string | null | undefined,
  precision: PrecisionDeFecha | null | undefined,
): { fechaNacimiento: string | null; precisionFecha: PrecisionDeFecha | null } {
  const dia = fecha === undefined || fecha === null ? null : diaDeCalendario(fecha)
  const precisionLimpia = precision ?? null
  if (dia === null && precisionLimpia === null) {
    return { fechaNacimiento: null, precisionFecha: null }
  }
  if (dia !== null && (precisionLimpia === 'exact' || precisionLimpia === 'approximate')) {
    return { fechaNacimiento: dia, precisionFecha: precisionLimpia }
  }
  throw new RechazoDeHerd('filiacion_incoherente')
}

function mismaDeclaracion(actual: Filiacion, siguiente: Filiacion): boolean {
  return (
    mismoLado(actual.madre, siguiente.madre) &&
    mismoLado(actual.padre, siguiente.padre) &&
    actual.nota === siguiente.nota &&
    actual.fechaNacimiento === siguiente.fechaNacimiento &&
    actual.precisionFecha === siguiente.precisionFecha
  )
}

function mismoLado(a: LadoDeFiliacion, b: LadoDeFiliacion): boolean {
  return a.certeza === b.certeza && a.animalId === b.animalId && a.motivo === b.motivo
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
