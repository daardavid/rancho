import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const SRC = fileURLToPath(new URL('../../src', import.meta.url))

function listarTs(directorio: string): string[] {
  const archivos: string[] = []
  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    const ruta = join(directorio, entrada.name)
    if (entrada.isDirectory()) {
      archivos.push(...listarTs(ruta))
      continue
    }
    if (entrada.name.endsWith('.ts')) {
      archivos.push(ruta)
    }
  }
  return archivos
}

describe('el servidor no migra al arrancar', () => {
  it('main y las rutas no aplican migraciones', () => {
    const archivos = [join(SRC, 'main.ts'), ...listarTs(join(SRC, 'http'))]
    expect(archivos.length).toBeGreaterThan(1)

    const menciones = archivos.filter((archivo) => {
      const texto = readFileSync(archivo, 'utf8')
      return /aplicarMigraciones|restablecerEsquemas|drizzle-kit|infrastructure\/db\/migrar|drizzle-orm\/[^'"]*migrator/.test(
        texto,
      )
    })

    expect(menciones).toEqual([])
  })
})
