import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

import { carpetaDeEvidencia } from '../../src/infrastructure/evidence/carpeta'

const RAIZ = fileURLToPath(new URL('../../../..', import.meta.url))
const ESPERADA = join(RAIZ, '.datos', 'evidencia')

describe('carpeta de evidencia', () => {
  it('sin EVIDENCE_DIR cae en .datos/evidencia del repo, en fuente y compilado', () => {
    expect(existsSync(join(RAIZ, 'package.json'))).toBe(true)
    expect(existsSync(join(RAIZ, 'apps', 'api', 'package.json'))).toBe(true)

    const fuente = pathToFileURL(
      join(RAIZ, 'apps', 'api', 'src', 'infrastructure', 'evidence', 'carpeta.ts'),
    ).href
    const compilado = pathToFileURL(join(RAIZ, 'apps', 'api', 'dist', 'main.js')).href

    expect(carpetaDeEvidencia({}, fuente)).toBe(ESPERADA)
    expect(carpetaDeEvidencia({ EVIDENCE_DIR: '   ' }, compilado)).toBe(ESPERADA)
    expect(carpetaDeEvidencia({}, compilado)).toBe(ESPERADA)
  })

  it('EVIDENCE_DIR definido se usa tal cual', () => {
    const fuera = pathToFileURL(join(RAIZ, 'no-es-el-repo', 'main.js')).href
    expect(carpetaDeEvidencia({ EVIDENCE_DIR: 'D:\\fotos' }, fuera)).toBe('D:\\fotos')
    expect(carpetaDeEvidencia({ EVIDENCE_DIR: '  /var/evidencia  ' }, fuera)).toBe('/var/evidencia')
  })

  it('fuera del repo y sin EVIDENCE_DIR usa el directorio de trabajo', () => {
    const fuera = pathToFileURL(resolve('/fuera-de-rancho/dist/main.js')).href
    expect(carpetaDeEvidencia({}, fuera)).toBe(join(process.cwd(), '.datos', 'evidencia'))
  })
})
