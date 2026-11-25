import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { montarApi, pintarApp, sesionAbierta, type Peticion } from './ayudas'

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
