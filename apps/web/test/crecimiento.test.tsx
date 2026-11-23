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

function fila(
  animalId: string,
  nombre: string,
  opciones: {
    ganancia?: string
    porDia?: string | null
    hueco?: boolean
    sinPeso?: boolean
    dias?: number
  },
): Record<string, unknown> {
  const ultimoPeso =
    opciones.sinPeso === true
      ? null
      : {
          pesoId: animalId,
          sesionId: '55555555-5555-4555-8555-555555555555',
          fecha: '2026-11-01',
          kilos: '200.000',
          calidad: 'measured',
          version: 1,
        }

  return {
    animalId,
    nombre,
    categoria: 'calf',
    ultimoPeso,
    ultimoIntervalo:
      opciones.ganancia === undefined
        ? null
        : {
            fechaPrevia: '2026-10-15',
            dias: opciones.dias ?? 17,
            kilosGanados: opciones.ganancia,
            kilosPorDia: opciones.porDia === undefined ? opciones.ganancia : opciones.porDia,
            calidades: ['measured', 'measured'],
            incluyeCalidadNoMedida: false,
          },
    diasDesdeElUltimoPesaje: opciones.sinPeso === true ? null : 21,
    fueHuecoEnLaUltimaSesion: opciones.hueco === true,
  }
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

describe('Tabla de crecimiento', () => {
  it('ordena los huecos primero, después la menor ganancia por día', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': () => ({
        estado: 200,
        cuerpo: {
          // Desordenado a propósito: el orden lo pone la pantalla.
          animales: [
            fila(A, 'Canelo', { ganancia: '12.500', porDia: '0.735' }),
            fila(B, 'Lucero', { ganancia: '-3.000', porDia: '-0.176', dias: 17 }),
            fila(C, 'Tordo', { hueco: true, ganancia: '20.000', porDia: '1.176' }),
            fila(D, 'Pinto', { sinPeso: true }),
          ],
        },
      }),
    })

    pintarApp('#/crecimiento')

    await screen.findByRole('heading', { name: 'Quién va bien y quién va atrás' })

    const cuerpo = screen.getAllByRole('row').slice(1)
    const nombres = cuerpo.map((renglon) => {
      const enlace = within(renglon).getAllByRole('button')[0]
      return enlace?.textContent
    })

    // El hueco primero; después la ganancia más baja (-0.176), luego 0.735 y
    // al final el que no tiene dos pesajes que comparar.
    expect(nombres).toEqual(['Tordo', 'Lucero', 'Canelo', 'Pinto'])
  })

  it('un hueco se ve como «no se pesó», no como un animal que se fue', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': () => ({
        estado: 200,
        cuerpo: {
          animales: [fila(C, 'Tordo', { hueco: true, ganancia: '20.000', porDia: '1.176' })],
        },
      }),
    })

    pintarApp('#/crecimiento')

    expect(await screen.findByText(/No se pesó en la última/)).toBeDefined()
    // El animal sigue en el hato: el hueco no lo dio de baja ni verificó nada.
    expect(screen.getByText('Becerro')).toBeDefined()
  })

  it('enseña la ganancia en kilos y por día como texto, con el intervalo', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': () => ({
        estado: 200,
        cuerpo: {
          animales: [fila(A, 'Canelo', { ganancia: '39.375', porDia: '1.969', dias: 20 })],
        },
      }),
    })

    pintarApp('#/crecimiento')

    expect(await screen.findByText(/39\.375 kg/)).toBeDefined()
    expect(screen.getByText(/1\.969 kg por día/)).toBeDefined()
    expect(screen.getByText('En 20 días')).toBeDefined()
  })

  it('sin pesajes invita a empezar la primera vuelta', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': () => ({ estado: 200, cuerpo: { animales: [] } }),
    })

    pintarApp('#/crecimiento')

    expect(
      await screen.findByText('Empieza con la primera vuelta por la báscula'),
    ).toBeDefined()
  })
})
