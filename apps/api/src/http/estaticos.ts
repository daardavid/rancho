import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Dónde queda la web construida.
 *
 * En producción el mismo proceso de Fastify sirve la SPA y la API bajo un solo
 * origen, para que la cookie de sesión sea de primera parte
 * ([deployment-strategy.md](../../../../docs/architecture/deployment-strategy.md)).
 * Este archivo solo resuelve la ruta: no arma la app ni sirve nada.
 *
 * `WEB_DIST` permite apuntar a otra carpeta. Es lo que usa la prueba de punta a
 * punta y sirve para un despliegue que no sea este repositorio.
 */
export function carpetaDeLaWeb(
  fuente: NodeJS.ProcessEnv = process.env,
  desdeUrl: () => string = raizDelRepositorio,
): string | null {
  const declarada = fuente['WEB_DIST']
  if (declarada !== undefined && declarada.trim() !== '') {
    const ruta = resolve(declarada)
    return esCarpetaDeWeb(ruta) ? ruta : null
  }

  const ruta = resolve(desdeUrl(), 'apps', 'web', 'dist')
  return esCarpetaDeWeb(ruta) ? ruta : null
}

/**
 * La raíz del repositorio, deducida del archivo compilado.
 *
 * `apps/api/dist/main.js` → `apps/api/dist` → `apps/api` → `apps` → la raíz.
 * Un despliegue que copie solo `dist` puede usar `WEB_DIST` y no depender de
 * esta deducción.
 */
export function raizDelRepositorio(): string {
  return resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
}

/** Una carpeta cuenta como web construida si tiene su `index.html`. */
export function esCarpetaDeWeb(ruta: string): boolean {
  try {
    return existsSync(ruta) && statSync(ruta).isDirectory() && existeElIndice(ruta)
  } catch {
    return false
  }
}

function existeElIndice(carpeta: string): boolean {
  try {
    return statSync(resolve(carpeta, 'index.html')).isFile()
  } catch {
    return false
  }
}
