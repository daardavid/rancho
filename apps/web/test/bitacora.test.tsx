import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { animalDeLista, CUANDO, CUENTA, montarApi, pintarApp, sesionAbierta } from './ayudas'

/**
 * Bitácora y pendientes en la pantalla: el reintento no cambia de comando si
 * el dato sigue igual, la historia se lee en español y las tarjetas no usan
 * la lista de Inicio.
 *
 * Los datos son sintéticos: los del rancho no entran al repo.
 */

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const NOTA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const PENDIENTE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const HECHO = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const POTRERO = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const ANIMAL = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

function potreros() {
  return () => ({
    estado: 200,
    cuerpo: {
      potreros: [
        {
          id: POTRERO,
          nombre: 'La Orilla',
          nota: null,
          version: 1,
          recordedBy: CUENTA,
          recordedAt: CUANDO,
          correcciones: [],
          esperados: 0,
        },
      ],
      sinAsignacion: 0,
      desconocidos: 0,
    },
  })
}

function notaConHistoria() {
  return {
    id: NOTA,
    tipo: 'agua',
    texto: 'El pozo se secó',
    fecha: '2026-04-02',
    precision: 'exact',
    potreroId: POTRERO,
    reportedBy: 'El vaquero',
    evidenciaId: null,
    version: 2,
    recordedBy: CUENTA,
    recordedAt: CUANDO,
    correcciones: [
      {
        campo: 'precision',
        valorAnterior: 'approximate',
        motivo: 'sí se sabía el día',
        correctedBy: CUENTA,
        correctedAt: CUANDO,
      },
      {
        campo: 'tipo',
        valorAnterior: 'cerca',
        motivo: 'era el agua',
        correctedBy: CUENTA,
        correctedAt: CUANDO,
      },
      {
        campo: 'reportedBy',
        valorAnterior: 'El caporal',
        motivo: 'lo dijo otro',
        correctedBy: CUENTA,
        correctedAt: CUANDO,
      },
    ],
  }
}

function pendienteAbierto() {
  return {
    id: PENDIENTE,
    texto: 'Vacunar el 5',
    fecha: '2026-12-05',
    estado: 'pendiente',
    sujeto: { clase: 'ninguno' },
    estadoPor: CUENTA,
    estadoEn: CUANDO,
    version: 1,
    recordedBy: CUENTA,
    recordedAt: CUANDO,
    correcciones: [],
    cambiosDeEstado: [],
  }
}

function pendienteHecho() {
  return {
    ...pendienteAbierto(),
    id: HECHO,
    texto: 'Revisar la cerca',
    estado: 'hecho',
    version: 2,
    cambiosDeEstado: [
      {
        estadoAnterior: 'pendiente',
        estadoNuevo: 'hecho',
        changedBy: CUENTA,
        changedAt: CUANDO,
      },
    ],
  }
}

describe('bitácora', () => {
  it('muestra el potrero y la historia en español, en una tarjeta', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/journal-notes': () => ({ estado: 200, cuerpo: { notas: [notaConHistoria()] } }),
      'GET /api/paddocks': potreros(),
    })

    pintarApp('#/bitacora')

    expect(await screen.findByText('Potrero: La Orilla')).toBeDefined()
    const texto = screen.getByRole('main').textContent ?? ''
    expect(texto).toContain('Precisión: antes decía «aproximada»')
    expect(texto).toContain('Tipo: antes decía «Cerca o instalación»')
    expect(texto).toContain('Quién lo dijo: antes decía «El caporal»')
    expect(texto).not.toContain('reportedBy')
    expect(texto).not.toContain('approximate')
    expect(texto).not.toContain('precision')
    expect(texto).not.toContain('«cerca»')

    const main = screen.getByRole('main')
    expect(main.className).toContain('pantalla--pestana')
    expect(main.querySelector('.ui-tarjeta')).not.toBeNull()
    expect(main.querySelector('.inicio__lista')).toBeNull()
    expect(main.querySelector('form.formulario')).toBeNull()
  })

  it('reintentar la misma nota reusa el comando, y cambiar el texto acuña otro', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/journal-notes': () => ({ estado: 200, cuerpo: { notas: [] } }),
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 },
      }),
      'POST /api/journal-notes': () => ({ estado: 500, cuerpo: { codigo: 'error_desconocido' } }),
    })

    pintarApp('#/bitacora')
    await usuario.click(await screen.findByRole('button', { name: 'Anotar en la bitácora' }))
    await usuario.click(screen.getByRole('radio', { name: 'Lluvia' }))
    await usuario.type(screen.getByLabelText('Qué pasó'), 'Llovió en la noche')
    await usuario.click(screen.getByRole('radio', { name: 'Fecha exacta' }))
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: '2026-04-02' } })
    await usuario.click(screen.getByRole('button', { name: 'Guardar nota' }))
    await screen.findByRole('alert')
    await usuario.click(screen.getByRole('button', { name: 'Guardar nota' }))

    await waitFor(() => {
      expect(enviosDeNota(api.peticiones)).toHaveLength(2)
    })
    const [primero, segundo] = enviosDeNota(api.peticiones)
    expect(segundo?.commandId).toBe(primero?.commandId)
    expect(segundo?.id).toBe(primero?.id)

    const quePaso = screen.getByLabelText('Qué pasó')
    await usuario.clear(quePaso)
    await usuario.type(quePaso, 'Llovió más')
    await usuario.click(screen.getByRole('button', { name: 'Guardar nota' }))

    await waitFor(() => {
      expect(enviosDeNota(api.peticiones)).toHaveLength(3)
    })
    const tercero = enviosDeNota(api.peticiones)[2]
    expect(tercero?.commandId).not.toBe(primero?.commandId)
    expect(tercero?.id).not.toBe(primero?.id)
    expect(tercero?.texto).toBe('Llovió más')
  })
})

