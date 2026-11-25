import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  animalDeLista,
  CUENTA,
  CUANDO,
  fichaDeAnimal,
  montarApi,
  pintarApp,
  sesionAbierta,
} from './ayudas'

/**
 * Notas de sanidad en la web: «Anotar sanidad» desde la ficha y desde el modo
 * de selección del hato, y la sección «Sanidad» de la ficha con las notas en
 * orden.
 *
 * Los datos son sintéticos: los del rancho no entran al repo.
 */

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const ANIMAL_A = '11111111-1111-4111-8111-111111111111'
const ANIMAL_B = '22222222-2222-4222-8222-222222222222'

function unaNota(cambios: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    animalId: ANIMAL_A,
    tipo: 'vacuna',
    detalle: 'Vacuna contra el ántrax',
    fecha: '2026-11-20',
    producto: 'Ántrax 200',
    evidenciaId: null,
    vioAlAnimal: false,
    version: 1,
    recordedBy: CUENTA,
    recordedAt: CUANDO,
    correcciones: [],
    ...cambios,
  }
}

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

const VISTA_VACIA = {
  animalId: ANIMAL_A,
  nombre: 'Canelo',
  categoria: 'calf',
  activo: true,
  pesos: [],
  ultimoPesaje: null,
  huecos: [],
}

