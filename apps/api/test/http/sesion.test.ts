import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { RecordedBy } from '../../src/shared-kernel/actores'
import { exigirRol } from '../../src/http/guardia'
import { NOMBRE_COOKIE_DE_SESION } from '../../src/http/cookie'
import { construirApp } from '../../src/http/app'
import { filasDe } from '../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearCuenta, type CuentaCreada } from '../../src/infrastructure/identity/cuentas'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { MAX_INTENTOS_FALLIDOS, VENTANA_DE_INTENTOS_MS } from '../../src/infrastructure/identity/parametros'
import { huellaDeToken } from '../../src/infrastructure/identity/tokens'
import { nuevoId } from '../../src/shared-kernel/ids'
import { SECRETO_DE_PRUEBA, abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO_OWNER = 'propietario-prueba'
const USUARIO_SUPPORT = 'soporte-prueba'
const USUARIO_BLOQUEO = 'bloqueo-prueba'
const USUARIO_VENTANA = 'ventana-prueba'

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

let db: Base
let cerrar: () => Promise<void> = async () => {}
let app: ReturnType<typeof construirApp>
let owner: CuentaCreada
let support: CuentaCreada
let ranchId = ''
let ultimoRecordedBy: RecordedBy | undefined
let soloSoporteCorrio = false

function comando(entrada: { recordedBy: RecordedBy }): { recordedBy: string } {
  ultimoRecordedBy = entrada.recordedBy
  return { recordedBy: entrada.recordedBy }
}

function cookieEnviada(setCookie: string): { cookie: string; token: string } {
  const par = (setCookie.split(';')[0] ?? '').trim()
  const separador = par.indexOf('=')
  return { cookie: par, token: par.slice(separador + 1) }
}

function setCookieDe(headers: Record<string, unknown>): string {
  const cruda = headers['set-cookie']
  const texto = Array.isArray(cruda) ? cruda[0] : cruda
  if (typeof texto !== 'string') {
    throw new Error('La respuesta no trajo la cookie de sesión.')
  }
  return texto
}

async function entrar(usuario: string, contrasena = CONTRASENA) {
  return app.inject({
    method: 'POST',
    url: '/api/session',
    payload: { usuario, contrasena },
  })
}

describe('sesión', () => {
  beforeAll(async () => {
    const base = await abrirBaseDePruebas()
    db = base.db
    cerrar = base.cerrar
    const sembrado = await sembrarRancho(db, 'Rancho de prueba')
    ranchId = sembrado.id
    owner = await crearCuenta(db, { rol: 'owner', usuario: USUARIO_OWNER, contrasena: CONTRASENA })
    support = await crearCuenta(db, {
      rol: 'support',
      usuario: USUARIO_SUPPORT,
      contrasena: CONTRASENA,
    })
    await crearCuenta(db, { rol: 'owner', usuario: USUARIO_BLOQUEO, contrasena: CONTRASENA })
    await crearCuenta(db, { rol: 'support', usuario: USUARIO_VENTANA, contrasena: CONTRASENA })

    app = construirApp({ identidad: crearIdentidad(db, SECRETO_DE_PRUEBA), nivelDeLog: 'silent' })
    app.post(
      '/api/prueba/hecho',
      { preHandler: exigirRol(['owner', 'support']) },
      async (peticion) => {
        const sesion = peticion.sesionActiva
        if (sesion === null) {
          throw new Error('La guardia dejó pasar un comando sin sesión.')
        }
        return comando({ recordedBy: sesion.recordedBy })
      },
    )
    app.post(
      '/api/prueba/solo-soporte',
      { preHandler: exigirRol(['support']) },
      async () => {
        soloSoporteCorrio = true
        return { ok: true }
      },
    )
  }, 60_000)

  afterAll(async () => {
    await app.close()
    await cerrar()
  })

  it('sin sesión, una ruta protegida responde 401 y el comando no corre', async () => {
    ultimoRecordedBy = undefined
    const respuesta = await app.inject({ method: 'POST', url: '/api/prueba/hecho' })

    expect(respuesta.statusCode).toBe(401)
    expect(respuesta.json()).toEqual({ codigo: 'no_autenticado' })
    expect(ultimoRecordedBy).toBeUndefined()
  })

  it('con un rol que la ruta no admite responde 403 y no corre el comando', async () => {
    soloSoporteCorrio = false
    const entrada = await entrar(USUARIO_OWNER)
    expect(entrada.statusCode).toBe(200)
    const { cookie } = cookieEnviada(setCookieDe(entrada.headers))

    const respuesta = await app.inject({
      method: 'POST',
      url: '/api/prueba/solo-soporte',
      headers: { cookie },
    })

    expect(respuesta.statusCode).toBe(403)
    expect(respuesta.json()).toEqual({ codigo: 'prohibido' })
    expect(soloSoporteCorrio).toBe(false)
  })

  it('con owner el comando recibe RecordedBy de esa cuenta y la sesión lleva el rancho sembrado', async () => {
    ultimoRecordedBy = undefined
    const entrada = await entrar(USUARIO_OWNER)
    expect(entrada.statusCode).toBe(200)
    expect(entrada.json()).toEqual({ cuentaId: owner.id, rol: 'owner', ranchId })
    expect(entrada.headers['cache-control']).toBe('no-store')

    const cruda = setCookieDe(entrada.headers)
    const atributos = cruda.split(';').slice(1).join(';')
    expect(atributos).toContain('HttpOnly')
    expect(atributos).toContain('SameSite=Lax')
    expect(atributos).not.toContain('Secure')
    const { cookie, token } = cookieEnviada(cruda)
    expect(entrada.json()).not.toHaveProperty('contrasena')
    expect(token).not.toBe('')

    const filas = filasDe<{ ranch_id: string; rol: string; account_id: string; token_hash: string }>(
      await db.execute(sql`
        SELECT ranch_id, rol, account_id, token_hash
        FROM identity.session
        WHERE token_hash = ${huellaDeToken(token, SECRETO_DE_PRUEBA)}
      `),
    )
    expect(filas).toEqual([
      { ranch_id: ranchId, rol: 'owner', account_id: owner.id, token_hash: huellaDeToken(token, SECRETO_DE_PRUEBA) },
    ])
    expect(filas[0]?.token_hash).not.toBe(token)

    const hecho = await app.inject({
      method: 'POST',
      url: '/api/prueba/hecho',
      headers: { cookie },
    })
    expect(hecho.statusCode).toBe(200)
    expect(hecho.json()).toEqual({ recordedBy: owner.id })
    expect(ultimoRecordedBy).toBe(owner.id)

    const quien = await app.inject({ method: 'GET', url: '/api/session', headers: { cookie } })
    expect(quien.statusCode).toBe(200)
    expect(quien.json()).toEqual({ cuentaId: owner.id, rol: 'owner', ranchId })
  })

  it('con support el comando recibe la cuenta de support, no la del propietario', async () => {
    const entrada = await entrar(USUARIO_SUPPORT)
    const { cookie } = cookieEnviada(setCookieDe(entrada.headers))
    const hecho = await app.inject({
      method: 'POST',
      url: '/api/prueba/hecho',
      headers: { cookie },
    })

    expect(hecho.statusCode).toBe(200)
    expect(hecho.json()).toEqual({ recordedBy: support.id })
    expect(support.id).not.toBe(owner.id)
  })

  it('cerrar sesión borra la fila y la cookie deja de servir', async () => {
    const entrada = await entrar(USUARIO_OWNER)
    const { cookie, token } = cookieEnviada(setCookieDe(entrada.headers))
    const huella = huellaDeToken(token, SECRETO_DE_PRUEBA)

    const cierre = await app.inject({
      method: 'DELETE',
      url: '/api/session',
      headers: { cookie },
    })
    expect(cierre.statusCode).toBe(204)
    const limpieza = setCookieDe(cierre.headers)
    expect(limpieza).toContain('Max-Age=0')
    expect(limpieza).toContain('HttpOnly')

    const filas = filasDe<{ id: string }>(
      await db.execute(sql`SELECT id FROM identity.session WHERE token_hash = ${huella}`),
    )
    expect(filas).toEqual([])

    const quien = await app.inject({ method: 'GET', url: '/api/session', headers: { cookie } })
    expect(quien.statusCode).toBe(401)
    const hecho = await app.inject({
      method: 'POST',
      url: '/api/prueba/hecho',
      headers: { cookie },
    })
    expect(hecho.statusCode).toBe(401)
  })

  it('una sesión vencida no autentica y la fila se descarta', async () => {
    const token = 'token-vencido-de-prueba'
    await db.execute(sql`
      INSERT INTO identity.session (
        id, account_id, ranch_id, rol, token_hash, expires_at, created_at
      )
      VALUES (
        ${nuevoId()},
        ${owner.id},
        ${ranchId},
        'owner',
        ${huellaDeToken(token, SECRETO_DE_PRUEBA)},
        ${new Date(Date.now() - 1000)},
        ${new Date(Date.now() - 2000)}
      )
    `)

    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/session',
      headers: { cookie: `${NOMBRE_COOKIE_DE_SESION}=${token}` },
    })
    expect(respuesta.statusCode).toBe(401)

    const filas = filasDe<{ id: string }>(
      await db.execute(sql`
        SELECT id FROM identity.session WHERE token_hash = ${huellaDeToken(token, SECRETO_DE_PRUEBA)}
      `),
    )
    expect(filas).toEqual([])
  })

  it('el cliente no puede mandar el rancho', async () => {
    const respuesta = await app.inject({
      method: 'POST',
      url: '/api/session',
      payload: { usuario: USUARIO_OWNER, contrasena: CONTRASENA, ranchId },
    })

    expect(respuesta.statusCode).toBe(400)
    expect(respuesta.json()).toEqual({ codigo: 'cuerpo_invalido' })
  })

  it('una contraseña mal puesta y un usuario que no existe responden igual', async () => {
    const mala = await entrar(USUARIO_OWNER, 'no-es-la-contrasena')
    const desconocido = await entrar('nadie-de-prueba', 'no-es-la-contrasena')

    expect(mala.statusCode).toBe(401)
    expect(desconocido.statusCode).toBe(401)
    expect(mala.json()).toEqual({ codigo: 'credenciales_invalidas' })
    expect(desconocido.json()).toEqual(mala.json())
    expect(mala.headers['set-cookie']).toBeUndefined()
  })

  it('después de varios intentos fallidos rechaza aunque la contraseña sea la buena', async () => {
    for (let intento = 0; intento < MAX_INTENTOS_FALLIDOS; intento += 1) {
      await db.execute(sql`
        INSERT INTO identity.login_attempt (id, usuario, occurred_at)
        VALUES (${nuevoId()}, ${USUARIO_BLOQUEO}, ${new Date()})
      `)
    }

    const respuesta = await entrar(USUARIO_BLOQUEO)
    expect(respuesta.statusCode).toBe(429)
    expect(respuesta.json()).toEqual({ codigo: 'demasiados_intentos' })
  })

  it('los intentos viejos no cuentan y un ingreso bueno los olvida', async () => {
    const viejo = new Date(Date.now() - VENTANA_DE_INTENTOS_MS - 60_000)
    for (let intento = 0; intento < MAX_INTENTOS_FALLIDOS; intento += 1) {
      await db.execute(sql`
        INSERT INTO identity.login_attempt (id, usuario, occurred_at)
        VALUES (${nuevoId()}, ${USUARIO_VENTANA}, ${viejo})
      `)
    }

    const respuesta = await entrar(USUARIO_VENTANA)
    expect(respuesta.statusCode).toBe(200)

    const quedan = filasDe<{ id: string }>(
      await db.execute(sql`
        SELECT id FROM identity.login_attempt WHERE usuario = ${USUARIO_VENTANA}
      `),
    )
    expect(quedan).toEqual([])
  })

  it('en producción la cookie es HttpOnly, Secure y SameSite=Lax', async () => {
    const publicada = construirApp({
      identidad: crearIdentidad(db, SECRETO_DE_PRUEBA),
      nivelDeLog: 'silent',
      produccion: true,
    })
    try {
      const respuesta = await publicada.inject({
        method: 'POST',
        url: '/api/session',
        payload: { usuario: USUARIO_OWNER, contrasena: CONTRASENA },
      })
      const cruda = setCookieDe(respuesta.headers)
      const atributos = cruda.split(';').slice(1).join(';')
      expect(atributos).toContain('HttpOnly')
      expect(atributos).toContain('Secure')
      expect(atributos).toContain('SameSite=Lax')

      const { cookie } = cookieEnviada(cruda)
      const quien = await publicada.inject({
        method: 'GET',
        url: '/api/session',
        headers: { cookie },
      })
      expect(quien.statusCode).toBe(200)
    } finally {
      await publicada.close()
    }
  })
})
