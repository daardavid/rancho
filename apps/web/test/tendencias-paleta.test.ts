import { describe, expect, it } from 'vitest'

import type { MesDeTendencia, VueltaDeTendencia } from '@rancho/api-contracts'

import type { AnimalParaGraficar } from '../src/dominio/tendencias'
import {
  COLOR_DE_NACIMIENTOS,
  MARCA_DE_VUELTAS,
  marcaDeAnimal,
  marcaDeMotivo,
} from '../src/pantallas/tendencias/estilo'
import { opcionDeMeses, opcionDePesos, opcionDeVueltas } from '../src/pantallas/tendencias/opciones'

/**
 * R-42: las gráficas se pintan con la paleta de la guía y con una marca por
 * animal y por motivo, no con los colores por omisión de ECharts.
 *
 * Se lee la opción que se le pasa a ECharts —el objeto que dice colores,
 * símbolos y tramas— sin montar el lienzo. `opciones.ts` no importa ECharts en
 * tiempo de ejecución, así que esta prueba no baja la biblioteca. El dibujo en
 * sí lo cubre la prueba de pantalla.
 */

const ANIMAL = '11111111-1111-4111-8111-111111111111'

function animal(indice: number): AnimalParaGraficar {
  return {
    animalId: `2222222${String(indice)}-2222-4222-8222-222222222222`,
    nombre: `Animal ${String(indice)}`,
    tramos: [
      [
        { pesoId: ANIMAL, fecha: '2026-03-01', kilos: '180.500', calidad: 'measured' },
        { pesoId: ANIMAL, fecha: '2026-03-11', kilos: '190.500', calidad: 'observed' },
      ],
    ],
  }
}

function vuelta(indice: number): VueltaDeTendencia {
  return {
    sesionId: `55555555-5555-4555-8555-55555555555${String(indice)}`,
    fecha: `2026-0${String(indice)}-01`,
    gananciaMediaKilosPorDia: '1.500',
    animalesConPar: 2,
  }
}

const MESES: readonly MesDeTendencia[] = [
  {
    mes: '2026-03',
    nacimientos: 2,
    salidas: [
      { motivo: 'sale', cantidad: 1 },
      { motivo: 'death', cantidad: 1 },
    ],
  },
]

describe('Opciones de las gráficas', () => {
  it('cada animal lleva su color, su símbolo y su trazo de la guía', () => {
    const series = opcionDePesos([animal(0), animal(1)])
    const lista = series.series as readonly Record<string, unknown>[]
    expect(lista).toHaveLength(2)

    expect(lista[0]?.lineStyle).toMatchObject({
      color: marcaDeAnimal(0).color,
      type: marcaDeAnimal(0).trazo,
    })
    expect(lista[0]?.symbol).toBe(marcaDeAnimal(0).simbolo)
    expect(lista[1]?.symbol).toBe(marcaDeAnimal(1).simbolo)
    // Los dos animales no son la misma marca.
    expect(lista[0]?.symbol).not.toBe(lista[1]?.symbol)
  })

  it('el punto dice el símbolo del animal y el peso no medido va hueco', () => {
    const series = opcionDePesos([animal(0)])
    const lista = series.series as readonly Record<string, unknown>[]
    const datos = lista[0]?.data as readonly Record<string, unknown>[]
    expect(datos[0]?.symbol).toBe(marcaDeAnimal(0).simbolo)
    // El medido va lleno con el color del animal; el observado, hueco con ámbar.
    expect(datos[0]?.itemStyle).toMatchObject({ color: marcaDeAnimal(0).color })
    expect(datos[1]?.itemStyle).toMatchObject({ color: '#ffffff', borderColor: '#8a4b00' })
  })

  it('la línea de ganancia media va en verde y la barra de nacimientos también', () => {
    const series = opcionDeVueltas([vuelta(1), vuelta(2)])
    const lista = series.series as readonly Record<string, unknown>[]
    expect(lista[0]?.lineStyle).toMatchObject({ color: MARCA_DE_VUELTAS.color })

    const meses = opcionDeMeses(MESES)
    const barras = meses.series as readonly Record<string, unknown>[]
    expect(barras[0]?.itemStyle).toMatchObject({ color: COLOR_DE_NACIMIENTOS })
  })

  it('cada motivo de salida apila con su color y su trama, no solo con color', () => {
    const meses = opcionDeMeses(MESES)
    const barras = meses.series as readonly Record<string, unknown>[]

    // Nacimientos y las dos salidas presentes, en el orden de la guía.
    expect(barras).toHaveLength(3)
    const salidas = barras.slice(1)
    for (const [indice, serie] of salidas.entries()) {
      const motivo = indice === 0 ? 'sale' : 'death'
      const marca = marcaDeMotivo(motivo)
      expect(serie.itemStyle).toMatchObject({ color: marca.color, decal: marca.decal })
    }
  })

  it('los ejes y la leyenda usan los neutros de la guía', () => {
    const series = opcionDeVueltas([vuelta(1)])
    const x = series.xAxis as Record<string, Record<string, unknown>>
    expect(x.axisLabel).toMatchObject({ color: '#5c6258' })
    expect(series.textStyle).toMatchObject({ color: '#1c1f1a' })
  })
})