describe('Sanidad en la ficha', () => {
  it('muestra las notas en orden, de la más nueva a la más vieja', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL_A}`]: () => ({ estado: 200, cuerpo: fichaDeAnimal({ id: ANIMAL_A, nombre: 'Canelo' }) }),
      [`GET /api/read-models/animal-growth/${ANIMAL_A}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
      'GET /api/paddocks': () => ({ estado: 200, cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 } }),
      [`GET /api/animals/${ANIMAL_A}/location`]: () => ({
        estado: 200,
        cuerpo: { vigente: null, historia: [] },
      }),
      [`GET /api/animals/${ANIMAL_A}/health-notes`]: () => ({
        estado: 200,
        cuerpo: {
          animalId: ANIMAL_A,
          notas: [
            unaNota({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', detalle: 'Vacuna vieja', fecha: '2026-10-01' }),
            unaNota({
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              tipo: 'problema',
              detalle: 'Se le vio cojera',
              fecha: '2026-11-20',
              producto: null,
              vioAlAnimal: true,
            }),
          ],
        },
      }),
    })

    pintarApp(`#/animal/${ANIMAL_A}`)

    const seccion = (await screen.findByRole('heading', { name: 'Sanidad' })).closest('section')
    expect(seccion).not.toBeNull()
    await within(seccion as HTMLElement).findByText('Se le vio cojera')
    const notas = within(seccion as HTMLElement).getAllByRole('listitem')
    // La más nueva va arriba: la cojera del 20 de noviembre primero.
    expect(notas[0]?.textContent).toContain('Problema visto')
    expect(notas[0]?.textContent).toContain('Se le vio cojera')
    expect(notas[0]?.textContent).toContain('La nota dice que se vio al animal.')
    expect(notas[1]?.textContent).toContain('Vacuna vieja')
    expect(notas[1]?.textContent).toContain('La nota no dice que se viera al animal.')
  })

  it('sin notas dice que no se le anotó nada, sin dejarlo vacío', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL_A}`]: () => ({ estado: 200, cuerpo: fichaDeAnimal({ id: ANIMAL_A, nombre: 'Canelo' }) }),
      [`GET /api/read-models/animal-growth/${ANIMAL_A}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
      'GET /api/paddocks': () => ({ estado: 200, cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 } }),
      [`GET /api/animals/${ANIMAL_A}/location`]: () => ({
        estado: 200,
        cuerpo: { vigente: null, historia: [] },
      }),
    })

    pintarApp(`#/animal/${ANIMAL_A}`)

    await screen.findByRole('heading', { name: 'Sanidad' })
    expect(await screen.findByText(/Todavía no se le anotó nada de sanidad/)).toBeDefined()
  })

  it('anota sanidad desde la ficha con «se vio» apagado por omisión', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL_A}`]: () => ({ estado: 200, cuerpo: fichaDeAnimal({ id: ANIMAL_A, nombre: 'Canelo' }) }),
      [`GET /api/read-models/animal-growth/${ANIMAL_A}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
      'GET /api/paddocks': () => ({ estado: 200, cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 } }),
      [`GET /api/animals/${ANIMAL_A}/location`]: () => ({
        estado: 200,
        cuerpo: { vigente: null, historia: [] },
      }),
      [`GET /api/animals/${ANIMAL_A}/health-notes`]: () => ({
        estado: 200,
        cuerpo: { animalId: ANIMAL_A, notas: [] },
      }),
      'POST /api/health-notes': () => ({
        estado: 201,
        cuerpo: { notas: [unaNota()] },
      }),
    })

    pintarApp(`#/animal/${ANIMAL_A}`)

    await usuario.click(await screen.findByRole('button', { name: 'Anotar sanidad' }))
    await usuario.type(
      await screen.findByLabelText('¿Qué se hizo o se vio?'),
      'Vacuna contra el ántrax',
    )
    await usuario.click(screen.getByRole('button', { name: 'Anotar sanidad' }))

    await waitFor(() => {
      expect(api.peticiones.some((peticion) => peticion.metodo === 'POST')).toBe(true)
    })

    const envio = api.peticiones.find((peticion) => peticion.metodo === 'POST')
    expect(envio?.ruta).toBe('/api/health-notes')
    expect(envio?.cuerpo).toMatchObject({
      tipo: 'vacuna',
      detalle: 'Vacuna contra el ántrax',
      // Por omisión la nota no dice que se vio al animal.
      vioAlAnimal: false,
      animales: [{ animalId: ANIMAL_A }],
    })
    // No viaja ni un calendario ni una dosis.
    expect(envio?.cuerpo).not.toHaveProperty('dosis')
    expect(envio?.cuerpo).not.toHaveProperty('proximaDosis')
  })

  it('con «sí se vio» lo manda explícito', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL_A}`]: () => ({ estado: 200, cuerpo: fichaDeAnimal({ id: ANIMAL_A, nombre: 'Canelo' }) }),
      [`GET /api/read-models/animal-growth/${ANIMAL_A}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
      'GET /api/paddocks': () => ({ estado: 200, cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 } }),
      [`GET /api/animals/${ANIMAL_A}/location`]: () => ({
        estado: 200,
        cuerpo: { vigente: null, historia: [] },
      }),
      [`GET /api/animals/${ANIMAL_A}/health-notes`]: () => ({
        estado: 200,
        cuerpo: { animalId: ANIMAL_A, notas: [] },
      }),
      'POST /api/health-notes': () => ({ estado: 201, cuerpo: { notas: [unaNota({ vioAlAnimal: true })] } }),
    })

    pintarApp(`#/animal/${ANIMAL_A}`)

    await usuario.click(await screen.findByRole('button', { name: 'Anotar sanidad' }))
    await usuario.type(await screen.findByLabelText('¿Qué se hizo o se vio?'), 'Baño de garrapata')
    await usuario.click(screen.getByRole('radio', { name: 'Sí se vio' }))
    await usuario.click(screen.getByRole('button', { name: 'Anotar sanidad' }))

    await waitFor(() => {
      expect(api.peticiones.some((peticion) => peticion.metodo === 'POST')).toBe(true)
    })
    expect(api.peticiones.find((peticion) => peticion.metodo === 'POST')?.cuerpo).toMatchObject({
      vioAlAnimal: true,
    })
  })

  it('sin decir qué se hizo no deja guardar', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL_A}`]: () => ({ estado: 200, cuerpo: fichaDeAnimal({ id: ANIMAL_A, nombre: 'Canelo' }) }),
      [`GET /api/read-models/animal-growth/${ANIMAL_A}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
      'GET /api/paddocks': () => ({ estado: 200, cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 } }),
      [`GET /api/animals/${ANIMAL_A}/location`]: () => ({
        estado: 200,
        cuerpo: { vigente: null, historia: [] },
      }),
    })

    pintarApp(`#/animal/${ANIMAL_A}`)

    await usuario.click(await screen.findByRole('button', { name: 'Anotar sanidad' }))
    const guardar = await screen.findByRole('button', { name: 'Anotar sanidad' })
    expect((guardar as HTMLButtonElement).disabled).toBe(true)
    expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toEqual([])
  })
})

