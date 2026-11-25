import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  animalDeLista,
  CUANDO,
  CUENTA,
  montarApi,
  pintarApp,
  sesionAbierta,
} from './ayudas'

/**
 * Potreros y lugar esperado en la web: la pantalla «Potreros» con cuántos se
 * esperan en cada uno, el filtro por potrero en el hato, «Mover a…» y el lugar
 * vigente en la ficha.
 *
 * Los datos son sintéticos: los del rancho no entran al repo.
 */

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const ANIMAL_A = '11111111-1111-4111-8111-111111111111'
const ANIMAL_B = '22222222-2222-4222-8222-222222222222'
const POTRERO_UNO = '33333333-3333-4333-8333-333333333333'
const POTRERO_DOS = '44444444-4444-4444-8444-444444444444'

function elHato() {
  return () => ({
    estado: 200,
    cuerpo: {
      animales: [
        animalDeLista({ id: ANIMAL_A, nombre: 'Canelo', categoria: 'calf' }),
        animalDeLista({ id: ANIMAL_B, nombre: 'Lucero', categoria: 'calf' }),
      ],
    },
  })
}

function elResumen() {
  return () => ({
    estado: 200,
    cuerpo: {
      animales: [],
      gananciaMediaKilosPorDia: null,
      pesadosEnLaUltimaVuelta: 0,
      esperadosEnLaUltimaVuelta: 0,
      fechaDeLaUltimaVuelta: null,
    },
  })
}

function unPotrero(cambios: Record<string, unknown> = {}) {
  return {
    id: POTRERO_UNO,
    nombre: 'El Zapote',
    nota: null,
    version: 1,
    recordedBy: CUENTA,
    recordedAt: CUANDO,
    correcciones: [],
    esperados: 0,
    ...cambios,
  }
}

function losPotreros(esperados = 0) {
  return () => ({
    estado: 200,
    cuerpo: {
      potreros: [
        unPotrero({ esperados }),
        unPotrero({ id: POTRERO_DOS, nombre: 'La Esperanza', esperados: 0 }),
      ],
      sinAsignacion: 2,
      desconocidos: 1,
    },
  })
}

function sinLugares() {
  return () => ({ estado: 200, cuerpo: { animales: [] } })
}

describe('pantalla Potreros', () => {
  it('lista los potreros con cuántos animales se esperan en cada uno y los huecos', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/paddocks': losPotreros(3),
      'GET /api/locations': sinLugares(),
    })

    pintarApp('#/potreros')

    expect(await screen.findByText('El Zapote')).toBeDefined()
    expect(screen.getByText('Se esperan 3 animales')).toBeDefined()
    expect(screen.getByText('La Esperanza')).toBeDefined()
    expect(screen.getByText('No se espera a nadie aquí')).toBeDefined()
    // Los dos huecos se dicen aparte: uno es «nunca se movió», el otro «no sé».
    expect(screen.getByText('2 animales sin lugar')).toBeDefined()
    expect(screen.getByText('1 animal está con lugar desconocido')).toBeDefined()
    // La pantalla no pide hectáreas ni afirma que los potreros cubran el rancho.
    expect(screen.queryByText(/530/)).toBeNull()
    expect(screen.queryByLabelText(/hectáreas/i)).toBeNull()
  })

  it('sin potreros invita a crear el primero y el aviso no inventa animales', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 },
      }),
      'GET /api/locations': sinLugares(),
    })

    pintarApp('#/potreros')

    expect(await screen.findByText('Empieza con un potrero')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Agregar el primer potrero' })).toBeDefined()
  })

  it('abre el alta de potrero y manda el nombre que el rancho usa', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 },
      }),
      'GET /api/locations': sinLugares(),
      'POST /api/paddocks': () => ({ estado: 201, cuerpo: unPotrero({ nombre: 'El Zapote' }) }),
    })

    pintarApp('#/potreros')
    await usuario.click(await screen.findByRole('button', { name: 'Agregar el primer potrero' }))
    await usuario.type(screen.getByLabelText('Nombre del potrero'), 'El Zapote')
    await usuario.click(screen.getByRole('button', { name: 'Agregar potrero' }))

    const alta = api.peticiones.find(
      (peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/paddocks',
    )
    expect(alta?.cuerpo).toMatchObject({ nombre: 'El Zapote' })
    expect(alta?.cuerpo).not.toHaveProperty('hectareas')
  })

  it('si los potreros no se pueden traer, no dice que no hay ninguno', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/paddocks': () => ({ estado: 500, cuerpo: { codigo: 'error_desconocido' } }),
      'GET /api/locations': sinLugares(),
    })

    pintarApp('#/potreros')

    expect(await screen.findByRole('button', { name: 'Volver a intentar' })).toBeDefined()
    expect(screen.queryByText('Empieza con un potrero')).toBeNull()
  })

  it('se llega desde el menú del hato', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/paddocks': losPotreros(),
      'GET /api/locations': sinLugares(),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')
    await usuario.click(screen.getByRole('button', { name: 'Menú' }))
    await usuario.click(screen.getByRole('button', { name: 'Potreros' }))

    expect(await screen.findByRole('heading', { name: 'Potreros' })).toBeDefined()
  })
})

