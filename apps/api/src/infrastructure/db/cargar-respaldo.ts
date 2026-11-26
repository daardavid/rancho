import { Client } from 'pg'

/**
 * Palabra que hay que escribir para cargar un respaldo en un PostgreSQL.
 *
 * Reemplaza los esquemas de la app en la base de `DATABASE_URL`. No es la
 * restauración local (`RESTAURAR`, que toca `.datos/`).
 */
export const CONFIRMACION_DE_CARGA = 'CARGAR'

/**
 * Un archivo de `pg_dump`, con el mismo criterio que el respaldo local.
 *
 * Vive aquí para que este comando no importe el motor embebido.
 */
export function esArchivoDeRespaldo(texto: string): boolean {
  return texto.includes('PostgreSQL database dump') && texto.includes('CREATE TABLE')
}

export function confirmarCarga(respuesta: string): boolean {
  return respuesta.trim() === CONFIRMACION_DE_CARGA
}

/** Un solo archivo. La ruta relativa se resuelve después, desde donde se invocó npm. */
export function leerArchivoDeCarga(argv: readonly string[]): string {
  const archivo = argv.length === 1 ? argv[0] : undefined
  if (archivo === undefined || archivo.startsWith('--') || archivo.trim() === '') {
    throw new Error('Uso: npm run cargar-respaldo -- <archivo.sql>')
  }
  return archivo
}

/**
 * Host, puerto, usuario y base. Nunca la contraseña.
 *
 * Es lo que el comando imprime antes de pedir `CARGAR`, para que se vea
 * si la dirección es la de Neon o la de esta máquina.
 */
export function describirDestino(url: string): string {
  const copia = leerUrl(url)
  const puerto = copia.port === '' ? '5432' : copia.port
  const base = decodificar(copia.pathname.replace(/^\//, ''))
  const usuario = copia.username === '' ? '' : `${decodificar(copia.username)}@`
  const nombre = base === '' ? '(sin nombre)' : base
  return `${usuario}${copia.hostname}:${puerto}/${nombre}`
}

/**
 * Carga el SQL del respaldo en un PostgreSQL de servidor.
 *
 * La misma secuencia que la prueba que ya mete el archivo en la base de CI:
 * una transacción, y si una sentencia falla no queda a medias. El archivo
 * de `npm run respaldo` trae sus propios `BEGIN`/`COMMIT`; envolverlo otra
 * vez es lo que esa prueba ya ejecuta contra este SQL.
 *
 * No toca `.datos/`. No migra: el archivo ya trae el diario de `drizzle`.
 */
export async function cargarRespaldoEnPostgres(url: string, sqlTexto: string): Promise<void> {
  if (!esArchivoDeRespaldo(sqlTexto)) {
    throw new Error('El archivo no es un respaldo de RANCHO (SQL de pg_dump).')
  }
  leerUrl(url)

  const cliente = new Client({ connectionString: url })
  try {
    await cliente.connect()
  } catch (error) {
    await cliente.end().catch(() => undefined)
    throw new Error(
      `No pude conectar a ${describirDestino(url)}. ${mensajeSinSecreto(error, url)}`,
    )
  }

  try {
    await cliente.query('BEGIN')
    await cliente.query(sqlTexto)
    await cliente.query('COMMIT')
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => undefined)
    throw new Error(
      `No se pudo cargar el respaldo en ${describirDestino(url)}. ${mensajeSinSecreto(error, url)}`,
    )
  } finally {
    await cliente.end().catch(() => undefined)
  }
}

function leerUrl(url: string): URL {
  let copia: URL
  try {
    copia = new URL(url)
  } catch {
    throw new Error('DATABASE_URL no es una dirección que se pueda leer.')
  }
  if (copia.protocol !== 'postgres:' && copia.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL tiene que ser una dirección de PostgreSQL.')
  }
  if (copia.hostname === '') {
    throw new Error('DATABASE_URL no trae host.')
  }
  return copia
}

function decodificar(valor: string): string {
  try {
    return decodeURIComponent(valor)
  } catch {
    return valor
  }
}

function mensajeSinSecreto(error: unknown, url: string): string {
  const texto = error instanceof Error ? error.message : String(error)
  let secreto = ''
  try {
    secreto = decodeURIComponent(new URL(url).password)
  } catch {
    return texto
  }
  if (secreto === '') {
    return texto
  }
  return texto.split(secreto).join('***')
}
