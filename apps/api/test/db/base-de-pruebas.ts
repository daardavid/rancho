import { randomUUID } from 'node:crypto'

import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { Client, Pool } from 'pg'

import { aplicarMigraciones } from '../../src/infrastructure/db/migrar'

/**
 * El secreto de sesión de las pruebas.
 *
 * No es un secreto: la prueba necesita uno del largo que exige
 * [`cargarConfiguracion`](../../src/infrastructure/configuracion.ts) para poder
 * armar la identidad. Cada base de prueba es nueva y todas usan el mismo valor;
 * la huella guardada depende de él.
 */
export const SECRETO_DE_PRUEBA = 'secreto-de-prueba-para-la-fabrica-0001'

/** Prefijo de las bases que esta fábrica crea en el servidor de `TEST_DATABASE_URL`. */
const PREFIJO = 'rancho_test_'

/**
 * Una fábrica para las pruebas de persistencia, y una base nueva por llamada (ADR-014).
 *
 * Con `TEST_DATABASE_URL` la fábrica usa esa URL como conexión de administración,
 * crea su propia base en ese servidor (`rancho_test_` más un id aleatorio), le
 * aplica las migraciones con `aplicarMigraciones` —el mismo código que
 * `db:migrate`— y la borra con `DROP DATABASE ... WITH (FORCE)` al cerrar. Sin
 * ella arranca una PGlite nueva en este proceso.
 *
 * Cada suite abre la suya porque las suites corren a la vez: con una sola base
 * compartida, dos archivos crean el esquema `growth` al mismo tiempo, la
 * búsqueda por arete encuentra animales de otra suite y una cuenta que la otra
 * suite ya creó. Aislada, cada archivo es dueño de lo que siembra.
 *
 * Si no puede crear la base o aplicar las migraciones, lanza: la prueba falla,
 * no se salta.
 */
export async function abrirBaseDePruebas() {
  const url = process.env['TEST_DATABASE_URL']
  if (url !== undefined && url.trim() !== '') {
    return abrirPostgres(url.trim())
  }
  return abrirPglite()
}

async function abrirPostgres(url: string) {
  const nombre = nombreDeBaseNueva()

  try {
    await conAdministracion(url, `CREATE DATABASE ${identificador(nombre)}`)
  } catch (error) {
    throw new Error(
      `TEST_DATABASE_URL está definida y no se pudo crear la base de pruebas «${nombre}». ` +
        `Esa conexión es de administración: necesita poder CREATE DATABASE y la base de la URL ` +
        `tiene que existir para poder conectarse: ${texto(error)}`,
    )
  }

  const pool = new Pool({ connectionString: urlConBase(url, nombre) })
  const db = drizzlePg(pool)
  try {
    await aplicarMigraciones(db)
  } catch (error) {
    await pool.end().catch(() => undefined)
    await borrarBase(url, nombre).catch(() => undefined)
    throw new Error(
      `TEST_DATABASE_URL está definida y no se pudieron aplicar las migraciones ` +
        `en «${nombre}»: ${texto(error)}`,
    )
  }

  return {
    db,
    cerrar: memoizar(async () => {
      await pool.end().catch(() => undefined)
      await borrarBase(url, nombre)
    }),
  }
}

/** `cerrar()` puede llamarse dos veces: la segunda vez devuelve la misma promesa. */
function memoizar(tarea: () => Promise<void>): () => Promise<void> {
  let pendiente: Promise<void> | undefined
  return () => {
    pendiente ??= tarea()
    return pendiente
  }
}

async function abrirPglite() {
  const cliente = new PGlite()
  try {
    await cliente.waitReady
    const db = drizzlePglite(cliente)
    await aplicarMigraciones(db)
    return { db, cerrar: memoizar(() => cliente.close()) }
  } catch (error) {
    await cliente.close().catch(() => undefined)
    throw new Error(
      `No se pudo arrancar la base de pruebas. Sin TEST_DATABASE_URL, PGlite tiene que arrancar en el proceso: ${texto(error)}`,
    )
  }
}

/** `rancho_test_` más 16 hex: corto, único y dentro de los 63 bytes de un identificador.*/
function nombreDeBaseNueva(): string {
  return `${PREFIJO}${randomUUID().replace(/-/g, '').slice(0, 16)}`
}

/** El nombre lo genera esta fábrica (hex y guion bajo); las comillas son por si acaso. */
function identificador(nombre: string): string {
  return `"${nombre.replace(/"/g, '""')}"`
}

/** La misma URL de administración, apuntando a la base recién creada. */
function urlConBase(url: string, nombre: string): string {
  let copia: URL
  try {
    copia = new URL(url)
  } catch (error) {
    throw new Error(`TEST_DATABASE_URL no es una URL que se pueda leer: ${texto(error)}`)
  }
  copia.pathname = `/${nombre}`
  return copia.toString()
}

/**
 * `WITH (FORCE)` corta las conexiones que queden abiertas (PostgreSQL 13 y
 * después, el mismo motor que CI y el Compose del repo). Si el `DROP` falla, el
 * error sale de `cerrar()`: la corrida queda en rojo en vez de dejar basura.
 */
async function borrarBase(url: string, nombre: string): Promise<void> {
  await conAdministracion(url, `DROP DATABASE IF EXISTS ${identificador(nombre)} WITH (FORCE)`)
}

/**
 * Una conexión de administración que se abre para el `CREATE`/`DROP` y se cierra
 * enseguida.
 *
 * No se guarda un pool por suite: con los archivos en paralelo, cada pool dejaba
 * una conexión viva a la base de administración hasta el final a pesar de
 * `max: 1`, y el servidor de CI acabaría sin `max_connections`. Así sólo hay una
 * conexión de administración por operación.
 */
async function conAdministracion(url: string, sentencia: string): Promise<void> {
  const cliente = new Client({ connectionString: url })
  await cliente.connect()
  try {
    await cliente.query(sentencia)
  } finally {
    await cliente.end().catch(() => undefined)
  }
}

function texto(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
