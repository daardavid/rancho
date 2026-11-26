import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { diaLegible } from '../src/dominio/fechas'
import { ANIMAL, CUANDO, CUENTA, fichaDeAnimal, montarApi, pintarApp, sesionAbierta } from './ayudas'

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

  it('una vaca sin partos dice «Sin parto registrado.» una sola vez', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Luna', sexo: 'female', categoria: 'cow' }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: crecimientoVacio(),
      }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    expect(await screen.findByRole('heading', { name: 'Cría' })).toBeDefined()
    expect(await screen.findAllByText('Sin parto registrado.')).toHaveLength(1)
  })

  it('la corrección de la fecha de un diagnóstico muestra el día anterior con diaLegible', async () => {
    const anterior = '2024-03-02'
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Luna', sexo: 'female', categoria: 'cow' }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: crecimientoVacio(),
      }),
      [`GET /api/read-models/cria/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: {
          animalId: ANIMAL,
          partos: [],
          intervalos: [],
          partosSinFecha: 0,
          diasDesdeElUltimoParto: null,
          kilosDestetados: {
            observadas: { conPeso: 0, sinPeso: 0, total: null, promedio: null },
            inferidas: { conPeso: 0, sinPeso: 0, total: null, promedio: null },
            sinPeso: [],
          },
          diagnosticos: [
            {
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              animalId: ANIMAL,
              fecha: '2026-11-01',
              resultado: 'prenada',
              reportedBy: null,
              nota: null,
              vioAlAnimal: true,
              version: 2,
              recordedBy: CUENTA,
              recordedAt: CUANDO,
              correcciones: [
                {
                  campo: 'fecha',
                  valorAnterior: anterior,
                  motivo: 'La fecha del cuaderno era otra',
                  correctedBy: CUENTA,
                  correctedAt: CUANDO,
                },
              ],
            },
          ],
        },
      }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    expect(
      await screen.findByText((texto) => texto.includes(`antes decía «${diaLegible(anterior)}»`)),
    ).toBeDefined()
    expect(screen.queryByText((texto) => texto.includes(anterior))).toBeNull()
  })
})

function crecimientoVacio(): Record<string, unknown> {
  return {
    animalId: ANIMAL,
    nombre: 'Luna',
    categoria: 'cow',
    activo: true,
    pesos: [],
    ultimoPesaje: null,
    huecos: [],
  }
}
