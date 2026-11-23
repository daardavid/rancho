import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  animalDeLista,
  ANIMAL,
  CUENTA,
  CUANDO,
  fichaDeAnimal,
  montarApi,
  pintarApp,
  sesionAbierta,
} from './ayudas'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

describe('Alta de un animal', () => {
  it('con todo en «No sé» manda un solo comando y no muestra ningún error', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'POST /api/animals': () => ({ estado: 201, cuerpo: fichaDeAnimal({ nombre: 'Lucero' }) }),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Lucero' }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: {
          animalId: ANIMAL,
          nombre: 'Lucero',
          categoria: 'unknown',
          activo: true,
          pesos: [],
          ultimoPesaje: null,
          huecos: [],
        },
      }),
    })

    pintarApp('#/alta')

    // Lo único que se toca es el botón: cada pregunta ya viene en «No sé».
    await usuario.click(await screen.findByRole('button', { name: 'Dar de alta' }))

    await waitFor(() => {
      expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(1)
    })

    const alta = api.peticiones.find((peticion) => peticion.metodo === 'POST')
    expect(alta?.ruta).toBe('/api/animals')
    expect(alta?.cuerpo).toMatchObject({
      sexo: 'unknown',
      categoria: 'unknown',
      tenencia: 'unknown',
      participacionEconomica: 'unknown',
    })

    const cuerpo = alta?.cuerpo as Record<string, unknown>
    // Nada inventado: sin nombre, sin detalle de categoría, sin nota.
    expect(cuerpo.nombre).toBeUndefined()
    expect(cuerpo.detalleCategoria).toBeUndefined()
    expect(cuerpo.nota).toBeUndefined()
    expect(cuerpo.notaDelArreglo).toBeUndefined()
    // Los identificadores los genera la pantalla.
    expect(cuerpo.commandId).toMatch(/^[0-9a-f-]{36}$/)
    expect(cuerpo.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('«No sé» no se pinta como error en ninguna de sus preguntas', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'POST /api/animals': () => ({ estado: 201, cuerpo: fichaDeAnimal() }),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaDeAnimal() }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: {
          animalId: ANIMAL,
          nombre: null,
          categoria: 'unknown',
          activo: true,
          pesos: [],
          ultimoPesaje: null,
          huecos: [],
        },
      }),
    })

    pintarApp('#/alta')

    const boton = await screen.findByRole('button', { name: 'Dar de alta' })
    expect((boton as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()

    // Sexo, categoría y tenencia ya vienen en «No sé» y se puede guardar así.
    const sexoNoSe = screen.getAllByRole('radio', { name: 'No sé' })
    expect(sexoNoSe).toHaveLength(3)
    for (const opcion of sexoNoSe) {
      expect((opcion as HTMLInputElement).checked).toBe(true)
    }

    await usuario.click(boton)
    await screen.findByRole('heading', { name: 'Sin nombre o seña' })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('encuentra al animal por un arete que ya se cambió', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({
        estado: 200,
        cuerpo: {
          animales: [
            animalDeLista({
              nombre: 'Canelo',
              marcas: [
                {
                  id: '66666666-6666-4666-8666-666666666666',
                  tipo: 'siniiga',
                  valor: 'MX-0001',
                  desde: '2025-03-01',
                  estado: 'replaced',
                  cambiadaEl: '2026-02-10',
                  recordedBy: CUENTA,
                  recordedAt: CUANDO,
                },
                {
                  id: '77777777-7777-4777-8777-777777777777',
                  tipo: 'siniiga',
                  valor: 'MX-9999',
                  desde: '2026-02-10',
                  estado: 'active',
                  cambiadaEl: null,
                  recordedBy: CUENTA,
                  recordedAt: CUANDO,
                },
              ],
            }),
          ],
        },
      }),
      'GET /api/read-models/growth-overview': () => ({ estado: 200, cuerpo: { animales: [] } }),
    })

    pintarApp('#/')

    expect(await screen.findByText('Canelo')).toBeDefined()
    // En la lista se ve el arete puesto, no el viejo.
    expect(screen.getByText(/SINIIGA MX-9999/)).toBeDefined()

    await usuario.type(screen.getByLabelText('Buscar'), 'MX-0001')
    expect(screen.getByText('Canelo')).toBeDefined()

    await usuario.clear(screen.getByLabelText('Buscar'))
    await usuario.type(screen.getByLabelText('Buscar'), 'no existe')
    expect(screen.getByText('Ningún animal coincide')).toBeDefined()
  })

  it('sin animales invita a dar de alta el primero', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({ estado: 200, cuerpo: { animales: [] } }),
      'GET /api/read-models/growth-overview': () => ({ estado: 200, cuerpo: { animales: [] } }),
    })

    pintarApp('#/')

    expect(await screen.findByText('Empieza con el primer animal')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Dar de alta el primer animal' })).toBeDefined()
  })
})
