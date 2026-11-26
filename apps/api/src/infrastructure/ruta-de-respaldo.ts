import { resolve } from 'node:path'

/**
 * Dónde está el archivo que se va a restaurar o a cargar.
 *
 * `npm run restaurar` y `npm run cargar-respaldo` dejan el proceso en
 * `apps/api` y guardan la carpeta desde la que se invocó npm en `INIT_CWD`.
 * Una ruta relativa (la que imprime `npm run respaldo`) se arma contra esa
 * carpeta. Sin ella, contra el directorio actual. Una ruta absoluta se queda
 * igual.
 *
 * Vive aquí, sin el motor embebido, para que `cargar-respaldo` no importe
 * PGlite.
 */
export function resolverArchivoDeRestauracion(
  ruta: string,
  directorioInicial: string | undefined = process.env['INIT_CWD'],
  directorioActual: string = process.cwd(),
): string {
  const base =
    directorioInicial !== undefined && directorioInicial !== ''
      ? directorioInicial
      : directorioActual
  return resolve(base, ruta)
}
