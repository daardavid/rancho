import { describe, expect, it } from 'vitest'

import {
  type Gramos,
  formatearGramosATexto,
  interpretarKilos,
  kilosTextoSchema,
  parsearKilosAGramos,
} from '../../src/shared-kernel/kilos'

function gramosDe(texto: string): Gramos {
  return parsearKilosAGramos(texto)
}

describe('kilos: de texto a gramos enteros', () => {
  it('lee un peso con un decimal', () => {
    expect(gramosDe('351.5')).toBe(351_500)
  })

  it('lee un peso entero', () => {
    expect(gramosDe('240')).toBe(240_000)
  })

  it('lee tres decimales sin perder el último', () => {
    expect(gramosDe('123.456')).toBe(123_456)
  })

  it('completa los decimales que faltan con ceros', () => {
    expect(gramosDe('8.2')).toBe(8_200)
    expect(gramosDe('8.02')).toBe(8_020)
  })

  it('acepta espacios alrededor del número', () => {
    expect(gramosDe(' 351.5 ')).toBe(351_500)
  })

  it('no pierde exactitud donde float la pierde', () => {
    // El caso que motiva el archivo: con coma flotante, '1.005' * 1000 da
    // 1004.9999999999999 y '32.3' * 1000 da 32299.999999999996. En gramos
    // enteros el resultado es exacto y además se vuelve a escribir igual.
    expect(1.005 * 1000).not.toBe(1_005)
    expect(32.3 * 1000).not.toBe(32_300)

    expect(gramosDe('1.005')).toBe(1_005)
    expect(gramosDe('32.3')).toBe(32_300)
    expect(formatearGramosATexto(gramosDe('1.005'))).toBe('1.005')
    expect(formatearGramosATexto(gramosDe('32.3'))).toBe('32.300')
  })

  it('redondea de ida y vuelta sin acumular error en una lista de pesos', () => {
    const esperado: ReadonlyArray<readonly [string, string]> = [
      ['0.1', '0.100'],
      ['0.2', '0.200'],
      ['0.3', '0.300'],
      ['333.333', '333.333'],
      ['999.999', '999.999'],
      ['1234.567', '1234.567'],
    ]

    for (const [texto, escritura] of esperado) {
      expect(formatearGramosATexto(gramosDe(texto))).toBe(escritura)
    }
  })

  it('conserva un peso grande que cabe en numeric(12,3)', () => {
    expect(gramosDe('999999999.999')).toBe(999_999_999_999)
  })
})

describe('kilos: lo que no es un peso', () => {
  const rechazos: ReadonlyArray<readonly [string, string]> = [
    ['', 'vacío'],
    ['   ', 'solo espacios'],
    ['0', 'cero'],
    ['0.000', 'cero con decimales'],
    ['-1', 'negativo'],
    ['-0.5', 'negativo con decimales'],
    ['+351.5', 'signo positivo'],
    ['351,5', 'coma decimal'],
    ['1e3', 'notación científica'],
    ['1E3', 'notación científica en mayúscula'],
    ['351.', 'punto sin decimales'],
    ['.5', 'decimales sin entero'],
    ['351.1234', 'cuatro decimales'],
    ['351 .5', 'espacio interior'],
    ['351.5 kg', 'unidad pegada al número'],
    ['trescientos', 'texto'],
    ['٣٥١', 'dígitos no latinos'],
    ['9999999999999', 'más ancho que numeric(12,3)'],
  ]

  for (const [texto, motivo] of rechazos) {
    it(`rechaza «${texto}» (${motivo})`, () => {
      const lectura = interpretarKilos(texto)

      expect(lectura.ok).toBe(false)
      expect(() => parsearKilosAGramos(texto)).toThrow(RangeError)
      expect(kilosTextoSchema.safeParse(texto).success).toBe(false)
    })
  }

  it('explica el rechazo en vez de devolver un número callado', () => {
    const lectura = interpretarKilos('351,5')

    expect(lectura.ok).toBe(false)
    if (!lectura.ok) {
      expect(lectura.motivo).toContain('punto decimal')
    }
  })

  it('no deja convertir el cero en un peso válido por la puerta de atrás', () => {
    const lectura = interpretarKilos('0.000')

    expect(lectura.ok).toBe(false)
    if (!lectura.ok) {
      expect(lectura.motivo).toContain('mayor que cero')
    }
  })
})

describe('kilos: de gramos a texto', () => {
  it('siempre escribe tres decimales', () => {
    expect(formatearGramosATexto(351_500 as Gramos)).toBe('351.500')
    expect(formatearGramosATexto(1_000 as Gramos)).toBe('1.000')
    expect(formatearGramosATexto(1 as Gramos)).toBe('0.001')
    expect(formatearGramosATexto(999_999_999_999 as Gramos)).toBe('999999999.999')
  })

  it('se niega a formatear gramos que no son un entero positivo', () => {
    expect(() => formatearGramosATexto(0 as Gramos)).toThrow()
    expect(() => formatearGramosATexto(-1 as Gramos)).toThrow()
    expect(() => formatearGramosATexto(1.5 as Gramos)).toThrow()
  })

  it('vuelve al mismo texto que entró, con los ceros completados', () => {
    const esperado: ReadonlyArray<readonly [string, string]> = [
      ['351.5', '351.500'],
      ['240', '240.000'],
      ['0.001', '0.001'],
      ['1234.567', '1234.567'],
    ]

    for (const [texto, escritura] of esperado) {
      expect(formatearGramosATexto(gramosDe(texto))).toBe(escritura)
    }
  })
})
