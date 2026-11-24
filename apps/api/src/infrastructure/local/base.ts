import { mkdirSync } from 'node:fs'

import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite'

import { filasDe, type EjecutorSql } from '../db/filas'
import { aplicarMigraciones } from '../db/migrar'
import { sembrarRancho } from '../db/semilla'
import { crearCuenta } from '../identity/cuentas'

/**
 * Rol de la primera cuenta que crea `npm run local`.
 *
 * INC-002 dice que David entra con `support` para juzgar el incremento antes
 * de que lo use el propietario. Si ya hay alguna cuenta, no se crea otra ni
 * se le cambia la contraseña. El rol `owner` se crea después, con
 * `cuenta:crear`.
 */
export const ROL_DE_LA_PRIMERA_CUENTA = 'support'

export type CuentaPedida = {
  readonly usuario: string
  readonly contrasena: string
}

export type PreparacionLocal = {
  readonly ranchId: string
  readonly ranchoCreado: boolean
  readonly cuentaCreada: boolean
  readonly cuentas: number
  readonly cuentaId: string | null
  readonly usuario: string | null
  readonly rol: string | null
}

type BaseLocal = {
  readonly cliente: PGlite
  readonly db: PgliteDatabase<Record<string, never>>
  cerrar(): Promise<void>
}

/**
 * Abre el PostgreSQL embebido con los archivos en `directorio`.
 *
 * Es el mismo motor que las pruebas. La carpeta es la persistencia: cerrar y
 * volver a abrir no borra lo que ya se escribió. El proceso HTTP no abre esto;
 * lo abre el comando `npm run local`, que después lo expone por el socket.
 */
export async function abrirBaseLocal(directorio: string): Promise<BaseLocal> {
  mkdirSync(directorio, { recursive: true })
  const cliente = new PGlite(directorio)
  try {
    await cliente.waitReady
  } catch (error) {
    await cliente.close().catch(() => undefined)
    throw new Error(
      `No pude abrir la base en ${directorio}. Si ya hay un «npm run local» corriendo, ciérralo antes de volver a arrancar. ${texto(error)}`,
    )
  }

  return {
    cliente,
    db: drizzle(cliente),
    cerrar: () => cliente.close(),
  }
}

/**
 * Migraciones, rancho y primera cuenta, sobre la base ya abierta.
 *
 * Son las mismas funciones que `db:migrate`, `db:seed` y `cuenta:crear`.
 * Correrlo otra vez aplica solo las migraciones que falten, no crea otro
 * rancho y no crea otra cuenta. El nombre que se pasa cuando el rancho ya
 * existe no lo renombra.
 */
export async function prepararInstalacionLocal(
  db: EjecutorSql,
  opciones: {
    readonly nombreDelRancho: string
    readonly pedirCuenta: () => Promise<CuentaPedida>
  },
): Promise<PreparacionLocal> {
  await aplicarMigraciones(db as PgliteDatabase<Record<string, never>>)
  const rancho = await sembrarRancho(db, opciones.nombreDelRancho)

  const antes = await contarCuentas(db)
  if (antes > 0) {
    const existente = await primeraCuenta(db)
    return {
      ranchId: rancho.id,
      ranchoCreado: rancho.creado,
      cuentaCreada: false,
      cuentas: antes,
      cuentaId: existente?.id ?? null,
      usuario: existente?.usuario ?? null,
      rol: existente?.rol ?? null,
    }
  }

  const pedida = await opciones.pedirCuenta()
  const cuenta = await crearCuenta(db, {
    rol: ROL_DE_LA_PRIMERA_CUENTA,
    usuario: pedida.usuario,
    contrasena: pedida.contrasena,
  })
  return {
    ranchId: rancho.id,
    ranchoCreado: rancho.creado,
    cuentaCreada: true,
    cuentas: 1,
    cuentaId: cuenta.id,
    usuario: pedida.usuario.trim(),
    rol: cuenta.rol,
  }
}

/**
 * Expone la base ya abierta por el protocolo de PostgreSQL, en esta máquina.
 *
 * La aplicación sigue hablando por `pg` y `DATABASE_URL`. No hay SQL distinto
 * para el modo local. El socket no se abre a la red: a la red sale solo la
 * app. El usuario y la clave de la cadena no se comprueban; el motor embebido
 * no autentica. No son un secreto de la instalación.
 *
 * `maxConnections` por encima de uno: con el valor por omisión la segunda
 * conexión se corta. El pool de la app, en este modo, es de una conexión
 * (`DB_POOL=1`) porque el motor atiende una consulta a la vez.
 */
export async function exponerBaseLocal(cliente: PGlite): Promise<{
  readonly url: string
  cerrar(): Promise<void>
}> {
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket')
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
    cerrar: () => servidor.stop(),
  }
}

async function contarCuentas(db: EjecutorSql): Promise<number> {
  const filas = filasDe<{ total: unknown }>(
    await db.execute(sql`SELECT count(*) AS total FROM identity.account`),
  )
  return comoNumero(filas[0]?.total)
}

async function primeraCuenta(
  db: EjecutorSql,
): Promise<{ id: string; usuario: string; rol: string } | null> {
  const filas = filasDe<{ id: string; usuario: string; rol: string }>(
    await db.execute(sql`
      SELECT id, usuario, rol
      FROM identity.account
      ORDER BY created_at
      LIMIT 1
    `),
  )
  return filas[0] ?? null
}

function comoNumero(valor: unknown): number {
  if (typeof valor === 'bigint' || typeof valor === 'number') {
    return Number(valor)
  }
  if (typeof valor === 'string' && valor.trim() !== '') {
    return Number(valor)
  }
  throw new Error('No pude contar las cuentas.')
}

function texto(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
