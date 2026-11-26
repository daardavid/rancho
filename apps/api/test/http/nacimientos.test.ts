import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { filasDe } from '../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { crearHerd } from '../../src/modules/herd'
import { nuevoId } from '../../src/shared-kernel/ids'
import { SECRETO_DE_PRUEBA, abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO = 'propietario-nacimiento'
const desconocido = { certeza: 'unknown', animalId: null, motivo: null }

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

let db: Base
let cerrar: () => Promise<void> = async () => {}
let app: ReturnType<typeof construirApp>

function cookieEnviada(setCookie: string): string {
  return (setCookie.split(';')[0] ?? '').trim()
}

function setCookieDe(headers: Record<string, unknown>): string {
  const cruda = headers['set-cookie']
  const texto = Array.isArray(cruda) ? cruda[0] : cruda
  if (typeof texto !== 'string') {
    throw new Error('La respuesta no trajo la cookie de sesión.')
  }
  return texto
}

async function entrar(): Promise<string> {
  const respuesta = await app.inject({
    method: 'POST',
    url: '/api/session',
    payload: { usuario: USUARIO, contrasena: CONTRASENA },
  })
  expect(respuesta.statusCode).toBe(200)
  return cookieEnviada(setCookieDe(respuesta.headers))
}

describe('nacimiento por HTTP', () => {
  beforeAll(async () => {
    const base = await abrirBaseDePruebas()
    db = base.db
    cerrar = base.cerrar
    await sembrarRancho(db, 'Rancho de prueba')
    await crearCuenta(db, { rol: 'owner', usuario: USUARIO, contrasena: CONTRASENA })
    app = construirApp({
      identidad: crearIdentidad(db, SECRETO_DE_PRUEBA),
      herd: crearHerd(db),
      nivelDeLog: 'silent',
    })
  }, 60_000)

  afterAll(async () => {
    await app.close()
    await cerrar()
  })

  it('responde 401 sin sesión y no guarda la cría', async () => {
    const criaId = nuevoId()
    const rutas = [
      { method: 'POST' as const, url: '/api/births', payload: cuerpo(criaId) },
      {
        method: 'POST' as const,
        url: `/api/animals/${criaId}/parentage/corrections`,
        payload: {
          commandId: nuevoId(),
          version: 1,
          motivo: 'no',
          fechaNacimiento: null,
          precisionFecha: null,
          madre: desconocido,
          padre: desconocido,
          nota: null,
        },
      },
      { method: 'GET' as const, url: `/api/animals/${criaId}/family` },
    ]

    for (const ruta of rutas) {
      const respuesta = await app.inject(ruta)
      expect(respuesta.statusCode, ruta.url).toBe(401)
      expect(respuesta.json()).toEqual({ codigo: 'no_autenticado' })
    }

    const filas = filasDe(await db.execute(sql`SELECT id FROM herd.animal WHERE id = ${criaId}`))
    expect(filas).toEqual([])
  })

  it('registra el nacimiento, no lo duplica y la corrección no toca la ficha', async () => {
    const cookie = await entrar()
    const madreId = nuevoId()
    const alta = await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        id: madreId,
        nombre: 'Vaca HTTP',
        sexo: 'female',
        categoria: 'cow',
        tenencia: 'ranch',
      },
    })
    expect(alta.statusCode).toBe(201)

    const criaId = nuevoId()
    const commandId = nuevoId()
    const payload = cuerpo(criaId, commandId, {
      sexo: 'female',
      tenencia: 'ranch',
      fechaNacimiento: '2026-05-01',
      precisionFecha: 'approximate',
      madre: { certeza: 'observed', animalId: madreId, motivo: null },
    })

    const nacimiento = await app.inject({
      method: 'POST',
      url: '/api/births',
      headers: { cookie },
      payload,
    })
    expect(nacimiento.statusCode).toBe(201)
    expect(nacimiento.json()).toMatchObject({
      animal: { id: criaId, categoria: 'calf', sexo: 'female', tenencia: 'ranch', version: 1 },
      filiacion: {
        criaId,
        fechaNacimiento: '2026-05-01',
        precisionFecha: 'approximate',
        madre: { certeza: 'observed', animalId: madreId },
        padre: desconocido,
      },
    })

    const reintento = await app.inject({
      method: 'POST',
      url: '/api/births',
      headers: { cookie },
      payload,
    })
    expect(reintento.statusCode).toBe(201)
    expect(reintento.json()).toEqual(nacimiento.json())

    const distinto = await app.inject({
      method: 'POST',
      url: '/api/births',
      headers: { cookie },
      payload: { ...payload, sexo: 'male' },
    })
    expect(distinto.statusCode).toBe(409)
    expect(distinto.json()).toEqual({ codigo: 'idempotency_mismatch' })

    const filas = filasDe(await db.execute(sql`SELECT id FROM herd.animal WHERE id = ${criaId}`))
    expect(filas).toHaveLength(1)

    const correccion = await app.inject({
      method: 'POST',
      url: `/api/animals/${criaId}/parentage/corrections`,
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        version: 1,
        motivo: 'faltaba la nota del parto',
        fechaNacimiento: '2026-05-01',
        precisionFecha: 'approximate',
        madre: { certeza: 'observed', animalId: madreId, motivo: null },
        padre: desconocido,
        nota: 'parto visto en el corral',
      },
    })
    expect(correccion.statusCode).toBe(200)
    expect(correccion.json()).toMatchObject({
      version: 2,
      nota: 'parto visto en el corral',
      correcciones: [{ nota: null, motivo: 'faltaba la nota del parto' }],
    })

    const ficha = await app.inject({
      method: 'GET',
      url: `/api/animals/${criaId}`,
      headers: { cookie },
    })
    expect(ficha.statusCode).toBe(200)
    expect(ficha.json()).toMatchObject({
      nombre: null,
      version: 1,
      categoria: 'calf',
      correcciones: [],
    })

    const familia = await app.inject({
      method: 'GET',
      url: `/api/animals/${madreId}/family`,
      headers: { cookie },
    })
    expect(familia.statusCode).toBe(200)
    expect(familia.json()).toMatchObject({
      filiacion: null,
      crias: [{ animal: { id: criaId }, como: 'madre', certeza: 'observed' }],
    })
  })

  it('lo mínimo queda en desconocido: sin sexo, tenencia ni certeza elegidos', async () => {
    const cookie = await entrar()
    const criaId = nuevoId()
    const nacimiento = await app.inject({
      method: 'POST',
      url: '/api/births',
      headers: { cookie },
      payload: cuerpo(criaId),
    })
    expect(nacimiento.statusCode).toBe(201)
    expect(nacimiento.json()).toMatchObject({
      animal: { id: criaId, sexo: 'unknown', tenencia: 'unknown' },
      filiacion: {
        criaId,
        fechaNacimiento: null,
        precisionFecha: null,
        madre: desconocido,
        padre: desconocido,
      },
    })

    const ficha = await app.inject({
      method: 'GET',
      url: `/api/animals/${criaId}`,
      headers: { cookie },
    })
    expect(ficha.statusCode).toBe(200)
    expect(ficha.json()).toMatchObject({ sexo: 'unknown', tenencia: 'unknown' })

    const familia = await app.inject({
      method: 'GET',
      url: `/api/animals/${criaId}/family`,
      headers: { cookie },
    })
    expect(familia.statusCode).toBe(200)
    expect(familia.json()).toMatchObject({
      filiacion: { madre: desconocido, padre: desconocido },
    })
  })

  it('una madre señalada sin certeza elegida no crea la cría ni la filiación', async () => {
    const cookie = await entrar()
    const madreId = nuevoId()
    const madres = [
      { certeza: 'unknown', animalId: madreId, motivo: null },
      { animalId: madreId, motivo: null },
    ]

    for (const madre of madres) {
      const criaId = nuevoId()
      const respuesta = await app.inject({
        method: 'POST',
        url: '/api/births',
        headers: { cookie },
        payload: { ...cuerpo(criaId), madre },
      })
      expect(respuesta.statusCode).toBe(400)
      expect(respuesta.json()).toEqual({ codigo: 'cuerpo_invalido' })

      const animales = filasDe(await db.execute(sql`SELECT id FROM herd.animal WHERE id = ${criaId}`))
      expect(animales).toEqual([])
      const filiaciones = filasDe(
        await db.execute(sql`SELECT id FROM herd.parentage_record WHERE offspring_id = ${criaId}`),
      )
      expect(filiaciones).toEqual([])
    }
  })

  it('rechaza único toro marcado como observado', async () => {
    const cookie = await entrar()
    const respuesta = await app.inject({
      method: 'POST',
      url: '/api/births',
      headers: { cookie },
      payload: cuerpo(nuevoId(), nuevoId(), {
        padre: { certeza: 'observed', animalId: nuevoId(), motivo: 'unico_toro' },
      }),
    })
    expect(respuesta.statusCode).toBe(400)
    expect(respuesta.json()).toEqual({ codigo: 'cuerpo_invalido' })
  })
})

function cuerpo(
  criaId: string,
  commandId: string = nuevoId(),
  extra: Record<string, unknown> = {},
) {
  return {
    commandId,
    id: criaId,
    filiacionId: nuevoId(),
    fechaNacimiento: null,
    precisionFecha: null,
    madre: desconocido,
    padre: desconocido,
    ...extra,
  }
}
