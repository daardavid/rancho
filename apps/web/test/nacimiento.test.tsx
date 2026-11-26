import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../src/App'
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
const TORO = '88888888-8888-4888-8888-888888888888'
const BECERRO = '99999999-9999-4999-8999-999999999999'
const DUDOSA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const VENDIDA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function sinLugares() {
  return () => ({ estado: 200, cuerpo: { animales: [] } })
}

function laMadre() {
  return animalDeLista({
    id: MADRE,
    nombre: 'La Pinta',
    categoria: 'cow',
    sexo: 'female',
    tenencia: 'ranch',
  })
}

/**
 * Elige la madre con el buscador, como lo hace el dueño: escribe y toca.
 *
 * El buscador reemplazó al desplegable: solo ofrece hembras activas o de sexo
 * «No sé», y se encuentra por nombre, seña o arete.
 */
async function elegirMadre(
  usuario: ReturnType<typeof userEvent.setup>,
  nombre: string,
): Promise<void> {
  await usuario.type(await screen.findByLabelText('Buscar la madre'), nombre)
  await usuario.click(await screen.findByRole('button', { name: new RegExp(nombre) }))
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
    await elegirMadre(usuario, 'La Pinta')
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
    await elegirMadre(usuario, 'La Pinta')
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

  it('si falla la lista de potreros no afirma «Potrero sin nombre»', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({ estado: 200, cuerpo: { animales: [laMadre()] } }),
      'GET /api/paddocks': () => ({ estado: 500, cuerpo: { codigo: 'error_desconocido' } }),
      'GET /api/locations': () => ({
        estado: 200,
        cuerpo: { animales: [{ animalId: MADRE, potreroId: POTRERO, desde: '2026-11-01' }] },
      }),
    })

    pintarApp('#/nacimiento')
    await elegirMadre(usuario, 'La Pinta')

    expect(await screen.findByText('No se pudo traer el nombre del potrero.')).toBeDefined()
    expect(screen.queryByText(/Potrero sin nombre/)).toBeNull()
  })
})

describe('Nacimiento: el buscador de la madre', () => {
  it('no ofrece machos ni animales dados de baja', async () => {
    const usuario = userEvent.setup()
    // El hato activo trae a la vaca, al toro, a un becerro y a una vaca con el
    // sexo en «No sé». Un animal dado de baja no lo manda la API, pero si
    // llegara, la pantalla tampoco lo ofrece.
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({
        estado: 200,
        cuerpo: {
          animales: [
            laMadre(),
            animalDeLista({ id: TORO, nombre: 'El Toro Prieto', categoria: 'bull', sexo: 'male' }),
            animalDeLista({ id: BECERRO, nombre: 'Becerro Suelto', categoria: 'calf', sexo: 'female' }),
            animalDeLista({ id: DUDOSA, nombre: 'La Dudosa', categoria: 'cow', sexo: 'unknown' }),
            animalDeLista({
              id: VENDIDA,
              nombre: 'La Vendida',
              categoria: 'cow',
              sexo: 'female',
              activo: false,
            }),
          ],
        },
      }),
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 },
      }),
      'GET /api/locations': sinLugares(),
    })

    pintarApp('#/nacimiento')

    // Un animal dado de baja no se ofrece como madre.
    await usuario.type(await screen.findByLabelText('Buscar la madre'), 'vendida')
    expect(await screen.findByText(/Ninguna hembra activa coincide/)).toBeDefined()

    // El macho no se ofrece aunque se escriba su nombre.
    await usuario.clear(screen.getByLabelText('Buscar la madre'))
    await usuario.type(screen.getByLabelText('Buscar la madre'), 'prieto')
    expect(await screen.findByText(/Ninguna hembra activa coincide/)).toBeDefined()

    // El becerro tampoco: no pare.
    await usuario.clear(screen.getByLabelText('Buscar la madre'))
    await usuario.type(screen.getByLabelText('Buscar la madre'), 'suelto')
    expect(await screen.findByText(/Ninguna hembra activa coincide/)).toBeDefined()

    // Una vaca con sexo «No sé» sí se ofrece: lo desconocido es una respuesta.
    await usuario.clear(screen.getByLabelText('Buscar la madre'))
    await usuario.type(screen.getByLabelText('Buscar la madre'), 'dudosa')
    expect(await screen.findByRole('button', { name: /La Dudosa/ })).toBeDefined()

    // Y la hembra de verdad también.
    await usuario.clear(screen.getByLabelText('Buscar la madre'))
    await usuario.type(screen.getByLabelText('Buscar la madre'), 'pinta')
    expect(await screen.findByRole('button', { name: /La Pinta/ })).toBeDefined()
  })

  it('sin certeza de la madre enfoca el aviso, y el buscador se esconde al elegirla', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({ estado: 200, cuerpo: { animales: [laMadre()] } }),
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 },
      }),
      'GET /api/locations': sinLugares(),
    })

    pintarApp('#/nacimiento')
    await elegirMadre(usuario, 'La Pinta')
    expect(screen.queryByLabelText('Buscar la madre')).toBeNull()

    await usuario.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(screen.getByLabelText('Buscar la madre')).toBeDefined()

    await elegirMadre(usuario, 'La Pinta')
    await usuario.click(screen.getByRole('button', { name: 'Registrar nacimiento' }))
    const aviso = await screen.findByRole('alert')
    expect(aviso.textContent).toContain('Di si viste a la madre')
    expect(document.activeElement).toBe(aviso)

    await usuario.click(screen.getByLabelText('Nombre o seña'))
    expect(document.activeElement).not.toBe(aviso)

    await usuario.click(screen.getByRole('button', { name: 'Registrar nacimiento' }))
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('alert'))
    })
  })
})

