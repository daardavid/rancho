/**
 * Revisión de fronteras de importación del monolito modular ([ADR-012](../../../docs/architecture/adr/ADR-012-repository-module-enforcement.md)).
 *
 * No es un linter: es una función pura sobre `{ ruta, contenido }` para que las
 * pruebas puedan alimentarla con archivos de ejemplo y con el código real. La
 * prueba `test/architecture/import-boundaries.test.ts` la corre sobre todo `src/`.
 *
 * Qué detiene, y solo qué:
 *
 * 1. Código fuera de un módulo que importa `modules/<x>/domain/**`,
 *    `modules/<x>/persistence/**` o la aplicación interna de ese módulo. El único
 *    camino soportado es su `index.ts`.
 * 2. Un archivo de `domain/` que importa Fastify, Drizzle, una librería de
 *    autenticación, código de la web o cualquier otro módulo.
 * 3. Un archivo del núcleo compartido que importa un módulo.
 *
 * Lo que no codifica: que un módulo llame a la escritura de otro, que un servicio
 * de aplicación reciba la transacción de Drizzle, o que una consulta lea tablas
 * ajenas. Eso lo revisa la persona que revisa; la prueba no se convierte en el
 * mapa de contextos completo.
 */

export type ArchivoFuente = {
  /** Ruta relativa a `apps/api/src`, con `/` como separador. */
  readonly ruta: string
  readonly contenido: string
}

export type Hallazgo = {
  readonly archivo: string
  /** Línea 1-based, o `null` si no se puede ubicar. */
  readonly linea: number | null
  readonly regla: string
  readonly detalle: string
}

/**
 * Paquetes que un `domain/` no puede importar: el borde HTTP, la persistencia, la
 * autenticación y la web. Se listan por nombre y no por fama: si aparece otro, se
 * agrega aquí y la prueba lo demuestra.
 */
const PAQUETES_PROHIBIDOS_EN_DOMINIO = [
  'fastify',
  '@fastify/',
  'drizzle-orm',
  'drizzle-kit',
  'better-auth',
  '@better-auth/',
  'lucia',
  '@lucia-auth/',
  'bcrypt',
  'bcryptjs',
  'argon2',
  '@node-rs/argon2',
  'react',
  'react-dom',
  '@tanstack/react-query',
  '@rancho/web',
] as const

const EXTENSIONES_FUENTE = ['.ts', '.tsx', '.mts', '.cts'] as const

/**
 * Extrae los especificadores de módulo de un archivo: `import`, `export ... from`,
 * `import()` y `require()`.
 *
 * Es una lectura por expresiones regulares, suficiente para TypeScript normal y
 * deliberadamente tonta: no interpreta comentarios ni plantillas, así que un
 * ejemplo dentro de una cadena podría dar un falso positivo. Eso se prefiere a un
 * parser; el código real no esconde imports en texto.
 */
export function especificadoresDeImport(contenido: string): string[] {
  const encontrados: string[] = []
  const patrones = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
  ]

  for (const patron of patrones) {
    for (const coincidencia of contenido.matchAll(patron)) {
      const especificador = coincidencia[1]
      if (especificador !== undefined && !encontrados.includes(especificador)) {
        encontrados.push(especificador)
      }
    }
  }

  return encontrados
}

/**
 * Resuelve un import relativo a una ruta dentro de `src`, sin extensión y sin
 * `/index`. Devuelve `null` para un paquete.
 */
export function resolverRutaRelativa(rutaArchivo: string, especificador: string): string | null {
  if (!especificador.startsWith('.')) {
    return null
  }

  const segmentos = rutaArchivo.split('/').slice(0, -1)

  for (const segmento of especificador.split('/')) {
    if (segmento === '' || segmento === '.') {
      continue
    }
    if (segmento === '..') {
      segmentos.pop()
      continue
    }
    segmentos.push(segmento)
  }

  let destino = segmentos.join('/')

  for (const extension of EXTENSIONES_FUENTE) {
    if (destino.endsWith(extension)) {
      destino = destino.slice(0, -extension.length)
      break
    }
  }
  // Un import escrito a la manera de Node (`./x.js`) apunta al `.ts` de al lado.
  destino = destino.replace(/\.(?:js|mjs|cjs|jsx)$/, '')

  if (destino.endsWith('/index')) {
    destino = destino.slice(0, -'/index'.length)
  }

  return destino
}

/** Módulo al que pertenece una ruta, o `null` si está fuera de `modules/`. */
export function moduloDe(ruta: string): string | null {
  const partes = ruta.split('/')
  if (partes[0] !== 'modules' || partes.length < 2) {
    return null
  }

  return partes[1] ?? null
}

