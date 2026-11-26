import { describe, expect, it } from 'vitest'

import { referenciaDePeso, type PesoFechado } from '../src/dominio/referenciaDePeso'

const ENERO: PesoFechado = { fecha: '2026-01-10', kilos: '100.000' }
const MARZO: PesoFechado = { fecha: '2026-03-10', kilos: '120.000' }
const NOVIEMBRE: PesoFechado = { fecha: '2026-11-25', kilos: '152.500' }

describe('referencia de peso según la fecha de la sesión', () => {
  it('una sesión posterior a todos los pesos usa el último', () => {
    expect(referenciaDePeso([ENERO, MARZO], '2026-04-01')).toEqual({
      anterior: MARZO,
      posterior: null,
    })
  })

  it('una sesión anterior a todos los pesos no tiene con qué comparar', () => {
    expect(referenciaDePeso([ENERO, MARZO, NOVIEMBRE], '2025-12-01')).toEqual({
      anterior: null,
      posterior: ENERO,
    })
  })

  it('una sesión entre dos pesos usa el anterior y conserva el posterior', () => {
    expect(referenciaDePeso([NOVIEMBRE, ENERO, MARZO], '2026-02-01')).toEqual({
      anterior: ENERO,
      posterior: MARZO,
    })
  })

  it('el mismo día no es anterior ni posterior', () => {
    const eseDia: PesoFechado = { fecha: '2026-02-01', kilos: '110.000' }
    expect(referenciaDePeso([ENERO, eseDia, MARZO], '2026-02-01')).toEqual({
      anterior: ENERO,
      posterior: MARZO,
    })
    expect(referenciaDePeso([eseDia], '2026-02-01')).toEqual({
      anterior: null,
      posterior: null,
    })
  })

  it('sin pesos no hay referencia', () => {
    expect(referenciaDePeso([], '2026-11-25')).toEqual({ anterior: null, posterior: null })
  })

  it('un peso posterior no se usa como si fuera anterior', () => {
    // El caso de David: capturar el 25 oct cuando ya existe el 25 nov.
    expect(referenciaDePeso([NOVIEMBRE], '2026-10-25')).toEqual({
      anterior: null,
      posterior: NOVIEMBRE,
    })
  })

  it('dos pesos el mismo día anterior: cuenta el último de la serie', () => {
    const primero: PesoFechado = { fecha: '2026-01-10', kilos: '100.000' }
    const corregido: PesoFechado = { fecha: '2026-01-10', kilos: '101.000' }
    expect(referenciaDePeso([primero, corregido], '2026-02-01').anterior).toEqual(corregido)
  })

  it('una fecha que no es un día no compara', () => {
    expect(referenciaDePeso([ENERO], '')).toEqual({ anterior: null, posterior: null })
    expect(referenciaDePeso([{ fecha: 'ayer', kilos: '1.000' }], '2026-02-01')).toEqual({
      anterior: null,
      posterior: null,
    })
  })
})
