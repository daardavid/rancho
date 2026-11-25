import { describe, expect, it } from 'vitest'

import {
  animalGrowthViewSchema,
  crecimientoDelHatoSchema,
  intervaloDeCrecimientoSchema,
  kilosConSignoSchema,
} from '../src/index'

const animalId = '66666666-6666-4666-8666-666666666666'
const sesionId = '44444444-4444-4444-8444-444444444444'
const pesoId = '55555555-5555-4555-8555-555555555555'

const intervalo = {
  fechaPrevia: '2026-03-01',
  dias: 20,
  kilosGanados: '39.375',
  kilosPorDia: '1.969',
  calidades: ['measured', 'measured'] as const,
  incluyeCalidadNoMedida: false,
}

describe('kilos con signo', () => {
  it('acepta una ganancia y una pérdida de tres decimales, y rechaza lo demás', () => {
    expect(kilosConSignoSchema.safeParse('39.375').success).toBe(true)
    expect(kilosConSignoSchema.safeParse('-14.500').success).toBe(true)
    expect(kilosConSignoSchema.safeParse('1.97').success).toBe(false)
    expect(kilosConSignoSchema.safeParse('1e3').success).toBe(false)
    expect(kilosConSignoSchema.safeParse(39.375).success).toBe(false)
  })
})

describe('intervalo de crecimiento', () => {
  it('acepta kilos por día nulos para el intervalo de 0 días', () => {
    expect(
      intervaloDeCrecimientoSchema.safeParse({ ...intervalo, dias: 0, kilosPorDia: null }).success,
    ).toBe(true)
  })

  it('pide las dos calidades de los pesos que forman el intervalo', () => {
    expect(
      intervaloDeCrecimientoSchema.safeParse({ ...intervalo, calidades: ['measured'] }).success,
    ).toBe(false)
    expect(
      intervaloDeCrecimientoSchema.safeParse({
        ...intervalo,
        calidades: ['declared', 'measured'],
        incluyeCalidadNoMedida: true,
      }).success,
    ).toBe(true)
  })
})

describe('vista del animal', () => {
  it('acepta un animal sin pesos y exige que el último pesaje se pueda omitir', () => {
    expect(
      animalGrowthViewSchema.parse({
        animalId,
        nombre: null,
        categoria: 'unknown',
        activo: true,
        pesos: [],
        ultimoPesaje: null,
        huecos: [{ sesionId, fecha: '2026-08-01' }],
      }),
    ).toMatchObject({ pesos: [], ultimoPesaje: null })
  })

  it('no deja pasar la ganancia como columna del peso ni un número en los kilos', () => {
    const peso = {
      pesoId,
      sesionId,
      fecha: '2026-03-21',
      kilos: '219.875',
      calidad: 'measured',
      version: 1,
    }
    expect(
      animalGrowthViewSchema.safeParse({
        animalId,
        nombre: null,
        categoria: 'calf',
        activo: true,
        pesos: [{ ...peso, intervalo }],
        ultimoPesaje: peso,
        huecos: [],
      }).success,
    ).toBe(true)

    expect(
      animalGrowthViewSchema.safeParse({
        animalId,
        nombre: null,
        categoria: 'calf',
        activo: true,
        pesos: [{ ...peso, intervalo, kilos: 219.875 }],
        ultimoPesaje: null,
        huecos: [],
      }).success,
    ).toBe(false)

    // El último pesaje no lleva intervalo: la ganancia no es una columna del peso.
    expect(
      animalGrowthViewSchema.safeParse({
        animalId,
        nombre: null,
        categoria: 'calf',
        activo: true,
        pesos: [],
        ultimoPesaje: { ...peso, intervalo },
        huecos: [],
      }).success,
    ).toBe(false)
  })
})

const cifrasDeLaVuelta = {
  gananciaMediaKilosPorDia: null,
  pesadosEnLaUltimaVuelta: 0,
  esperadosEnLaUltimaVuelta: 1,
  fechaDeLaUltimaVuelta: '2026-11-24',
} as const

describe('resumen del hato', () => {
  it('acepta una fila de un animal que solo tiene huecos', () => {
    expect(
      crecimientoDelHatoSchema.parse({
        ...cifrasDeLaVuelta,
        animales: [
          {
            animalId,
            nombre: null,
            categoria: 'unknown',
            ultimoPeso: null,
            ultimoIntervalo: null,
            intervaloAnterior: null,
            diasDesdeElUltimoPesaje: null,
            fueHuecoEnLaUltimaSesion: true,
          },
        ],
      }).animales[0],
    ).toMatchObject({ ultimoPeso: null, diasDesdeElUltimoPesaje: null, intervaloAnterior: null })
  })

  it('la media viaja como texto de tres decimales y rechaza un número', () => {
    const fila = {
      animalId,
      nombre: null,
      categoria: 'calf' as const,
      ultimoPeso: null,
      ultimoIntervalo: intervalo,
      intervaloAnterior: { ...intervalo, kilosPorDia: '1.001', kilosGanados: '10.010' },
      diasDesdeElUltimoPesaje: 3,
      fueHuecoEnLaUltimaSesion: false,
    }

    const aceptado = crecimientoDelHatoSchema.parse({
      gananciaMediaKilosPorDia: '0.652',
      pesadosEnLaUltimaVuelta: 7,
      esperadosEnLaUltimaVuelta: 9,
      fechaDeLaUltimaVuelta: '2026-11-24',
      animales: [fila],
    })
    expect(aceptado.gananciaMediaKilosPorDia).toBe('0.652')
    expect(aceptado.animales[0]?.intervaloAnterior?.kilosPorDia).toBe('1.001')

    expect(
      crecimientoDelHatoSchema.safeParse({
        gananciaMediaKilosPorDia: 0.652,
        pesadosEnLaUltimaVuelta: 7,
        esperadosEnLaUltimaVuelta: 9,
        fechaDeLaUltimaVuelta: '2026-11-24',
        animales: [fila],
      }).success,
    ).toBe(false)
  })
})
