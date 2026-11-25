import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ANIMAL,
  CUANDO,
  CUENTA,
  fichaDeAnimal,
  montarApi,
  pintarApp,
  sesionAbierta,
} from './ayudas'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const MADRE_VIEJA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const MADRE_ACTUAL = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const FILIACION = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const VISTA_VACIA = {
  animalId: ANIMAL,
  nombre: 'Cría',
  categoria: 'calf',
  activo: true,
  pesos: [],
  ultimoPesaje: null,
  huecos: [],
}

describe('Familia: historia de la filiación', () => {
  it('al abrirla muestra la fecha, la nota y el nombre anteriores', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({ estado: 200, cuerpo: { animales: [] } }),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Cría', sexo: 'male', categoria: 'calf' }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
      [`GET /api/animals/${ANIMAL}/weights`]: () => ({
        estado: 200,
        cuerpo: { animalId: ANIMAL, pesos: [] },
      }),
      [`GET /api/animals/${ANIMAL}/family`]: () => ({
        estado: 200,
        cuerpo: {
          filiacion: {
            id: FILIACION,
            criaId: ANIMAL,
            madre: { certeza: 'observed', animalId: MADRE_ACTUAL, motivo: null },
            padre: { certeza: 'unknown', animalId: null, motivo: null },
            nota: null,
            fechaNacimiento: '2026-04-02',
            precisionFecha: 'exact',
            version: 2,
            recordedBy: CUENTA,
            recordedAt: CUANDO,
            correcciones: [
              {
                madre: { certeza: 'observed', animalId: MADRE_VIEJA, motivo: null },
                padre: { certeza: 'unknown', animalId: null, motivo: null },
                nota: 'parto en el corral norte',
                fechaNacimiento: '2026-03-15',
                precisionFecha: 'approximate',
                motivo: 'la fecha del parto estaba mal',
                correctedBy: CUENTA,
                correctedAt: CUANDO,
              },
            ],
          },
          madre: {
            id: MADRE_ACTUAL,
            nombre: 'La Nueva',
            sexo: 'female',
            categoria: 'cow',
          },
          padre: null,
          crias: [],
          // La Vieja ya no está en el hato: el nombre sale de esta lectura.
          referidos: [
            {
              id: MADRE_VIEJA,
              nombre: 'La Vieja',
              sexo: 'female',
              categoria: 'cow',
            },
            {
              id: MADRE_ACTUAL,
              nombre: 'La Nueva',
              sexo: 'female',
              categoria: 'cow',
            },
          ],
        },
      }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    const historia = await screen.findByRole('button', { name: /Historia de la filiación/ })
    const nota = screen.getByText(/parto en el corral norte/)
    const fecha = screen.getByText(/15 mar 2026, aproximada/)
    // El desplegable deja el texto montado y oculto hasta que se abre.
    expect(nota.closest('[hidden]')).not.toBeNull()
    expect(fecha.closest('[hidden]')).not.toBeNull()

    await usuario.click(historia)

    expect(nota.closest('[hidden]')).toBeNull()
    expect(fecha.closest('[hidden]')).toBeNull()
    expect(screen.getByText(/Nota: antes parto en el corral norte/)).toBeDefined()
    expect(screen.getByText(/Nació: antes 15 mar 2026, aproximada/)).toBeDefined()
    expect(screen.getByText(/La vi · La Vieja/)).toBeDefined()
  })
})
