import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ANIMAL, CUANDO, CUENTA, fichaDeAnimal, montarApi, pintarApp, sesionAbierta } from './ayudas'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const VISTA_VACIA = {
  animalId: ANIMAL,
  nombre: null,
  categoria: 'unknown',
  activo: true,
  pesos: [],
  ultimoPesaje: null,
  huecos: [],
}

const ARETE_VIEJO = {
  id: '66666666-6666-4666-8666-666666666666',
  tipo: 'siniiga',
  valor: 'MX-0001',
  desde: '2024-04-02',
  estado: 'active',
  cambiadaEl: null,
  recordedBy: CUENTA,
  recordedAt: CUANDO,
}

describe('Aretes del animal', () => {
  it('cambiar un arete cierra el anterior y deja el nuevo en un solo comando', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Canelo', marcas: [ARETE_VIEJO] }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
      [`POST /api/animals/${ANIMAL}/marks/${ARETE_VIEJO.id}/replace`]: () => ({
        estado: 200,
        cuerpo: {
          anterior: { ...ARETE_VIEJO, estado: 'replaced', cambiadaEl: '2026-11-22' },
          nueva: {
            ...ARETE_VIEJO,
            id: '77777777-7777-4777-8777-777777777777',
            valor: 'MX-9999',
            desde: null,
          },
        },
      }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    expect(await screen.findByText('SINIIGA MX-0001')).toBeDefined()
    await usuario.click(screen.getByRole('button', { name: 'Cambiar arete' }))

    await usuario.type(screen.getByLabelText(/Número del arete/), 'MX-9999')
    await usuario.click(screen.getByRole('button', { name: 'Guardar el cambio' }))

    await waitFor(() => {
      expect(
        api.peticiones.filter((peticion) =>
          peticion.ruta.endsWith(`/marks/${ARETE_VIEJO.id}/replace`),
        ),
      ).toHaveLength(1)
    })

    const cambio = api.peticiones.find((peticion) => peticion.ruta.includes('/replace'))
    expect(cambio?.cuerpo).toMatchObject({ tipo: 'siniiga', valor: 'MX-9999' })

    const cuerpo = cambio?.cuerpo as Record<string, unknown>
    expect(cuerpo.commandId).toMatch(/^[0-9a-f-]{36}$/)
    // Un arete nuevo es su propio registro, con su propio id.
    expect(cuerpo.marcaId).toMatch(/^[0-9a-f-]{36}$/)
    expect(cuerpo.marcaId).not.toBe(ARETE_VIEJO.id)
    // La fecha vacía no viaja: no se inventa el día en que se lo puso.
    expect(cuerpo.desde).toBeUndefined()
  })

  it('un arete que se cayó se cierra y no se borra', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Canelo', marcas: [ARETE_VIEJO] }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
      [`POST /api/animals/${ANIMAL}/marks/${ARETE_VIEJO.id}/lost`]: () => ({
        estado: 200,
        cuerpo: { ...ARETE_VIEJO, estado: 'lost', cambiadaEl: '2026-11-22' },
      }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    await screen.findByText('SINIIGA MX-0001')
    await usuario.click(screen.getByRole('button', { name: 'Se cayó' }))

    await waitFor(() => {
      expect(api.peticiones.some((peticion) => peticion.ruta.endsWith('/lost'))).toBe(true)
    })

    const perdida = api.peticiones.find((peticion) => peticion.ruta.endsWith('/lost'))
    const cuerpo = (perdida?.cuerpo ?? {}) as Record<string, unknown>
    expect(cuerpo.commandId).toMatch(/^[0-9a-f-]{36}$/)
    // No se manda `cambiadaEl`: el día no se sabe y no se inventa.
    expect(cuerpo.cambiadaEl).toBeUndefined()
  })
})