describe('pendientes', () => {
  it('deja aire para la barra, usa tarjetas y el atajo de sanidad no es una fila de Inicio', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/reminders': () => ({
        estado: 200,
        cuerpo: { pendientes: [pendienteAbierto(), pendienteHecho()] },
      }),
    })

    pintarApp('#/pendientes')

    const enlace = await screen.findByRole('link', { name: /anótalo en sanidad/ })
    expect(enlace.closest('.inicio__lista')).toBeNull()
    expect(enlace.closest('.ui-tarjeta')).not.toBeNull()

    const main = screen.getByRole('main')
    expect(main.className).toContain('pantalla--pestana')
    expect(main.querySelectorAll('.ui-tarjeta').length).toBe(2)
    expect(main.querySelector('.inicio__lista')).toBeNull()
    expect(main.querySelector('.ui-botones')).toBeNull()
    expect(main.querySelector('.ui-grupo')).toBeNull()
  })

  it('reintentar el mismo estado reusa el comando, y el otro estado acuña otro', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/reminders': () => ({
        estado: 200,
        cuerpo: { pendientes: [pendienteAbierto()] },
      }),
      [`POST /api/reminders/${PENDIENTE}/status`]: () => ({
        estado: 500,
        cuerpo: { codigo: 'error_desconocido' },
      }),
    })

    pintarApp('#/pendientes')
    await usuario.click(await screen.findByRole('button', { name: 'Hecho' }))
    await screen.findByRole('alert')
    await usuario.click(screen.getByRole('button', { name: 'Hecho' }))

    await waitFor(() => {
      expect(enviosDeEstado(api.peticiones)).toHaveLength(2)
    })
    const [primero, segundo] = enviosDeEstado(api.peticiones)
    expect(segundo?.commandId).toBe(primero?.commandId)
    expect(segundo?.estado).toBe('hecho')

    await usuario.click(screen.getByRole('button', { name: 'Ya no aplica' }))
    await waitFor(() => {
      expect(enviosDeEstado(api.peticiones)).toHaveLength(3)
    })
    const tercero = enviosDeEstado(api.peticiones)[2]
    expect(tercero?.commandId).not.toBe(primero?.commandId)
    expect(tercero?.estado).toBe('ya_no_aplica')
  })

  it('elegir un grupo usa las píldoras que ya existen', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/reminders': () => ({ estado: 200, cuerpo: { pendientes: [] } }),
      'GET /api/animals': () => ({
        estado: 200,
        cuerpo: { animales: [animalDeLista({ id: ANIMAL, nombre: 'Canelo' })] },
      }),
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 },
      }),
    })

    pintarApp('#/pendientes')
    await usuario.click(await screen.findByRole('button', { name: 'Anotar un pendiente' }))
    await usuario.click(screen.getByRole('radio', { name: 'Un grupo' }))

    const grupo = screen.getByRole('group', { name: 'Animales del grupo' })
    expect(grupo.classList.contains('ui-pildoras')).toBe(true)
    expect(grupo.classList.contains('ui-grupo')).toBe(false)
    expect(screen.getByRole('main').querySelector('form.formulario')).not.toBeNull()
  })
})

function enviosDeNota(peticiones: readonly { metodo: string; ruta: string; cuerpo: unknown }[]) {
  return peticiones
    .filter((peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/journal-notes')
    .map((peticion) => peticion.cuerpo as { commandId: string; id: string; texto: string })
}

function enviosDeEstado(peticiones: readonly { metodo: string; ruta: string; cuerpo: unknown }[]) {
  return peticiones
    .filter((peticion) => peticion.metodo === 'POST' && peticion.ruta.endsWith('/status'))
    .map((peticion) => peticion.cuerpo as { commandId: string; estado: string })
}
