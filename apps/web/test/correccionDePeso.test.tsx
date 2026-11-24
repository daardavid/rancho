import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  animalDeLista,
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
  window.localStorage.clear()
})

const SESION = '55555555-5555-4555-8555-555555555555'
const FILA = '66666666-6666-4666-8666-666666666666'
const PESO = '77777777-7777-4777-8777-777777777777'

const SESION_GUARDADA = {
  id: SESION,
  fecha: '2026-11-01',
  nota: null,
  reportedBy: null,
  commandId: '88888888-8888-4888-8888-888888888888',
  recordedBy: CUENTA,
  recordedAt: CUANDO,
  filas: [
    {
      id: FILA,
      animalId: ANIMAL,
      resultado: 'pesado',
      kilos: '180.000',
      calidad: 'measured',
      version: 1,
    },
  ],
}

const VISTA = {
  animalId: ANIMAL,
  nombre: 'Canelo',
  categoria: 'calf',
  activo: true,
  pesos: [
    {
      pesoId: PESO,
      sesionId: SESION,
      fecha: '2026-11-01',
      kilos: '180.000',
      calidad: 'measured',
      version: 1,
      intervalo: null,
    },
  ],
  ultimoPesaje: {
    pesoId: PESO,
    sesionId: SESION,
    fecha: '2026-11-01',
    kilos: '180.000',
    calidad: 'measured',
    version: 1,
  },
  huecos: [],
}

const PESOS_CON_HISTORIA = {
  animalId: ANIMAL,
  pesos: [
    {
      id: PESO,
      animalId: ANIMAL,
      sesionId: SESION,
      fecha: '2026-11-01',
      kilos: '180.000',
      calidad: 'measured',
      version: 1,
      correcciones: [],
    },
  ],
}

