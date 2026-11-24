import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { animalDeLista, montarApi, pintarApp, sesionAbierta } from './ayudas'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'
const D = '44444444-4444-4444-8444-444444444444'

const SESION = '55555555-5555-4555-8555-555555555555'

function intervalo(
  porDia: string | null,
  opciones: {
    ganancia?: string
    dias?: number
    calidades?: readonly ['measured' | 'declared' | 'observed', 'measured' | 'declared' | 'observed']
  } = {},
) {
  const calidades = opciones.calidades ?? (['measured', 'measured'] as const)
  return {
    fechaPrevia: '2026-10-15',
    dias: opciones.dias ?? 17,
    kilosGanados: opciones.ganancia ?? '12.000',
    kilosPorDia: porDia,
    calidades,
    incluyeCalidadNoMedida: calidades.some((calidad) => calidad !== 'measured'),
  }
}

function fila(
  animalId: string,
  nombre: string,
  opciones: {
    ganancia?: string
    porDia?: string | null
    hueco?: boolean
    sinPeso?: boolean
    sinIntervalo?: boolean
    dias?: number
    calidades?: readonly ['measured' | 'declared' | 'observed', 'measured' | 'declared' | 'observed']
    anterior?: string | null
  },
): Record<string, unknown> {
  const ultimoPeso =
    opciones.sinPeso === true
      ? null
      : {
          pesoId: animalId,
          sesionId: SESION,
          fecha: '2026-11-01',
          kilos: '200.000',
          calidad: 'measured',
          version: 1,
        }

  const sinIntervalo = opciones.sinIntervalo === true || opciones.ganancia === undefined
  return {
    animalId,
    nombre,
    categoria: 'calf',
    ultimoPeso,
    ultimoIntervalo: sinIntervalo
      ? null
      : intervalo(opciones.porDia === undefined ? opciones.ganancia ?? null : opciones.porDia, {
          ...(opciones.ganancia === undefined ? {} : { ganancia: opciones.ganancia }),
          ...(opciones.dias === undefined ? {} : { dias: opciones.dias }),
          ...(opciones.calidades === undefined ? {} : { calidades: opciones.calidades }),
        }),
    intervaloAnterior:
      opciones.anterior === undefined || opciones.anterior === null
        ? null
        : intervalo(opciones.anterior),
    diasDesdeElUltimoPesaje: opciones.sinPeso === true ? null : 21,
    fueHuecoEnLaUltimaSesion: opciones.hueco === true,
  }
}

function elResumen(
  animales: readonly Record<string, unknown>[],
  cifras: {
    media?: string | null
    pesados?: number
    esperados?: number
    fecha?: string | null
  } = {},
) {
  return () => ({
    estado: 200,
    cuerpo: {
      animales,
      gananciaMediaKilosPorDia: cifras.media === undefined ? null : cifras.media,
      pesadosEnLaUltimaVuelta: cifras.pesados ?? 0,
      esperadosEnLaUltimaVuelta: cifras.esperados ?? 0,
      fechaDeLaUltimaVuelta: cifras.fecha === undefined ? null : cifras.fecha,
    },
  })
}

function elHato() {
  return () => ({
    estado: 200,
    cuerpo: {
      animales: [
        animalDeLista({ id: A, nombre: 'Canelo' }),
        animalDeLista({ id: B, nombre: 'Lucero' }),
        animalDeLista({ id: C, nombre: 'Tordo' }),
        animalDeLista({ id: D, nombre: 'Pinto' }),
      ],
    },
  })
}

function region(nombre: string): HTMLElement {
  return screen.getByRole('region', { name: nombre })
}

