import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { carpetaDeLaWeb, esCarpetaDeWeb } from '../../src/http/estaticos'
import { servirLaWeb } from '../../src/http/servir-web'

/**
 * La web construida se sirve desde el mismo proceso que la API, en `/`.
 *
 * Un solo origen es lo que hace que la cookie sea de primera parte
 * ([ADR-010](../../../../docs/architecture/adr/ADR-010-authentication.md)). La
 * prueba usa una carpeta temporal con un `index.html` y un asset, para no
 * depender de que la web esté construida cuando corre `npm test`.
 */

let carpeta = ''

beforeAll(() => {
  carpeta = mkdtempSync(join(tmpdir(), 'rancho-web-'))
  writeFileSync(
    join(carpeta, 'index.html'),
    '<!doctype html><html lang="es"><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>',
  )
  mkdirSync(join(carpeta, 'assets'))
  writeFileSync(join(carpeta, 'assets', 'app.js'), 'console.log("rancho")')
})

afterAll(() => {
  rmSync(carpeta, { recursive: true, force: true })
})

describe('servir la web desde la API', () => {
  it('la raíz entrega el índice de la SPA', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })
    servirLaWeb(app, carpeta)

    try {
      const respuesta = await app.inject({ method: 'GET', url: '/' })

      expect(respuesta.statusCode).toBe(200)
      expect(respuesta.headers['content-type']).toMatch(/text\/html/)
      expect(respuesta.body).toContain('<div id="root"></div>')
      // El índice no se cachea: es el que dice qué assets cargar.
      expect(respuesta.headers['cache-control']).toBe('no-store')
    } finally {
      await app.close()
    }
  })

  it('los assets se sirven con caché larga, porque llevan hash en el nombre', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })
    servirLaWeb(app, carpeta)

    try {
      const respuesta = await app.inject({ method: 'GET', url: '/assets/app.js' })

      expect(respuesta.statusCode).toBe(200)
      expect(respuesta.body).toContain('rancho')
      expect(respuesta.headers['cache-control']).toMatch(/immutable/)
      expect(respuesta.headers['cache-control']).toMatch(/max-age=31536000/)
    } finally {
      await app.close()
    }
  })

  it('la API sigue respondiendo en /api y no la tapa la web', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })
    servirLaWeb(app, carpeta)

    try {
      const salud = await app.inject({ method: 'GET', url: '/api/health' })

      expect(salud.statusCode).toBe(200)
      expect(salud.json()).toEqual({ ok: true })
    } finally {
      await app.close()
    }
  })

  it('una ruta que no es pantalla ni archivo responde 404, no un índice disfrazado', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })
    servirLaWeb(app, carpeta)

    try {
      // Las pantallas viven en el `hash` (`#/pesaje`): `/pesaje` no existe.
      const respuesta = await app.inject({ method: 'GET', url: '/pesaje' })

      expect(respuesta.statusCode).toBe(404)
      expect(respuesta.body).not.toContain('<div id="root"></div>')
    } finally {
      await app.close()
    }
  })
})

describe('carpetaDeLaWeb', () => {
  it('sin WEB_DIST toma apps/web/dist bajo la raíz del repositorio', () => {
    const ruta = carpetaDeLaWeb({}, () => carpeta)
    expect(ruta).toBeNull()

    // Con una raíz que sí tiene apps/web/dist, la encuentra.
    const raiz = mkdtempSync(join(tmpdir(), 'rancho-raiz-'))
    try {
      mkdirSync(join(raiz, 'apps', 'web', 'dist'), { recursive: true })
      writeFileSync(join(raiz, 'apps', 'web', 'dist', 'index.html'), '<html></html>')

      expect(carpetaDeLaWeb({}, () => raiz)).toBe(join(raiz, 'apps', 'web', 'dist'))
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  it('WEB_DIST manda cuando está definido y existe', () => {
    expect(carpetaDeLaWeb({ WEB_DIST: carpeta }, () => carpeta)).toBe(carpeta)
  })

  it('un WEB_DIST que no existe devuelve null en vez de arrancar sin la web', () => {
    const inexistente = join(tmpdir(), 'rancho-no-existe-de-verdad')
    expect(carpetaDeLaWeb({ WEB_DIST: inexistente }, () => carpeta)).toBeNull()
  })

  it('una carpeta sin index.html no cuenta como web construida', () => {
    const vacia = mkdtempSync(join(tmpdir(), 'rancho-vacia-'))
    try {
      expect(esCarpetaDeWeb(vacia)).toBe(false)
      writeFileSync(join(vacia, 'index.html'), '<html></html>')
      expect(esCarpetaDeWeb(vacia)).toBe(true)
    } finally {
      rmSync(vacia, { recursive: true, force: true })
    }
  })
})
