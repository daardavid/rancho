import type { RecordedBy } from '../../../shared-kernel/actores'
import type { AnimalId, RanchId } from '../../../shared-kernel/ids'

import { diaOpcional } from './dia'
import { RechazoDeHerd } from './errores'
import { LARGO_MAXIMO_MARCA, type EstadoDeMarca, type TipoDeMarca } from './valores'

/**
 * Una marca del animal. Reemplazarla o perderla no la borra: el valor anterior
 * sigue identificando a la misma ficha. No es una columna que el guardado de
 * la ficha pise.
 */
export type Marca = {
  readonly id: string
  readonly ranchId: RanchId
  readonly animalId: AnimalId
  readonly tipo: TipoDeMarca
  readonly valor: string
  readonly desde: string | null
  readonly estado: EstadoDeMarca
  readonly cambiadaEl: string | null
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

export type AltaDeMarca = {
  readonly id: string
  readonly ranchId: RanchId
  readonly animalId: AnimalId
  readonly tipo: TipoDeMarca
  readonly valor: string
  readonly desde?: string | null
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

/** La marca nace vigente. El día de inicio puede no saberse. */
export function crearMarca(entrada: AltaDeMarca): Marca {
  return {
    id: entrada.id,
    ranchId: entrada.ranchId,
    animalId: entrada.animalId,
    tipo: entrada.tipo,
    valor: valorDeMarca(entrada.valor),
    desde: diaOpcional(entrada.desde),
    estado: 'active',
    cambiadaEl: null,
    recordedBy: entrada.recordedBy,
    recordedAt: entrada.recordedAt,
  }
}

/**
 * La marca deja de estar vigente y conserva su valor. El día del reemplazo
 * puede ser desconocido.
 */
export function reemplazarMarca(marca: Marca, cambiadaEl: string | null | undefined): Marca {
  return cerrar(marca, 'replaced', cambiadaEl)
}

/** Se perdió. El animal sigue en la ficha; la marca sigue sirviendo para buscarlo. */
export function perderMarca(marca: Marca, cambiadaEl: string | null | undefined): Marca {
  return cerrar(marca, 'lost', cambiadaEl)
}

function cerrar(marca: Marca, estado: 'replaced' | 'lost', cambiadaEl: string | null | undefined): Marca {
  if (marca.estado !== 'active') {
    throw new RechazoDeHerd('marca_no_activa')
  }

  return {
    ...marca,
    estado,
    cambiadaEl: diaOpcional(cambiadaEl),
  }
}

function valorDeMarca(valor: string): string {
  const limpio = valor.trim()
  if (limpio === '' || limpio.length > LARGO_MAXIMO_MARCA) {
    throw new RechazoDeHerd('marca_invalida')
  }
  return limpio
}
