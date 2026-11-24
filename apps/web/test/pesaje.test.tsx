import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

    // Los tres de la vuelta anterior ya vienen propuestos.
    await screen.findByText('Canelo')
    expect(screen.getByText('Lucero')).toBeDefined()
    expect(screen.getByText('Tordo')).toBeDefined()

    const kilos = screen.getAllByLabelText('Kilos')
    expect(kilos).toHaveLength(3)

    const fotos = screen.getAllByLabelText('Foto de la báscula')
    expect(fotos).toHaveLength(3)
    expect((fotos[0] as HTMLInputElement).getAttribute('capture')).toBe('environment')

    await usuario.type(kilos[0] as HTMLElement, '215.5')
    await usuario.type(kilos[1] as HTMLElement, '188')

    // El tercero no se pesó y se marca como tal.
    const trecero = screen.getAllByRole('button', { name: 'No se pesó' })[2]
    await usuario.click(trecero as HTMLElement)

    // La calidad por omisión es «medido en la báscula»; al segundo se le
    // cambia a «me lo dijeron» porque el número llegó por el radio.
    const calidades = screen.getAllByLabelText('¿Cómo se obtuvo?')
    await usuario.selectOptions(calidades[1] as HTMLElement, 'declared')

    await usuario.click(screen.getByRole('button', { name: 'Guardar la sesión' }))

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

    await screen.findByText('Canelo')
    const kilos = screen.getAllByLabelText('Kilos')
    for (const campo of kilos) {
      await usuario.type(campo as HTMLElement, '200')
    }

    // Primer intento: se cae la conexión y la pantalla lo explica.
    await usuario.click(screen.getByRole('button', { name: 'Guardar la sesión' }))
    expect(await screen.findByText(/No hay conexión con el rancho/)).toBeDefined()

    // Segundo intento: mismo botón, mismos datos, mismo id de comando.
    await usuario.click(screen.getByRole('button', { name: 'Guardar la sesión' }))

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

    pintarApp('#/pesaje')
    await screen.findByText('Canelo')

    const kilos = screen.getAllByLabelText('Kilos')
    await usuario.type(kilos[0] as HTMLElement, '201.250')

    // Lo capturado quedó en el celular.
    const guardado = window.localStorage.getItem('rancho.pesaje.borrador')
    expect(guardado).not.toBeNull()
    const borrador = JSON.parse(guardado ?? '{}') as { commandId?: string; filas?: unknown[] }
    expect(borrador.commandId).toMatch(/^[0-9a-f-]{36}$/)
    expect(borrador.filas).toHaveLength(3)

    // Al volver a abrir la pantalla (otro montaje), el borrador manda: lo
    // escrito sigue ahí en vez de empezar de cero.
    pintarApp('#/pesaje')
    await screen.findByText('Canelo')
    const recuperado = screen.getAllByLabelText('Kilos')[0] as HTMLInputElement
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
    await screen.findByRole('heading', { name: 'La vuelta por la báscula' })

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
    expect(screen.queryByLabelText('Kilos')).toBeNull()

    await usuario.type(screen.getByLabelText('Buscar'), 'lucero')
    await usuario.click(screen.getByRole('button', { name: /\+ Lucero/ }))

    const kilos = await screen.findByLabelText('Kilos')
    await usuario.type(kilos as HTMLElement, '175.5')
    await usuario.click(screen.getByRole('button', { name: 'Guardar la sesión' }))

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
    await screen.findByText('Canelo')

    const kilos = screen.getAllByLabelText('Kilos')
    await usuario.type(kilos[0] as HTMLElement, '215')
    await usuario.type(kilos[1] as HTMLElement, '0')

    await usuario.click(screen.getByRole('button', { name: 'Guardar la sesión' }))

    // No se manda nada: un cero no es un peso y faltan dos renglones.
    expect(await screen.findByText('El peso tiene que ser mayor que cero.')).toBeDefined()
    expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(0)
  })

  it('los que faltan se pueden marcar todos como «no se pesó» de un toque', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
    })

    pintarApp('#/pesaje')
    await screen.findByText('Canelo')

    await usuario.type(screen.getAllByLabelText('Kilos')[0] as HTMLElement, '215')
    await usuario.click(screen.getByRole('button', { name: 'Los que faltan no se pesaron' }))

    expect(screen.getAllByText('No se pesó.').length).toBe(2)
    expect(screen.queryAllByLabelText('Kilos')).toHaveLength(1)
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
    await screen.findByText('Canelo')

    const kilos = screen.getAllByLabelText('Kilos')
    await usuario.type(kilos[0] as HTMLElement, '215.375')
    await usuario.type(kilos[1] as HTMLElement, '188.001')
    await usuario.type(kilos[2] as HTMLElement, '190')
    await usuario.click(screen.getByRole('button', { name: 'Guardar la sesión' }))

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
    await screen.findByText('Canelo')
    await usuario.type(screen.getAllByLabelText('Kilos')[0] as HTMLElement, '215')

    // Tirar trabajo pide dos toques: el primero solo pregunta.
    await usuario.click(screen.getByRole('button', { name: 'Empezar una vuelta nueva' }))
    expect(screen.getByText('¿Tirar esta vuelta a medias?')).toBeDefined()
    expect(window.localStorage.getItem('rancho.pesaje.borrador')).not.toBeNull()

    await usuario.click(screen.getByRole('button', { name: 'Sí, empezar de cero' }))

    expect(await screen.findByText('Todavía no hay animales en la sesión.')).toBeDefined()
    expect(screen.queryAllByLabelText('Kilos')).toHaveLength(0)
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
    await screen.findByText('Canelo')

    // La propuesta de esta cuenta manda, no la captura ajena: la de la otra
    // cuenta se tiró y en el celular quedó solo la de esta sesión.
    expect(screen.getAllByLabelText('Kilos').length).toBe(3)
    expect(screen.queryByDisplayValue('captura de otra sesión')).toBeNull()
    const guardado = JSON.parse(
      window.localStorage.getItem('rancho.pesaje.borrador') ?? '{}',
    ) as { cuentaId?: string }
    expect(guardado.cuentaId).toBe(CUENTA)
    expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(0)
  })

  it('cerrar sesión borra el borrador de este navegador', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': vueltaAnterior(),
      'DELETE /api/session': () => ({ estado: 204, cuerpo: null }),
      'GET /api/session/tras-salir': sesionAbierta(),
    })

    pintarApp('#/pesaje')
    await screen.findByText('Canelo')
    await usuario.type(screen.getAllByLabelText('Kilos')[0] as HTMLElement, '199')

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
    await screen.findByText('Canelo')

    const kilos = screen.getAllByLabelText('Kilos')
    for (const campo of kilos) {
      await usuario.type(campo as HTMLElement, '200')
    }
    await usuario.click(screen.getByRole('button', { name: 'Guardar la sesión' }))

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
    await screen.findByText('Canelo')

    const entrada = screen.getAllByLabelText('Foto de la báscula')[0]
    await usuario.upload(entrada as HTMLElement, archivoDeBascula())
    expect(await screen.findByRole('button', { name: 'Subiendo la foto…' })).toBeDefined()

    const kilos = screen.getAllByLabelText('Kilos')
    await usuario.type(kilos[0] as HTMLElement, '215.5')
    await usuario.selectOptions(screen.getAllByLabelText('¿Cómo se obtuvo?')[0] as HTMLElement, 'observed')
    await usuario.type(kilos[1] as HTMLElement, '188')

    fotos.soltar()

    expect(await screen.findByRole('button', { name: 'Guardar la sesión' })).toBeDefined()
    expect((screen.getAllByLabelText('Kilos')[0] as HTMLInputElement).value).toBe('215.5')
    expect((screen.getAllByLabelText('Kilos')[1] as HTMLInputElement).value).toBe('188')
    expect((screen.getAllByLabelText('¿Cómo se obtuvo?')[0] as HTMLSelectElement).value).toBe('observed')
    expect(screen.getByRole('img', { name: 'Foto de la báscula' }).getAttribute('src')).toBe(
      `/api/evidencia/${FOTO_ID}`,
    )

    await usuario.click(screen.getAllByRole('button', { name: 'No se pesó' })[2] as HTMLElement)
    await usuario.click(screen.getByRole('button', { name: 'Guardar la sesión' }))

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
    await screen.findByText('Canelo')

    await usuario.upload(screen.getAllByLabelText('Foto de la báscula')[0] as HTMLElement, archivoDeBascula())
    expect(await screen.findByRole('button', { name: 'Subiendo la foto…' })).toBeDefined()

    await usuario.click(screen.getAllByRole('button', { name: 'No se pesó' })[0] as HTMLElement)

    const guardar = await screen.findByRole('button', { name: 'Guardar la sesión' })
    expect((guardar as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByText('No se pesó.')).toBeDefined()

    fotos.soltar()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Subiendo la foto…' })).toBeNull()
    })
    expect(screen.getByText('No se pesó.')).toBeDefined()
    expect(screen.getAllByLabelText('Kilos')).toHaveLength(2)
    expect((screen.getByRole('button', { name: 'Guardar la sesión' }) as HTMLButtonElement).disabled).toBe(false)

    await usuario.upload(screen.getAllByLabelText('Foto de la báscula')[0] as HTMLElement, archivoDeBascula())
    expect(await screen.findByRole('button', { name: 'Subiendo la foto…' })).toBeDefined()
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
