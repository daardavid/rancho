import type { MesDeTendencia } from '@rancho/api-contracts'

/**
 * Cómo se ve una gráfica: los colores y las marcas de cada serie.
 *
 * Los colores son los de [la guía visual](../../../../../docs/design/guia-visual.md),
 * no los que ECharts pone por omisión. Aquí no hay ningún color fuera de esa
 * tabla: verde para lo que va bien y para la serie principal, ámbar para lo que
 * hay que revisar, y neutros para el resto.
 *
 * El color nunca es la única señal. Cada animal cambia además de símbolo y de
 * trazo, y cada motivo de salida cambia de trama. Quien no distingue los
 * colores sigue leyendo qué línea es cuál por la forma de sus puntos y por la
 * trama de su barra; la leyenda pone el nombre.
 *
 * Este archivo no importa ECharts: la pantalla lo lee sin bajar el trozo de las
 * gráficas y la prueba puede leerlo sin lienzo.
 *
 * Los valores son hex y no `var(--verde)` porque el lienzo de la gráfica no lee
 * el CSS de la página: son los mismos valores de `estilos.css`.
 */

export const VERDE = '#1f5c3f'
export const TINTA = '#1c1f1a'
export const SUAVE = '#5c6258'
export const AMBAR_FUERTE = '#6b3a00'
export const AMBAR_TEXTO = '#8a4b00'
export const AMBAR_BARRA = '#d9a55b'
export const BORDE = '#e3e0d8'
export const BLANCO = '#ffffff'

/** Los colores de la guía que una serie puede usar. Nada de la paleta de ECharts. */
export const COLORES_DE_LA_GUIA: readonly string[] = [
  VERDE,
  TINTA,
  SUAVE,
  AMBAR_FUERTE,
  AMBAR_TEXTO,
  AMBAR_BARRA,
]

/** Los símbolos del punto. Distintos entre sí a simple vista, también sin color. */
export const SIMBOLOS = ['circle', 'rect', 'triangle', 'diamond', 'pin', 'arrow'] as const
export type Simbolo = (typeof SIMBOLOS)[number]

/** El trazo de la línea. Un trazo distinto por animal, además del símbolo. */
export const TRAZOS = ['solid', 'dashed', 'dotted'] as const
export type Trazo = (typeof TRAZOS)[number]

const COLORES_DE_ANIMAL = [VERDE, TINTA, AMBAR_FUERTE, SUAVE] as const

export type MarcaDeAnimal = {
  readonly color: string
  readonly simbolo: Simbolo
  readonly trazo: Trazo
}

/**
 * La marca del animal que va en esta posición de la gráfica.
 *
 * Los tres ciclos tienen longitudes que no se dividen entre sí (4 colores, 6
 * símbolos y 3 trazos): los primeros doce animales no repiten combinación. Con
 * más de doce vuelve a empezar, y la leyenda sigue diciendo el nombre.
 */
export function marcaDeAnimal(indice: number): MarcaDeAnimal {
  const posicion = Math.abs(Math.trunc(indice))
  return {
    color: COLORES_DE_ANIMAL[posicion % COLORES_DE_ANIMAL.length] ?? TINTA,
    simbolo: SIMBOLOS[posicion % SIMBOLOS.length] ?? 'circle',
    trazo: TRAZOS[posicion % TRAZOS.length] ?? 'solid',
  }
}

/**
 * La marca de la línea de ganancia media del hato: la serie principal, en verde
 * y con el trazo más simple. Es una sola, no compite con nadie.
 */
export const MARCA_DE_VUELTAS: MarcaDeAnimal = {
  color: VERDE,
  simbolo: 'circle',
  trazo: 'solid',
}

/**
 * La barra de nacimientos: verde y lisa. Las salidas llevan trama, así que la
 * barra lisa se reconoce sola.
 */
export const COLOR_DE_NACIMIENTOS = VERDE

export type MotivoDeSalida = MesDeTendencia['salidas'][number]['motivo']

/**
 * La trama de una barra, en el formato de `decal` de ECharts.
 *
 * Se declara aquí y no se importa el tipo de la biblioteca para que este
 * archivo siga sin depender de ECharts. La forma es la que ECharts acepta.
 */
export type Decal = {
  readonly symbol: 'circle' | 'rect' | 'triangle'
  readonly symbolSize: number
  readonly dashArrayX: readonly number[]
  readonly dashArrayY: readonly number[]
  readonly rotation?: number
}

export type MarcaDeMotivo = {
  readonly color: string
  /** La trama que distingue el motivo aunque no se vea el color. */
  readonly decal: Decal
}

const DECAL_DE_PUNTOS: Decal = {
  symbol: 'circle',
  symbolSize: 4,
  dashArrayX: [1, 0],
  dashArrayY: [1, 4],
}

const DECAL_DE_RAYAS: Decal = {
  symbol: 'rect',
  symbolSize: 8,
  dashArrayX: [1, 0],
  dashArrayY: [2, 4],
}

const DECAL_DE_DIAGONAL: Decal = {
  symbol: 'rect',
  symbolSize: 8,
  dashArrayX: [1, 0],
  dashArrayY: [2, 4],
  rotation: Math.PI / 4,
}

const DECAL_DE_TABLERO: Decal = {
  symbol: 'rect',
  symbolSize: 4,
  dashArrayX: [3, 3],
  dashArrayY: [3, 3],
}

const DECAL_DE_TRIANGULOS: Decal = {
  symbol: 'triangle',
  symbolSize: 6,
  dashArrayX: [1, 0],
  dashArrayY: [1, 4],
}

/**
 * Cada motivo de salida tiene su tono de ámbar o su neutro, y su trama.
 *
 * Que un animal haya muerto no es «revisar» ni «sin datos»: aquí los colores
 * solo separan una serie de otra dentro del mismo bloque apilado, y el motivo
 * se lee en la leyenda. No se inventa un significado nuevo para el verde ni
 * para el ámbar.
 */
const MARCAS_DE_MOTIVO: Record<MotivoDeSalida, MarcaDeMotivo> = {
  sale: { color: AMBAR_BARRA, decal: DECAL_DE_PUNTOS },
  death: { color: TINTA, decal: DECAL_DE_RAYAS },
  confirmed_missing: { color: AMBAR_FUERTE, decal: DECAL_DE_DIAGONAL },
  other: { color: SUAVE, decal: DECAL_DE_TABLERO },
  unknown: { color: AMBAR_TEXTO, decal: DECAL_DE_TRIANGULOS },
}

export function marcaDeMotivo(motivo: MotivoDeSalida): MarcaDeMotivo {
  return MARCAS_DE_MOTIVO[motivo]
}

/** El orden en que se apilan las salidas y se leen en la leyenda. */
export const ORDEN_DE_MOTIVOS: readonly MotivoDeSalida[] = [
  'sale',
  'death',
  'confirmed_missing',
  'other',
  'unknown',
]
