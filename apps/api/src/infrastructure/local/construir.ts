import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SALIDAS = ['apps/api/dist/main.js', 'apps/web/dist/index.html'] as const

const VIGILADOS = [
  'apps/api/src',
  'apps/api/build.mjs',
  'apps/api/package.json',
  'apps/web/src',
  'apps/web/scripts',
  'apps/web/index.html',
  'apps/web/vite.config.ts',
  'apps/web/package.json',
  'packages/api-contracts/src',
  'packages/api-contracts/package.json',
] as const

/**
 * La raíz del repo, a partir de este archivo.
 *
 * `npm run local -w @rancho/api` deja el proceso en `apps/api`. Las rutas del
 * comando (`.env`, `.datos/`, `dist`) salen de aquí, no del directorio de trabajo.
 */
export function raizDelRepo(): string {
  return resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', '..', '..')
}

/** Falta alguna salida, o el código es más nuevo que la construcción. */
export function haceFaltaConstruir(raiz: string): boolean {
  const marcas: number[] = []
  for (const relativa of SALIDAS) {
    const ruta = join(raiz, relativa)
    if (!existsSync(ruta)) {
      return true
    }
    marcas.push(statSync(ruta).mtimeMs)
  }
  const listo = Math.min(...marcas)
  return VIGILADOS.some((relativa) => masNuevoQue(join(raiz, relativa), listo))
}

export function construirAplicacion(raiz: string): Promise<void> {
  return new Promise((resolvePromesa, reject) => {
    const hijo = spawn('npm', ['run', 'build'], {
      cwd: raiz,
      stdio: 'inherit',
      shell: true,
    })
    hijo.on('error', reject)
    hijo.on('exit', (codigo) => {
      if (codigo === 0) {
        resolvePromesa()
        return
      }
      reject(new Error(`npm run build terminó con código ${String(codigo ?? 'desconocido')}.`))
    })
  })
}

function masNuevoQue(ruta: string, marca: number): boolean {
  if (!existsSync(ruta)) {
    return false
  }
  const stat = statSync(ruta)
  if (stat.isFile()) {
    return stat.mtimeMs > marca
  }
  for (const entrada of readdirSync(ruta, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name === 'dist') {
      continue
    }
    if (masNuevoQue(join(ruta, entrada.name), marca)) {
      return true
    }
  }
  return false
}
