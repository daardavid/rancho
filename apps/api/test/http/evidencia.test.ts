import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { filasDe } from '../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearPuertoDeEvidencia } from '../../src/infrastructure/evidence/puerto'
import { hashDeContrasena } from '../../src/infrastructure/identity/contrasena'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { crearGrowth } from '../../src/modules/growth'
import { crearHerd } from '../../src/modules/herd'
import { nuevoId } from '../../src/shared-kernel/ids'
import { SECRETO_DE_PRUEBA, abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO = 'propietario-foto'
const AJENO = 'ajeno-foto'
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

let db: Base
let cerrar: () => Promise<void> = async () => {}
let app: ReturnType<typeof construirApp>
let carpeta = ''
let ranchId = ''

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

async function entrar(usuario: string): Promise<string> {
  const respuesta = await app.inject({
    method: 'POST',
    url: '/api/session',
    payload: { usuario, contrasena: CONTRASENA },
  })
  expect(respuesta.statusCode).toBe(200)
  return cookieEnviada(setCookieDe(respuesta.headers))
}

describe('foto de la báscula', () => {
  beforeAll(async () => {
    const base = await abrirBaseDePruebas()
    db = base.db
    cerrar = base.cerrar
    const sembrado = await sembrarRancho(db, 'Rancho de la foto')
    ranchId = sembrado.id
    await crearCuenta(db, { rol: 'owner', usuario: USUARIO, contrasena: CONTRASENA })

    const otroRanch = nuevoId()
    const hash = await hashDeContrasena(CONTRASENA)
    await db.execute(sql`
      INSERT INTO identity.ranch (id, nombre, created_at)
      VALUES (${otroRanch}, 'Rancho ajeno', ${new Date()})
    `)
    await db.execute(sql`
      INSERT INTO identity.account (id, ranch_id, usuario, password_hash, rol, created_at)
      VALUES (${nuevoId()}, ${otroRanch}, ${AJENO}, ${hash}, 'owner', ${new Date()})
    `)

    carpeta = await mkdtemp(join(tmpdir(), 'rancho-evidencia-'))
    const evidencia = crearPuertoDeEvidencia(db, carpeta)
    const identidad = crearIdentidad(db, SECRETO_DE_PRUEBA)
    const herd = crearHerd(db)
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

  it('exige sesión para subir y para ver', async () => {
    const subida = await app.inject({
      method: 'POST',
      url: '/api/evidencia',
      headers: { 'content-type': 'application/octet-stream' },
      payload: Buffer.from(JPEG),
    })
    expect(subida.statusCode).toBe(401)

    const lectura = await app.inject({ method: 'GET', url: `/api/evidencia/${nuevoId()}` })
    expect(lectura.statusCode).toBe(401)
  })

  it('rechaza lo que no es imagen aunque el encabezado diga que sí', async () => {
    const cookie = await entrar(USUARIO)
    const respuesta = await app.inject({
      method: 'POST',
      url: '/api/evidencia',
      headers: { cookie, 'content-type': 'image/jpeg' },
      payload: Buffer.from('GIF89a no es el indicador'),
    })

    expect(respuesta.statusCode).toBe(422)
    expect(respuesta.json()).toMatchObject({
      codigo: 'foto_no_es_imagen',
      mensaje: expect.stringMatching(/JPEG, PNG o WebP/),
    })
  })

  it('sube la foto, la asocia sin cambiar la calidad y corregirla no borra los bytes', async () => {
    const cookie = await entrar(USUARIO)
    const subida = await app.inject({
      method: 'POST',
      url: '/api/evidencia',
      headers: {
        cookie,
        'content-type': 'application/octet-stream',
        'x-nombre-original': encodeURIComponent('../../nota.txt'),
      },
      payload: Buffer.from(JPEG),
    })
    expect(subida.statusCode).toBe(201)
    const fotoId = subida.json().id as string
    expect(subida.json()).toMatchObject({ id: fotoId, tipo: 'image/jpeg', tamano: JPEG.byteLength })

    const vista = await app.inject({
      method: 'GET',
      url: `/api/evidencia/${fotoId}`,
      headers: { cookie },
    })
    expect(vista.statusCode).toBe(200)
    expect(vista.headers['content-type']).toMatch(/image\/jpeg/)
    expect(Buffer.from(vista.rawPayload).equals(Buffer.from(JPEG))).toBe(true)

    const filas = filasDe<{ original_filename: string | null; sha256: string; storage_key: string }>(
      await db.execute(sql`
        SELECT original_filename, sha256, storage_key
        FROM evidence.file
        WHERE id = ${fotoId}
      `),
    )
    expect(filas[0]).toMatchObject({
      original_filename: 'nota.txt',
      sha256: createHash('sha256').update(JPEG).digest('hex'),
      storage_key: `${ranchId}/${fotoId}`,
    })
    expect(await readdir(carpeta)).toEqual([ranchId])
    expect(await readdir(join(carpeta, ranchId))).toEqual([fotoId])

    const animal = await alta(cookie)
    const sesionId = nuevoId()
    const pesoId = nuevoId()
    const registrada = await app.inject({
      method: 'POST',
      url: '/api/weighing-sessions',
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        id: sesionId,
        fecha: '2026-04-02',
        filas: [
          {
            id: pesoId,
            animalId: animal,
            resultado: 'pesado',
            kilos: '180.500',
            calidad: 'measured',
            evidenciaId: fotoId,
          },
        ],
      },
    })
    expect(registrada.statusCode).toBe(201)
    expect(registrada.json().filas[0]).toMatchObject({
      kilos: '180.500',
      calidad: 'measured',
      evidenciaId: fotoId,
    })

    const segunda = await app.inject({
      method: 'POST',
      url: '/api/evidencia',
      headers: { cookie, 'content-type': 'image/png' },
      payload: Buffer.from(PNG),
    })
    expect(segunda.statusCode).toBe(201)
    const fotoNueva = segunda.json().id as string
    expect(segunda.json().tipo).toBe('image/png')

    const corregida = await app.inject({
      method: 'POST',
      url: `/api/weights/${pesoId}/corrections`,
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        version: 1,
        motivo: 'era la foto de otro becerro',
        evidenciaId: fotoNueva,
      },
    })
    expect(corregida.statusCode).toBe(200)
    expect(corregida.json()).toMatchObject({
      kilos: '180.500',
      calidad: 'measured',
      evidenciaId: fotoNueva,
      version: 2,
    })
    expect(corregida.json().correcciones).toEqual([
      expect.objectContaining({ campo: 'evidencia', valorAnterior: fotoId }),
    ])

    const vieja = await app.inject({
      method: 'GET',
      url: `/api/evidencia/${fotoId}`,
      headers: { cookie },
    })
    expect(vieja.statusCode).toBe(200)
    expect(Buffer.from(vieja.rawPayload).equals(Buffer.from(JPEG))).toBe(true)
    expect(Buffer.from(await readFile(join(carpeta, ranchId, fotoId))).equals(Buffer.from(JPEG))).toBe(true)

    const quitada = await app.inject({
      method: 'POST',
      url: `/api/weights/${pesoId}/corrections`,
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        version: 2,
        motivo: 'la quité del peso',
        evidenciaId: null,
      },
    })
    expect(quitada.statusCode).toBe(200)
    expect(quitada.json()).toMatchObject({ calidad: 'measured', evidenciaId: null, version: 3 })

    const guardada = filasDe<{ evidence_id: string | null; quality: string }>(
      await db.execute(sql`
        SELECT evidence_id::text as evidence_id, quality
        FROM growth.weighing_line
        WHERE id = ${pesoId}
      `),
    )
    expect(guardada[0]).toEqual({ evidence_id: null, quality: 'measured' })
    expect(Buffer.from(await readFile(join(carpeta, ranchId, fotoId))).equals(Buffer.from(JPEG))).toBe(true)
    expect(Buffer.from(await readFile(join(carpeta, ranchId, fotoNueva))).equals(Buffer.from(PNG))).toBe(true)

    const cookieAjena = await entrar(AJENO)
    const ajena = await app.inject({
      method: 'GET',
      url: `/api/evidencia/${fotoId}`,
      headers: { cookie: cookieAjena },
    })
    expect(ajena.statusCode).toBe(404)
    expect(ajena.json()).toMatchObject({
      codigo: 'no_encontrado',
      mensaje: expect.stringMatching(/este rancho/),
    })
    expect(ajena.headers['content-type']).toMatch(/json/)

    const animalAjeno = await alta(cookieAjena)
    const rechazo = await app.inject({
      method: 'POST',
      url: '/api/weighing-sessions',
      headers: { cookie: cookieAjena },
      payload: {
        commandId: nuevoId(),
        id: nuevoId(),
        fecha: '2026-04-02',
        filas: [
          {
            id: nuevoId(),
            animalId: animalAjeno,
            resultado: 'pesado',
            kilos: '10.000',
            calidad: 'declared',
            evidenciaId: fotoId,
          },
        ],
      },
    })
    expect(rechazo.statusCode).toBe(422)
    expect(rechazo.json()).toEqual({ codigo: 'evidencia_ajena' })
  }, 30_000)
})

async function alta(cookie: string): Promise<string> {
  const id = nuevoId()
  const respuesta = await app.inject({
    method: 'POST',
    url: '/api/animals',
    headers: { cookie },
    payload: { commandId: nuevoId(), id },
  })
  expect(respuesta.statusCode).toBe(201)
  return id
}
