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
 * archivo siga sin depender de ECharts. La forma es la que ECharts acepta
 * (`lib/util/decal.js`, `lib/model/globalDefault.js`), y tiene dos reglas que
 * se rompen fácil:
 *
 * - `dashArrayX`/`dashArrayY` son las celdas del mosaico, en píxeles: se pinta
 *   una celda sí y la siguiente no, y un renglón anidado alterna el dibujo de
 *   izquierda a derecha (así se escalona un punto respecto al de abajo).
 * - `symbolSize` es una proporción en `(0, 1]` de esa celda, no un tamaño en
 *   píxeles. Si pasa de `1`, el símbolo tapa el hueco y la trama se ve como un
 *   relleno sólido. Quienes dibujan puntos o triángulos necesitan además un
 *   ancho de celda de varios píxeles: con `[1, 0]` el círculo queda en una
 *   franja de un píxel.
 *
 * El `color` va explícito: el que ECharts pone por omisión es
 * `rgba(0, 0, 0, 0.2)`, invisible sobre las barras oscuras.
 */
export type Decal = {
  readonly symbol: 'circle' | 'rect' | 'triangle'
  /** Proporción de la celda que ocupa el símbolo, en `(0, 1]`. */
  readonly symbolSize: number
  /** Celdas de izquierda a derecha; un renglón anidado escala el dibujo. */
  readonly dashArrayX: readonly (number | readonly number[])[]
  /** Celdas de arriba abajo: se pintan las posiciones pares. */
  readonly dashArrayY: readonly number[]
  /** El trazo de la trama. Debe contrastar con el fondo de su barra. */
  readonly color: string
  readonly rotation?: number
}

export type MarcaDeMotivo = {
  readonly color: string
  /** La trama que distingue el motivo aunque no se vea el color. */
  readonly decal: Decal
}

/**
 * El trazo de la trama según el fondo de la barra: claro translúcido donde la
 * barra es oscura y oscuro translúcido sobre el ámbar claro. En los dos casos
 * queda arriba de 3:1 contra el fondo, el mínimo de contraste para algo que no
 * es texto.
 */
export const TRAMA_SOBRE_OSCURO = 'rgba(255, 255, 255, 0.65)'
export const TRAMA_SOBRE_CLARO = 'rgba(28, 31, 26, 0.65)'

const DECAL_DE_PUNTOS: Decal = {
  symbol: 'circle',
  symbolSize: 0.75,
  dashArrayX: [[8, 8], [0, 8, 8, 0]],
  dashArrayY: [8, 0],
  color: TRAMA_SOBRE_CLARO,
}

const DECAL_DE_RAYAS: Decal = {
  symbol: 'rect',
  symbolSize: 1,
  dashArrayX: [1, 0],
  dashArrayY: [2, 5],
  color: TRAMA_SOBRE_OSCURO,
}

const DECAL_DE_DIAGONAL: Decal = {
  symbol: 'rect',
  symbolSize: 1,
  // El mismo trazo que las rayas, inclinado a 45°: las rayas se leen de
  // izquierda a derecha y estas de esquina a esquina, así que sin color no se
  // confunden.
  dashArrayX: [1, 0],
  dashArrayY: [2, 5],
  color: TRAMA_SOBRE_OSCURO,
  rotation: Math.PI / 4,
}

const DECAL_DE_TABLERO: Decal = {
  symbol: 'rect',
  symbolSize: 1,
  dashArrayX: [[5, 5], [0, 5, 5, 0]],
  dashArrayY: [5, 0],
  color: TRAMA_SOBRE_OSCURO,
}

const DECAL_DE_TRIANGULOS: Decal = {
  symbol: 'triangle',
  symbolSize: 0.75,
  dashArrayX: [[9, 9], [0, 9, 9, 0]],
  dashArrayY: [7, 2],
  color: TRAMA_SOBRE_OSCURO,
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
