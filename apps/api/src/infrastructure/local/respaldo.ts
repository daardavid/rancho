import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { PGlite } from '@electric-sql/pglite'
import { pgDump } from '@electric-sql/pglite-tools/pg_dump'

import { leerVariable } from './archivo-env'
import { abrirBaseLocal } from './base'

/**
 * Palabra que hay que escribir para restaurar.
 *
 * No basta con «sí»: el comando reemplaza la base local. La palabra es una
 * sola, en mayúsculas, para que un Enter vacío no alcance.
 */
export const CONFIRMACION_DE_RESTAURACION = 'RESTAURAR'

/**
 * El SQL guarda qué foto es de qué animal, no los bytes. La misma idea que
 * `npm run cargar-respaldo`: las imágenes se quedan en la carpeta de evidencia.
 */
export const AVISO_FOTOS_FUERA_DEL_SQL =
  'Las fotos no van en el archivo SQL: solo sus datos. Los bytes se quedan en la carpeta de evidencia.'

/**
 * Esquemas de la app. `evidence` guarda los metadatos de las fotos: sin él,
 * una base restaurada queda sin `evidence.file` y `db:migrate` no lo vuelve a
 * crear porque la migración ya está marcada en `drizzle`. `journal` guarda
 * la bitácora y los pendientes: sin él se pierden las notas y su historia, y
 * `db:migrate` no recrea el esquema porque esa migración ya está marcada.
 * `drizzle` guarda qué migraciones ya se aplicaron: sin él, el siguiente
 * `npm run local` intentaría crear tablas que el respaldo ya trajo. `public`
 * no entra completo: ahí solo vive `command_idempotency`, y un
 * `pg_dump --schema=public --clean` emite `DROP SCHEMA public`.
 */
const ESQUEMAS = ['herd', 'growth', 'identity', 'evidence', 'journal', 'drizzle'] as const

const ARGUMENTOS_COMUNES = ['--no-owner', '--no-privileges', '--clean', '--if-exists'] as const

const ENCABEZADO = `-- Respaldo de RANCHO.
-- SQL de pg_dump (INSERT), generado desde la base local embebida.
-- Reemplaza los esquemas herd, growth, identity, evidence, journal y drizzle, y la tabla
-- public.command_idempotency. No borra el esquema public.
-- En un PostgreSQL de servidor:
--   psql -v ON_ERROR_STOP=1 --single-transaction -f <este archivo> "postgres://…"
`

/**
 * Estos comandos no tocan una base de producción.
 *
 * Se mira cada origen que se pase (el proceso y, si el comando lo leyó, el
 * `.env`). Con uno solo en `production` basta para negarse.
 */
export function afirmarRespaldoPermitido(...origenes: Array<string | undefined>): void {
  if (origenes.some((valor) => valor === 'production')) {
    throw new Error(
      'npm run respaldo y npm run restaurar no corren cuando NODE_ENV=production.',
    )
  }
}

export function confirmarRestauracion(respuesta: string): boolean {
  return respuesta.trim() === CONFIRMACION_DE_RESTAURACION
}

export function leerArchivoDeRestauracion(argv: readonly string[]): string {
  const archivo = argv.length === 1 ? argv[0] : undefined
  if (archivo === undefined || archivo.startsWith('--') || archivo.trim() === '') {
    throw new Error('Uso: npm run restaurar -- <archivo.sql>')
  }
  return archivo
}

export { resolverArchivoDeRestauracion } from '../ruta-de-respaldo'

/** Un archivo de `pg_dump`, no un texto cualquiera. */
export function esRespaldoSql(texto: string): boolean {
  return texto.includes('PostgreSQL database dump') && texto.includes('CREATE TABLE')
}

/**
 * `rancho-AAAA-MM-DD-HHMMSS-mmm.sql` en la hora del rancho.
 *
 * Sin dos puntos: en Windows el nombre no los admite. Los milisegundos
 * separan dos respaldos del mismo segundo (el automático y uno manual).
 */
export function nombreDeRespaldo(ahora: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ahora)
  const tomar = (tipo: Intl.DateTimeFormatPartTypes): string => {
    const valor = partes.find((parte) => parte.type === tipo)?.value
    if (valor === undefined || !/^\d+$/.test(valor)) {
      throw new Error('No pude armar la fecha del respaldo.')
    }
    return valor
  }
  const hora = tomar('hour') === '24' ? '00' : tomar('hour')
  const milisegundos = String(ahora.getMilliseconds()).padStart(3, '0')
  const fecha = `${tomar('year')}-${dos(tomar('month'))}-${dos(tomar('day'))}`
  const reloj = `${dos(hora)}${dos(tomar('minute'))}${dos(tomar('second'))}`
  return `rancho-${fecha}-${reloj}-${milisegundos}.sql`
}

