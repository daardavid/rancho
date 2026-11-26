import { brotliDecompressSync, gunzipSync } from 'node:zlib'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { comprimirCarpeta, esComprimible } from '../scripts/comprimir'

/**
 * El paso de compresión del build de la web.
 *
 * La meta de INC-006 es que el celular baje mucho menos la primera vez. Ese
 * ahorro depende de dos cosas que aquí se fijan: que el script deje `.br` y
 * `.gz` de verdad (y que descompriman al contenido original), y que **no**
 * toque lo que ya viene comprimido, porque comprimir un `.woff2` lo haría más
 * grande y gastaría el build sin ganar nada.
 */
const TEXTO = 'console.log("rancho")\n'.repeat(30)

let carpeta = ''

beforeEach(() => {
  carpeta = mkdtempSync(join(tmpdir(), 'rancho-comprimir-'))
})

afterEach(() => {
  rmSync(carpeta, { recursive: true, force: true })
})

const existe = (relativa: string): boolean => existsSync(join(carpeta, relativa))

describe('esComprimible', () => {
  it('los tipos de texto del build sí', () => {
    for (const nombre of ['app.js', 'index.css', 'index.html', 'icono.svg', 'datos.json']) {
      expect(esComprimible(nombre)).toBe(true)
    }
  })

  it('una fuente, una imagen o algo ya comprimido no', () => {
    for (const nombre of [
      'inter-latin-wght-normal.woff2',
      'archivo-latin-700-normal.woff',
      'foto.jpg',
      'foto.png',
      'foto.webp',
      'archivo.zip',
      'app.js.br',
      'app.js.gz',
    ]) {
      expect(esComprimible(nombre)).toBe(false)
    }
  })

  it('reconoce la extensión sin importar mayúsculas', () => {
    expect(esComprimible('APP.JS')).toBe(true)
    expect(esComprimible('INTER.WOFF2')).toBe(false)
  })
})

describe('comprimirCarpeta', () => {
  it('deja `.br` y `.gz` junto a cada archivo de texto, con el mismo contenido', () => {
    writeFileSync(join(carpeta, 'app.js'), TEXTO)
    writeFileSync(join(carpeta, 'index.html'), '<div id="root"></div>')

    const resultado = comprimirCarpeta(carpeta)

    expect(resultado.archivos).toBe(2)
    expect(brotliDecompressSync(readFileSync(join(carpeta, 'app.js.br'))).toString()).toBe(TEXTO)
    expect(gunzipSync(readFileSync(join(carpeta, 'app.js.gz'))).toString()).toBe(TEXTO)
    expect(readFileSync(join(carpeta, 'index.html.br')).byteLength).toBeGreaterThan(0)
    expect(readFileSync(join(carpeta, 'index.html.gz')).byteLength).toBeGreaterThan(0)
  })

  it('no comprime fuentes ni imágenes', () => {
    writeFileSync(join(carpeta, 'fuente.woff2'), Buffer.alloc(64, 7))
    writeFileSync(join(carpeta, 'foto.png'), Buffer.alloc(64, 9))
    writeFileSync(join(carpeta, 'estilos.css'), TEXTO)

    comprimirCarpeta(carpeta)

    expect(existe('fuente.woff2.br')).toBe(false)
    expect(existe('fuente.woff2.gz')).toBe(false)
    expect(existe('foto.png.br')).toBe(false)
    expect(existe('foto.png.gz')).toBe(false)
    expect(existe('estilos.css.br')).toBe(true)
  })

  it('entra a las subcarpetas, donde Vite deja los assets', () => {
    mkdirSync(join(carpeta, 'assets'), { recursive: true })
    writeFileSync(join(carpeta, 'assets', 'index-abc.js'), TEXTO)

    comprimirCarpeta(carpeta)

    expect(existe(join('assets', 'index-abc.js.br'))).toBe(true)
    expect(existe(join('assets', 'index-abc.js.gz'))).toBe(true)
  })

  it('correrla otra vez no comprime los `.br` ni los `.gz` que ya dejó', () => {
    writeFileSync(join(carpeta, 'app.js'), TEXTO)

    comprimirCarpeta(carpeta)
    const segunda = comprimirCarpeta(carpeta)

    // Solo el guion cuenta otra vez; sus hermanos comprimidos no se tocan.
    expect(segunda.archivos).toBe(1)
    expect(existe('app.js.br.br')).toBe(false)
    expect(existe('app.js.gz.gz')).toBe(false)
  })

  it('informa cuántos bytes se ahorraron', () => {
    writeFileSync(join(carpeta, 'app.js'), TEXTO)

    const resultado = comprimirCarpeta(carpeta)

    expect(resultado.antes).toBe(TEXTO.length)
    expect(resultado.brotli).toBeLessThan(resultado.antes)
    expect(resultado.gzip).toBeLessThan(resultado.antes)
  })

  it('una carpeta sin archivos de texto no inventa nada', () => {
    writeFileSync(join(carpeta, 'fuente.woff2'), Buffer.alloc(16, 1))

    const resultado = comprimirCarpeta(carpeta)

    expect(resultado).toEqual({ archivos: 0, antes: 0, brotli: 0, gzip: 0 })
  })

  it('un archivo vacío no deja hermanos comprimidos', () => {
    writeFileSync(join(carpeta, 'vacio.css'), '')

    const resultado = comprimirCarpeta(carpeta)

    expect(resultado.archivos).toBe(0)
    expect(existe('vacio.css.br')).toBe(false)
  })
})