function vistaDeCrecimiento(animalId: string, nombre: string, categoria: string) {
  return {
    animalId,
    nombre,
    categoria,
    activo: true,
    pesos: [],
    ultimoPesaje: null,
    huecos: [],
  }
}

describe('Nacimiento: la observación de la madre', () => {
  it('al volver a la ficha antes de 30 s se vuelve a pedir la última observación', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({ estado: 200, cuerpo: { animales: [laMadre()] } }),
      [`GET /api/animals/${MADRE}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({
          id: MADRE,
          nombre: 'La Pinta',
          categoria: 'cow',
          sexo: 'female',
          tenencia: 'ranch',
        }),
      }),
      [`GET /api/animals/${CRIA}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ id: CRIA, nombre: 'Cría', categoria: 'calf' }),
      }),
      [`GET /api/read-models/animal-growth/${MADRE}`]: () => ({
        estado: 200,
        cuerpo: vistaDeCrecimiento(MADRE, 'La Pinta', 'cow'),
      }),
      [`GET /api/read-models/animal-growth/${CRIA}`]: () => ({
        estado: 200,
        cuerpo: vistaDeCrecimiento(CRIA, 'Cría', 'calf'),
      }),
      [`GET /api/read-models/ultima-observacion/${MADRE}`]: () => ({
        estado: 200,
        cuerpo: { animalId: MADRE, observacion: null },
      }),
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 },
      }),
      'GET /api/locations': sinLugares(),
      'POST /api/births': () => ({ estado: 201, cuerpo: nacimientoGuardado('unknown') }),
    })

    const cliente = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
        mutations: { retry: false },
      },
    })
    window.location.hash = `#/animal/${MADRE}`
    render(
      <QueryClientProvider client={cliente}>
        <App />
      </QueryClientProvider>,
    )

    const lecturasDeLaMadre = (): Peticion[] =>
      api.peticiones.filter(
        (peticion) =>
          peticion.metodo === 'GET' &&
          peticion.ruta === `/api/read-models/ultima-observacion/${MADRE}`,
      )

    expect(await screen.findByText('Sin observación')).toBeDefined()
    expect(lecturasDeLaMadre()).toHaveLength(1)

    await usuario.click(screen.getByRole('button', { name: 'Registrar nacimiento' }))
    expect(await screen.findByRole('heading', { name: 'Nacimiento' })).toBeDefined()
    await usuario.click(screen.getByRole('radio', { name: 'Fecha exacta' }))
    fireEvent.change(screen.getByLabelText('Día del parto'), { target: { value: '2026-11-20' } })
    await usuario.click(screen.getByRole('radio', { name: 'La vi' }))
    await usuario.click(screen.getByRole('button', { name: 'Registrar nacimiento' }))

    await waitFor(() => {
      expect(nacimientos(api.peticiones)).toHaveLength(1)
    })
    expect(nacimientos(api.peticiones)[0]?.cuerpo).toMatchObject({
      fechaNacimiento: '2026-11-20',
      precisionFecha: 'exact',
      madre: { certeza: 'observed', animalId: MADRE, motivo: null },
    })
    expect(lecturasDeLaMadre()).toHaveLength(1)

    window.location.hash = `#/animal/${MADRE}`

    await waitFor(() => {
      expect(lecturasDeLaMadre()).toHaveLength(2)
    })
  })
})
