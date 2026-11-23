/**
 * Levanta la aplicación **construida** sobre una base desechable.
 *
 * Lo usan `globalSetup` (una sola vez por corrida, en el proceso principal de
 * Playwright) y nada más. No se usa el `webServer` de Playwright a propósito:
 * ese arranca el comando como un proceso aparte, y en Windows un hijo sigue
 * vivo después de que muere su padre. La corrida siguiente encontraba el
 * puerto tomado y probaba contra el proceso viejo: un verde que no significaba
 * nada. Aquí el servidor vive dentro del proceso que Playwright ya controla.
 *
 * Lo que se levanta es `apps/api/dist/main.js`, el mismo archivo que ejecuta
 * `npm start`, con `NODE_ENV=production` (cookie `Secure`) y la web de
 * `apps/web/dist` servida por el mismo proceso. Si el compilado no carga, esto
 * falla: no se prueba contra un camino que nadie despliega.
 *
 * La base:
 *
 * - Sin `E2E_DATABASE_URL`: PGlite en este proceso, expuesto por TCP con
 *   `@electric-sql/pglite-socket`. Es el mismo motor que las pruebas de
 *   persistencia ([ADR-014](../../docs/architecture/adr/ADR-014-local-test-database.md))
 *   y no necesita Docker.
 * - Con `E2E_DATABASE_URL`: ese PostgreSQL, y se le aplican las migraciones.
 *
 * `maxConnections` importa: el servidor de PGlite acepta una sola conexión por
 * omisión y la API abre varias (el pool de `pg` más las consultas concurrentes
 * de una pantalla). Con el valor por omisión, la segunda conexión se reinicia y
 * la API contesta 500.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import type { FastifyInstance } from 'fastify'

import { aplicarMigraciones } from '../apps/api/src/infrastructure/db/migrar'
import { sembrarRancho } from '../apps/api/src/infrastructure/db/semilla'
import { crearCuenta } from '../apps/api/src/infrastructure/identity/cuentas'

/** Las credenciales de la prueba. Son datos sintéticos, no del rancho. */
export const USUARIO_DE_PRUEBA = 'propietario-e2e'
export const CONTRASENA_DE_PRUEBA = 'contrasena-de-prueba-e2e'
export const NOMBRE_DEL_RANCHO = 'Rancho de prueba'
export const PUERTO_DE_LA_APP = 4310

const SECRETO = 'secreto-de-prueba-de-punta-a-punta-0001'

const RAIZ = resolve(import.meta.dirname, '..')
const SERVIDOR = resolve(RAIZ, 'apps', 'api', 'dist', 'main.js')
const WEB = resolve(RAIZ, 'apps', 'web', 'dist')

type BaseDePrueba = { readonly url: string; cerrar(): Promise<void> }
type Compilado = { arrancar: () => Promise<FastifyInstance> }

/** Arranca todo y devuelve cómo apagarlo. */
export async function levantar(): Promise<() => Promise<void>> {
  exigirConstruido()
  await exigirPuertoLibre(PUERTO_DE_LA_APP)

  const base = await prepararBase()

  // Las variables se ponen antes de importar el compilado: `cargarConfiguracion`
  // las lee al arrancar, y `.env` no las pisa.
  Object.assign(process.env, {
    NODE_ENV: 'production',
    DATABASE_URL: base.url,
    SESSION_SECRET: SECRETO,
    PORT: String(PUERTO_DE_LA_APP),
    HOST: '127.0.0.1',
    WEB_DIST: WEB,
    // Una sola conexión: el motor embebido atiende una consulta a la vez y
    // multiplexa las conexiones sobre la misma sesión, así que dos consultas
    // simultáneas por conexiones distintas se pisan los parámetros. Con un
    // pool de uno se turnan, que es lo que hace un PostgreSQL de verdad.
    DB_POOL: '1',
  })

  const app = await importarYArrancar()

  return async () => {
    await app.close()
    await base.cerrar()
  }
}

