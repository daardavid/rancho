import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ANIMAL, CUENTA, fichaDeAnimal, montarApi, pintarApp } from './ayudas'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const VISTA_VACIA = {
  animalId: ANIMAL,
  nombre: null,
  categoria: 'unknown',
  activo: true,
  pesos: [],
  ultimoPesaje: null,
  huecos: [],
}

describe('Inicio de sesión', () => {
  it('sin sesión pide entrar y no pierde la pantalla de destino', async () => {
    montarApi({
      'GET /api/session': () => ({ estado: 401, cuerpo: { codigo: 'no_autenticado' } }),
      'POST /api/session': () => ({
        estado: 200,
        cuerpo: { cuentaId: CUENTA, rol: 'owner', ranchId: '11111111-1111-4111-8111-111111111111' },
      }),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaDeAnimal({ nombre: 'Lucero' }) }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
    })

    const usuario = userEvent.setup()
    pintarApp(`#/animal/${ANIMAL}`)

    expect(await screen.findByRole('heading', { name: 'Entra para ver tu hato' })).toBeDefined()

    await usuario.type(screen.getByLabelText(/^Usuario/), 'david')
    await usuario.type(screen.getByLabelText(/^Contraseña/), 'una contrasena larga')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    // Al entrar se vuelve a la ficha que estaba abierta, no al hato.
    expect(await screen.findByRole('heading', { name: 'Lucero' })).toBeDefined()
  })

  it('cuando la sesión vence al guardar, regresa al inicio de sesión y conserva la ruta', async () => {
    let sesionVencida = false
    montarApi({
      'GET /api/session': () =>
        sesionVencida
          ? { estado: 401, cuerpo: { codigo: 'no_autenticado' } }
          : {
              estado: 200,
              cuerpo: {
                cuentaId: CUENTA,
                rol: 'owner',
                ranchId: '11111111-1111-4111-8111-111111111111',
              },
            },
      'POST /api/animals': () =>
        sesionVencida
          ? { estado: 401, cuerpo: { codigo: 'no_autenticado' } }
          : { estado: 201, cuerpo: fichaDeAnimal() },
    })

    const usuario = userEvent.setup()
    pintarApp('#/alta')
    await screen.findByRole('heading', { name: 'Dar de alta un animal' })

    // La sesión se vence mientras el formulario está abierto.
    sesionVencida = true
    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }))

    // Vuelve el inicio de sesión y la URL sigue apuntando al alta.
    expect(await screen.findByRole('heading', { name: 'Entra para ver tu hato' })).toBeDefined()
    expect(window.location.hash).toBe('#/alta')
  })

  it('con una contraseña mala dice qué revisar', async () => {
    montarApi({
      'GET /api/session': () => ({ estado: 401, cuerpo: { codigo: 'no_autenticado' } }),
      'POST /api/session': () => ({ estado: 401, cuerpo: { codigo: 'credenciales_invalidas' } }),
    })

    const usuario = userEvent.setup()
    pintarApp('#/')

    await screen.findByRole('heading', { name: 'Entra para ver tu hato' })
    await usuario.type(screen.getByLabelText(/^Usuario/), 'david')
    await usuario.type(screen.getByLabelText(/^Contraseña/), 'otra')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('El usuario o la contraseña no coinciden.')).toBeDefined()
    expect(screen.getByText(/Revísalos y vuelve a escribir la contraseña/)).toBeDefined()
  })
})
