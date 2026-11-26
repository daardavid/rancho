import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { diaMas, hoyEnElRancho } from '../src/dominio/fechas'
import { animalDeLista, montarApi, pintarApp, sesionAbierta } from './ayudas'

/**
 * El encabezado de las cuatro pestañas.
 *
 * Antes cada pestaña traía el suyo: el hato con su menú, el pesaje con flecha
 * de regreso y un «Salir» suelto arriba, crecimiento sin menú. La prueba de
 * David del 2026-11-25 lo señaló. Aquí se lee que las cuatro comparten el mismo
 * encabezado («MI RANCHO» y el título) y el mismo menú ☰, y que «Salir» está
 * una sola vez.
 */

const ANIMAL = '11111111-1111-4111-8111-111111111111'

afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
  window.location.hash = ''
})

function elHato() {
  return () => ({
    estado: 200,
    cuerpo: { animales: [animalDeLista({ id: ANIMAL, nombre: 'Canelo' })] },
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

function vistaDelInicio() {
  const desde = diaMas(hoyEnElRancho(), -7)
  const hoy = hoyEnElRancho()
  return {
    ruta: `GET /api/read-models/inicio?desde=${desde}`,
    responder: () => ({
      estado: 200,
      cuerpo: {
        hoy,
        desde,
        activosPorCategoria: [{ categoria: 'calf', cantidad: 1 }],
        cambios: {
          nacimientos: [],
          nacimientosSinFecha: 0,
          salidas: [],
          pesajes: 0,
          notasDeSanidad: 0,
        },
        paraRevisar: {
          fechaDeLaUltimaVuelta: null,
          huecosDeLaUltimaVuelta: [],
          sinLugar: [],
          lugarDesconocido: [],
          sinObservacion: [],
          porDiasSinVerse: [],
        },
      },
    }),
  }
}

describe('Encabezado de las pestañas', () => {
  it.each([
    ['#/', 'Inicio'],
    ['#/hato', 'Hato'],
    ['#/pesaje', 'Pesaje'],
    ['#/crecimiento', 'Crecimiento'],
  ])('%s usa «MI RANCHO», su título y el mismo menú ☰', async (hash, titulo) => {
    const inicio = vistaDelInicio()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      'GET /api/weighing-sessions/latest': () => ({
        estado: 404,
        cuerpo: { codigo: 'no_encontrado' },
      }),
      [inicio.ruta]: inicio.responder,
    })

    pintarApp(hash)

    const encabezado = (await screen.findByRole('heading', { name: titulo })).closest('header')
    expect(encabezado).not.toBeNull()
    if (encabezado === null) {
      return
    }

    expect(within(encabezado).getByText('MI RANCHO')).toBeDefined()
    expect(within(encabezado).getByRole('button', { name: 'Menú' })).toBeDefined()
    // Ninguna pestaña trae flecha de regreso: no se regresa del trabajo. Se
    // mira el botón y el enlace: el encabezado pinta la flecha como `<button>`,
    // y Pesaje la traía así antes de R-29, no como enlace.
    expect(within(encabezado).queryByRole('link', { name: /Regresar/ })).toBeNull()
    expect(within(encabezado).queryByRole('button', { name: /Regresar/ })).toBeNull()
    // Y «Salir» no aparece suelto fuera del menú.
    expect(screen.queryByRole('button', { name: 'Salir' })).toBeNull()
  })

  it('el menú ofrece nacimiento, potreros, salidas, tendencias y salir desde cualquier pestaña', async () => {
    const inicio = vistaDelInicio()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      [inicio.ruta]: inicio.responder,
    })

    pintarApp('#/')
    await screen.findByRole('heading', { name: 'Inicio' })

    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Menú' }))

    expect(screen.getByRole('button', { name: 'Registrar nacimiento' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Potreros' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Salidas' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Ver tendencias' })).toBeDefined()
    expect(screen.getAllByRole('button', { name: 'Salir' })).toHaveLength(1)
  })

  it('el acceso directo «Nota de sanidad» abre el hato listo para elegir animales', async () => {
    const inicio = vistaDelInicio()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      [inicio.ruta]: inicio.responder,
    })

    pintarApp('#/')
    await screen.findByRole('heading', { name: 'Inicio' })

    const accesos = screen.getByRole('region', { name: 'Accesos directos' })
    const enlace = within(accesos).getByRole('link', { name: /Nota de sanidad/ })
    expect(enlace.getAttribute('href')).toBe('#/hato/sanidad')

    window.location.hash = '#/hato/sanidad'
    expect(await screen.findByRole('checkbox', { name: 'Elegir a Canelo' })).toBeDefined()
  })

  it('«Salida» desde Inicio elige al animal y abre su ficha con la baja desplegada', async () => {
    const inicio = vistaDelInicio()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen(),
      [inicio.ruta]: inicio.responder,
    })

    pintarApp('#/')
    await screen.findByRole('heading', { name: 'Inicio' })

    const accesos = screen.getByRole('region', { name: 'Accesos directos' })
    expect(within(accesos).getByRole('link', { name: /Salida/ }).getAttribute('href')).toBe('#/salida')

    window.location.hash = '#/salida'
    // La pantalla de elegir no inventa una segunda captura: abre la ficha.
    const elegido = await screen.findByRole('button', { name: /Canelo/ })
    const usuario = userEvent.setup()
    await usuario.click(elegido)

    expect(window.location.hash).toBe(`#/animal/${ANIMAL}/salida`)
  })
})
