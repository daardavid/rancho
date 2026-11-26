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
} from '../src/pantallas/tendencias/estilo'
import { regresoDeLaFicha } from '../src/dominio/regreso'

const ANIMAL = '11111111-1111-4111-8111-111111111111'

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
