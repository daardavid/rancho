import { request } from 'node:http'
import { brotliCompressSync, brotliDecompressSync, gunzipSync, gzipSync } from 'node:zlib'
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
 *
 * Los `.br` y `.gz` los escribe el build de la web
 * (`apps/web/scripts/comprimir.ts`). Aquí se escriben a mano con el mismo
 * `node:zlib` para probar el servidor sin construir la app entera.
 */

const GUION = 'console.log("rancho")\n'.repeat(40)
const INDICE = '<!doctype html><html lang="es"><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>'

let carpeta = ''

beforeAll(() => {
  carpeta = mkdtempSync(join(tmpdir(), 'rancho-web-'))
  writeFileSync(join(carpeta, 'index.html'), INDICE)
  writeFileSync(join(carpeta, 'index.html.br'), brotliCompressSync(INDICE))
  writeFileSync(join(carpeta, 'index.html.gz'), gzipSync(INDICE))
  mkdirSync(join(carpeta, 'assets'))
  writeFileSync(join(carpeta, 'assets', 'app.js'), GUION)
  writeFileSync(join(carpeta, 'assets', 'app.js.br'), brotliCompressSync(GUION))
  writeFileSync(join(carpeta, 'assets', 'app.js.gz'), gzipSync(GUION))
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

/**
 * El celular en el rancho abre con señal débil: el guion es lo que más pesa en
 * la primera carga. Estas pruebas fijan las tres respuestas que el navegador
 * puede pedir y que el contenido sea el mismo en las tres.
 */
describe('la web viaja comprimida cuando el navegador la acepta', () => {
  it('con `Accept-Encoding: br` el guion llega en brotli, idéntico y con la caché de siempre', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })
    servirLaWeb(app, carpeta)

    try {
      const respuesta = await app.inject({
        method: 'GET',
        url: '/assets/app.js',
        headers: { 'accept-encoding': 'br' },
      })

      expect(respuesta.statusCode).toBe(200)
      expect(respuesta.headers['content-encoding']).toBe('br')
      expect(respuesta.headers['content-type']).toMatch(/javascript/)
      // El asset conserva su caché inmutable: comprimido tampoco cambia de URL.
      expect(respuesta.headers['cache-control']).toMatch(/max-age=31536000/)
      expect(respuesta.headers['cache-control']).toMatch(/immutable/)
      // El contenido descomprimido es el mismo que sin comprimir, y el
      // comprimido de verdad es más chico: no basta con el encabezado.
      expect(brotliDecompressSync(respuesta.rawPayload).toString()).toBe(GUION)
      expect(respuesta.rawPayload.byteLength).toBeLessThan(GUION.length)
      // Sin `Vary`, una caché compartida podría devolver el comprimido a quien
      // no lo acepta.
      expect(String(respuesta.headers['vary']).toLowerCase()).toContain('accept-encoding')
    } finally {
      await app.close()
    }
  })

  it('con `Accept-Encoding: gzip` el guion llega en gzip, idéntico', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })
    servirLaWeb(app, carpeta)

    try {
      const respuesta = await app.inject({
        method: 'GET',
        url: '/assets/app.js',
        headers: { 'accept-encoding': 'gzip' },
      })

      expect(respuesta.statusCode).toBe(200)
      expect(respuesta.headers['content-encoding']).toBe('gzip')
      expect(respuesta.headers['cache-control']).toMatch(/max-age=31536000/)
      expect(gunzipSync(respuesta.rawPayload).toString()).toBe(GUION)
    } finally {
      await app.close()
    }
  })

  it('sin `Accept-Encoding` el guion llega sin comprimir', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })
    servirLaWeb(app, carpeta)

    try {
      const respuesta = await app.inject({ method: 'GET', url: '/assets/app.js' })

      expect(respuesta.statusCode).toBe(200)
      expect(respuesta.headers['content-encoding']).toBeUndefined()
      expect(respuesta.body).toBe(GUION)
      expect(respuesta.headers['cache-control']).toMatch(/max-age=31536000/)
    } finally {
      await app.close()
    }
  })

  it('el índice comprimido sigue sin caché: si no, el celular abriría la versión vieja', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })
    servirLaWeb(app, carpeta)

    try {
      for (const encoding of ['br', 'gzip'] as const) {
        const respuesta = await app.inject({
          method: 'GET',
          url: '/',
          headers: { 'accept-encoding': encoding },
        })

        expect(respuesta.statusCode).toBe(200)
        expect(respuesta.headers['content-encoding']).toBe(encoding)
        expect(respuesta.headers['cache-control']).toBe('no-store')
        const cuerpo =
          encoding === 'br'
            ? brotliDecompressSync(respuesta.rawPayload).toString()
            : gunzipSync(respuesta.rawPayload).toString()
        expect(cuerpo).toBe(INDICE)
      }
    } finally {
      await app.close()
    }
  })

  it('un archivo comprimido no es una ruta pública por su nombre', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })
    servirLaWeb(app, carpeta)

    try {
      const respuesta = await app.inject({ method: 'GET', url: '/assets/app.js.br' })

      expect(respuesta.statusCode).toBe(404)
    } finally {
      await app.close()
    }
  })

  it('un asset sin `.br` ni `.gz` se sirve tal cual aunque el navegador acepte compresión', async () => {
    writeFileSync(join(carpeta, 'assets', 'suelto.css'), 'body{color:#1c1f1a}')
    const app = construirApp({ nivelDeLog: 'silent' })
    servirLaWeb(app, carpeta)

    try {
      const respuesta = await app.inject({
        method: 'GET',
        url: '/assets/suelto.css',
        headers: { 'accept-encoding': 'br, gzip' },
      })

      expect(respuesta.statusCode).toBe(200)
      expect(respuesta.headers['content-encoding']).toBeUndefined()
      expect(respuesta.body).toBe('body{color:#1c1f1a}')
      // Aun sin comprimir, la respuesta depende de lo que el cliente acepta:
      // la caché compartida tiene que saberlo.
      expect(String(respuesta.headers['vary']).toLowerCase()).toContain('accept-encoding')
    } finally {
      await app.close()
      rmSync(join(carpeta, 'assets', 'suelto.css'), { force: true })
    }
  })

  /**
   * `inject` arma la petición en memoria. Aquí se abre un puerto de verdad y se
   * habla HTTP crudo con `node:http`, que es lo que hace el navegador del
   * celular. `fetch` no sirve para esta prueba: descomprime el cuerpo solo y
   * entonces no se ve cuántos bytes viajaron.
   */
  it('por un socket verdadero el guion también viaja comprimido', async () => {
    const app = construirApp({ nivelDeLog: 'silent' })
    servirLaWeb(app, carpeta)
    await app.listen({ port: 0, host: '127.0.0.1' })

    try {
      const direccion = app.server.address()
      const puerto = typeof direccion === 'object' && direccion !== null ? direccion.port : 0

      const respuesta = await pedirCrudo(puerto, '/assets/app.js', 'br')

      expect(respuesta.estado).toBe(200)
      expect(respuesta.encabezados['content-encoding']).toBe('br')
      expect(respuesta.encabezados['cache-control']).toMatch(/immutable/)
      expect(brotliDecompressSync(respuesta.cuerpo).toString()).toBe(GUION)
      // Lo que de verdad paga el celular: menos bytes por el aire.
      expect(respuesta.cuerpo.byteLength).toBeLessThan(Buffer.from(GUION).byteLength)
    } finally {
      await app.close()
    }
  })
})

