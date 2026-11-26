import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { filasDe } from '../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { TAMANO_MAXIMO_DE_FOTO } from '../../src/infrastructure/evidence/imagen'
import { crearPuertoDeEvidencia } from '../../src/infrastructure/evidence/puerto'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { crearGrowth } from '../../src/modules/growth'
import { crearHerd } from '../../src/modules/herd'
import { nuevoId } from '../../src/shared-kernel/ids'
import { SECRETO_DE_PRUEBA, abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO = 'propietario-retrato'
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

let db: Base
let cerrar: () => Promise<void> = async () => {}
let app: ReturnType<typeof construirApp>
let carpeta = ''

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

async function alta(cookie: string, nombre: string | null = null): Promise<string> {
  const id = nuevoId()
  const respuesta = await app.inject({
    method: 'POST',
    url: '/api/animals',
    headers: { cookie },
    payload: {
      commandId: nuevoId(),
      id,
      ...(nombre === null ? {} : { nombre }),
    },
  })
  expect(respuesta.statusCode).toBe(201)
  return id
}

async function subir(cookie: string, bytes: Uint8Array): Promise<string> {
  const respuesta = await app.inject({
    method: 'POST',
    url: '/api/evidencia',
    headers: { cookie, 'content-type': 'application/octet-stream' },
    payload: Buffer.from(bytes),
  })
  expect(respuesta.statusCode).toBe(201)
  return respuesta.json().id as string
}

describe('foto de cada animal', () => {
  beforeAll(async () => {
    const base = await abrirBaseDePruebas()
    db = base.db
    cerrar = base.cerrar
    await sembrarRancho(db, 'Rancho del retrato')
    await crearCuenta(db, { rol: 'owner', usuario: USUARIO, contrasena: CONTRASENA })

    carpeta = await mkdtemp(join(tmpdir(), 'rancho-foto-animal-'))
    const evidencia = crearPuertoDeEvidencia(db, carpeta)
    const identidad = crearIdentidad(db, SECRETO_DE_PRUEBA)
    const herd = crearHerd(db, evidencia)
    app = construirApp({
      identidad,
      herd,
      growth: crearGrowth(db, herd, evidencia),
      evidencia,
      nivelDeLog: 'silent',
    })
  }, 60_000)

  afterAll(async () => {
    await app.close()
    await cerrar()
    await rm(carpeta, { recursive: true, force: true })
  }, 30_000)

  it('rechaza subir y poner la foto sin sesión', async () => {
    const subida = await app.inject({
      method: 'POST',
      url: '/api/evidencia',
      headers: { 'content-type': 'application/octet-stream' },
      payload: Buffer.from(JPEG),
    })
    expect(subida.statusCode).toBe(401)

    const puesta = await app.inject({
      method: 'POST',
      url: `/api/animals/${nuevoId()}/photo`,
      payload: {
        commandId: nuevoId(),
        version: 0,
        evidenciaId: nuevoId(),
        miniaturaId: nuevoId(),
      },
    })
    expect(puesta.statusCode).toBe(401)
  })

  it('rechaza un tipo que no es foto', async () => {
    const cookie = await entrar()
    const respuesta = await app.inject({
      method: 'POST',
      url: '/api/evidencia',
      headers: { cookie, 'content-type': 'image/jpeg' },
      payload: Buffer.from('esto no es una foto'),
    })
    expect(respuesta.statusCode).toBe(422)
    expect(respuesta.json()).toMatchObject({ codigo: 'foto_no_es_imagen' })
  })

  it('rechaza una foto más grande que el tope', async () => {
    const cookie = await entrar()
    const respuesta = await app.inject({
      method: 'POST',
      url: '/api/evidencia',
      headers: { cookie, 'content-type': 'application/octet-stream' },
      payload: cuerpoMayorAlTope(),
    })
    expect(respuesta.statusCode).toBe(413)
    expect(respuesta.json()).toMatchObject({ codigo: 'foto_demasiado_grande' })
  }, 30_000)

  it('sube la foto, la cambia y deja la anterior en la historia', async () => {
    const cookie = await entrar()
    const animalId = await alta(cookie, 'Canelo de prueba')
    const antes = await app.inject({
      method: 'GET',
      url: `/api/animals/${animalId}`,
      headers: { cookie },
    })
    expect(antes.json()).toMatchObject({
      nombre: 'Canelo de prueba',
      sexo: 'unknown',
      categoria: 'unknown',
      version: 1,
      foto: null,
    })

    const evidenciaId = await subir(cookie, JPEG)
    const miniaturaId = await subir(cookie, PNG)
    const commandId = nuevoId()
    const puesta = await app.inject({
      method: 'POST',
      url: `/api/animals/${animalId}/photo`,
      headers: { cookie },
      payload: { commandId, version: 0, evidenciaId, miniaturaId },
    })
    expect(puesta.statusCode).toBe(200)
    expect(puesta.json()).toEqual({
      animalId,
      foto: { evidenciaId, miniaturaId, version: 1 },
      anterior: null,
    })

    const repetida = await app.inject({
      method: 'POST',
      url: `/api/animals/${animalId}/photo`,
      headers: { cookie },
      payload: { commandId, version: 0, evidenciaId, miniaturaId },
    })
    expect(repetida.statusCode).toBe(200)
    expect(repetida.json()).toEqual(puesta.json())

    const otra = await subir(cookie, JPEG)
    const otraMini = await subir(cookie, PNG)
    const cambiada = await app.inject({
      method: 'POST',
      url: `/api/animals/${animalId}/photo`,
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        version: 1,
        evidenciaId: otra,
        miniaturaId: otraMini,
      },
    })
    expect(cambiada.statusCode).toBe(200)
    expect(cambiada.json()).toEqual({
      animalId,
      foto: { evidenciaId: otra, miniaturaId: otraMini, version: 2 },
      anterior: { evidenciaId, miniaturaId, version: 1 },
    })

    const vieja = await app.inject({
      method: 'GET',
      url: `/api/evidencia/${evidenciaId}`,
      headers: { cookie },
    })
    expect(vieja.statusCode).toBe(200)
    expect(Buffer.from(vieja.rawPayload).equals(Buffer.from(JPEG))).toBe(true)

    const ficha = await app.inject({
      method: 'GET',
      url: `/api/animals/${animalId}`,
      headers: { cookie },
    })
    expect(ficha.statusCode).toBe(200)
    expect(ficha.json()).toMatchObject({
      nombre: 'Canelo de prueba',
      sexo: 'unknown',
      categoria: 'unknown',
      version: 1,
      foto: { evidenciaId: otra, miniaturaId: otraMini, version: 2 },
    })

    const lista = await app.inject({
      method: 'GET',
      url: '/api/animals',
      headers: { cookie },
    })
    const enLaLista = (lista.json().animales as { id: string; foto: unknown }[]).find(
      (animal) => animal.id === animalId,
    )
    expect(enLaLista?.foto).toEqual({
      evidenciaId: otra,
      miniaturaId: otraMini,
      version: 2,
    })

    const filas = filasDe<{ evidence_id: string; version: number }>(
      await db.execute(sql`
        SELECT evidence_id, version
        FROM herd.animal_photo
        WHERE animal_id = ${animalId}
        ORDER BY version
      `),
    )
    expect(filas.map((fila) => fila.evidence_id)).toEqual([evidenciaId, otra])

    const conflicto = await app.inject({
      method: 'POST',
      url: `/api/animals/${animalId}/photo`,
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        version: 0,
        evidenciaId: await subir(cookie, JPEG),
        miniaturaId: await subir(cookie, PNG),
      },
    })
    expect(conflicto.statusCode).toBe(409)
    expect(conflicto.json()).toEqual({ codigo: 'version_conflict' })
    expect(ficha.json().version).toBe(1)
  })
})

function cuerpoMayorAlTope(): Readable {
  const total = TAMANO_MAXIMO_DE_FOTO + 1
  const trozo = 1024 * 1024
  let enviado = 0
  return new Readable({
    read() {
      if (enviado >= total) {
        this.push(null)
        return
      }
      const n = Math.min(trozo, total - enviado)
      enviado += n
      this.push(Buffer.alloc(n, 0xff))
    },
  })
}