describe('Sanidad desde el hato', () => {
  it('anota una nota por cada animal elegido, en una sola captura', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/paddocks': () => ({ estado: 200, cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 } }),
      'GET /api/locations': () => ({ estado: 200, cuerpo: { animales: [] } }),
      'POST /api/health-notes': () => ({
        estado: 201,
        cuerpo: { notas: [unaNota(), unaNota({ id: '88888888-8888-4888-8888-888888888888', animalId: ANIMAL_B })] },
      }),
    })

    pintarApp('#/')

    await usuario.click(
      await screen.findByRole('button', { name: 'Anotar sanidad a varios animales' }),
    )
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Canelo' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Lucero' }))
    await usuario.click(screen.getByRole('radio', { name: 'Baño' }))
    await usuario.type(
      await screen.findByLabelText('¿Qué se hizo o se vio?'),
      'Baño contra la mosca',
    )
    await usuario.click(screen.getByRole('button', { name: 'Anotar sanidad' }))

    await waitFor(() => {
      expect(api.peticiones.some((peticion) => peticion.metodo === 'POST')).toBe(true)
    })

    const envio = api.peticiones.find((peticion) => peticion.metodo === 'POST')
    const cuerpo = envio?.cuerpo as { tipo: string; animales: { animalId: string; notaId: string }[] }
    expect(cuerpo.tipo).toBe('bano')
    expect(cuerpo.animales.map((fila) => fila.animalId).sort()).toEqual([ANIMAL_A, ANIMAL_B].sort())
    // Cada animal lleva su propio id de nota: el reintento no duplica.
    expect(new Set(cuerpo.animales.map((fila) => fila.notaId)).size).toBe(2)
    expect(await screen.findByText(/Notas de sanidad guardadas/)).toBeDefined()
  })

  it('el mismo contenido al reintentar manda el mismo comando y los mismos ids', async () => {
    const usuario = userEvent.setup()
    let intentos = 0
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/paddocks': () => ({ estado: 200, cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 } }),
      'GET /api/locations': () => ({ estado: 200, cuerpo: { animales: [] } }),
      'POST /api/health-notes': () => {
        intentos += 1
        // La primera vez se cae la red; la segunda contesta lo guardado.
        return intentos === 1
          ? { estado: 500, cuerpo: { codigo: 'error_desconocido' } }
          : { estado: 201, cuerpo: { notas: [unaNota()] } }
      },
    })

    pintarApp('#/')

    await usuario.click(
      await screen.findByRole('button', { name: 'Anotar sanidad a varios animales' }),
    )
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Canelo' }))
    await usuario.type(await screen.findByLabelText('¿Qué se hizo o se vio?'), 'Se le curó una pata')
    await usuario.click(screen.getByRole('button', { name: 'Anotar sanidad' }))

    await waitFor(() => {
      expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(1)
    })

    await usuario.click(screen.getByRole('button', { name: 'Anotar sanidad' }))
    await waitFor(() => {
      expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(2)
    })

    const [primero, segundo] = api.peticiones.filter((peticion) => peticion.metodo === 'POST')
    expect(segundo?.cuerpo).toEqual(primero?.cuerpo)
  })
})
