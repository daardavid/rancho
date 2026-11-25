import type { RecordedBy } from '../../../shared-kernel/actores'
import type { AnimalId, RanchId } from '../../../shared-kernel/ids'

import { diaDeCalendario } from './dia'
import { RechazoDeHerd } from './errores'
import { LARGO_MAXIMO_NOTA } from './valores'

/**
 * Dónde se espera a un animal desde un día.
 *
 * Es un hecho histórico: se agrega y no se edita. Un movimiento no borra el
 * anterior; el lugar vigente es la última asignación. `unknown` es un valor
 * pleno: no saber dónde está el animal es distinto de no haberlo asignado, y
 * las dos cosas se ven distintas.
 *
 * No es una observación del animal y no toca su última observación
 * ([domain-boundaries](../../../../../../docs/architecture/domain-boundaries.md),
 * «Paddock reference and expected location»). Tampoco afirma que el potrero
 * cubra el rancho ni que el animal esté ahí: dice dónde se le espera.
 */
export type AsignacionDeLugar = {
  readonly id: string
  readonly ranchId: RanchId
  readonly animalId: AnimalId
  /** `null` es desconocido: el rancho no sabe dónde se le espera. */
  readonly potreroId: string | null
  /** El día desde el que vale. */
  readonly desde: string
  readonly nota: string | null
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

export type RegistroDeAsignacion = {
  readonly id: string
  readonly ranchId: RanchId
  readonly animalId: AnimalId
  readonly potreroId: string | null
  readonly desde: string
  readonly nota?: string | null
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

/**
 * Abre la asignación. `desde` es el día en que empieza a valer; si no se dice,
 * no se inventa una fecha: el dominio exige el día y el borde lo pide.
 */
export function asignarLugar(entrada: RegistroDeAsignacion): AsignacionDeLugar {
  return {
    id: entrada.id,
    ranchId: entrada.ranchId,
    animalId: entrada.animalId,
    potreroId: entrada.potreroId,
    desde: diaDeCalendario(entrada.desde),
    nota: notaOpcional(entrada.nota),
    recordedBy: entrada.recordedBy,
    recordedAt: entrada.recordedAt,
  }
}

/**
 * La asignación vigente de una lista, por animal.
 *
 * La última es la de día más reciente; si dos comparten día, la que se registró
 * después; si empatan las dos cosas, la del id mayor, para que dos consultas
 * seguidas no cambien de respuesta. Es el mismo desempate que usa la serie de
 * pesos.
 */
export function vigentesPorAnimal(
  asignaciones: readonly AsignacionDeLugar[],
): ReadonlyMap<string, AsignacionDeLugar> {
  const vigentes = new Map<string, AsignacionDeLugar>()
  for (const asignacion of asignaciones) {
    const actual = vigentes.get(asignacion.animalId)
    if (actual === undefined || esPosterior(asignacion, actual)) {
      vigentes.set(asignacion.animalId, asignacion)
    }
  }
  return vigentes
}

/** La última de dos: el día manda, y el registro desempata. */
export function esPosterior(candidata: AsignacionDeLugar, actual: AsignacionDeLugar): boolean {
  if (candidata.desde !== actual.desde) {
    return candidata.desde > actual.desde
  }
  const registrada = candidata.recordedAt.getTime()
  const registradaActual = actual.recordedAt.getTime()
  if (registrada !== registradaActual) {
    return registrada > registradaActual
  }
  return candidata.id > actual.id
}

function notaOpcional(valor: string | null | undefined): string | null {
  if (valor === undefined || valor === null) {
    return null
  }
  const limpio = valor.trim()
  if (limpio === '' || limpio.length > LARGO_MAXIMO_NOTA) {
    throw new RechazoDeHerd('texto_invalido')
  }
  return limpio
}
