import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { montarApi, pintarApp, sesionAbierta } from './ayudas'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

describe('Exportar', () => {
  it('el menú abre la pantalla y cada botón baja un archivo', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({ estado: 200, cuerpo: { animales: [] } }),
      'GET /api/animals?estado=salidas': () => ({ estado: 200, cuerpo: { animales: [] } }),
    })

    pintarApp('#/hato')
    await screen.findByRole('heading', { name: 'Hato' })

    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Menú' }))
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))

    expect(await screen.findByRole('heading', { name: 'Exportar' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Bajar el hato' }).getAttribute('href')).toBe(
      '/api/exports/herd',
    )
    expect(screen.getByRole('link', { name: 'Bajar los pesos' }).getAttribute('href')).toBe(
      '/api/exports/weights',
    )
    expect(screen.getByRole('link', { name: 'Bajar los eventos' }).getAttribute('href')).toBe(
      '/api/exports/events',
    )
  })
})