function dos(valor: string): string {
  return valor.padStart(2, '0')
}

/** La carpeta de `npm run local` ya fue inicializada. */
export function hayBaseLocal(directorio: string): boolean {
  return existsSync(join(directorio, 'PG_VERSION'))
}

/** `.datos/pglite` es la base embebida. `respaldos/` recibe los archivos. */
export function rutasDeLaBaseLocal(raiz: string): { datos: string; respaldos: string } {
  return {
    datos: join(raiz, '.datos', 'pglite'),
    respaldos: join(raiz, 'respaldos'),
  }
}

/** `NODE_ENV` escrito en el `.env` de la raíz, si el archivo existe. */
export function nodeEnvDelArchivo(raiz: string): string | undefined {
  const envRuta = join(raiz, '.env')
  if (!existsSync(envRuta)) {
    return undefined
  }
  return leerVariable(readFileSync(envRuta, 'utf8'), 'NODE_ENV')?.trim()
}

/**
 * Abre y cierra la base para fallar antes de pedir confirmación.
 *
 * Si `npm run local` la tiene abierta, este proceso no puede usarla. Sin
 * carpeta todavía, no hay nada que abrir: restaurar la crea.
 */
export async function asegurarBaseLibre(directorio: string): Promise<void> {
  if (!hayBaseLocal(directorio)) {
    return
  }
  const base = await abrirBaseLocal(directorio)
  await base.cerrar()
}

type OpcionesDeEntorno = {
  readonly nodeEnv?: string
}

function nodeEnvDe(opciones: OpcionesDeEntorno): string | undefined {
  return 'nodeEnv' in opciones ? opciones.nodeEnv : process.env['NODE_ENV']
}

/**
 * SQL de toda la base de la app.
 *
 * `@electric-sql/pglite-tools` trae `pg_dump` de PostgreSQL 18 compilado a
 * WASM y le agrega `--inserts`, así que el archivo son sentencias SQL: las
 * carga PGlite con `exec` y un PostgreSQL de servidor con `psql`. No hace
 * falta el binario de `pg_dump` en la laptop.
 *
 * Van dos pasadas. Juntar `--schema` y `--table` en una sola hace que
 * `pg_dump` se quede solo con las tablas que cumplen las dos, y
 * `--schema=public` con `--clean` borra el esquema `public` entero. La
 * segunda pasada saca únicamente `public.command_idempotency`.
 */
export async function volcarSql(cliente: PGlite): Promise<string> {
  const esquemas = await pgDump({
    pg: cliente,
    args: [...ARGUMENTOS_COMUNES, ...ESQUEMAS.map((esquema) => `--schema=${esquema}`)],
  })
  const recibos = await pgDump({
    pg: cliente,
    args: [...ARGUMENTOS_COMUNES, '--table=public.command_idempotency'],
  })
  const sqlTexto = `${ENCABEZADO}\n${await esquemas.text()}\n${await recibos.text()}\n`
  afirmarRespaldoCompleto(sqlTexto)
  // `pg_dump` abre una transacción de solo lectura y no la cierra. Si
  // después se restaura en esta misma conexión, el ALTER TABLE falla.
  await soltarTransaccion(cliente)
  return sqlTexto
}

function afirmarRespaldoCompleto(sqlTexto: string): void {
  if (/DROP SCHEMA(?: IF EXISTS)? public\b/.test(sqlTexto)) {
    throw new Error('El respaldo iba a borrar el esquema public. No se escribió el archivo.')
  }
  for (const esquema of ESQUEMAS) {
    if (!sqlTexto.includes(`CREATE SCHEMA ${esquema}`)) {
      throw new Error(`El respaldo no trae el esquema ${esquema}. No se escribió el archivo.`)
    }
  }
  if (!sqlTexto.includes('public.command_idempotency')) {
    throw new Error('El respaldo no trae los recibos de comando. No se escribió el archivo.')
  }
}

/**
 * Reemplaza los objetos de la app con el SQL del respaldo.
 *
 * `pg_dump --clean` emite `DROP SCHEMA` sin `CASCADE`. Una tabla que el
 * archivo no trae —una migración posterior— impediría borrar el esquema y
 * la restauración fallaría a medias. Por eso, en la misma transacción, se
 * tiran antes los esquemas de la app y la tabla de recibos. El archivo
 * vuelve a crearlos. Si una sentencia falla, la base queda como estaba.
 * `pg_dump` deja `search_path` vacío en la sesión; la app busca
 * `command_idempotency` sin esquema, así que se devuelve el que había.
 */
