import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { comprimirCarpeta } from './comprimir'

/**
 * Comprime la web construida: deja `.br` y `.gz` junto a cada asset de texto
 * para que el servidor los encuentre sin gastar CPU en cada petición.
 *
 * Se llama desde el `build` de `apps/web`, que es el que usan `npm run build`,
 * `npm run local` y el despliegue: un solo camino, así lo que se prueba es lo
 * que se publica.
 *
 * La carpeta por omisión es el `dist` de `apps/web`, resuelto desde este
 * archivo y no desde el directorio de trabajo: `npm run build -w @rancho/web`
 * deja el proceso en `apps/web`, pero un `npm run build` desde la raíz no, y un
 * compresor que se equivoca de carpeta dejaría al celular bajando todo entero
 * sin que nadie lo note.
 */
const CARPETA_DE_LA_WEB = resolve(import.meta.dirname, '..')

export function comprimirLaWeb(carpeta = resolve(CARPETA_DE_LA_WEB, 'dist')): void {
  const ruta = resolve(carpeta)
  if (!existsSync(ruta)) {
    throw new Error(`No existe ${ruta}. Comprime después de construir la web.`)
  }

  const resultado = comprimirCarpeta(ruta)
  const kb = (bytes: number): string => (bytes / 1024).toFixed(1)
  console.log(
    `Comprimidos ${String(resultado.archivos)} archivos de texto: ${kb(resultado.antes)} KB → br ${kb(resultado.brotli)} KB, gz ${kb(resultado.gzip)} KB.`,
  )
}

const entrada = process.argv[1]
if (entrada !== undefined && import.meta.url === pathToFileURL(entrada).href) {
  try {
    const carpeta = process.argv[2]
    comprimirLaWeb(carpeta === undefined ? undefined : resolve(carpeta))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
