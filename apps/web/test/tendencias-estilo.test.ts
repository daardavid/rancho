import { describe, expect, it } from 'vitest'

import { leerRuta, rutaAHash, type Ruta } from '../src/ruta'
import {
  COLORES_DE_LA_GUIA,
  COLOR_DE_NACIMIENTOS,
  MARCA_DE_VUELTAS,
  ORDEN_DE_MOTIVOS,
  SIMBOLOS,
  TRAZOS,
  marcaDeAnimal,
  marcaDeMotivo,
  type Decal,
} from '../src/pantallas/tendencias/estilo'
import { regresoDeLaFicha } from '../src/dominio/regreso'

const ANIMAL = '11111111-1111-4111-8111-111111111111'

/**
 * Las tramas de ECharts, tal como las lee `lib/util/decal.js`: `dashArrayX` es
 * una lista de renglones de celdas y `symbolSize` una proporción de la celda.
 * Esta prueba copia nada más la aritmética que hace falta para saber si una
 * trama de verdad deja hueco, con la misma normalización que la biblioteca:
 * una lista de puros números es **un** renglón, y un número suelto dentro de
 * una lista mixta es un renglón de dos celdas iguales.
 */
function renglonesDeX(decal: Decal): readonly (readonly number[])[] {
  const crudo = decal.dashArrayX
  if (crudo.every((celda) => typeof celda === 'number')) {
    return [[...(crudo as readonly number[])]]
  }
  return crudo.map((renglon) =>
    typeof renglon === 'number' ? [renglon, renglon] : [...renglon],
  )
}

/** El ancho dibujado más grande y el hueco más grande de un renglón. */
function anchoYHueco(renglon: readonly number[]): { readonly ancho: number; readonly hueco: number } {
  const pares = renglon.filter((_, indice) => indice % 2 === 0)
  const impares = renglon.filter((_, indice) => indice % 2 === 1)
  return {
    ancho: Math.max(0, ...pares),
    hueco: Math.max(0, ...impares),
  }
}

/**
 * Qué parte del mosaico queda pintada, con el mismo bucle que `decal.js`
 * (`brushDecal`): recorre el mosaico renglón por renglón y, en las celdas
 * pares, pinta un símbolo de `celda × symbolSize`. Un mosaico 100% pintado es
 * una trama sólida, que es justo el defecto que esta prueba cuida.
 */
function fraccionPintada(decal: Decal): number {
  const renglones = renglonesDeX(decal)
  const alto = decal.dashArrayY
  const maximoComunDivisor = (a: number, b: number): number => (b === 0 ? a : maximoComunDivisor(b, a % b))
  const bloque = (celdas: readonly number[]): number => {
    const suma = celdas.reduce((total, celda) => total + celda, 0)
    return celdas.length % 2 === 1 ? suma * 2 : suma
  }
  const ancho = renglones
    .map(bloque)
    .reduce((a, b) => (a * b) / maximoComunDivisor(a, b), 1)
  const altura = bloque(alto) * renglones.length

  const pintados = new Set<string>()
  let y = -bloque(alto)
  let renglonDeY = 0
  let renglonTotal = 0
  while (y < altura) {
    if (renglonDeY % 2 === 0) {
      const celdas = renglones[Math.trunc(renglonTotal / 2) % renglones.length] ?? [1, 0]
      if (celdas.reduce((total, celda) => total + celda, 0) <= 0) {
        break
      }
      let x = 0
      let celdaDeX = 0
      while (x < ancho * 2) {
        if (celdaDeX % 2 === 0) {
          const margen = (1 - decal.symbolSize) * 0.5
          const izquierda = x + (celdas[celdaDeX] ?? 0) * margen
          const arriba = y + (alto[renglonDeY] ?? 0) * margen
          const anchoDeCelda = (celdas[celdaDeX] ?? 0) * decal.symbolSize
          const altoDeCelda = (alto[renglonDeY] ?? 0) * decal.symbolSize
          for (let px = Math.round(izquierda); px < Math.round(izquierda + anchoDeCelda); px += 1) {
            for (let py = Math.round(arriba); py < Math.round(arriba + altoDeCelda); py += 1) {
              if (px >= 0 && py >= 0 && px < ancho && py < altura) {
                pintados.add(`${String(px)},${String(py)}`)
              }
            }
          }
        }
        x += celdas[celdaDeX] ?? 0
        celdaDeX = (celdaDeX + 1) % celdas.length
      }
    }
    y += alto[renglonDeY] ?? 0
    renglonTotal += 1
    renglonDeY = (renglonDeY + 1) % alto.length
  }
  return pintados.size / (ancho * altura)
}

type Rgba = { readonly r: number; readonly g: number; readonly b: number; readonly a: number }

