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
    // La acción no se repite: el «+» del encabezado no está en la lista vacía.
    expect(screen.queryByRole('button', { name: 'Agregar un potrero' })).toBeNull()
  })

  it('abre el alta de potrero y la tarjeta de «Empieza con un potrero» desaparece', async () => {
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

    // La invitación ya no está: el formulario es lo que hay en pantalla, y una
    // tarjeta vacía al lado del formulario solo estorba.
    expect(screen.queryByText('Empieza con un potrero')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Nuevo potrero' })).toBeDefined()

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

  it('si se cae la red al agregar, el reintento manda el mismo comando y el mismo id', async () => {
    const usuario = userEvent.setup()
    let intentos = 0
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 },
      }),
      'GET /api/locations': sinLugares(),
      'POST /api/paddocks': () => {
        intentos += 1
        return intentos === 1
          ? { estado: 500, cuerpo: { codigo: 'error_desconocido' } }
          : { estado: 201, cuerpo: unPotrero({ nombre: 'El Zapote' }) }
      },
    })

    pintarApp('#/potreros')
    await usuario.click(await screen.findByRole('button', { name: 'Agregar el primer potrero' }))
    await usuario.type(screen.getByLabelText('Nombre del potrero'), 'El Zapote')
    await usuario.click(screen.getByRole('button', { name: 'Agregar potrero' }))
    await screen.findByRole('alert')
    await usuario.click(screen.getByRole('button', { name: 'Agregar potrero' }))

    const altas = api.peticiones.filter(
      (peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/paddocks',
    ) as { cuerpo: { commandId: string; id: string; nombre?: string } }[]
    expect(altas).toHaveLength(2)
    expect(altas[1]?.cuerpo.commandId).toBe(altas[0]?.cuerpo.commandId)
    expect(altas[1]?.cuerpo.id).toBe(altas[0]?.cuerpo.id)
  })

  it('cambiar el nombre después de un fallo genera otro comando y otro id', async () => {
    const usuario = userEvent.setup()
    let intentos = 0
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 },
      }),
      'GET /api/locations': sinLugares(),
      'POST /api/paddocks': () => {
        intentos += 1
        return intentos === 1
          ? { estado: 500, cuerpo: { codigo: 'error_desconocido' } }
          : { estado: 201, cuerpo: unPotrero({ nombre: 'El Zapote' }) }
      },
    })

    pintarApp('#/potreros')
    await usuario.click(await screen.findByRole('button', { name: 'Agregar el primer potrero' }))
    const nombre = screen.getByLabelText('Nombre del potrero')
    await usuario.type(nombre, 'El Zapote')
    await usuario.click(screen.getByRole('button', { name: 'Agregar potrero' }))
    await screen.findByRole('alert')

    // Ya no es el mismo potrero: hace falta otro comando y otro id.
    await usuario.clear(nombre)
    await usuario.type(nombre, 'La Esperanza')
    await usuario.click(screen.getByRole('button', { name: 'Agregar potrero' }))

    const altas = api.peticiones.filter(
      (peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/paddocks',
    ) as { cuerpo: { commandId: string; id: string } }[]
    expect(altas).toHaveLength(2)
    expect(altas[1]?.cuerpo.commandId).not.toBe(altas[0]?.cuerpo.commandId)
    expect(altas[1]?.cuerpo.id).not.toBe(altas[0]?.cuerpo.id)
  })

  it('si alguien más renombró el potrero, lo explica y ofrece recargar la lista', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/paddocks': losPotreros(),
      'GET /api/locations': sinLugares(),
      'POST /api/paddocks/33333333-3333-4333-8333-333333333333/corrections': () => ({
        estado: 409,
        cuerpo: { codigo: 'version_conflict' },
      }),
    })

    pintarApp('#/potreros')
    await screen.findByText('El Zapote')
    await usuario.click(screen.getAllByRole('button', { name: 'Cambiar el nombre o la nota' })[0]!)
    await usuario.type(screen.getByLabelText('Nombre del potrero'), ' cambiado')
    await usuario.type(screen.getByLabelText('¿Por qué se cambia?'), 'así le dice el rancho')
    await usuario.click(screen.getByRole('button', { name: 'Guardar el cambio' }))

    expect(
      await screen.findByText('Alguien más cambió este potrero mientras lo tenías abierto.'),
    ).toBeDefined()
    expect(screen.getByRole('button', { name: 'Recargar los potreros' })).toBeDefined()
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

    pintarApp('#/hato')
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

    pintarApp('#/hato')
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

    pintarApp('#/hato')
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

    pintarApp('#/hato')
    await screen.findByText('Canelo')

    await usuario.click(screen.getByRole('button', { name: 'Mover animales a un potrero' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Canelo' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Lucero' }))

    const destino = within(screen.getByRole('radiogroup', { name: '¿A qué potrero?' }))
    await usuario.click(destino.getByRole('radio', { name: 'El Zapote' }))
    // El botón dice el destino: no hay que adivinar a dónde se mueven.
    await usuario.click(screen.getByRole('button', { name: 'Mover 2 al Zapote' }))

    const movimiento = api.peticiones.find(
      (peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/locations',
    ) as { cuerpo: { potreroId: string; animales: { animalId: string; asignacionId: string }[] } }
    expect(movimiento.cuerpo.potreroId).toBe(POTRERO_UNO)
    expect(movimiento.cuerpo.animales.map((animal) => animal.animalId).sort()).toEqual(
      [ANIMAL_A, ANIMAL_B].sort(),
    )
    expect(new Set(movimiento.cuerpo.animales.map((animal) => animal.asignacionId)).size).toBe(2)
  })

  it('crear el potrero desde «Mover a…» lo deja elegido y mueve en la misma pasada', async () => {
    const usuario = userEvent.setup()
    const NUEVO = '77777777-7777-4777-8777-777777777777'
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [], sinAsignacion: 2, desconocidos: 0 },
      }),
      'GET /api/locations': sinLugares(),
      'POST /api/paddocks': () => ({
        estado: 201,
        cuerpo: {
          id: NUEVO,
          nombre: 'Potrero Norte',
          nota: null,
          version: 1,
          recordedBy: CUENTA,
          recordedAt: CUANDO,
          correcciones: [],
        },
      }),
      'POST /api/locations': () => ({ estado: 201, cuerpo: { asignaciones: [] } }),
    })

    pintarApp('#/hato')
    await screen.findByText('Canelo')

    await usuario.click(screen.getByRole('button', { name: 'Mover animales a un potrero' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Canelo' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Lucero' }))

    // Sin salir al menú: el potrero se crea aquí mismo.
    await usuario.click(screen.getByRole('button', { name: 'Crear un potrero nuevo' }))
    await usuario.type(screen.getByLabelText('Nombre del potrero nuevo'), 'Potrero Norte')
    await usuario.click(screen.getByRole('button', { name: 'Agregar potrero' }))

    // Queda elegido y el botón final dice el destino.
    const destino = await screen.findByRole('radiogroup', { name: '¿A qué potrero?' })
    expect(
      (within(destino).getByRole('radio', { name: 'Potrero Norte' }) as HTMLInputElement).checked,
    ).toBe(true)
    await usuario.click(screen.getByRole('button', { name: 'Mover 2 a Potrero Norte' }))

    const movimiento = api.peticiones.find(
      (peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/locations',
    ) as { cuerpo: { potreroId: string; animales: { animalId: string }[] } }
    expect(movimiento.cuerpo.potreroId).toBe(NUEVO)
    expect(movimiento.cuerpo.animales.map((animal) => animal.animalId).sort()).toEqual(
      [ANIMAL_A, ANIMAL_B].sort(),
    )
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

    pintarApp('#/hato')
    await screen.findByText('Canelo')
    await usuario.click(screen.getByRole('button', { name: 'Mover animales a un potrero' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Canelo' }))
    await usuario.click(
      within(screen.getByRole('radiogroup', { name: '¿A qué potrero?' })).getByRole('radio', {
        name: 'No sé',
      }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Mover 1 a «No sé»' }))

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

    pintarApp('#/hato')
    await screen.findByText('Canelo')
    await usuario.click(screen.getByRole('button', { name: 'Mover animales a un potrero' }))

    expect(screen.getByRole('button', { name: 'Mover a…' })).toHaveProperty('disabled', true)
  })

  it('¿Quién lo dijo? viaja aparte de la nota y de la cuenta', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/paddocks': losPotreros(),
      'GET /api/locations': sinLugares(),
      'POST /api/locations': () => ({ estado: 201, cuerpo: { asignaciones: [] } }),
    })

    pintarApp('#/hato')
    await screen.findByText('Canelo')
    await usuario.click(screen.getByRole('button', { name: 'Mover animales a un potrero' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Canelo' }))
    await usuario.click(
      within(screen.getByRole('radiogroup', { name: '¿A qué potrero?' })).getByRole('radio', {
        name: 'El Zapote',
      }),
    )
    await usuario.click(screen.getByRole('button', { name: /Más datos/ }))
    await usuario.type(screen.getByLabelText('¿Quién lo dijo?'), 'el vaquero')
    await usuario.type(screen.getByLabelText('Nota'), 'los pasaron al lote')
    await usuario.click(screen.getByRole('button', { name: 'Mover 1 al Zapote' }))

    const movimiento = api.peticiones.find(
      (peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/locations',
    ) as { cuerpo: { nota?: string; reportedBy?: string } }
    expect(movimiento.cuerpo.reportedBy).toBe('el vaquero')
    expect(movimiento.cuerpo.nota).toBe('los pasaron al lote')
    // La cuenta que registra no viaja en el cuerpo: sale de la sesión.
    expect(movimiento.cuerpo).not.toHaveProperty('recordedBy')
  })

  it('si se cae la red, el reintento sin cambios manda el mismo comando y los mismos ids', async () => {
    const usuario = userEvent.setup()
    let intentos = 0
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/paddocks': losPotreros(),
      'GET /api/locations': sinLugares(),
      'POST /api/locations': () => {
        intentos += 1
        return intentos === 1
          ? { estado: 500, cuerpo: { codigo: 'error_desconocido' } }
          : { estado: 201, cuerpo: { asignaciones: [] } }
      },
    })

    pintarApp('#/hato')
    await screen.findByText('Canelo')
    await usuario.click(screen.getByRole('button', { name: 'Mover animales a un potrero' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Canelo' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Lucero' }))
    await usuario.click(
      within(screen.getByRole('radiogroup', { name: '¿A qué potrero?' })).getByRole('radio', {
        name: 'El Zapote',
      }),
    )

    await usuario.click(screen.getByRole('button', { name: 'Mover 2 al Zapote' }))
    await screen.findByRole('alert')
    await usuario.click(screen.getByRole('button', { name: 'Mover 2 al Zapote' }))

    const movimientos = api.peticiones.filter(
      (peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/locations',
    ) as { cuerpo: { commandId: string; animales: { asignacionId: string }[] } }[]
    expect(movimientos).toHaveLength(2)
    const [primero, segundo] = movimientos
    expect(segundo?.cuerpo.commandId).toBe(primero?.cuerpo.commandId)
    expect(segundo?.cuerpo.animales.map((a) => a.asignacionId)).toEqual(
      primero?.cuerpo.animales.map((a) => a.asignacionId),
    )
  })

  it('cambiar los datos después de un fallo genera otro comando', async () => {
    const usuario = userEvent.setup()
    let intentos = 0
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/paddocks': losPotreros(),
      'GET /api/locations': sinLugares(),
      'POST /api/locations': () => {
        intentos += 1
        return intentos === 1
          ? { estado: 500, cuerpo: { codigo: 'error_desconocido' } }
          : { estado: 201, cuerpo: { asignaciones: [] } }
      },
    })

    pintarApp('#/hato')
    await screen.findByText('Canelo')
    await usuario.click(screen.getByRole('button', { name: 'Mover animales a un potrero' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Canelo' }))
    await usuario.click(
      within(screen.getByRole('radiogroup', { name: '¿A qué potrero?' })).getByRole('radio', {
        name: 'El Zapote',
      }),
    )

    await usuario.click(screen.getByRole('button', { name: 'Mover 1 al Zapote' }))
    await screen.findByRole('alert')

    // Otro destino: es otro movimiento, así que hace falta otro comando.
    await usuario.click(
      within(screen.getByRole('radiogroup', { name: '¿A qué potrero?' })).getByRole('radio', {
        name: 'La Esperanza',
      }),
    )
    await usuario.click(screen.getByRole('button', { name: 'Mover 1 a la Esperanza' }))

    const movimientos = api.peticiones.filter(
      (peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/locations',
    ) as { cuerpo: { commandId: string } }[]
    expect(movimientos).toHaveLength(2)
    expect(movimientos[1]?.cuerpo.commandId).not.toBe(movimientos[0]?.cuerpo.commandId)
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
            reportedBy: 'el vaquero',
            recordedBy: CUENTA,
            recordedAt: CUANDO,
          },
          historia: [
            {
              id: '66666666-6666-4666-8666-666666666666',
              potreroId: POTRERO_DOS,
              desde: '2026-11-01',
              nota: null,
              reportedBy: null,
              recordedBy: CUENTA,
              recordedAt: CUANDO,
            },
            {
              id: '55555555-5555-4555-8555-555555555555',
              potreroId: POTRERO_UNO,
              desde: '2026-11-12',
              nota: null,
              reportedBy: 'el vaquero',
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
    // Quién lo dijo se ve, y no es la cuenta que lo registró.
    expect(screen.getByText('Lo dijo: el vaquero')).toBeDefined()

    // La historia está, y el potrero anterior no se borró.
    expect(screen.getByRole('button', { name: /Dónde se le esperaba antes/ })).toBeDefined()
  })

  it('si la lista de potreros falla, la ficha no afirma que el potrero no tiene nombre', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/paddocks': () => ({ estado: 500, cuerpo: { codigo: 'error_desconocido' } }),
      'GET /api/locations': sinLugares(),
      [`GET /api/animals/${ANIMAL_A}`]: () => ({ estado: 200, cuerpo: fichaDeCanelo() }),
      [`GET /api/animals/${ANIMAL_A}/location`]: () => ({
        estado: 200,
        cuerpo: {
          vigente: {
            id: '55555555-5555-4555-8555-555555555555',
            potreroId: POTRERO_UNO,
            desde: '2026-11-12',
            nota: null,
            reportedBy: null,
            recordedBy: CUENTA,
            recordedAt: CUANDO,
          },
          historia: [],
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
    // El nombre no llegó: se dice eso, no se inventa «Potrero sin nombre».
    expect(await screen.findByText('No se pudo traer el nombre del potrero.')).toBeDefined()
    expect(screen.queryByText('Potrero sin nombre')).toBeNull()
    expect(screen.getByText('Un potrero (no se pudo traer su nombre)')).toBeDefined()
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
