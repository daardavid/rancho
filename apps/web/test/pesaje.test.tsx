import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { compararConElAnterior } from '../src/dominio/kilos'
import { Pesaje } from '../src/pantallas/Pesaje'
import {
  animalDeLista,
  ANIMAL,
  CUANDO,
  CUENTA,
  montarApi,
  pintarApp,
  sesionAbierta,
} from './ayudas'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
  window.localStorage.clear()
})

beforeEach(() => {
  window.localStorage.clear()
})

const ANIMAL_B = '99999999-9999-4999-8999-999999999999'
const ANIMAL_C = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const SESION_ANTERIOR = '55555555-5555-4555-8555-555555555555'

function sinVueltaAnterior() {
  return () => ({ estado: 404, cuerpo: { codigo: 'no_encontrado' } })
}

function elHato() {
  return () => ({
    estado: 200,
    cuerpo: {
      animales: [
        animalDeLista({ id: ANIMAL, nombre: 'Canelo' }),
        animalDeLista({ id: ANIMAL_B, nombre: 'Lucero' }),
        animalDeLista({ id: ANIMAL_C, nombre: 'Tordo' }),
      ],
    },
  })
}

function vueltaAnterior() {
  return () => ({
    estado: 200,
    cuerpo: {
      id: SESION_ANTERIOR,
      fecha: '2026-11-01',
      nota: null,
      reportedBy: null,
      commandId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      recordedBy: CUENTA,
      recordedAt: CUANDO,
      filas: [
        { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', animalId: ANIMAL, resultado: 'pesado', kilos: '180.000', calidad: 'measured', version: 1 },
        { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', animalId: ANIMAL_B, resultado: 'pesado', kilos: '175.000', calidad: 'measured', version: 1 },
        { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', animalId: ANIMAL_C, resultado: 'pesado', kilos: '190.000', calidad: 'measured', version: 1 },
      ],
    },
  })
}

function sesionGuardada(cuerpo: unknown) {
  return () => ({ estado: 201, cuerpo })
}

describe('Pesaje: una sesión de 3 animales con un «no se pesó»', () => {
  it('manda un solo comando con los datos correctos', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
      'POST /api/weighing-sessions': sesionGuardada({
        id: '11111111-2222-4333-8444-555555555555',
        fecha: '2026-11-22',
        nota: null,
        reportedBy: null,
        commandId: '12121212-2222-4333-8444-555555555555',
        recordedBy: CUENTA,
        recordedAt: CUANDO,
        filas: [],
      }),
      [`GET /api/weighing-sessions/11111111-2222-4333-8444-555555555555`]: () => ({
        estado: 200,
        cuerpo: {
          id: '11111111-2222-4333-8444-555555555555',
          fecha: '2026-11-22',
          nota: null,
          reportedBy: null,
          commandId: '12121212-2222-4333-8444-555555555555',
          recordedBy: CUENTA,
          recordedAt: CUANDO,
          filas: [],
        },
      }),
    })

    pintarApp('#/pesaje')

    // Los tres de la vuelta anterior ya vienen propuestos. El primero está en turno.
    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })
    expect(screen.getByText('Lucero')).toBeDefined()
    expect(screen.getByText('Tordo')).toBeDefined()
    expect(screen.getByText('0 de 3 pesados')).toBeDefined()

    const fotos = screen.getAllByLabelText('Foto de la báscula')
    expect(fotos).toHaveLength(3)
    expect((fotos[0] as HTMLInputElement).getAttribute('capture')).toBe('environment')

    await usuario.type(screen.getByRole('textbox', { name: 'Kilos de Canelo' }), '215.5')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.type(await screen.findByRole('textbox', { name: 'Kilos de Lucero' }), '188')

    // La calidad por omisión es «medido en la báscula»; a Lucero se le cambia
    // a «me lo dijeron» porque el número llegó por el radio.
    await usuario.click(screen.getByRole('button', { name: 'Medido en la báscula' }))
    await usuario.click(screen.getByRole('radio', { name: 'Me lo dijeron' }))
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))

    // El tercero no se pesó y se marca como tal.
    await usuario.click(screen.getByRole('button', { name: 'No se pesó' }))

    await usuario.click(screen.getByRole('button', { name: 'Guardar pesaje (2)' }))

    await waitFor(() => {
      expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(1)
    })

    const envio = api.peticiones.find((peticion) => peticion.metodo === 'POST')
    expect(envio?.ruta).toBe('/api/weighing-sessions')

    const cuerpo = envio?.cuerpo as Record<string, unknown>
    expect(cuerpo.commandId).toMatch(/^[0-9a-f-]{36}$/)
    expect(cuerpo.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(cuerpo.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const filas = cuerpo.filas as { resultado: string; animalId: string; kilos?: string; calidad?: string }[]
    expect(filas).toHaveLength(3)

    // Los kilos viajan como texto, tal como se escribieron.
    const canelo = filas.find((fila) => fila.animalId === ANIMAL)
    expect(canelo).toMatchObject({ resultado: 'pesado', kilos: '215.5', calidad: 'measured' })

    const lucero = filas.find((fila) => fila.animalId === ANIMAL_B)
    expect(lucero).toMatchObject({ resultado: 'pesado', kilos: '188', calidad: 'declared' })

    // El «no se pesó» no lleva kilos ni calidad: es un hueco, no un peso cero.
    const tordo = filas.find((fila) => fila.animalId === ANIMAL_C)
    expect(tordo?.resultado).toBe('hueco')
    expect(tordo?.kilos).toBeUndefined()
    expect(tordo?.calidad).toBeUndefined()

    // Ningún peso pasó por `number`: en el JSON son cadenas.
    expect(typeof canelo?.kilos).toBe('string')
    expect(typeof lucero?.kilos).toBe('string')
  })

  it('Siguiente avanza al siguiente pendiente y le da el foco', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
    })

    pintarApp('#/pesaje')
    const primero = (await screen.findByRole('textbox', { name: 'Kilos de Canelo' })) as HTMLInputElement
    await waitFor(() => {
      expect(document.activeElement).toBe(primero)
    })

    await usuario.type(primero, '210')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))

    const segundo = (await screen.findByRole('textbox', { name: 'Kilos de Lucero' })) as HTMLInputElement
    await waitFor(() => {
      expect(document.activeElement).toBe(segundo)
    })
  })

  it('la diferencia contra el peso anterior se calcula en gramos, no con float', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': () => ({
        estado: 200,
        cuerpo: {
          id: SESION_ANTERIOR,
          fecha: '2026-11-01',
          nota: null,
          reportedBy: null,
          commandId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          recordedBy: CUENTA,
          recordedAt: CUANDO,
          filas: [
            {
              id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
              animalId: ANIMAL,
              resultado: 'pesado',
              kilos: '8.020',
              calidad: 'measured',
              version: 1,
            },
          ],
        },
      }),
      'GET /api/read-models/known-weights': () => ({
        estado: 200,
        cuerpo: {
          pesos: [{ animalId: ANIMAL, fecha: '2026-11-01', kilos: '8.020' }],
        },
      }),
    })

    pintarApp('#/pesaje')
    const fecha = (await screen.findByLabelText('¿Cuándo se pesó?')) as HTMLInputElement
    await usuario.clear(fecha)
    await usuario.type(fecha, '2026-11-16')

    // `Number('8.2') - Number('8.02')` da 0.17999999999999972, no 0.18.
    expect(Number('8.2') - Number('8.02')).not.toBe(0.18)
    expect(compararConElAnterior('8.2', '8.02', 15)?.gramos).toBe(180n)

    await usuario.type(screen.getByRole('textbox', { name: 'Kilos de Canelo' }), '8.2')

    expect(await screen.findByText('+0.18 kg · 0.01 kg/día')).toBeDefined()
    expect(screen.getByText('Antes: 8.02 kg · hace 15 días')).toBeDefined()
    expect(screen.queryByText(/0\.17999/)).toBeNull()
  })

  it('una fecha anterior a la última vuelta no se resta contra un peso posterior', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': () => ({
        estado: 200,
        cuerpo: {
          id: SESION_ANTERIOR,
          fecha: '2026-11-25',
          nota: null,
          reportedBy: null,
          commandId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          recordedBy: CUENTA,
          recordedAt: CUANDO,
          filas: [
            {
              id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
              animalId: ANIMAL,
              resultado: 'pesado',
              kilos: '152.500',
              calidad: 'measured',
              version: 1,
            },
          ],
        },
      }),
      'GET /api/read-models/known-weights': () => ({
        estado: 200,
        cuerpo: {
          pesos: [{ animalId: ANIMAL, fecha: '2026-11-25', kilos: '152.500' }],
        },
      }),
    })

    pintarApp('#/pesaje')
    const fecha = (await screen.findByLabelText('¿Cuándo se pesó?')) as HTMLInputElement

    // Con una fecha posterior, el 25 nov sí es el peso anterior.
    await usuario.clear(fecha)
    await usuario.type(fecha, '2026-12-25')
    await usuario.type(screen.getByRole('textbox', { name: 'Kilos de Canelo' }), '160')
    expect(await screen.findByText('Antes: 152.5 kg · hace 30 días')).toBeDefined()
    expect(screen.getByText('+7.5 kg · 0.25 kg/día')).toBeDefined()
    expect(screen.queryByText(/Después:/)).toBeNull()

    // Al cambiar al 25 oct y anotar 128, ese peso queda después. No hay −24.5 kg.
    await usuario.clear(fecha)
    await usuario.type(fecha, '2026-10-25')
    const kilos = screen.getByRole('textbox', { name: 'Kilos de Canelo' })
    await usuario.clear(kilos)
    await usuario.type(kilos, '128')
    expect(screen.queryByText(/Antes: 152\.5/)).toBeNull()
    expect(screen.queryByText(/-24\.5/)).toBeNull()
    expect(screen.queryByText(/−24\.5/)).toBeNull()
    expect(screen.getByText('Después: 152.5 kg el 25 nov')).toBeDefined()
    // La propuesta sigue siendo la de la vuelta anterior.
    expect(screen.getByRole('textbox', { name: 'Kilos de Canelo' })).toBeDefined()
  })

  it('reabrir una fila capturada vuelve a mostrar sus kilos', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
    })

    pintarApp('#/pesaje')
    await usuario.type(await screen.findByRole('textbox', { name: 'Kilos de Canelo' }), '215.5')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.click(await screen.findByRole('button', { name: /Canelo/ }))

    const reabierto = (await screen.findByRole('textbox', { name: 'Kilos de Canelo' })) as HTMLInputElement
    expect(reabierto.value).toBe('215.5')
  })

  it('«No se pesó» deja el renglón sin kilos ni calidad', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
    })

    pintarApp('#/pesaje')
    await usuario.type(await screen.findByRole('textbox', { name: 'Kilos de Canelo' }), '200')
    await usuario.click(screen.getByRole('button', { name: 'Medido en la báscula' }))
    await usuario.click(screen.getByRole('radio', { name: 'Me lo dijeron' }))
    await usuario.click(screen.getByRole('button', { name: 'No se pesó' }))

    await usuario.click(await screen.findByRole('button', { name: /Canelo/ }))

    expect(screen.getByText('No se pesó.')).toBeDefined()
    expect(screen.queryByRole('textbox', { name: /Kilos de/ })).toBeNull()
    expect(screen.queryByRole('radiogroup', { name: '¿Cómo se obtuvo?' })).toBeNull()
    expect(screen.queryByText('Me lo dijeron')).toBeNull()
    expect(screen.queryByText('Medido en la báscula')).toBeNull()
  })

  it('al reintentar después de una caída manda el mismo id de comando y no duplica', async () => {
    const usuario = userEvent.setup()
    let intentos = 0
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
      'POST /api/weighing-sessions': () => {
        intentos += 1
        if (intentos === 1) {
          // Se cortó la señal: no hay estado HTTP.
          throw new TypeError('Failed to fetch')
        }
        return {
          estado: 201,
          cuerpo: {
            id: '11111111-2222-4333-8444-555555555555',
            fecha: '2026-11-22',
            nota: null,
            reportedBy: null,
            commandId: '12121212-2222-4333-8444-555555555555',
            recordedBy: CUENTA,
            recordedAt: CUANDO,
            filas: [],
          },
        }
      },
      'GET /api/weighing-sessions/11111111-2222-4333-8444-555555555555': () => ({
        estado: 200,
        cuerpo: {
          id: '11111111-2222-4333-8444-555555555555',
          fecha: '2026-11-22',
          nota: null,
          reportedBy: null,
          commandId: '12121212-2222-4333-8444-555555555555',
          recordedBy: CUENTA,
          recordedAt: CUANDO,
          filas: [],
        },
      }),
    })

    pintarApp('#/pesaje')

    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })
    await usuario.type(screen.getByRole('textbox', { name: 'Kilos de Canelo' }), '200')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.type(await screen.findByRole('textbox', { name: 'Kilos de Lucero' }), '200')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.type(await screen.findByRole('textbox', { name: 'Kilos de Tordo' }), '200')

    // Primer intento: se cae la conexión y la pantalla lo explica.
    await usuario.click(screen.getByRole('button', { name: 'Guardar pesaje (3)' }))
    expect(await screen.findByText(/No hay conexión con el rancho/)).toBeDefined()

    // Segundo intento: mismo botón, mismos datos, mismo id de comando.
    await usuario.click(screen.getByRole('button', { name: 'Guardar pesaje (3)' }))

    await waitFor(() => {
      expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(2)
    })

    const envios = api.peticiones.filter((peticion) => peticion.metodo === 'POST')
    const primero = envios[0]?.cuerpo as Record<string, unknown>
    const segundo = envios[1]?.cuerpo as Record<string, unknown>

    expect(segundo.commandId).toBe(primero.commandId)
    expect(segundo.id).toBe(primero.id)
    // Los renglones tampoco cambian de id: es el mismo comando, no uno nuevo.
    const filasPrimero = primero.filas as { id: string }[]
    const filasSegundo = segundo.filas as { id: string }[]
    expect(filasSegundo.map((fila) => fila.id)).toEqual(filasPrimero.map((fila) => fila.id))
  })

  it('recupera el borrador después de recargar y conserva el id del comando', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
      'POST /api/weighing-sessions': () => {
        throw new TypeError('Failed to fetch')
      },
    })

    const primera = pintarApp('#/pesaje')
    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })
    await usuario.type(screen.getByRole('textbox', { name: 'Kilos de Canelo' }), '201.250')

    // Lo capturado quedó en el celular.
    const guardado = window.localStorage.getItem('rancho.pesaje.borrador')
    expect(guardado).not.toBeNull()
    const borrador = JSON.parse(guardado ?? '{}') as { commandId?: string; filas?: unknown[] }
    expect(borrador.commandId).toMatch(/^[0-9a-f-]{36}$/)
    expect(borrador.filas).toHaveLength(3)

    // Al volver a abrir la pantalla (otro montaje), el borrador manda: lo
    // escrito sigue ahí en vez de empezar de cero.
    primera.unmount()
    pintarApp('#/pesaje')
    // Canelo ya tiene kilos: el turno pasa al siguiente pendiente y el suyo
    // queda en la fila, listo para reabrirse.
    await screen.findByRole('textbox', { name: 'Kilos de Lucero' })
    await usuario.click(screen.getByRole('button', { name: /Canelo/ }))
    const recuperado = (await screen.findByRole('textbox', { name: 'Kilos de Canelo' })) as HTMLInputElement
    expect(recuperado.value).toBe('201.250')
  })

  it('propone la fecha de hoy y la deja cambiar', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': sinVueltaAnterior(),
    })

    pintarApp('#/pesaje')
    await screen.findByRole('heading', { name: 'Pesaje' })

    const fecha = screen.getByLabelText('¿Cuándo se pesó?') as HTMLInputElement
    // Viene contestada: hoy en el rancho, no vacía.
    expect(fecha.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    await usuario.clear(fecha)
    await usuario.type(fecha, '2026-11-15')
    expect(fecha.value).toBe('2026-11-15')
  })

  it('sin vuelta anterior no propone animales y deja agregarlos buscando', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': sinVueltaAnterior(),
      'POST /api/weighing-sessions': sesionGuardada({
        id: '11111111-2222-4333-8444-555555555555',
        fecha: '2026-11-22',
        nota: null,
        reportedBy: null,
        commandId: '12121212-2222-4333-8444-555555555555',
        recordedBy: CUENTA,
        recordedAt: CUANDO,
        filas: [],
      }),
      'GET /api/weighing-sessions/11111111-2222-4333-8444-555555555555': () => ({
        estado: 200,
        cuerpo: {
          id: '11111111-2222-4333-8444-555555555555',
          fecha: '2026-11-22',
          nota: null,
          reportedBy: null,
          commandId: '12121212-2222-4333-8444-555555555555',
          recordedBy: CUENTA,
          recordedAt: CUANDO,
          filas: [],
        },
      }),
    })

    pintarApp('#/pesaje')

    expect(await screen.findByText('Todavía no hay animales en la sesión.')).toBeDefined()
    // Nada inventado: no hay ningún campo de kilos todavía.
    expect(screen.queryByRole('textbox', { name: /Kilos de/ })).toBeNull()

    await usuario.click(screen.getByRole('button', { name: 'Agregar otro animal' }))
    await usuario.type(screen.getByLabelText('Buscar'), 'lucero')
    await usuario.click(screen.getByRole('button', { name: /\+ Lucero/ }))

    const kilos = await screen.findByRole('textbox', { name: 'Kilos de Lucero' })
    await usuario.type(kilos, '175.5')
    await usuario.click(screen.getByRole('button', { name: 'Guardar pesaje (1)' }))

    await waitFor(() => {
      expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(1)
    })
    const envio = api.peticiones.find((peticion) => peticion.metodo === 'POST')
    const filas = (envio?.cuerpo as { filas: { animalId: string; kilos: string }[] } | undefined)
      ?.filas ?? []
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ animalId: ANIMAL_B, kilos: '175.5' })
  })

  it('un renglón sin kilos detiene el guardado y dice qué escribir', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
    })

    pintarApp('#/pesaje')
    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })

    await usuario.type(screen.getByRole('textbox', { name: 'Kilos de Canelo' }), '215')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.type(await screen.findByRole('textbox', { name: 'Kilos de Lucero' }), '0')

    await usuario.click(screen.getByRole('button', { name: 'Guardar pesaje (1)' }))

    // No se manda nada: un cero no es un peso y faltan dos renglones.
    expect(await screen.findByText('El peso tiene que ser mayor que cero.')).toBeDefined()
    expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(0)
  })

  it('cada pendiente se marca «no se pesó» y el renglón queda sin kilos', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
    })

    pintarApp('#/pesaje')
    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })

    await usuario.type(screen.getByRole('textbox', { name: 'Kilos de Canelo' }), '215')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.click(screen.getByRole('button', { name: 'No se pesó' }))
    await usuario.click(screen.getByRole('button', { name: 'No se pesó' }))

    expect(screen.getAllByText('No se pesó')).toHaveLength(2)
    expect(screen.queryByRole('textbox', { name: /Kilos de/ })).toBeNull()
  })

  it('el hato se ve mientras el número es un texto: sin perder decimales', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
      'POST /api/weighing-sessions': sesionGuardada({
        id: '11111111-2222-4333-8444-555555555555',
        fecha: '2026-11-22',
        nota: null,
        reportedBy: null,
        commandId: '12121212-2222-4333-8444-555555555555',
        recordedBy: CUENTA,
        recordedAt: CUANDO,
        filas: [],
      }),
      'GET /api/weighing-sessions/11111111-2222-4333-8444-555555555555': () => ({
        estado: 200,
        cuerpo: {
          id: '11111111-2222-4333-8444-555555555555',
          fecha: '2026-11-22',
          nota: null,
          reportedBy: null,
          commandId: '12121212-2222-4333-8444-555555555555',
          recordedBy: CUENTA,
          recordedAt: CUANDO,
          filas: [],
        },
      }),
    })

    pintarApp('#/pesaje')
    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })

    await usuario.type(screen.getByRole('textbox', { name: 'Kilos de Canelo' }), '215.375')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.type(await screen.findByRole('textbox', { name: 'Kilos de Lucero' }), '188.001')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.type(await screen.findByRole('textbox', { name: 'Kilos de Tordo' }), '190')
    await usuario.click(screen.getByRole('button', { name: 'Guardar pesaje (3)' }))

    await waitFor(() => {
      expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(1)
    })
    const enviado = api.peticiones.find((peticion) => peticion.metodo === 'POST')
    const filas =
      (enviado?.cuerpo as { filas: { kilos: string }[] } | undefined)?.filas ?? []
    // Los tres decimales sobreviven: no se redondea en el camino.
    const valores = filas.map((fila) => fila.kilos)
    expect(valores).toContain('215.375')
    expect(valores).toContain('188.001')
    expect(valores).toContain('190')
  })

  it('la vuelta a medias se puede tirar, con un segundo toque', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
    })

    pintarApp('#/pesaje')
    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })
    await usuario.type(screen.getByRole('textbox', { name: 'Kilos de Canelo' }), '215')

    // Tirar trabajo pide dos toques: el primero solo pregunta.
    await usuario.click(screen.getByRole('button', { name: 'Empezar una vuelta nueva' }))
    expect(screen.getByText('¿Tirar esta vuelta a medias?')).toBeDefined()
    expect(window.localStorage.getItem('rancho.pesaje.borrador')).not.toBeNull()

    await usuario.click(screen.getByRole('button', { name: 'Sí, empezar de cero' }))

    expect(await screen.findByText('Todavía no hay animales en la sesión.')).toBeDefined()
    expect(screen.queryByRole('textbox', { name: /Kilos de/ })).toBeNull()
  })

  it('el borrador de otra cuenta no aparece en el pesaje y se tira', async () => {
    // Lo que quedó en este celular lo empezó otra cuenta: no se muestra ni se manda.
    window.localStorage.setItem(
      'rancho.pesaje.borrador',
      JSON.stringify({
        version: 2,
        cuentaId: '77777777-7777-4777-8777-777777777777',
        fecha: '2026-11-20',
        nota: 'captura de otra sesión',
        reportedBy: '',
        sesionId: '88888888-8888-4888-8888-888888888888',
        commandId: '99999999-9999-4999-8999-999999999998',
        filas: [],
      }),
    )

    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
    })

    pintarApp('#/pesaje')
    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })

    // La propuesta de esta cuenta manda, no la captura ajena: la de la otra
    // cuenta se tiró y en el celular quedó solo la de esta sesión.
    expect(screen.getByText('Lucero')).toBeDefined()
    expect(screen.getByText('Tordo')).toBeDefined()
    expect(screen.queryByDisplayValue('captura de otra sesión')).toBeNull()
    const guardado = JSON.parse(
      window.localStorage.getItem('rancho.pesaje.borrador') ?? '{}',
    ) as { cuentaId?: string }
    expect(guardado.cuentaId).toBe(CUENTA)
    expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(0)
  })

  it('sin saber todavía la cuenta no se arma ni se guarda un borrador', async () => {
    // Lo que quedó en el celular es de una cuenta real. Si la pantalla se
    // abriera sin saber quién está capturando, no debe pisarlo con un borrador
    // sin dueño: eso borraría la captura de la sesión anterior.
    const anterior = {
      version: 2,
      cuentaId: CUENTA,
      fecha: '2026-11-20',
      nota: 'captura de la cuenta',
      reportedBy: '',
      sesionId: '88888888-8888-4888-8888-888888888888',
      commandId: '99999999-9999-4999-8999-999999999998',
      filas: [],
    }
    const antes = JSON.stringify(anterior)
    window.localStorage.setItem('rancho.pesaje.borrador', antes)
    const escrituras = vi.spyOn(Storage.prototype, 'setItem')

    const api = montarApi({
      // Todavía no se sabe quién está en la sesión: no hay cuenta a quién
      // atribuir un borrador.
      'GET /api/session': () => ({ estado: 401, cuerpo: { codigo: 'no_autenticado' } }),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
    })

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <Pesaje />
      </QueryClientProvider>,
    )

    // Se espera a que la vuelta anterior y el hato lleguen: con el error, es
    // justo entonces cuando se arma el borrador sin dueño.
    await waitFor(() => {
      const rutas = api.peticiones.map((peticion) => `${peticion.metodo} ${peticion.ruta}`)
      expect(rutas).toContain('GET /api/animals')
      expect(rutas).toContain('GET /api/weighing-sessions/latest')
    })
    await new Promise((resolver) => {
      setTimeout(resolver, 50)
    })

    const guardados = escrituras.mock.calls.filter(
      (llamada) => llamada[0] === 'rancho.pesaje.borrador',
    )
    expect(guardados).toHaveLength(0)
    expect(window.localStorage.getItem('rancho.pesaje.borrador')).toBe(antes)
  })

  it('cerrar sesión borra el borrador de este navegador', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
      'DELETE /api/session': () => ({ estado: 204, cuerpo: null }),
    })

    pintarApp('#/pesaje')
    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })
    await usuario.type(screen.getByRole('textbox', { name: 'Kilos de Canelo' }), '199')

    expect(window.localStorage.getItem('rancho.pesaje.borrador')).not.toBeNull()

    await usuario.click(screen.getByRole('button', { name: 'Salir' }))

    // Lo capturado no sobrevive al cierre: el siguiente que entre en este
    // celular no hereda una vuelta a medias de otra sesión.
    await waitFor(() => {
      expect(window.localStorage.getItem('rancho.pesaje.borrador')).toBeNull()
    })
  })

  it('el choque de idempotencia se explica y no se ofrece guardar otra vez', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
      'POST /api/weighing-sessions': () => ({
        estado: 409,
        cuerpo: { codigo: 'idempotency_mismatch' },
      }),
    })

    pintarApp('#/pesaje')
    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })

    await usuario.type(screen.getByRole('textbox', { name: 'Kilos de Canelo' }), '200')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.type(await screen.findByRole('textbox', { name: 'Kilos de Lucero' }), '200')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.type(await screen.findByRole('textbox', { name: 'Kilos de Tordo' }), '200')
    await usuario.click(screen.getByRole('button', { name: 'Guardar pesaje (3)' }))

    expect(
      await screen.findByText('Esta vuelta ya se había guardado con otros datos.'),
    ).toBeDefined()
    expect(screen.getByRole('button', { name: 'Abrir la sesión guardada' })).toBeDefined()
  })

  it('conserva kilos y calidad si la foto termina de subir después', async () => {
    const usuario = userEvent.setup()
    const fotos = colaDeFotos()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
      'POST /api/evidencia': fotos.ruta,
      'POST /api/weighing-sessions': sesionGuardada({
        id: '11111111-2222-4333-8444-555555555555',
        fecha: '2026-11-22',
        nota: null,
        reportedBy: null,
        commandId: '12121212-2222-4333-8444-555555555555',
        recordedBy: CUENTA,
        recordedAt: CUANDO,
        filas: [],
      }),
      'GET /api/weighing-sessions/11111111-2222-4333-8444-555555555555': () => ({
        estado: 200,
        cuerpo: {
          id: '11111111-2222-4333-8444-555555555555',
          fecha: '2026-11-22',
          nota: null,
          reportedBy: null,
          commandId: '12121212-2222-4333-8444-555555555555',
          recordedBy: CUENTA,
          recordedAt: CUANDO,
          filas: [],
        },
      }),
    })

    pintarApp('#/pesaje')
    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })

    const entrada = screen.getAllByLabelText('Foto de la báscula')[0]
    await usuario.upload(entrada as HTMLElement, archivoDeBascula())
    expect(await screen.findByRole('button', { name: 'Subiendo la foto…' })).toBeDefined()

    await usuario.type(screen.getByRole('textbox', { name: 'Kilos de Canelo' }), '215.5')
    await usuario.click(screen.getByRole('button', { name: 'Medido en la báscula' }))
    await usuario.click(screen.getByRole('radio', { name: 'Visto' }))
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.type(await screen.findByRole('textbox', { name: 'Kilos de Lucero' }), '188')

    fotos.soltar()

    expect(await screen.findByRole('button', { name: 'Guardar pesaje (2)' })).toBeDefined()
    expect((screen.getByRole('textbox', { name: 'Kilos de Lucero' }) as HTMLInputElement).value).toBe('188')

    await usuario.click(screen.getByRole('button', { name: /Canelo/ }))
    expect((await screen.findByRole('textbox', { name: 'Kilos de Canelo' }) as HTMLInputElement).value).toBe(
      '215.5',
    )
    expect(screen.getByRole('button', { name: 'Visto, no medido' })).toBeDefined()
    expect(screen.getByRole('img', { name: 'Foto de la báscula' }).getAttribute('src')).toBe(
      `/api/evidencia/${FOTO_ID}`,
    )

    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.click(screen.getByRole('button', { name: 'No se pesó' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar pesaje (2)' }))

    await waitFor(() => {
      expect(api.peticiones.filter((peticion) => peticion.ruta === '/api/weighing-sessions')).toHaveLength(1)
    })
    const envio = api.peticiones.find((peticion) => peticion.ruta === '/api/weighing-sessions')
    if (envio === undefined) {
      throw new Error('No se mandó la sesión.')
    }
    const filas = (
      envio.cuerpo as {
        filas: {
          animalId: string
          resultado: string
          kilos?: string
          calidad?: string
          evidenciaId?: string
        }[]
      }
    ).filas
    expect(filas.find((fila) => fila.animalId === ANIMAL)).toMatchObject({
      resultado: 'pesado',
      kilos: '215.5',
      calidad: 'observed',
      evidenciaId: FOTO_ID,
    })
    expect(filas.find((fila) => fila.animalId === ANIMAL_B)).toMatchObject({
      resultado: 'pesado',
      kilos: '188',
      calidad: 'measured',
    })
  })

  it('no revive el renglón si se marca «no se pesó» mientras sube la foto', async () => {
    const usuario = userEvent.setup()
    const fotos = colaDeFotos()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
      'POST /api/evidencia': fotos.ruta,
    })

    pintarApp('#/pesaje')
    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })

    await usuario.upload(screen.getAllByLabelText('Foto de la báscula')[0] as HTMLElement, archivoDeBascula())
    expect(await screen.findByRole('button', { name: 'Subiendo la foto…' })).toBeDefined()

    await usuario.click(screen.getByRole('button', { name: 'No se pesó' }))

    const guardar = await screen.findByRole('button', { name: 'Guardar pesaje (0)' })
    expect((guardar as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByRole('button', { name: /Canelo/ }).textContent).toContain('No se pesó')

    fotos.soltar()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Subiendo la foto…' })).toBeNull()
    })
    expect(screen.getByRole('button', { name: /Canelo/ }).textContent).toContain('No se pesó')
    expect(screen.getAllByRole('textbox', { name: /Kilos de/ })).toHaveLength(1)
    expect((screen.getByRole('button', { name: 'Guardar pesaje (0)' }) as HTMLButtonElement).disabled).toBe(false)

    await usuario.upload(screen.getAllByLabelText('Foto de la báscula')[0] as HTMLElement, archivoDeBascula())
    expect(await screen.findByRole('button', { name: 'Subiendo la foto…' })).toBeDefined()
  })

  it('al pasar al siguiente, la fila inactiva no deja «Quitar la foto»', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
      'POST /api/evidencia': () => ({
        estado: 201,
        cuerpo: { id: FOTO_ID, tipo: 'image/jpeg', tamano: 4 },
      }),
    })

    pintarApp('#/pesaje')
    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })

    await usuario.upload(screen.getAllByLabelText('Foto de la báscula')[0] as HTMLElement, archivoDeBascula())
    expect(await screen.findByRole('button', { name: 'Quitar la foto' })).toBeDefined()

    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByRole('textbox', { name: 'Kilos de Lucero' })

    expect(screen.queryByRole('button', { name: 'Quitar la foto' })).toBeNull()
    expect(screen.queryByRole('img', { name: 'Foto de la báscula' })).toBeNull()
  })

  it('Enter en la nota de la sesión inserta un salto y no envía el pesaje', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
      'POST /api/weighing-sessions': sesionGuardada({
        id: '11111111-2222-4333-8444-555555555555',
        fecha: '2026-11-22',
        nota: null,
        reportedBy: null,
        commandId: '12121212-2222-4333-8444-555555555555',
        recordedBy: CUENTA,
        recordedAt: CUANDO,
        filas: [],
      }),
    })

    pintarApp('#/pesaje')
    await screen.findByRole('textbox', { name: 'Kilos de Canelo' })
    await usuario.click(screen.getByRole('button', { name: 'Agregar quién reportó o una nota' }))

    const nota = screen.getByRole('textbox', { name: 'Nota de la sesión' }) as HTMLTextAreaElement
    await usuario.type(nota, 'Línea uno{Enter}Línea dos')

    expect(nota.value).toBe('Línea uno\nLínea dos')
    expect(screen.queryByText('Escribe los kilos.')).toBeNull()
    expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Pesaje' })).toBeDefined()
  })
})

