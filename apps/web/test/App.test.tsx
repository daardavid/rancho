import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../src/App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function pintarApp(): void {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={cliente}>
      <App />
    </QueryClientProvider>,
  )
}

describe('App', () => {
  it('avisa que la API responde cuando el contrato se cumple', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ok: true })),
    )

    pintarApp()

    expect(await screen.findByText('La API responde')).toBeDefined()
  })

  it('pide revisar la conexión cuando la API no contesta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )

    pintarApp()

    expect(await screen.findByText('No se pudo hablar con la API')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDefined()
  })

  it('no da por buena una respuesta que no cumple el contrato', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ok: 'sí' })),
    )

    pintarApp()

    expect(await screen.findByText('No se pudo hablar con la API')).toBeDefined()
  })

  it('muestra el estado de espera mientras consulta', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    )

    pintarApp()

    expect(screen.getByText('Revisando la conexión…')).toBeDefined()
  })
})