describe('Corregir un peso desde la sesión', () => {
  it('manda la versión, el motivo y los kilos, con un id de comando', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({
        estado: 200,
        cuerpo: { animales: [animalDeLista({ nombre: 'Canelo' })] },
      }),
      'GET /api/weighing-sessions/latest': () => ({ estado: 200, cuerpo: SESION_GUARDADA }),
      [`GET /api/weighing-sessions/${SESION}`]: () => ({ estado: 200, cuerpo: SESION_GUARDADA }),
      [`POST /api/weights/${FILA}/corrections`]: () => ({
        estado: 200,
        cuerpo: {
          id: PESO,
          animalId: ANIMAL,
          sesionId: SESION,
          fecha: '2026-11-01',
          kilos: '188.000',
          calidad: 'measured',
          version: 2,
          correcciones: [],
        },
      }),
    })

    pintarApp(`#/sesion/${SESION}`)

    await usuario.click(await screen.findByRole('button', { name: 'Corregir este peso' }))

    // El peso viene con lo que decía, no vacío: se corrige lo que está mal.
    const kilos = screen.getByLabelText('Kilos') as HTMLInputElement
    expect(kilos.value).toBe('180')

    await usuario.clear(kilos)
    await usuario.type(kilos, '188')
    await usuario.type(screen.getByLabelText('¿Por qué se corrige?'), 'Se leyó mal la báscula')
    await usuario.click(screen.getByRole('button', { name: 'Guardar corrección' }))

    await waitFor(() => {
      expect(api.peticiones.some((peticion) => peticion.metodo === 'POST')).toBe(true)
    })

    const envio = api.peticiones.find((peticion) => peticion.metodo === 'POST')
    expect(envio?.ruta).toBe(`/api/weights/${FILA}/corrections`)
    expect(envio?.cuerpo).toMatchObject({
      version: 1,
      motivo: 'Se leyó mal la báscula',
      kilos: '188',
    })
    const cuerpo = envio?.cuerpo as Record<string, unknown>
    expect(cuerpo.commandId).toMatch(/^[0-9a-f-]{36}$/)
    // La calidad no cambió: no viaja. Solo se manda lo que de verdad cambió.
    expect(cuerpo.calidad).toBeUndefined()
  })

  it('sin motivo no se puede guardar y no sale ninguna petición', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({
        estado: 200,
        cuerpo: { animales: [animalDeLista({ nombre: 'Canelo' })] },
      }),
      'GET /api/weighing-sessions/latest': () => ({ estado: 200, cuerpo: SESION_GUARDADA }),
      [`GET /api/weighing-sessions/${SESION}`]: () => ({ estado: 200, cuerpo: SESION_GUARDADA }),
    })

    pintarApp(`#/sesion/${SESION}`)
    await usuario.click(await screen.findByRole('button', { name: 'Corregir este peso' }))

    await usuario.clear(screen.getByLabelText('Kilos'))
    await usuario.type(screen.getByLabelText('Kilos'), '188')

    const guardar = screen.getByRole('button', { name: 'Guardar corrección' })
    expect((guardar as HTMLButtonElement).disabled).toBe(true)
    expect(api.peticiones.some((peticion) => peticion.metodo === 'POST')).toBe(false)
  })

  it('no deja guardar una corrección que no cambia nada', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({
        estado: 200,
        cuerpo: { animales: [animalDeLista({ nombre: 'Canelo' })] },
      }),
      'GET /api/weighing-sessions/latest': () => ({ estado: 200, cuerpo: SESION_GUARDADA }),
      [`GET /api/weighing-sessions/${SESION}`]: () => ({ estado: 200, cuerpo: SESION_GUARDADA }),
    })

    pintarApp(`#/sesion/${SESION}`)
    await usuario.click(await screen.findByRole('button', { name: 'Corregir este peso' }))

    // 180 y 180.000 son el mismo peso: se compara como texto, no como número.
    await usuario.type(screen.getByLabelText('¿Por qué se corrige?'), 'Prueba')

    const guardar = screen.getByRole('button', { name: 'Guardar corrección' })
    expect((guardar as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Todavía no cambiaste el peso, la calidad ni la foto.')).toBeDefined()
  })

  it('si alguien más corrigió el peso, lo explica y no guarda nada', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({
        estado: 200,
        cuerpo: { animales: [animalDeLista({ nombre: 'Canelo' })] },
      }),
      'GET /api/weighing-sessions/latest': () => ({ estado: 200, cuerpo: SESION_GUARDADA }),
      [`GET /api/weighing-sessions/${SESION}`]: () => ({ estado: 200, cuerpo: SESION_GUARDADA }),
      [`POST /api/weights/${FILA}/corrections`]: () => ({
        estado: 409,
        cuerpo: { codigo: 'version_conflict' },
      }),
    })

    pintarApp(`#/sesion/${SESION}`)
    await usuario.click(await screen.findByRole('button', { name: 'Corregir este peso' }))

    await usuario.clear(screen.getByLabelText('Kilos'))
    await usuario.type(screen.getByLabelText('Kilos'), '188')
    await usuario.type(screen.getByLabelText('¿Por qué se corrige?'), 'Se leyó mal')
    await usuario.click(screen.getByRole('button', { name: 'Guardar corrección' }))

    expect(
      await screen.findByText('Alguien más corrigió este peso mientras lo tenías abierto.'),
    ).toBeDefined()
    expect(screen.getByRole('button', { name: 'Volver a ver el peso' })).toBeDefined()
  })

  it('un peso que no se midió se puede pasar a «medido en la báscula»', async () => {
    const usuario = userEvent.setup()
    const conDeclarado = {
      ...SESION_GUARDADA,
      filas: [{ ...SESION_GUARDADA.filas[0], calidad: 'declared' }],
    }
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({
        estado: 200,
        cuerpo: { animales: [animalDeLista({ nombre: 'Canelo' })] },
      }),
      'GET /api/weighing-sessions/latest': () => ({ estado: 200, cuerpo: conDeclarado }),
      [`GET /api/weighing-sessions/${SESION}`]: () => ({ estado: 200, cuerpo: conDeclarado }),
      [`POST /api/weights/${FILA}/corrections`]: () => ({
        estado: 200,
        cuerpo: {
          id: PESO,
          animalId: ANIMAL,
          sesionId: SESION,
          fecha: '2026-11-01',
          kilos: '180.000',
          calidad: 'measured',
          version: 2,
          correcciones: [],
        },
      }),
    })

    pintarApp(`#/sesion/${SESION}`)
    await usuario.click(await screen.findByRole('button', { name: 'Corregir este peso' }))

    await usuario.selectOptions(screen.getByLabelText('¿Cómo se obtuvo?'), 'measured')
    await usuario.type(screen.getByLabelText('¿Por qué se corrige?'), 'Sí estaba en la báscula')
    await usuario.click(screen.getByRole('button', { name: 'Guardar corrección' }))

    await waitFor(() => {
      expect(api.peticiones.some((peticion) => peticion.metodo === 'POST')).toBe(true)
    })
    const cuerpo = api.peticiones.find((peticion) => peticion.metodo === 'POST')
      ?.cuerpo as Record<string, unknown>
    expect(cuerpo.calidad).toBe('measured')
    // Los kilos no cambiaron: no viajan.
    expect(cuerpo.kilos).toBeUndefined()
  })

  it('la foto de la báscula se ve, se sube y se quita', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({
        estado: 200,
        cuerpo: { animales: [animalDeLista({ nombre: 'Canelo' })] },
      }),
      'GET /api/weighing-sessions/latest': () => ({ estado: 200, cuerpo: SESION_GUARDADA }),
      [`GET /api/weighing-sessions/${SESION}`]: () => ({ estado: 200, cuerpo: SESION_GUARDADA }),
      'POST /api/evidencia': () => ({
        estado: 201,
        cuerpo: {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          tipo: 'image/jpeg',
          tamano: 4,
        },
      }),
    })

    pintarApp(`#/sesion/${SESION}`)
    await usuario.click(await screen.findByRole('button', { name: 'Corregir este peso' }))

    const entrada = screen.getByLabelText('Foto de la báscula') as HTMLInputElement
    const contenedor = entrada.closest('.foto-bascula')
    expect(contenedor).not.toBeNull()
    expect(contenedor?.classList.contains('ui-sr')).toBe(false)
    expect(entrada.classList.contains('ui-sr')).toBe(false)
    expect(entrada.classList.contains('campo__entrada')).toBe(true)
    expect(entrada.tabIndex).not.toBe(-1)
    expect(screen.getByText('Foto de la báscula', { selector: 'label' }).closest('.ui-sr')).toBeNull()

    await usuario.upload(
      entrada,
      new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])], 'bascula.jpg', { type: 'image/jpeg' }),
    )
    expect(await screen.findByRole('img', { name: 'Foto de la báscula' })).toBeDefined()
    await usuario.click(screen.getByRole('button', { name: 'Quitar la foto' }))
    expect(screen.queryByRole('img', { name: 'Foto de la báscula' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Quitar la foto' })).toBeNull()
  })
})

