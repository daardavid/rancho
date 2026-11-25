import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CUANDO, CUENTA, animalDeLista, fichaDeAnimal, montarApi, pintarApp, sesionAbierta, type Peticion } from './ayudas'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

function nacimientos(peticiones: readonly Peticion[]): Peticion[] {
  return peticiones.filter((peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/births')
}

describe('Nacimiento: reintento del comando', () => {
  it('reutiliza el commandId si nada cambió, y lo renueva si solo cambia el arete', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({ estado: 200, cuerpo: { animales: [] } }),
      'POST /api/births': () => ({ estado: 500, cuerpo: { codigo: 'error_desconocido' } }),
    })

    pintarApp('#/nacimiento')

    const guardar = await screen.findByRole('button', { name: 'Registrar nacimiento' })
    await usuario.click(guardar)

    expect(await screen.findByRole('alert')).toBeDefined()
    await waitFor(() => {
      expect(nacimientos(api.peticiones)).toHaveLength(1)
    })

    await usuario.click(screen.getByRole('button', { name: 'Registrar nacimiento' }))
    await waitFor(() => {
      expect(nacimientos(api.peticiones)).toHaveLength(2)
    })

    const [primero, segundo] = nacimientos(api.peticiones)
    const cuerpoPrimero = primero?.cuerpo as { commandId: string; marca?: unknown }
    const cuerpoSegundo = segundo?.cuerpo as { commandId: string; marca?: unknown }
    expect(cuerpoSegundo.commandId).toBe(cuerpoPrimero.commandId)
    expect(cuerpoPrimero.marca).toBeUndefined()
    expect(cuerpoSegundo.marca).toBeUndefined()

    await usuario.type(screen.getByLabelText('Arete SINIIGA'), '4821')
    await usuario.click(screen.getByRole('button', { name: 'Registrar nacimiento' }))
    await waitFor(() => {
      expect(nacimientos(api.peticiones)).toHaveLength(3)
    })

    const tercero = nacimientos(api.peticiones)[2]?.cuerpo as {
      commandId: string
      marca?: { marcaId: string; tipo: string; valor: string }
    }
    expect(tercero.commandId).not.toBe(cuerpoPrimero.commandId)
    expect(tercero.marca?.tipo).toBe('siniiga')
    expect(tercero.marca?.valor).toBe('4821')
    expect(tercero.marca?.marcaId).toMatch(/^[0-9a-f-]{36}$/)
  })
})

const MADRE = '44444444-4444-4444-8444-444444444444'
const CRIA = '55555555-5555-4555-8555-555555555555'
const POTRERO = '66666666-6666-4666-8666-666666666666'
const FILIACION = '77777777-7777-4777-8777-777777777777'

function laMadre() {
  return animalDeLista({
    id: MADRE,
    nombre: 'La Pinta',
    categoria: 'cow',
    sexo: 'female',
    tenencia: 'ranch',
  })
}

function potrero() {
  return {
    id: POTRERO,
    nombre: 'El Zapote',
    nota: null,
    version: 1,
    recordedBy: CUENTA,
    recordedAt: CUANDO,
    correcciones: [],
    esperados: 1,
  }
}

function nacimientoGuardado(tenencia: string) {
  return {
    animal: fichaDeAnimal({ id: CRIA, nombre: 'Cría', categoria: 'calf', tenencia }),
    filiacion: {
      id: FILIACION,
      criaId: CRIA,
      madre: { certeza: 'observed', animalId: MADRE, motivo: null },
      padre: { certeza: 'unknown', animalId: null, motivo: null },
      nota: null,
      fechaNacimiento: null,
      precisionFecha: null,
      version: 1,
      recordedBy: CUENTA,
      recordedAt: CUANDO,
    },
  }
}

describe('Nacimiento: la propuesta de la madre', () => {
  it('sin aceptarla no copia tenencia ni lugar', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({ estado: 200, cuerpo: { animales: [laMadre()] } }),
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [potrero()], sinAsignacion: 0, desconocidos: 0 },
      }),
      'GET /api/locations': () => ({
        estado: 200,
        cuerpo: { animales: [{ animalId: MADRE, potreroId: POTRERO, desde: '2026-11-01' }] },
      }),
      'POST /api/births': () => ({ estado: 201, cuerpo: nacimientoGuardado('unknown') }),
    })

    pintarApp('#/nacimiento')
    await usuario.selectOptions(await screen.findByLabelText('Madre'), MADRE)
    expect(await screen.findByText('¿Va con su madre? Del rancho · El Zapote')).toBeDefined()
    await usuario.click(screen.getByRole('radio', { name: 'La vi' }))
    await usuario.click(screen.getByRole('button', { name: 'Registrar nacimiento' }))

    await waitFor(() => {
      expect(nacimientos(api.peticiones)).toHaveLength(1)
    })
    expect(nacimientos(api.peticiones)[0]?.cuerpo).toMatchObject({
      tenencia: 'unknown',
      madre: { certeza: 'observed', animalId: MADRE, motivo: null },
      padre: { certeza: 'unknown', animalId: null, motivo: null },
    })
    expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/locations')).toEqual([])
  })

  it('aceptarla escribe la tenencia y el potrero de la madre', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({ estado: 200, cuerpo: { animales: [laMadre()] } }),
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [potrero()], sinAsignacion: 0, desconocidos: 0 },
      }),
      'GET /api/locations': () => ({
        estado: 200,
        cuerpo: { animales: [{ animalId: MADRE, potreroId: POTRERO, desde: '2026-11-01' }] },
      }),
      'POST /api/births': () => ({ estado: 201, cuerpo: nacimientoGuardado('ranch') }),
      'POST /api/locations': () => ({
        estado: 201,
        cuerpo: {
          asignaciones: [
            {
              id: '88888888-8888-4888-8888-888888888888',
              potreroId: POTRERO,
              desde: '2026-11-25',
              nota: null,
              reportedBy: null,
              recordedBy: CUENTA,
              recordedAt: CUANDO,
            },
          ],
        },
      }),
    })

    pintarApp('#/nacimiento')
    await usuario.selectOptions(await screen.findByLabelText('Madre'), MADRE)
    const aceptar = await screen.findByRole('button', { name: 'Va con su madre' })
    await waitFor(() => {
      expect(aceptar).toHaveProperty('disabled', false)
    })
    await usuario.click(aceptar)
    await usuario.click(screen.getByRole('radio', { name: 'La vi' }))
    await usuario.click(screen.getByRole('button', { name: 'Registrar nacimiento' }))

    await waitFor(() => {
      expect(api.peticiones.some((peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/locations')).toBe(true)
    })
    expect(nacimientos(api.peticiones)[0]?.cuerpo).toMatchObject({ tenencia: 'ranch' })
    expect(
      api.peticiones.find((peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/locations')?.cuerpo,
    ).toMatchObject({
      potreroId: POTRERO,
      animales: [{ animalId: CRIA }],
    })
  })
})
