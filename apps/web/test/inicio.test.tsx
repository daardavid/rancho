import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { diaMas, hoyEnElRancho } from '../src/dominio/fechas'
import { montarApi, pintarApp, sesionAbierta } from './ayudas'

/**
 * Inicio con datos sintéticos. El orden y el vacío se leen en la pantalla,
 * no en un umbral escondido.
 */

const VIEJO = '11111111-1111-4111-8111-111111111111'
const HOY = '22222222-2222-4222-8222-222222222222'
const CRIA = '33333333-3333-4333-8333-333333333333'
const SIN_DATOS = '44444444-4444-4444-8444-444444444444'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

describe('Inicio', () => {
  it('muestra los activos, deja vacío lo que no se sabe y ordena por días sin umbral', async () => {
    const desde = diaMas(hoyEnElRancho(), -7)
    const hoy = hoyEnElRancho()
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/read-models/inicio?desde=${desde}`]: () => ({
        estado: 200,
        cuerpo: {
          hoy,
          desde,
          activosPorCategoria: [
            { categoria: 'calf', cantidad: 1 },
            { categoria: 'unknown', cantidad: 2 },
          ],
          cambios: {
            nacimientos: [
              { animalId: CRIA, nombre: 'Cría del periodo', categoria: 'calf', fecha: hoy },
            ],
            nacimientosSinFecha: 1,
            salidas: [],
            pesajes: 0,
            notasDeSanidad: 0,
          },
          paraRevisar: {
            fechaDeLaUltimaVuelta: null,
            huecosDeLaUltimaVuelta: [],
            sinLugar: [{ animalId: SIN_DATOS, nombre: null, categoria: 'unknown' }],
            lugarDesconocido: [],
            sinObservacion: [{ animalId: SIN_DATOS, nombre: null, categoria: 'unknown' }],
            porDiasSinVerse: [
              {
                animalId: VIEJO,
                nombre: 'Visto hace mucho',
                categoria: 'cow',
                dias: 40,
                fecha: '2026-10-01',
                origen: 'pesaje',
                origenId: '55555555-5555-4555-8555-555555555555',
              },
              {
                animalId: HOY,
                nombre: 'Visto hoy',
                categoria: 'cow',
                dias: 0,
                fecha: hoy,
                origen: 'sanidad',
                origenId: '66666666-6666-4666-8666-666666666666',
              },
            ],
          },
        },
      }),
    })

    pintarApp('#/inicio')

    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Inicio' }).getAttribute('aria-current')).toBe('page')
    expect(within(screen.getByRole('region', { name: 'Activos' })).getByText('No sé')).toBeDefined()
    expect(screen.getByText('Todavía no hay una vuelta de pesaje.')).toBeDefined()
    expect(screen.getByText('Hay 1 nacimiento sin fecha. No entra en la cuenta.')).toBeDefined()
    expect(
      within(screen.getByRole('region', { name: 'Nacimientos' })).getByRole('link', {
        name: /Cría del periodo/,
      }),
    ).toBeDefined()

    const dias = screen.getByRole('region', { name: 'Días sin verse' })
    const nombres = within(dias).getAllByRole('link').map((enlace) => enlace.textContent)
    expect(nombres[0]).toContain('Visto hace mucho')
    expect(nombres[0]).toContain('hace 40 días')
    expect(nombres[1]).toContain('Visto hoy')
    expect(nombres[1]).toContain('hoy')
    expect(nombres).toHaveLength(2)
  })
})
