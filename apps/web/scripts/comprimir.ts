import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

/**
 * Deja junto a cada asset de texto su versión `.br` y `.gz`.
 *
 * El celular en el rancho abre la app con señal débil y el JavaScript pesa
 * medio megabyte. Comprimirlo aquí, en el build, evita dos cosas: comprimir en
 * cada petición (CPU del servicio gratis) y meter una dependencia de
 * producción al servidor. `@fastify/static` ya sabe buscar el hermano
 * comprimido cuando se le pide `preCompressed`
 * ([servir-web.ts](../../api/src/http/servir-web.ts)).
 *
 * Solo se comprimen tipos de texto. Un `.woff2` ya viene comprimido y volver a
 * comprimirlo lo deja más grande y gasta tiempo del build; lo mismo pasa con
 * imágenes, video y `.zip`. La lista es explícita a propósito: un asset nuevo y
 * binario no se comprime por accidente.
 */
const EXTENSIONES_DE_TEXTO = [
  '.js',
  '.mjs',
  '.css',
  '.html',
  '.svg',
  '.json',
  '.txt',
  '.webmanifest',
  '.map',
] as const

/** Sufijos que ya son la versión comprimida: no se comprimen otra vez. */
const SUFIJOS_COMPRIMIDOS = ['.br', '.gz'] as const

/** `true` si el archivo es de texto y vale la pena comprimirlo. */
export function esComprimible(ruta: string): boolean {
  const minuscula = ruta.toLowerCase()
  if (SUFIJOS_COMPRIMIDOS.some((sufijo) => minuscula.endsWith(sufijo))) {
    return false
  }
  const extension = extname(minuscula)
  return (EXTENSIONES_DE_TEXTO as readonly string[]).includes(extension)
}

export type ResultadoDeCompresion = {
  /** Cuántos archivos se comprimieron. */
  readonly archivos: number
  /** Bytes que sumaban sin comprimir. */
  readonly antes: number
  /** Bytes de las versiones `.br`. */
  readonly brotli: number
  /** Bytes de las versiones `.gz`. */
  readonly gzip: number
}

/**
 * Recorre `carpeta` y escribe `archivo.br` y `archivo.gz` junto a cada archivo
 * de texto. Devuelve los totales para que el build los informe.
 *
 * Es idempotente: correrla otra vez reescribe los mismos archivos y no toca los
 * `.br`/`.gz` que ella misma dejó (no se comprimen a sí mismos). Los archivos
 * vacíos se saltan: no ganan nada y su `.br` solo ensuciaría la carpeta.
 */
export function comprimirCarpeta(carpeta: string): ResultadoDeCompresion {
  let archivos = 0
  let antes = 0
  let brotli = 0
  let gzip = 0

  for (const ruta of archivosDeTexto(carpeta)) {
    const contenido = readFileSync(ruta)
    const enBrotli = brotliCompressSync(contenido, {
      params: {
        // El build corre una vez por despliegue, no en cada petición: vale la
        // pena el nivel máximo.
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: contenido.byteLength,
      },
    })
    const enGzip = gzipSync(contenido, { level: 9 })

    writeFileSync(`${ruta}.br`, enBrotli)
    writeFileSync(`${ruta}.gz`, enGzip)

    archivos += 1
    antes += contenido.byteLength
    brotli += enBrotli.byteLength
    gzip += enGzip.byteLength
  }

  return { archivos, antes, brotli, gzip }
}

function archivosDeTexto(carpeta: string): string[] {
  const encontrados: string[] = []
  for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = join(carpeta, entrada.name)
    if (entrada.isDirectory()) {
      encontrados.push(...archivosDeTexto(ruta))
    } else if (entrada.isFile() && esComprimible(ruta) && statSync(ruta).size > 0) {
      encontrados.push(ruta)
    }
  }
  return encontrados
}