/**
 * Una petición HTTP cruda, sin que nadie descomprima el cuerpo.
 *
 * `fetch` y `inject` son cómodos, pero el primero descomprime solo y el segundo
 * no sale del proceso. Para saber cuántos bytes viajan de verdad hace falta el
 * socket.
 */
function pedirCrudo(
  puerto: number,
  ruta: string,
  acepta: string,
): Promise<{ estado: number; encabezados: Record<string, string>; cuerpo: Buffer }> {
  return new Promise((resolver, rechazar) => {
    const peticion = request(
      { host: '127.0.0.1', port: puerto, path: ruta, headers: { 'accept-encoding': acepta } },
      (respuesta) => {
        const trozos: Buffer[] = []
        respuesta.on('data', (trozo: Buffer) => trozos.push(trozo))
        respuesta.once('error', rechazar)
        respuesta.on('end', () => {
          const encabezados: Record<string, string> = {}
          for (const [nombre, valor] of Object.entries(respuesta.headers)) {
            if (typeof valor === 'string') {
              encabezados[nombre] = valor
            }
          }
          resolver({ estado: respuesta.statusCode ?? 0, encabezados, cuerpo: Buffer.concat(trozos) })
        })
      },
    )
    peticion.once('error', rechazar)
    peticion.end()
  })
}

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