function esEn(ruta: string, carpeta: string): boolean {
  if (ruta === carpeta) {
    return true
  }

  const prefijo = `${carpeta}/`
  return ruta.startsWith(prefijo)
}

/** `modules/herd/domain/animal` → `{ modulo: 'herd', capa: 'domain' }`. */
function capaDeModulo(ruta: string): { modulo: string; capa: string } | null {
  const partes = ruta.split('/')
  const modulo = moduloDe(ruta)
  const capa = partes[2]

  if (modulo === null || capa === undefined || partes.length < 4) {
    return null
  }

  return { modulo, capa }
}

function lineaDe(contenido: string, especificador: string): number | null {
  const lineas = contenido.split(/\r?\n/)
  const indice = lineas.findIndex((linea) => linea.includes(especificador))

  return indice === -1 ? null : indice + 1
}

function paqueteProhibidoEnDominio(especificador: string): string | null {
  for (const prohibido of PAQUETES_PROHIBIDOS_EN_DOMINIO) {
    if (prohibido.endsWith('/')) {
      if (especificador.startsWith(prohibido)) {
        return prohibido
      }
      continue
    }
    if (especificador === prohibido || especificador.startsWith(`${prohibido}/`)) {
      return prohibido
    }
  }

  return null
}

/**
 * Revisa un archivo y devuelve sus hallazgos. `archivo.ruta` es relativa a `src`.
 */
export function revisarArchivo(archivo: ArchivoFuente): Hallazgo[] {
  const hallazgos: Hallazgo[] = []
  const moduloPropio = moduloDe(archivo.ruta)
  const capaPropia = capaDeModulo(archivo.ruta)
  const esDeDominio = capaPropia?.capa === 'domain'
  const esDelNucleo = esEn(archivo.ruta, 'shared-kernel')

  for (const especificador of especificadoresDeImport(archivo.contenido)) {
    const linea = lineaDe(archivo.contenido, especificador)
    const destino = resolverRutaRelativa(archivo.ruta, especificador)
    const moduloDestino = destino === null ? null : moduloDe(destino)
    const capaDestino = destino === null ? null : capaDeModulo(destino)

    if (esDeDominio) {
      const prohibido = paqueteProhibidoEnDominio(especificador)
      if (prohibido !== null) {
        hallazgos.push({
          archivo: archivo.ruta,
          linea,
          regla: 'dominio-sin-infraestructura',
          detalle: `Un archivo de domain/ importa «${prohibido}». El dominio no conoce HTTP, persistencia, autenticación ni la web.`,
        })
      }

      if (moduloDestino !== null && moduloDestino !== moduloPropio) {
        hallazgos.push({
          archivo: archivo.ruta,
          linea,
          regla: 'dominio-sin-otro-modulo',
          detalle: `Un archivo de domain/ del módulo «${moduloPropio ?? '?'}» importa el módulo «${moduloDestino}».`,
        })
      }
    }

    if (esDelNucleo && moduloDestino !== null) {
      hallazgos.push({
        archivo: archivo.ruta,
        linea,
        regla: 'nucleo-sin-modulos',
        detalle: `El núcleo compartido importa el módulo «${moduloDestino}». El kernel no conoce agregados ni módulos.`,
      })
    }

    if (
      destino === null ||
      moduloDestino === null ||
      capaDestino === null ||
      moduloDestino === moduloPropio
    ) {
      continue
    }

    // Desde aquí: el import entra a otro módulo.
    const esInterno = capaDestino.capa === 'domain' || capaDestino.capa === 'application'

    if (esInterno) {
      hallazgos.push({
        archivo: archivo.ruta,
        linea,
        regla: 'solo-el-index-publico',
        detalle: `“${archivo.ruta}” importa «${especificador}», que está dentro de modules/${moduloDestino}/${capaDestino.capa}/. Solo se importa modules/${moduloDestino} (su index.ts).`,
      })
      continue
    }

    if (capaDestino.capa === 'persistence') {
      // ADR-012 deja leer definiciones de tabla desde `read-models/` para un
      // SELECT. Cualquier otra lectura de persistencia ajena está prohibida.
      const esLecturaDeModelo = esEn(archivo.ruta, 'read-models')
      if (!esLecturaDeModelo) {
        hallazgos.push({
          archivo: archivo.ruta,
          linea,
          regla: 'tablas-ajenas',
          detalle: `“${archivo.ruta}” importa la persistencia de modules/${moduloDestino}. Solo read-models/ puede leer definiciones de tabla para un SELECT.`,
        })
      }
    }
  }

  return hallazgos
}

export function revisarFronteras(archivos: readonly ArchivoFuente[]): Hallazgo[] {
  return archivos.flatMap(revisarArchivo)
}