describe('Corregir un peso desde la ficha', () => {
  it('trae la versión del peso y guarda el motivo', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Canelo' }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA }),
      [`GET /api/animals/${ANIMAL}/weights`]: () => ({ estado: 200, cuerpo: PESOS_CON_HISTORIA }),
      [`POST /api/weights/${PESO}/corrections`]: () => ({
        estado: 200,
        cuerpo: {
          id: PESO,
          animalId: ANIMAL,
          sesionId: SESION,
          fecha: '2026-11-01',
          kilos: '185.000',
          calidad: 'measured',
          version: 2,
          correcciones: [],
        },
      }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    await usuario.click(await screen.findByRole('button', { name: 'Corregir este peso' }))
    await usuario.clear(screen.getByLabelText('Kilos'))
    await usuario.type(screen.getByLabelText('Kilos'), '185')
    await usuario.type(screen.getByLabelText('¿Por qué se corrige?'), 'La báscula marcaba otra')
    await usuario.click(screen.getByRole('button', { name: 'Guardar corrección' }))

    await waitFor(() => {
      expect(api.peticiones.some((peticion) => peticion.metodo === 'POST')).toBe(true)
    })
    const envio = api.peticiones.find((peticion) => peticion.metodo === 'POST')
    expect(envio?.ruta).toBe(`/api/weights/${PESO}/corrections`)
    expect(envio?.cuerpo).toMatchObject({ version: 1, kilos: '185' })
  })

  it('con un solo peso no dibuja una línea: lo dice', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Canelo' }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA }),
      [`GET /api/animals/${ANIMAL}/weights`]: () => ({ estado: 200, cuerpo: PESOS_CON_HISTORIA }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    expect(await screen.findByText(/Con un solo pesaje no hay línea todavía/)).toBeDefined()
  })

  it('con dos pesos dibuja la gráfica y marca el peso no medido', async () => {
    const dosPesos = {
      ...VISTA,
      pesos: [
        VISTA.pesos[0],
        {
          pesoId: '99999999-9999-4999-8999-999999999999',
          sesionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          fecha: '2026-11-15',
          kilos: '210.500',
          calidad: 'declared',
          version: 1,
          intervalo: {
            fechaPrevia: '2026-11-01',
            dias: 14,
            kilosGanados: '30.500',
            kilosPorDia: '2.179',
            calidades: ['measured', 'declared'],
            incluyeCalidadNoMedida: true,
          },
        },
      ],
    }

    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Canelo' }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: dosPesos }),
      [`GET /api/animals/${ANIMAL}/weights`]: () => ({ estado: 200, cuerpo: PESOS_CON_HISTORIA }),
    })
    const { container } = pintarApp(`#/animal/${ANIMAL}`)

    await waitFor(() => {
      expect(container.querySelector('.grafica__lienzo')).not.toBeNull()
    })
    expect(screen.getAllByText('210.5 kg').length).toBeGreaterThan(0)
    const grafica = container.querySelector('.grafica__lienzo')
    expect(grafica).not.toBeNull()
    // El peso declarado no se esconde: el intervalo lo dice en palabras.
    expect(screen.getAllByText(/incluye un peso que no se midió/).length).toBeGreaterThan(0)
  })
})
