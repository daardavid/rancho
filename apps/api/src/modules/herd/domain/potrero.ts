import type { RecordedBy } from '../../../shared-kernel/actores'
import type { RanchId } from '../../../shared-kernel/ids'

import { RechazoDeHerd } from './errores'
import { LARGO_MAXIMO_MOTIVO, LARGO_MAXIMO_NOMBRE, LARGO_MAXIMO_NOTA } from './valores'

/**
 * Un potrero tal como el rancho lo nombra.
 *
 * Es una referencia, no un agregado de tierra: no guarda hectáreas, carga
 * animal, agua, pasto, arrendamiento ni forma en un mapa
 * ([domain-boundaries](../../../../../../docs/architecture/domain-boundaries.md),
 * «Paddock reference and expected location»). Son unos ocho y no cubren las
 * aproximadamente 530 hectáreas: eso no se afirma en ninguna parte.
 *
 * Puede estar incompleto: un nombre desconocido es válido. El id interno es el
 * que sostiene la relación; el nombre es cómo se le dice.
 */
export type Potrero = {
  readonly id: string
  readonly ranchId: RanchId
  readonly nombre: string | null
  readonly nota: string | null
  readonly version: number
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

export type RegistroDePotrero = {
  readonly id: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
  readonly nombre?: string
  readonly nota?: string
}

/** Cada clave presente es un cambio. `null` borra el texto. Omitir es no tocarlo. */
export type CambiosDePotrero = {
  readonly nombre?: string | null
  readonly nota?: string | null
}

export type CampoDePotrero = 'nombre' | 'nota'

export type ValorAnteriorDePotrero = {
  readonly campo: CampoDePotrero
  readonly valorAnterior: string | null
}

export type PotreroCorregido = {
  readonly potrero: Potrero
  readonly anteriores: readonly ValorAnteriorDePotrero[]
  readonly motivo: string
}

const VERSION_INICIAL = 1

/** Abre el potrero. Si no se sabe el nombre, se deja en blanco: no se inventa. */
export function abrirPotrero(entrada: RegistroDePotrero): Potrero {
  return {
    id: entrada.id,
    ranchId: entrada.ranchId,
    nombre: textoOpcional(entrada.nombre, LARGO_MAXIMO_NOMBRE),
    nota: textoOpcional(entrada.nota, LARGO_MAXIMO_NOTA),
    version: VERSION_INICIAL,
    recordedBy: entrada.recordedBy,
    recordedAt: entrada.recordedAt,
  }
}

/**
 * Renombra o anota otra vez. El potrero es el mismo: el id no se toca y el
 * valor anterior queda en la historia con quién, cuándo y por qué. Sin algún
 * cambio de verdad no hay hecho nuevo que guardar.
 */
export function corregirPotrero(
  potrero: Potrero,
  cambios: CambiosDePotrero,
  motivo: string,
): PotreroCorregido {
  const motivoLimpio = motivoDe(motivo)
  const anteriores: ValorAnteriorDePotrero[] = []
  let siguiente = potrero

  const cambiar = (campo: CampoDePotrero, valor: string | null): void => {
    if (potrero[campo] === valor) {
      return
    }
    anteriores.push({ campo, valorAnterior: potrero[campo] })
    siguiente = { ...siguiente, [campo]: valor }
  }

  if ('nombre' in cambios && cambios.nombre !== undefined) {
    cambiar('nombre', textoOpcional(cambios.nombre, LARGO_MAXIMO_NOMBRE))
  }
  if ('nota' in cambios && cambios.nota !== undefined) {
    cambiar('nota', textoOpcional(cambios.nota, LARGO_MAXIMO_NOTA))
  }

  if (anteriores.length === 0) {
    throw new RechazoDeHerd('correccion_vacia')
  }

  return {
    potrero: { ...siguiente, version: potrero.version + 1 },
    anteriores,
    motivo: motivoLimpio,
  }
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
