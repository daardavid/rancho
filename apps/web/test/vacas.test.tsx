import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ANIMAL, fichaDeAnimal, montarApi, pintarApp, sesionAbierta } from './ayudas'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const TARDA = '11111111-1111-4111-8111-111111111111'
const RECIENTE = '22222222-2222-4222-8222-222222222222'
const SIN = '33333333-3333-4333-8333-333333333333'

function fila(
  animalId: string,
  nombre: string,
  dias: number | null,
  fecha: string | null,
): Record<string, unknown> {
  return {
    animalId,
    nombre,
    categoria: 'cow',
    diasDesdeElUltimoParto: dias,
    fechaDelUltimoParto: fecha,
    partosSinFecha: 0,
    ultimoDiagnostico: null,
  }
}

describe('vacas por último parto', () => {
  it('ordena por días y separa a las que no tienen parto', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/read-models/vacas': () => ({
        estado: 200,
        cuerpo: {
          porUltimoParto: [
            fila(TARDA, 'Tarda', 800, '2024-01-01'),
            fila(RECIENTE, 'Reciente', 40, '2026-10-01'),
          ],
          partoSinFecha: [],
          sinPartoRegistrado: [fila(SIN, 'Sin parto', null, null)],
        },
      }),
    })

    pintarApp('#/vacas')

    const conParto = await screen.findByRole('list', { name: 'Por días desde el último parto' })
    const nombres = within(conParto)
      .getAllByRole('link')
      .map((enlace) => enlace.textContent)
    expect(nombres[0]).toContain('Tarda')
    expect(nombres[0]).toContain('800')
    expect(nombres[1]).toContain('Reciente')
    expect(nombres[1]).toContain('40')

    const aparte = screen.getByRole('list', { name: 'Sin parto registrado' })
    expect(within(aparte).getByRole('link', { name: /Sin parto/ })).toBeDefined()
    expect(within(conParto).queryByText(/Sin parto/)).toBeNull()
  })

  it('el diagnóstico no trae resultado ni «se vio» preelegidos', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Luna', sexo: 'female', categoria: 'cow' }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: {
          animalId: ANIMAL,
          nombre: 'Luna',
          categoria: 'cow',
          activo: true,
          pesos: [],
          ultimoPesaje: null,
          huecos: [],
        },
      }),
    })

    pintarApp(`#/animal/${ANIMAL}`)
    await usuario.click(await screen.findByRole('button', { name: 'Anotar diagnóstico' }))

    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBeGreaterThan(0)
    expect(radios.every((radio) => (radio as HTMLInputElement).checked === false)).toBe(true)
    expect((screen.getByRole('button', { name: 'Guardar diagnóstico' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })
})