describe('filtro por potrero en el hato', () => {
  it('filtra los animales activos por el potrero donde se les espera', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/paddocks': losPotreros(),
      'GET /api/locations': () => ({
        estado: 200,
        cuerpo: {
          animales: [
            { animalId: ANIMAL_A, potreroId: POTRERO_UNO, desde: '2026-11-01' },
            { animalId: ANIMAL_B, potreroId: null, desde: '2026-11-02' },
          ],
        },
      }),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')

    const filtro = await screen.findByRole('radiogroup', { name: 'Filtrar por potrero' })
    await usuario.click(within(filtro).getByRole('radio', { name: /El Zapote/ }))

    expect(screen.getByText('Canelo')).toBeDefined()
    expect(screen.queryByText('Lucero')).toBeNull()

    await usuario.click(within(filtro).getByRole('radio', { name: 'No sé' }))
    expect(screen.getByText('Lucero')).toBeDefined()
    expect(screen.queryByText('Canelo')).toBeNull()

    await usuario.click(within(filtro).getByRole('radio', { name: 'Sin lugar' }))
    expect(screen.getByText('Ningún animal coincide')).toBeDefined()
  })

  it('sin potreros anotados no se ofrece el filtro', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 },
      }),
      'GET /api/locations': sinLugares(),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')

    expect(screen.queryByRole('radiogroup', { name: 'Filtrar por potrero' })).toBeNull()
  })
})