export async function aplicarRespaldo(cliente: PGlite, sqlTexto: string): Promise<void> {
  if (!esRespaldoSql(sqlTexto)) {
    throw new Error('El archivo no es un respaldo de RANCHO (SQL de pg_dump).')
  }
  const antes = await cliente.query<{ search_path: string }>('SHOW search_path')
  const searchPath = antes.rows[0]?.search_path ?? 'public'
  await soltarTransaccion(cliente)
  await cliente.exec('BEGIN')
  try {
    await cliente.exec(`DROP SCHEMA IF EXISTS ${ESQUEMAS.join(', ')} CASCADE`)
    await cliente.exec('DROP TABLE IF EXISTS public.command_idempotency')
    await cliente.exec(sqlTexto)
    await cliente.exec('COMMIT')
  } catch (error) {
    await cliente.exec('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    await cliente.query(`SELECT set_config('search_path', $1, false)`, [searchPath])
  }
}

export async function respaldarBaseLocal(opciones: {
  readonly directorioDeDatos: string
  readonly directorioDeRespaldos: string
  readonly ahora?: Date
  readonly nodeEnv?: string
}): Promise<string> {
  afirmarRespaldoPermitido(nodeEnvDe(opciones))
  if (!hayBaseLocal(opciones.directorioDeDatos)) {
    throw new Error('No hay base local en .datos/. Corre npm run local antes de respaldar.')
  }
  const base = await abrirBaseLocal(opciones.directorioDeDatos)
  try {
    return await escribirRespaldo(base.cliente, opciones.directorioDeRespaldos, opciones.ahora)
  } finally {
    await base.cerrar()
  }
}

/**
 * Pone el archivo en la base local.
 *
 * Si ya había datos, primero los escribe en `directorioDeRespaldos`. Si no
 * había carpeta, no inventa un respaldo vacío: lo dice con `respaldoPrevio`
 * en null. La confirmación la pide el comando, antes de llamar aquí.
 */
export async function restaurarBaseLocal(opciones: {
  readonly directorioDeDatos: string
  readonly directorioDeRespaldos: string
  readonly archivo: string
  readonly ahora?: Date
  readonly nodeEnv?: string
}): Promise<{ readonly respaldoPrevio: string | null }> {
  afirmarRespaldoPermitido(nodeEnvDe(opciones))
  const sqlTexto = readFileSync(opciones.archivo, 'utf8')
  if (!esRespaldoSql(sqlTexto)) {
    throw new Error('El archivo no es un respaldo de RANCHO (SQL de pg_dump).')
  }

  const habia = hayBaseLocal(opciones.directorioDeDatos)
  const base = await abrirBaseLocal(opciones.directorioDeDatos)
  let respaldoPrevio: string | null = null
  try {
    if (habia) {
      respaldoPrevio = await escribirRespaldo(
        base.cliente,
        opciones.directorioDeRespaldos,
        opciones.ahora,
      )
    }
    await aplicarRespaldo(base.cliente, sqlTexto)
    return { respaldoPrevio }
  } catch (error) {
    const donde =
      respaldoPrevio === null
        ? 'No se había escrito el respaldo automático.'
        : `Lo que había antes quedó en ${respaldoPrevio}.`
    throw new Error(`No se pudo restaurar. ${donde} ${texto(error)}`)
  } finally {
    await base.cerrar()
  }
}

async function escribirRespaldo(
  cliente: PGlite,
  directorioDeRespaldos: string,
  ahora: Date | undefined,
): Promise<string> {
  const sqlTexto = await volcarSql(cliente)
  mkdirSync(directorioDeRespaldos, { recursive: true })
  const ruta = rutaLibre(directorioDeRespaldos, ahora ?? new Date())
  writeFileSync(ruta, sqlTexto, 'utf8')
  return ruta
}

function rutaLibre(directorio: string, ahora: Date): string {
  const base = nombreDeRespaldo(ahora).replace(/\.sql$/, '')
  let ruta = join(directorio, `${base}.sql`)
  let consecutivo = 2
  while (existsSync(ruta)) {
    ruta = join(directorio, `${base}-${consecutivo}.sql`)
    consecutivo += 1
  }
  return ruta
}

async function soltarTransaccion(cliente: PGlite): Promise<void> {
  await cliente.exec('ROLLBACK').catch(() => undefined)
}

function texto(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
