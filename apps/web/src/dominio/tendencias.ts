import type { SerieDeTendencia, Tendencias } from '@rancho/api-contracts'

/**
 * Cuándo una gráfica dice algo y cuándo dice que todavía no.
 *
 * Los números salen de la lectura. Aquí no se promedia, no se rellena un hueco
 * y no se propone una meta. Un corte entre tramos es un hueco real: no es un
 * peso y la línea no lo cruza.
 */

export const VUELTAS_PARA_TENDENCIA = 4
export const PESAJES_PARA_LINEA = 2
export const MESES_PARA_TENDENCIA = 2

export type PuntoDibujable = SerieDeTendencia['pesos'][number]

export type AnimalParaGraficar = {
  readonly animalId: string
  readonly nombre: string
  readonly tramos: readonly (readonly PuntoDibujable[])[]
}

export function nombreDeAnimal(nombre: string | null): string {
  return nombre ?? 'Sin nombre o seña'
}

/**
 * `null` cuando ya se puede dibujar la media por vuelta.
 *
 * Con menos de cuatro vueltas se dice cuántas hay. Con cuatro o más, si no hay
 * al menos dos pares, tampoco se inventa la línea.
 */
export function textoDeVueltas(
  vueltas: readonly { readonly gananciaMediaKilosPorDia: string | null }[],
): string | null {
  if (vueltas.length < VUELTAS_PARA_TENDENCIA) {
    const palabra = vueltas.length === 1 ? 'vuelta' : 'vueltas'
    return `Hay ${vueltas.length} ${palabra}. La tendencia se ve a partir de ${VUELTAS_PARA_TENDENCIA}.`
  }

  const conPar = vueltas.filter((vuelta) => vuelta.gananciaMediaKilosPorDia !== null).length
  if (conPar >= 2) {
    return null
  }
  if (conPar === 0) {
    return `Hay ${vueltas.length} vueltas. Ninguna tiene un par de pesos. La línea se ve a partir de 2.`
  }
  return `Hay ${vueltas.length} vueltas. Solo 1 tiene un par de pesos. La línea se ve a partir de 2.`
}

/** `null` cuando hay meses de sobra para ver el movimiento. */
export function textoDeMeses(cantidad: number): string | null {
  if (cantidad >= MESES_PARA_TENDENCIA) {
    return null
  }
  const palabra = cantidad === 1 ? 'mes' : 'meses'
  return `Hay ${cantidad} ${palabra} con nacimientos o salidas. La tendencia se ve a partir de ${MESES_PARA_TENDENCIA}.`
}

export function notaSinFecha(cantidad: number, hecho: 'nacimiento' | 'salida'): string | null {
  if (cantidad === 0) {
    return null
  }
  if (hecho === 'nacimiento') {
    return cantidad === 1
      ? '1 nacimiento sin fecha no entra en la gráfica.'
      : `${cantidad} nacimientos sin fecha no entran en la gráfica.`
  }
  return cantidad === 1
    ? '1 salida sin fecha no entra en la gráfica.'
    : `${cantidad} salidas sin fecha no entran en la gráfica.`
}

/**
 * Parte la serie donde hubo un hueco entre dos pesos.
 *
 * El hueco no se vuelve un punto. Los pesos quedan en tramos distintos para
 * que la línea no los una.
 */
export function tramosDePesos(
  pesos: readonly PuntoDibujable[],
  huecos: readonly { readonly fecha: string }[],
): readonly (readonly PuntoDibujable[])[] {
  const tramos: PuntoDibujable[][] = []
  let actual: PuntoDibujable[] = []

  for (let indice = 0; indice < pesos.length; indice += 1) {
    const peso = pesos[indice]
    if (peso === undefined) {
      continue
    }
    const previo = pesos[indice - 1]
    const hayHueco =
      previo !== undefined &&
      huecos.some((hueco) => hueco.fecha > previo.fecha && hueco.fecha < peso.fecha)
    if (hayHueco && actual.length > 0) {
      tramos.push(actual)
      actual = []
    }
    actual.push(peso)
  }

  if (actual.length > 0) {
    tramos.push(actual)
  }
  return tramos
}

export function animalesParaGraficar(
  series: readonly SerieDeTendencia[],
  elegidos: readonly string[],
): { readonly animales: readonly AnimalParaGraficar[]; readonly avisos: readonly string[] } {
  if (elegidos.length === 0) {
    return series.length === 0
      ? { animales: [], avisos: ['Hay 0 pesajes. La línea se ve a partir de 2.'] }
      : { animales: [], avisos: ['Elige uno o varios animales.'] }
  }

  const elegidosSet = new Set(elegidos)
  const seleccion = series.filter((serie) => elegidosSet.has(serie.animalId))
  const animales: AnimalParaGraficar[] = []
  const cortos: SerieDeTendencia[] = []

  for (const serie of seleccion) {
    if (serie.pesos.length < PESAJES_PARA_LINEA) {
      cortos.push(serie)
      continue
    }
    animales.push({
      animalId: serie.animalId,
      nombre: nombreDeAnimal(serie.nombre),
      tramos: tramosDePesos(serie.pesos, serie.huecos),
    })
  }

  return { animales, avisos: avisosDePesajes(cortos) }
}

export function hayPesoNoMedido(animales: readonly AnimalParaGraficar[]): boolean {
  return animales.some((animal) =>
    animal.tramos.some((tramo) => tramo.some((punto) => punto.calidad !== 'measured')),
  )
}

function avisosDePesajes(cortos: readonly SerieDeTendencia[]): readonly string[] {
  if (cortos.length === 0) {
    return []
  }
  if (cortos.length === 1) {
    const unico = cortos[0]
    if (unico === undefined) {
      return []
    }
    return [textoDePesajes(unico.pesos.length)]
  }
  return cortos.map(
    (serie) => `${nombreDeAnimal(serie.nombre)}: ${textoDePesajes(serie.pesos.length, true)}`,
  )
}

function textoDePesajes(cantidad: number, enMinuscula = false): string {
  const palabra = cantidad === 1 ? 'pesaje' : 'pesajes'
  const hay = enMinuscula ? 'hay' : 'Hay'
  return `${hay} ${cantidad} ${palabra}. La línea se ve a partir de 2.`
}

export type DatosDeTendencias = Tendencias
