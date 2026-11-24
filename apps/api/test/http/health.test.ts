import { describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'

describe('GET /api/health', () => {
  it('responde ok: true con 200', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })

    try {
      const respuesta = await app.inject({ method: 'GET', url: '/api/health' })

      expect(respuesta.statusCode).toBe(200)
      expect(respuesta.headers['content-type']).toMatch(/application\/json/)
      expect(respuesta.json()).toEqual({ ok: true })
    } finally {
      await app.close()
    }
  })

  it('no se cachea', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })

    try {
      const respuesta = await app.inject({ method: 'GET', url: '/api/health' })

      expect(respuesta.headers['cache-control']).toBe('no-store')
    } finally {
      await app.close()
    }
  })

  it('reutiliza el id de petición cuando es un UUID y genera otro cuando no lo es', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })
    const uuid = '9f8e7d6c-5b4a-4321-8fed-cba987654321'

    try {
      const respetado = await app.inject({
        method: 'GET',
        url: '/api/health',
        headers: { 'x-request-id': uuid },
      })
      expect(respetado.headers['x-request-id']).toBe(uuid)

      const generado = await app.inject({
        method: 'GET',
        url: '/api/health',
        headers: { 'x-request-id': 'basura con espacios' },
      })
      expect(generado.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
      expect(generado.headers['x-request-id']).not.toBe('basura con espacios')
    } finally {
      await app.close()
    }
  })
})
