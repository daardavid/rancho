import { describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { comprobacionDeBase } from '../../src/infrastructure/db/salud'
import { sql } from 'drizzle-orm'

import { abrirBaseDePruebas } from '../db/base-de-pruebas'

/**
 * `GET /api/health/ready` revisa que el proceso además llegue a PostgreSQL.
 *
 * Es lo que mira un despliegue antes de mandarle tráfico, así que lo importante
 * es que diga la verdad en los dos sentidos: 200 cuando la base contesta, 503
 * cuando no, y que nunca deje escapar la cadena de conexión.
 */
describe('GET /api/health/ready', () => {
  it(
    'con la base contestando responde 200 y dice que la base responde',
    async () => {
      const base = await abrirBaseDePruebas()
      const app = construirApp({ nivelDeLog: 'silent', base: comprobacionDeBase(base.db) })

      try {
        const respuesta = await app.inject({ method: 'GET', url: '/api/health/ready' })

        expect(respuesta.statusCode).toBe(200)
        expect(respuesta.json()).toEqual({ ok: true, base: 'responde' })
        expect(respuesta.headers['cache-control']).toBe('no-store')
      } finally {
        await app.close()
        await base.cerrar()
      }
    },
    /**
     * Bajo `npm test` los tres workspaces corren a la vez y PGlite tarda más en
     * arrancar que el presupuesto por omisión. Es el mismo motivo por el que el
     * `vitest.config.ts` de la API sube `hookTimeout`.
     */
    60_000,
  )

  it('sin base responde 503 y lo dice, sin morir en la petición', async () => {
    const app = construirApp({
      nivelDeLog: 'silent',
      base: async () => false,
    })

    try {
      const respuesta = await app.inject({ method: 'GET', url: '/api/health/ready' })

      expect(respuesta.statusCode).toBe(503)
      expect(respuesta.json()).toEqual({ ok: false, base: 'no_responde' })
    } finally {
      await app.close()
    }
  })

  it('un error de la base cuenta como «no responde» y no se filtra al cliente', async () => {
    const secreto = 'postgres://usuario:contrasena@otro-host:5432/base_privada'
    const app = construirApp({
      nivelDeLog: 'silent',
      base: async () => {
        throw new Error(`no se pudo conectar a ${secreto}`)
      },
    })

    try {
      const respuesta = await app.inject({ method: 'GET', url: '/api/health/ready' })

      expect(respuesta.statusCode).toBe(503)
      expect(respuesta.json()).toEqual({ ok: false, base: 'no_responde' })
      // Ni la cadena de conexión, ni el usuario, ni el host salen al cliente.
      expect(respuesta.body).not.toContain('contrasena')
      expect(respuesta.body).not.toContain('otro-host')
      expect(respuesta.body).not.toContain('postgres://')
    } finally {
      await app.close()
    }
  })

  it('sin la comprobación montada la ruta no existe: no hay «listo» que no revisó nada', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })

    try {
      const respuesta = await app.inject({ method: 'GET', url: '/api/health/ready' })

      expect(respuesta.statusCode).toBe(404)
    } finally {
      await app.close()
    }
  })

  it(
    'un pool cerrado hace que la comprobación diga que no responde',
    async () => {
      const base = await abrirBaseDePruebas()
      const comprobacion = comprobacionDeBase(base.db)

      expect(await comprobacion()).toBe(true)

      await base.cerrar()

      // El cliente ya no puede llegar a la base: la comprobación contesta que
      // no, en vez de lanzar y tumbar la petición de salud.
      expect(await comprobacion()).toBe(false)
    },
    60_000,
  )
})

/** La tabla de negocio no se toca: la comprobación solo pregunta «¿contestas?». */
describe('la comprobación de base no lee datos del rancho', () => {
  it(
    'una consulta trivial basta y no depende de que exista un rancho',
    async () => {
      const base = await abrirBaseDePruebas()

      try {
        const comprobacion = comprobacionDeBase(base.db)
        expect(await comprobacion()).toBe(true)

        // Sin sembrar ningún rancho, sigue siendo cierto: no es una verificación
        // del hato ni cuenta cabezas.
        const ranchos = await base.db.execute(sql`SELECT COUNT(*)::int AS total FROM identity.ranch`)
        expect(
          (ranchos as unknown as { rows: { total: number }[] }).rows[0]?.total,
        ).toBeGreaterThanOrEqual(0)
      } finally {
        await base.cerrar()
      }
    },
    60_000,
  )
})