const FOTO_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function archivoDeBascula(): File {
  return new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])], 'bascula.jpg', { type: 'image/jpeg' })
}

function colaDeFotos(): {
  ruta: () => Promise<{ estado: number; cuerpo: unknown }>
  soltar: () => void
} {
  const pendientes: Array<(respuesta: { estado: number; cuerpo: unknown }) => void> = []
  return {
    ruta: () =>
      new Promise((resolve) => {
        pendientes.push(resolve)
      }),
    soltar: () => {
      const resolver = pendientes.shift()
      if (resolver === undefined) {
        throw new Error('No hay una foto subiéndose.')
      }
      resolver({ estado: 201, cuerpo: { id: FOTO_ID, tipo: 'image/jpeg', tamano: 4 } })
    },
  }
}

describe('Sesión guardada', () => {
  it('enseña los pesos y los huecos, y no inventa la ganancia', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
      [`GET /api/weighing-sessions/${SESION_ANTERIOR}`]: vueltaAnterior(),
    })

    pintarApp(`#/sesion/${SESION_ANTERIOR}`)

    expect(await screen.findByRole('heading', { name: 'Pesaje del 1 nov 2026' })).toBeDefined()
    expect(screen.getByText('180 kg')).toBeDefined()
    expect(screen.getAllByText('Medido en la báscula')).toHaveLength(3)
  })
})