describe('Pantalla de crecimiento', () => {
  it('muestra la media del servidor, los pesados y a quién revisar', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(
        [
          // Si el navegador promediara 1.000 y 9.000 saldría 5. La pantalla pinta 0.652.
          fila(A, 'Canelo', { ganancia: '10.000', porDia: '1.000' }),
          fila(B, 'Lucero', { ganancia: '90.000', porDia: '9.000' }),
          fila(C, 'Tordo', { hueco: true, sinPeso: true }),
        ],
        { media: '0.652', pesados: 7, esperados: 9, fecha: '2026-11-24' },
      ),
    })

    pintarApp('#/crecimiento')

    expect(await screen.findByRole('heading', { name: 'Crecimiento' })).toBeDefined()
    expect(screen.getByText('ÚLTIMA VUELTA · 24 NOV')).toBeDefined()
    expect(screen.getByText('0.652')).toBeDefined()
    expect(screen.queryByText('5')).toBeNull()
    expect(screen.getByText('7 / 9')).toBeDefined()
    expect(screen.getByText('1')).toBeDefined()

    const revisar = region('Revisar primero')
    expect(within(revisar).getByRole('button', { name: 'Tordo' })).toBeDefined()
    expect(within(revisar).getByText('No se pesó')).toBeDefined()
    expect(within(region('Van bien')).getByRole('button', { name: 'Canelo' })).toBeDefined()
  })

  it('quien bajó contra su intervalo anterior sale en revisar con el motivo', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(
        [
          fila(B, 'Lucero', { ganancia: '3.300', porDia: '0.330', anterior: '0.710' }),
          fila(A, 'Canelo', { ganancia: '9.200', porDia: '0.920', anterior: '0.800' }),
        ],
        { media: '0.625', pesados: 2, esperados: 2, fecha: '2026-11-24' },
      ),
    })

    pintarApp('#/crecimiento')
    await screen.findByRole('heading', { name: 'Crecimiento' })

    const revisar = region('Revisar primero')
    expect(within(revisar).getByRole('button', { name: 'Lucero' })).toBeDefined()
    expect(
      within(revisar).getByText('Bajó de 0.71 a 0.33 kg/día respecto a la vuelta anterior'),
    ).toBeDefined()
    expect(within(region('Van bien')).getByRole('button', { name: 'Canelo' })).toBeDefined()
    expect(within(region('Van bien')).queryByText(/Bajó de/)).toBeNull()
  })

  it('un peso declarado sale en revisar aunque la ganancia sea alta', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(
        [
          fila(D, 'Pinto', {
            ganancia: '8.200',
            porDia: '0.820',
            calidades: ['declared', 'measured'],
          }),
        ],
        { media: '0.820', pesados: 1, esperados: 1, fecha: '2026-11-24' },
      ),
    })

    pintarApp('#/crecimiento')
    await screen.findByRole('heading', { name: 'Crecimiento' })

    const revisar = region('Revisar primero')
    expect(within(revisar).getByRole('button', { name: 'Pinto' })).toBeDefined()
    expect(within(revisar).getByText('Peso no medido')).toBeDefined()
    expect(within(revisar).getByText('0.82 kg/día')).toBeDefined()
    expect(screen.queryByRole('region', { name: 'Van bien' })).toBeNull()
  })

  it('una ganancia baja que no bajó contra sí misma va en «Van bien»', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(
        [fila(A, 'Canelo', { ganancia: '0.500', porDia: '0.050', anterior: '0.040' })],
        { media: '0.050', pesados: 1, esperados: 1, fecha: '2026-11-24' },
      ),
    })

    pintarApp('#/crecimiento')
    await screen.findByRole('heading', { name: 'Crecimiento' })

    expect(screen.queryByRole('region', { name: 'Revisar primero' })).toBeNull()
    const bien = region('Van bien')
    expect(within(bien).getByRole('button', { name: 'Canelo' })).toBeDefined()
    expect(within(bien).getByText('0.05 kg/día')).toBeDefined()
    expect(screen.getByText('0')).toBeDefined()
  })

  it('ordena los huecos primero y después la menor ganancia', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(
        [
          fila(A, 'Canelo', { ganancia: '12.500', porDia: '0.735' }),
          fila(B, 'Lucero', { ganancia: '-3.000', porDia: '-0.176', dias: 17 }),
          fila(C, 'Tordo', { hueco: true, ganancia: '20.000', porDia: '1.176' }),
          fila(D, 'Pinto', { sinPeso: true }),
        ],
        { media: '0.735', pesados: 2, esperados: 3, fecha: '2026-11-01' },
      ),
    })

    pintarApp('#/crecimiento')
    await screen.findByRole('heading', { name: 'Crecimiento' })

    const revisar = within(region('Revisar primero'))
      .getAllByRole('button')
      .map((boton) => boton.textContent)
    const bien = within(region('Van bien'))
      .getAllByRole('button')
      .map((boton) => boton.textContent)

    expect(revisar).toEqual(['Tordo', 'Lucero'])
    expect(bien).toEqual(['Canelo', 'Pinto'])
    expect(within(region('Revisar primero')).getByText('No se pesó')).toBeDefined()
    expect(
      within(region('Revisar primero')).getByText('Perdió kilos en el último intervalo'),
    ).toBeDefined()
  })

  it('sin pesajes invita una sola vez a registrar el primero', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([]),
    })

    pintarApp('#/crecimiento')

    expect(await screen.findByRole('heading', { name: 'Registra el primer pesaje' })).toBeDefined()
    expect(screen.getAllByRole('button', { name: 'Registrar un pesaje' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Regresar al hato' })).toBeNull()
  })
})
