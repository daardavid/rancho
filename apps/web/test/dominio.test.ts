import { describe, expect, it } from 'vitest'

import { ErrorDeApi } from '../src/api/http'
import {
  anchoDeBarra,
  compararDecimales,
  mayorKilosPorDia,
  ordenarCrecimiento,
} from '../src/dominio/crecimiento'
import { kilosNormales, kilosParaEditar, revisarKilos } from '../src/dominio/kilos'
import { mensajeDeError } from '../src/dominio/mensajes'

describe('Kilos como texto', () => {
  it('acepta dígitos con punto y hasta tres decimales', () => {
    expect(revisarKilos('351.5').ok).toBe(true)
    expect(revisarKilos('1200').ok).toBe(true)
    expect(revisarKilos(' 210.375 ').ok).toBe(true)
  })

  it('rechaza lo que no es un peso anotable, con un motivo que dice qué escribir', () => {
    const casos = ['', '   ', '0', '0.000', '351,5', '+3', '-3', '351.', '.5', '1e3', 'abc', '1 2']
    for (const caso of casos) {
      const revision = revisarKilos(caso)
      expect(revision.ok, `«${caso}» debería rechazarse`).toBe(false)
    }

    const vacio = revisarKilos('')
    expect(vacio.ok ? '' : vacio.motivo).toBe('Escribe los kilos.')

    const cero = revisarKilos('0')
    expect(cero.ok ? '' : cero.motivo).toBe('El peso tiene que ser mayor que cero.')
  })

  it('recorta ceros para editar y rellena a tres decimales para comparar', () => {
    expect(kilosParaEditar('210.500')).toBe('210.5')
    expect(kilosParaEditar('1200.000')).toBe('1200')
    expect(kilosParaEditar('180.125')).toBe('180.125')

    expect(kilosNormales('180')).toBe('180.000')
    expect(kilosNormales('180.5')).toBe('180.500')
    expect(kilosNormales('180.125')).toBe('180.125')
    // Un texto que no es un peso se devuelve tal cual para que lo rechace la revisión.
    expect(kilosNormales('abc')).toBe('abc')
  })
})

describe('Comparar y ordenar decimales sin coma flotante', () => {
  it('compara signo, enteros y decimales', () => {
    expect(compararDecimales('-14.500', '1.969')).toBeLessThan(0)
    expect(compararDecimales('1.969', '1.97')).toBeLessThan(0)
    expect(compararDecimales('2.000', '1.999')).toBeGreaterThan(0)
    expect(compararDecimales('10.0', '9.999')).toBeGreaterThan(0)
    expect(compararDecimales('1.500', '1.5')).toBe(0)
    expect(compararDecimales('0.735', '0.735')).toBe(0)
  })

  it('no pierde precisión con números que `Number` redondearía', () => {
    // Estos dos son distintos al tercer decimal y `Number` los ve casi iguales.
    expect(compararDecimales('0.100', '0.101')).toBeLessThan(0)
    expect(compararDecimales('12345678.001', '12345678.002')).toBeLessThan(0)
  })
})

type Fila = Parameters<typeof ordenarCrecimiento>[0][number]

function fila(
  animalId: string,
  opciones: {
    hueco?: boolean
    porDia?: string | null
    ganados?: string
    sinIntervalo?: boolean
  } = {},
): Fila {
  return {
    animalId,
    nombre: animalId,
    categoria: 'calf',
    ultimoPeso: {
      pesoId: animalId,
      sesionId: '55555555-5555-4555-8555-555555555555',
      fecha: '2026-11-01',
      kilos: '200.000',
      calidad: 'measured',
      version: 1,
    },
    ultimoIntervalo: opciones.sinIntervalo
      ? null
      : {
          fechaPrevia: '2026-10-15',
          dias: 17,
          kilosGanados: opciones.ganados ?? '10.000',
          kilosPorDia: opciones.porDia === undefined ? '0.588' : opciones.porDia,
          calidades: ['measured', 'measured'],
          incluyeCalidadNoMedida: false,
        },
    diasDesdeElUltimoPesaje: 21,
    fueHuecoEnLaUltimaSesion: opciones.hueco === true,
    intervaloAnterior: null,
  }
}

describe('ordenarCrecimiento', () => {
  it('pone los huecos primero, después la menor ganancia y al final los que no comparan', () => {
    const orden = ordenarCrecimiento([
      fila('canelo', { porDia: '0.735' }),
      fila('lucero', { porDia: '-0.176' }),
      fila('tordo', { hueco: true, porDia: '1.176' }),
      fila('pinto', { sinIntervalo: true }),
    ])

    expect(orden.map((unaFila) => unaFila.animalId)).toEqual(['tordo', 'lucero', 'canelo', 'pinto'])
  })

  it('no muta la lista que recibe', () => {
    const original = [fila('a', { porDia: '2.000' }), fila('b', { porDia: '1.000' })]
    const copia = [...original]
    ordenarCrecimiento(original)
    expect(original).toEqual(copia)
  })

  it('con dos pesajes el mismo día ordena por los kilos ganados', () => {
    const orden = ordenarCrecimiento([
      fila('a', { porDia: null, ganados: '4.500' }),
      fila('b', { porDia: null, ganados: '-1.000' }),
    ])
    expect(orden.map((unaFila) => unaFila.animalId)).toEqual(['b', 'a'])
  })
})

describe('Barras de crecimiento', () => {
  it('el ancho es proporcional al mayor y no usa una ganancia negativa', () => {
    const filas = [
      fila('a', { porDia: '1.000' }),
      fila('b', { porDia: '0.500' }),
      fila('c', { porDia: '-0.200' }),
    ]
    const mayor = mayorKilosPorDia(filas)
    expect(mayor).toBe('1.000')
    expect(anchoDeBarra('0.500', mayor)).toBe(50)
    expect(anchoDeBarra('1.000', mayor)).toBe(100)
    expect(anchoDeBarra('-0.200', mayor)).toBe(0)
    expect(anchoDeBarra(null, mayor)).toBe(0)
  })
})

describe('Cuánto esperar cuando la API frena los intentos', () => {
  // El texto de respaldo, para cuando la API no manda segundos.
  const MENSAJE_SIN_PLAZO =
    'Espera un momento y vuelve a intentar. Los intentos buenos no se bloquean para siempre.'

  const queHacer = (segundos: number): string =>
    mensajeDeError(new ErrorDeApi(429, 'demasiados_intentos', segundos)).queHacer

  it('solo hasta medio minuto se dice «medio minuto»', () => {
    expect(queHacer(1)).toBe('Espera medio minuto y vuelve a intentar.')
    expect(queHacer(30)).toBe('Espera medio minuto y vuelve a intentar.')
  })

  it('de 31 a 60 segundos se redondea a un minuto, para no prometer un plazo menor', () => {
    expect(queHacer(31)).toBe('Espera un minuto y vuelve a intentar.')
    expect(queHacer(45)).toBe('Espera un minuto y vuelve a intentar.')
    expect(queHacer(60)).toBe('Espera un minuto y vuelve a intentar.')
    expect(queHacer(61)).toBe('Espera 2 minutos y vuelve a intentar.')
  })

  it('sin segundos de la API el mensaje no inventa un plazo', () => {
    expect(mensajeDeError(new ErrorDeApi(429, 'demasiados_intentos')).queHacer).toBe(
      MENSAJE_SIN_PLAZO,
    )
  })
})