describe('Mover a… en el hato', () => {
  it('manda una asignación por animal elegido, en un solo comando', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/paddocks': losPotreros(),
      'GET /api/locations': sinLugares(),
      'POST /api/locations': () => ({
        estado: 201,
        cuerpo: { asignaciones: [] },
      }),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')

    await usuario.click(screen.getByRole('button', { name: 'Mover animales a un potrero' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Canelo' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Lucero' }))

    const destino = within(screen.getByRole('radiogroup', { name: '¿A qué potrero?' }))
    await usuario.click(destino.getByRole('radio', { name: 'El Zapote' }))
    await usuario.click(screen.getByRole('button', { name: 'Mover a…' }))

    const movimiento = api.peticiones.find(
      (peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/locations',
    ) as { cuerpo: { potreroId: string; animales: { animalId: string; asignacionId: string }[] } }
    expect(movimiento.cuerpo.potreroId).toBe(POTRERO_UNO)
    expect(movimiento.cuerpo.animales.map((animal) => animal.animalId).sort()).toEqual(
      [ANIMAL_A, ANIMAL_B].sort(),
    )
    expect(new Set(movimiento.cuerpo.animales.map((animal) => animal.asignacionId)).size).toBe(2)
  })

  it('«No sé» es un destino válido y viaja como nulo', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/paddocks': losPotreros(),
      'GET /api/locations': sinLugares(),
      'POST /api/locations': () => ({ estado: 201, cuerpo: { asignaciones: [] } }),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')
    await usuario.click(screen.getByRole('button', { name: 'Mover animales a un potrero' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Canelo' }))
    await usuario.click(
      within(screen.getByRole('radiogroup', { name: '¿A qué potrero?' })).getByRole('radio', {
        name: 'No sé',
      }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Mover a…' }))

    const movimiento = api.peticiones.find(
      (peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/locations',
    ) as { cuerpo: { potreroId: string | null } }
    expect(movimiento.cuerpo.potreroId).toBeNull()
  })

  it('sin animales elegidos no se puede mover', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/paddocks': losPotreros(),
      'GET /api/locations': sinLugares(),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')
    await usuario.click(screen.getByRole('button', { name: 'Mover animales a un potrero' }))

    expect(screen.getByRole('button', { name: 'Mover a…' })).toHaveProperty('disabled', true)
  })
})

describe('lugar vigente en la ficha', () => {
  it('dice el potrero vigente, desde cuándo y que no es una observación', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/paddocks': losPotreros(),
      'GET /api/locations': sinLugares(),
      [`GET /api/animals/${ANIMAL_A}`]: () => ({
        estado: 200,
        cuerpo: fichaDeCanelo(),
      }),
      [`GET /api/animals/${ANIMAL_A}/location`]: () => ({
        estado: 200,
        cuerpo: {
          vigente: {
            id: '55555555-5555-4555-8555-555555555555',
            potreroId: POTRERO_UNO,
            desde: '2026-11-12',
            nota: null,
            recordedBy: CUENTA,
            recordedAt: CUANDO,
          },
          historia: [
            {
              id: '66666666-6666-4666-8666-666666666666',
              potreroId: POTRERO_DOS,
              desde: '2026-11-01',
              nota: null,
              recordedBy: CUENTA,
              recordedAt: CUANDO,
            },
            {
              id: '55555555-5555-4555-8555-555555555555',
              potreroId: POTRERO_UNO,
              desde: '2026-11-12',
              nota: null,
              recordedBy: CUENTA,
              recordedAt: CUANDO,
            },
          ],
        },
      }),
      [`GET /api/animals/${ANIMAL_A}/weights`]: () => ({
        estado: 200,
        cuerpo: { animalId: ANIMAL_A, pesos: [] },
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL_A}`]: () => ({
        estado: 200,
        cuerpo: {
          animalId: ANIMAL_A,
          nombre: 'Canelo',
          categoria: 'calf',
          activo: true,
          pesos: [],
          ultimoPesaje: null,
          huecos: [],
        },
      }),
    })

    pintarApp(`#/animal/${ANIMAL_A}`)

    expect(await screen.findByText('Dónde se le espera')).toBeDefined()
    expect(await screen.findByText('El Zapote')).toBeDefined()
    expect(
      screen.getByText('Desde el 12 nov 2026. Es dónde se le espera, no una observación.'),
    ).toBeDefined()

    // La historia está, y el potrero anterior no se borró.
    expect(screen.getByRole('button', { name: /Dónde se le esperaba antes/ })).toBeDefined()
  })

  it('un animal sin asignación lo dice sin inventar un potrero', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/paddocks': losPotreros(),
      'GET /api/locations': sinLugares(),
      [`GET /api/animals/${ANIMAL_A}`]: () => ({ estado: 200, cuerpo: fichaDeCanelo() }),
      [`GET /api/animals/${ANIMAL_A}/location`]: () => ({
        estado: 200,
        cuerpo: { vigente: null, historia: [] },
      }),
      [`GET /api/animals/${ANIMAL_A}/weights`]: () => ({
        estado: 200,
        cuerpo: { animalId: ANIMAL_A, pesos: [] },
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL_A}`]: () => ({
        estado: 200,
        cuerpo: {
          animalId: ANIMAL_A,
          nombre: 'Canelo',
          categoria: 'calf',
          activo: true,
          pesos: [],
          ultimoPesaje: null,
          huecos: [],
        },
      }),
    })

    pintarApp(`#/animal/${ANIMAL_A}`)

    expect(
      await screen.findByText(
        'Todavía no se le anotó un potrero. En el hato se elige el animal y se usa «Mover a…».',
      ),
    ).toBeDefined()
  })
})

function fichaDeCanelo(): Record<string, unknown> {
  return {
    ...animalDeLista({ id: ANIMAL_A, nombre: 'Canelo', categoria: 'calf' }),
    correcciones: [],
    correccionesDeSalida: [],
  }
}
