import { statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Dónde viven los bytes en esta máquina.
 *
 * Por omisión es `<raíz>/.datos/evidencia`, que git ya ignora junto con la
 * base local. La raíz se busca subiendo desde este archivo hasta el monorepo
 * (la carpeta que tiene `apps` y `package.json`), así que vale igual sin
 * empaquetar (`tsx src/main.ts`) y empaquetado (`apps/api/dist/main.js`).
 * `EVIDENCE_DIR` la mueve sin cambiar la llave `{ranchId}/{evidenceId}`.
 */
export function carpetaDeEvidencia(
  env: NodeJS.ProcessEnv = process.env,
  desdeUrl: string = import.meta.url,
): string {
  const dada = env['EVIDENCE_DIR']?.trim()
  if (dada !== undefined && dada !== '') {
    return dada
  }
  return join(raizDelMonorepo(desdeUrl), '.datos', 'evidencia')
}

/**
 * Sube desde `desdeUrl` hasta la carpeta del monorepo.
 *
 * Si el proceso corre fuera del repo (por ejemplo solo el `dist` copiado) y
 * no hay `EVIDENCE_DIR`, se usa el directorio de trabajo.
 */
function raizDelMonorepo(desdeUrl: string, directorioDeTrabajo: string = process.cwd()): string {
  let actual = resolve(directorioDe(desdeUrl))
  const vistos = new Set<string>()
  while (!vistos.has(actual)) {
    vistos.add(actual)
    if (esRaizDelMonorepo(actual)) {
      return actual
    }
    const padre = dirname(actual)
    if (padre === actual) {
      break
    }
    actual = padre
  }
  return directorioDeTrabajo
}

function directorioDe(desdeUrl: string): string {
  const ruta = desdeUrl.startsWith('file:') ? fileURLToPath(desdeUrl) : desdeUrl
  return dirname(ruta)
}

function esRaizDelMonorepo(directorio: string): boolean {
  try {
    const paquete = join(directorio, 'package.json')
    const apps = join(directorio, 'apps')
    return statSync(paquete).isFile() && statSync(apps).isDirectory()
  } catch {
    return false
  }
}