function exigirConstruido(): void {
  if (!existsSync(SERVIDOR)) {
    throw new Error(
      `No existe ${SERVIDOR}. Las pruebas de punta a punta corren contra lo construido: usa «npm run test:e2e», que construye antes de probar.`,
    )
  }
  if (!existsSync(resolve(WEB, 'index.html'))) {
    throw new Error(
      `No existe ${WEB}/index.html. Las pruebas de punta a punta corren contra la web construida: usa «npm run test:e2e», que construye antes de probar.`,
    )
  }
}

/**
 * Carga `dist/main.js` y llama a su `arrancar`.
 *
 * El compilado no arranca solo al importarse: sigue el mismo patrón que
 * `cuenta:crear` y solo se pone a escuchar cuando es el archivo que se ejecutó
 * ([`apps/api/src/main.ts`](../apps/api/src/main.ts)).
 */
async function importarYArrancar(): Promise<FastifyInstance> {
  const modulo = (await import(pathToFileURL(SERVIDOR).href)) as Partial<Compilado>

  if (typeof modulo.arrancar !== 'function') {
    throw new Error(
      `${SERVIDOR} no exporta «arrancar». El compilado tiene que exportarlo para que la prueba levante justo el código que se despliega.`,
    )
  }

  return modulo.arrancar()
}

/**
 * Falla si algo ya escucha en el puerto de la prueba.
 *
 * Si quedó un servidor de una corrida anterior, las pruebas pasarían contra ese
 * proceso y no contra lo recién construido. Es mejor romper con una causa
 * legible que aceptar un verde falso.
 */
async function exigirPuertoLibre(puerto: number): Promise<void> {
  const ocupado = await hayAlgoEscuchando(puerto)
  if (ocupado) {
    throw new Error(
      `El puerto ${String(puerto)} ya está ocupado. Probablemente quedó un servidor de una corrida anterior; ciérralo antes de volver a probar, o las pruebas pasarían contra ese proceso y no contra lo recién construido.`,
    )
  }
}

function hayAlgoEscuchando(puerto: number): Promise<boolean> {
  return fetch(`http://127.0.0.1:${String(puerto)}/api/health`)
    .then(() => true)
    .catch(() => false)
}

async function prepararBase(): Promise<BaseDePrueba> {
  const externa = process.env['E2E_DATABASE_URL']
  if (externa !== undefined && externa.trim() !== '') {
    const { Pool } = await import('pg')
    const { drizzle } = await import('drizzle-orm/node-postgres')
    const pool = new Pool({ connectionString: externa })
    const db = drizzle(pool)
    await aplicarMigraciones(db)
    await sembrarYCrearCuenta(db)
    return { url: externa, cerrar: () => pool.end() }
  }

  const cliente = new PGlite()
  await cliente.waitReady
  const db = drizzlePglite(cliente)
  await aplicarMigraciones(db)
  await sembrarYCrearCuenta(db)

  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket')
  /**
   * Puerto 0: el sistema elige uno libre. Con un puerto fijo, una corrida
   * anterior que no terminó bien deja el puerto tomado y la siguiente falla por
   * una razón que no tiene que ver con el código.
   */
  const servidor = new PGLiteSocketServer({
    db: cliente,
    port: 0,
    host: '127.0.0.1',
    maxConnections: 10,
  })
  await servidor.start()

  const puerto = servidor.getServerConn().split(':').at(-1)

  return {
    url: `postgres://postgres:postgres@127.0.0.1:${String(puerto)}/postgres`,
    cerrar: async () => {
      await servidor.stop()
      await cliente.close()
    },
  }
}

/**
 * Un rancho y la cuenta del propietario, con datos sintéticos.
 *
 * Son las mismas funciones que usan `db:seed` y `cuenta:crear`, así que el
 * camino que se prueba es el de verdad.
 */
async function sembrarYCrearCuenta(db: Parameters<typeof sembrarRancho>[0]): Promise<void> {
  await sembrarRancho(db, NOMBRE_DEL_RANCHO)
  await crearCuenta(db, {
    rol: 'owner',
    usuario: USUARIO_DE_PRUEBA,
    contrasena: CONTRASENA_DE_PRUEBA,
  })
}
