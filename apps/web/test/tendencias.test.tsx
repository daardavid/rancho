import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { tramosDePesos } from '../src/dominio/tendencias'
import { AvisoDeGraficas } from '../src/pantallas/cargarTendencias'
import { montarApi, pintarApp, sesionAbierta } from './ayudas'

vi.mock('../src/pantallas/tendencias/Lienzo', () => ({
  GraficaDePesos: () => <div>Gráfica de pesos</div>,
  GraficaDeVueltas: () => <div>Gráfica de vueltas</div>,
  GraficaDeMeses: () => <div>Gráfica de meses</div>,
}))

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const ANIMAL = '11111111-1111-4111-8111-111111111111'
const PESO = '22222222-2222-4222-8222-222222222222'

function vuelta(indice: number, kilos: string | null) {
  return {
    sesionId: `55555555-5555-4555-8555-55555555555${String(indice)}`,
    fecha: `2026-0${String(indice)}-01`,
    gananciaMediaKilosPorDia: kilos,
    animalesConPar: kilos === null ? 0 : 1,
  }
}

function tendencias(vueltas: number) {
  return () => ({
    estado: 200,
    cuerpo: {
      series:
        vueltas < 2
          ? []
          : [
              {
                animalId: ANIMAL,
                nombre: 'Canelo',
                categoria: 'calf',
                activo: true,
                pesos: [
                  { pesoId: PESO, fecha: '2026-03-01', kilos: '180.500', calidad: 'measured' },
                ],
                huecos: [],
              },
            ],
      vueltas: Array.from({ length: vueltas }, (_, indice) => vuelta(indice + 1, null)),
      meses:
        vueltas < 2
          ? []
          : [{ mes: '2026-03', nacimientos: 1, salidas: [{ motivo: 'sale', cantidad: 1 }] }],
      nacimientosSinFecha: 0,
      salidasSinFecha: 0,
    },
  })
}

function abrir(vueltas: number) {
  montarApi({
    'GET /api/session': sesionAbierta(),
    'GET /api/read-models/tendencias': tendencias(vueltas),
    'GET /api/read-models/growth-overview': () => ({
      estado: 200,
      cuerpo: {
        animales: [],
        gananciaMediaKilosPorDia: null,
        pesadosEnLaUltimaVuelta: 0,
        esperadosEnLaUltimaVuelta: 0,
        fechaDeLaUltimaVuelta: null,
      },
    }),
    'GET /api/animals': () => ({ estado: 200, cuerpo: { animales: [] } }),
  })
  pintarApp('#/tendencias')
}

describe('lectura de las gráficas', () => {
  it('tiene el encabezado del rancho, con menú, y regresa a Crecimiento', async () => {
    abrir(1)

    // Se espera a contenido de la pantalla ya cargada: el encabezado del estado
    // de espera se reemplaza cuando llegan las tendencias.
    await screen.findByText('Hay 1 vuelta. La tendencia se ve a partir de 4.')

    const encabezado = screen.getByRole('heading', { name: 'Tendencias' }).closest('header')
    expect(encabezado).not.toBeNull()
    if (encabezado === null) {
      return
    }
    expect(within(encabezado).getByText('MI RANCHO')).toBeDefined()
    expect(within(encabezado).getByRole('button', { name: 'Menú' })).toBeDefined()

    // La flecha regresa a Crecimiento y lo dice: el texto nombra el destino.
    const flecha = within(encabezado).getByRole('button', { name: 'Regresar a Crecimiento' })
    await userEvent.setup().click(flecha)
    expect(window.location.hash).toBe('#/crecimiento')
  })

  it('parte la serie en un hueco y no agrega un punto', () => {
    const pesos = [
      { pesoId: PESO, fecha: '2026-03-01', kilos: '100.000', calidad: 'measured' as const },
      { pesoId: ANIMAL, fecha: '2026-04-01', kilos: '130.000', calidad: 'declared' as const },
    ]
    const tramos = tramosDePesos(pesos, [{ fecha: '2026-03-15' }])

    expect(tramos).toEqual([[pesos[0]], [pesos[1]]])
    expect(tramos.flat()).toEqual(pesos)
  })

  it('con una vuelta se ve el vacío honesto', async () => {
    abrir(1)

    expect(await screen.findByText('Hay 1 vuelta. La tendencia se ve a partir de 4.')).toBeDefined()
    expect(screen.getByText('Hay 0 pesajes. La línea se ve a partir de 2.')).toBeDefined()
    expect(screen.getByText('Hay 0 meses con nacimientos o salidas. La tendencia se ve a partir de 2.')).toBeDefined()
    expect(screen.queryByText('Gráfica de vueltas')).toBeNull()
  })

  it('con dos vueltas se ve el vacío honesto y un pesaje no se dibuja', async () => {
    abrir(2)

    expect(await screen.findByText('Hay 2 vueltas. La tendencia se ve a partir de 4.')).toBeDefined()
    expect(screen.getByText('Hay 1 mes con nacimientos o salidas. La tendencia se ve a partir de 2.')).toBeDefined()

    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Canelo' }))

    expect(screen.getByText('Hay 1 pesaje. La línea se ve a partir de 2.')).toBeDefined()
    expect(screen.queryByText('Gráfica de pesos')).toBeNull()
  })

  it('si no se pueden preparar las gráficas, lo dice y deja reintentar', async () => {
    const reintentar = vi.fn()
    const { render } = await import('@testing-library/react')
    render(<AvisoDeGraficas alReintentar={reintentar} />)

    expect(screen.getByRole('alert').textContent).toContain('No se pudieron preparar las gráficas.')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Volver a intentar' }))
    expect(reintentar).toHaveBeenCalledTimes(1)
  })
})