function colorDe(texto: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(texto)
  if (hex !== null) {
    const valor = Number.parseInt(hex[1] ?? '', 16)
    return { r: (valor >> 16) & 0xff, g: (valor >> 8) & 0xff, b: valor & 0xff, a: 1 }
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(texto)
  if (rgba === null) {
    throw new Error(`Color que la prueba no sabe leer: ${texto}`)
  }
  return {
    r: Number(rgba[1]),
    g: Number(rgba[2]),
    b: Number(rgba[3]),
    a: rgba[4] === undefined ? 1 : Number(rgba[4]),
  }
}

/** Lo que se ve cuando la trama translúcida se pinta encima de la barra. */
function compuesto(encima: Rgba, fondo: Rgba): Rgba {
  return {
    r: Math.round(encima.r * encima.a + fondo.r * (1 - encima.a)),
    g: Math.round(encima.g * encima.a + fondo.g * (1 - encima.a)),
    b: Math.round(encima.b * encima.a + fondo.b * (1 - encima.a)),
    a: 1,
  }
}

function luminancia(color: Rgba): number {
  const canal = (valor: number): number => {
    const proporcion = valor / 255
    return proporcion <= 0.03928 ? proporcion / 12.92 : ((proporcion + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(color.r) + 0.7152 * canal(color.g) + 0.0722 * canal(color.b)
}

/** El contraste WCAG entre la trama y el fondo de su barra. */
function contraste(encima: Rgba, fondo: Rgba): number {
  const uno = luminancia(compuesto(encima, fondo))
  const dos = luminancia(fondo)
  return (Math.max(uno, dos) + 0.05) / (Math.min(uno, dos) + 0.05)
}

/**
 * R-42. Lo que se puede probar sin lienzo: la paleta de la guía, las marcas que
 * distinguen una serie sin color y la flecha que dice su destino en la ficha.
 */

describe('Paleta de las tendencias', () => {
  it('solo usa verde, ámbar y neutros de la guía visual', () => {
    // Los colores de la guía visual, en minúsculas.
    const DE_LA_GUIA = new Set([
      '#1f5c3f', // --verde
      '#1c1f1a', // --texto
      '#5c6258', // --texto-suave
      '#6b3a00', // --ambar-fuerte
      '#8a4b00', // --ambar-texto
      '#d9a55b', // --ambar-barra
    ])

    for (const color of COLORES_DE_LA_GUIA) {
      expect(DE_LA_GUIA.has(color), `${color} no es de la guía`).toBe(true)
    }
    // La barra de nacimientos y la línea principal también salen de ahí.
    expect(COLORES_DE_LA_GUIA).toContain(COLOR_DE_NACIMIENTOS)
    expect(COLORES_DE_LA_GUIA).toContain(MARCA_DE_VUELTAS.color)
  })

  it('no repite la combinación de color, símbolo y trazo en los primeros doce animales', () => {
    const vistas = new Set<string>()
    for (let indice = 0; indice < 12; indice += 1) {
      const marca = marcaDeAnimal(indice)
      vistas.add(`${marca.color}|${marca.simbolo}|${marca.trazo}`)
      expect(SIMBOLOS).toContain(marca.simbolo)
      expect(TRAZOS).toContain(marca.trazo)
    }
    expect(vistas.size).toBe(12)
  })

  it('dos animales seguidos nunca comparten símbolo ni trazo, así que se separan sin color', () => {
    for (let indice = 0; indice < 12; indice += 1) {
      const uno = marcaDeAnimal(indice)
      const dos = marcaDeAnimal(indice + 1)
      expect(uno.simbolo === dos.simbolo && uno.trazo === dos.trazo).toBe(false)
    }
  })

  it('cada motivo de salida tiene su trama, aunque el color se pierda', () => {
    const tramas = ORDEN_DE_MOTIVOS.map((motivo) => JSON.stringify(marcaDeMotivo(motivo).decal))
    expect(new Set(tramas).size).toBe(ORDEN_DE_MOTIVOS.length)
    for (const motivo of ORDEN_DE_MOTIVOS) {
      expect(COLORES_DE_LA_GUIA, motivo).toContain(marcaDeMotivo(motivo).color)
    }
  })

  it('las cinco tramas se ven distintas de verdad, no solo en sus números', () => {
    // La rayas y la diagonal comparten celdas y solo cambian de inclinación:
    // dos tramas se consideran la misma si coinciden en símbolo, tamaño y
    // giro, aunque el mosaico se lea igual. Aquí se comparan las cinco.
    const vistas = ORDEN_DE_MOTIVOS.map((motivo) => {
      const { decal } = marcaDeMotivo(motivo)
      return {
        motivo,
        firma: `${decal.symbol}|${String(decal.symbolSize)}|${JSON.stringify(decal.dashArrayX)}|${JSON.stringify(decal.dashArrayY)}|${String(decal.rotation ?? 0)}`,
      }
    })
    expect(new Set(vistas.map((vista) => vista.firma)).size).toBe(ORDEN_DE_MOTIVOS.length)

    // Y ninguna pinta el mosaico entero: una trama sólida se ve como relleno.
    for (const motivo of ORDEN_DE_MOTIVOS) {
      const fraccion = fraccionPintada(marcaDeMotivo(motivo).decal)
      expect(fraccion, `${motivo} pinta el ${(fraccion * 100).toFixed(0)}% del mosaico`).toBeLessThan(0.9)
      expect(fraccion, `${motivo} no pinta nada`).toBeGreaterThan(0.05)
    }
  })

  it('las tramas caben en su celda, así que dejan ver el fondo y no pintan la barra sólida', () => {
    // `decal.js` dibuja `dashX * symbolSize` por `dashY * symbolSize`. Si eso
    // pasa de la celda, la trama tapa el hueco y la barra se ve llena. El
    // hueco puede estar a los lados (puntos, tablero) o entre renglones
    // (rayas); lo que no puede es no existir.
    for (const motivo of ORDEN_DE_MOTIVOS) {
      const { decal } = marcaDeMotivo(motivo)
      expect(decal.symbolSize, motivo).toBeGreaterThan(0)
      expect(decal.symbolSize, motivo).toBeLessThanOrEqual(1)

      const huecoEntreRenglones = decal.dashArrayY
        .filter((_, indice) => indice % 2 === 1)
        .reduce((suma, celda) => suma + celda, 0)
      const huecoALoLargo = renglonesDeX(decal).some((renglon) => anchoYHueco(renglon).hueco > 0)
      expect(huecoEntreRenglones > 0 || huecoALoLargo, `${motivo} no deja hueco`).toBe(true)
    }
  })

  it('los puntos y los triángulos caben en una celda ancha, no en una franja de un píxel', () => {
    for (const motivo of ORDEN_DE_MOTIVOS) {
      const { decal } = marcaDeMotivo(motivo)
      if (decal.symbol !== 'circle' && decal.symbol !== 'triangle') {
        continue
      }
      for (const renglon of renglonesDeX(decal)) {
        const { ancho, hueco } = anchoYHueco(renglon)
        expect(ancho, `${motivo} dibuja en ${ancho} px de ancho`).toBeGreaterThanOrEqual(4)
        expect(hueco, `${motivo} deja ${hueco} px de hueco`).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('cada trama contrasta con el fondo de su barra', () => {
    for (const motivo of ORDEN_DE_MOTIVOS) {
      const marca = marcaDeMotivo(motivo)
      expect(marca.decal.color, `${motivo} sin color de trama`).toBeTruthy()
      const razon = contraste(colorDe(marca.decal.color), colorDe(marca.color))
      expect(razon, `${motivo} contrasta solo ${razon.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('Regreso de la ficha', () => {
  it('el texto siempre nombra el destino al que lleva', () => {
    const casos = [
      { desde: 'hato' as const, activo: true, destino: 'hato', texto: 'Regresar al hato' },
      { desde: 'hato' as const, activo: false, destino: 'hato', texto: 'Regresar al hato' },
      { desde: 'salidas' as const, activo: false, destino: 'salidas', texto: 'Regresar a salidas' },
      { desde: 'salidas' as const, activo: true, destino: 'salidas', texto: 'Regresar a salidas' },
      { desde: 'inicio' as const, activo: false, destino: 'inicio', texto: 'Regresar al inicio' },
    ]

    for (const caso of casos) {
      const regreso = regresoDeLaFicha(caso.desde, caso.activo)
      expect(regreso.ruta.nombre).toBe(caso.destino)
      expect(regreso.etiqueta).toBe(caso.texto)
    }
  })

  it('sin origen se decide por el animal: activo al hato, dado de baja a salidas', () => {
    expect(regresoDeLaFicha(undefined, true).ruta.nombre).toBe('hato')
    const salio = regresoDeLaFicha(undefined, false)
    expect(salio.ruta.nombre).toBe('salidas')
    expect(salio.etiqueta).toBe('Regresar a salidas')
  })
})

describe('La ficha en la URL', () => {
  it('el origen viaja en la URL y se vuelve a leer igual', () => {
    const rutas: readonly Ruta[] = [
      { nombre: 'ficha', animalId: ANIMAL, desde: 'salidas' },
      { nombre: 'ficha', animalId: ANIMAL, abrirSalida: true, desde: 'inicio' },
      { nombre: 'ficha', animalId: ANIMAL, abrirSalida: true, desde: 'hato' },
    ]
    for (const ruta of rutas) {
      expect(leerRuta(rutaAHash(ruta))).toEqual(ruta)
    }
  })

  it('sin origen la URL es la de siempre y un origen desconocido se ignora', () => {
    expect(rutaAHash({ nombre: 'ficha', animalId: ANIMAL })).toBe(`#/animal/${ANIMAL}`)
    expect(leerRuta(`#/animal/${ANIMAL}?desde=otro-lado`)).toEqual({
      nombre: 'ficha',
      animalId: ANIMAL,
    })
    expect(leerRuta(`#/animal/${ANIMAL}/salida?desde=salidas`)).toEqual({
      nombre: 'ficha',
      animalId: ANIMAL,
      abrirSalida: true,
      desde: 'salidas',
    })
  })
})
