import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { filasDe } from '../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { crearGrowth } from '../../src/modules/growth'
import { crearHerd } from '../../src/modules/herd'
import { nuevoId } from '../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO = 'propietario-pesaje'

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

async function alta(cookie: string, cuerpo: Record<string, unknown> = {}): Promise<string> {
  const id = nuevoId()
  const respuesta = await app.inject({
    method: 'POST',
    url: '/api/animals',
    headers: { cookie },
    payload: { commandId: nuevoId(), id, ...cuerpo },
  })
  expect(respuesta.statusCode).toBe(201)
  return id
}

describe('pesaje por HTTP', () => {
  beforeAll(async () => {
    const base = await abrirBaseDePruebas()
    db = base.db
    cerrar = base.cerrar
    await sembrarRancho(db, 'Rancho de prueba')
    await crearCuenta(db, { rol: 'owner', usuario: USUARIO, contrasena: CONTRASENA })
    const identidad = crearIdentidad(db)
    const herd = crearHerd(db)
    app = construirApp({
      identidad,
      herd,
      growth: crearGrowth(db, herd),
      nivelDeLog: 'silent',
    })
  }, 60_000)

  afterAll(async () => {
    await app.close()
    await cerrar()
  })

  it('responde 401 en cada ruta cuando no hay sesión', async () => {
    const id = nuevoId()
    const rutas = [
      {
        method: 'POST' as const,
        url: '/api/weighing-sessions',
        payload: { commandId: nuevoId(), id, fecha: '2026-03-15', filas: [] },
      },
      { method: 'GET' as const, url: '/api/weighing-sessions/latest' },
      { method: 'GET' as const, url: `/api/weighing-sessions/${id}` },
      {
        method: 'POST' as const,
        url: `/api/weights/${id}/corrections`,
        payload: { commandId: nuevoId(), version: 1, motivo: 'no', kilos: '10.000' },
      },
      { method: 'GET' as const, url: `/api/animals/${id}/weights` },
    ]

    for (const ruta of rutas) {
      const respuesta = await app.inject(ruta)
      expect(respuesta.statusCode, ruta.url).toBe(401)
      expect(respuesta.json()).toEqual({ codigo: 'no_autenticado' })
    }
  })

  it('registra un pesado de vaca y un hueco, reintenta y rechaza otro contenido', async () => {
    const cookie = await entrar()
    const vaca = await alta(cookie, { categoria: 'cow', sexo: 'female' })
    const otro = await alta(cookie)
    const sesionId = nuevoId()
    const pesoId = nuevoId()
    const huecoId = nuevoId()
    const commandId = nuevoId()
    const payload = {
      commandId,
      id: sesionId,
      fecha: '2026-03-15',
      nota: 'paso por la manga',
      reportedBy: 'el vaquero',
      filas: [
        { id: pesoId, animalId: vaca, resultado: 'pesado', kilos: '351.125', calidad: 'measured' },
        { id: huecoId, animalId: otro, resultado: 'hueco' },
      ],
    }

    const altaSesion = await app.inject({
      method: 'POST',
      url: '/api/weighing-sessions',
      headers: { cookie },
      payload,
    })
    expect(altaSesion.statusCode).toBe(201)
    expect(altaSesion.json()).toMatchObject({
      id: sesionId,
      fecha: '2026-03-15',
      nota: 'paso por la manga',
      reportedBy: 'el vaquero',
      filas: [
        { id: pesoId, animalId: vaca, resultado: 'pesado', kilos: '351.125', calidad: 'measured', version: 1 },
        { id: huecoId, animalId: otro, resultado: 'hueco' },
      ],
    })
    expect(altaSesion.json().filas[1]).not.toHaveProperty('kilos')

    const repetida = await app.inject({
      method: 'POST',
      url: '/api/weighing-sessions',
      headers: { cookie },
      payload,
    })
    expect(repetida.statusCode).toBe(201)
    expect(repetida.json()).toEqual(altaSesion.json())

    const distinta = await app.inject({
      method: 'POST',
      url: '/api/weighing-sessions',
      headers: { cookie },
      payload: {
        ...payload,
        filas: [{ id: pesoId, animalId: vaca, resultado: 'pesado', kilos: '10.000', calidad: 'measured' }],
      },
    })
    expect(distinta.statusCode).toBe(409)
    expect(distinta.json()).toEqual({ codigo: 'idempotency_mismatch' })

    const guardado = filasDe<{ kilos: string }>(
      await db.execute(sql`SELECT kilos::text as kilos FROM growth.weighing_line WHERE id = ${pesoId}`),
    )
    expect(guardado).toEqual([{ kilos: '351.125' }])

    const ficha = await app.inject({
      method: 'GET',
      url: `/api/animals/${vaca}`,
      headers: { cookie },
    })
    expect(ficha.json()).toMatchObject({ categoria: 'cow', activo: true, version: 1 })

    const leida = await app.inject({
      method: 'GET',
      url: `/api/weighing-sessions/${sesionId}`,
      headers: { cookie },
    })
    expect(leida.statusCode).toBe(200)
    expect(leida.json()).toEqual(altaSesion.json())

    const ultima = await app.inject({
      method: 'GET',
      url: '/api/weighing-sessions/latest',
      headers: { cookie },
    })
    expect(ultima.statusCode).toBe(200)
    expect(ultima.json()).toMatchObject({ id: sesionId })

    const pesos = await app.inject({
      method: 'GET',
      url: `/api/animals/${vaca}/weights`,
      headers: { cookie },
    })
    expect(pesos.statusCode).toBe(200)
    expect(pesos.json().pesos).toEqual([
      expect.objectContaining({ id: pesoId, kilos: '351.125', calidad: 'measured', fecha: '2026-03-15' }),
    ])

    const huecos = await app.inject({
      method: 'GET',
      url: `/api/animals/${otro}/weights`,
      headers: { cookie },
    })
    expect(huecos.json()).toEqual({ animalId: otro, pesos: [] })
  })

  it('corrige el peso, conserva la fecha y rechaza la versión vieja y el hueco', async () => {
    const cookie = await entrar()
    const animalId = await alta(cookie)
    const sesionId = nuevoId()
    const pesoId = nuevoId()
    const huecoId = nuevoId()
    const segundo = await alta(cookie)
    const creada = await app.inject({
      method: 'POST',
      url: '/api/weighing-sessions',
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        id: sesionId,
        fecha: '2026-06-01',
        filas: [
          { id: pesoId, animalId, resultado: 'pesado', kilos: '351.125', calidad: 'measured' },
          { id: huecoId, animalId: segundo, resultado: 'hueco' },
        ],
      },
    })
    expect(creada.statusCode).toBe(201)

    const corregida = await app.inject({
      method: 'POST',
      url: `/api/weights/${pesoId}/corrections`,
      headers: { cookie },
      payload: { commandId: nuevoId(), version: 1, motivo: 'leí de más', kilos: '350.000' },
    })
    expect(corregida.statusCode).toBe(200)
    expect(corregida.json()).toMatchObject({
      id: pesoId,
      kilos: '350.000',
      calidad: 'measured',
      version: 2,
      fecha: '2026-06-01',
      correcciones: [expect.objectContaining({ campo: 'kilos', valorAnterior: '351.125' })],
    })

    const vieja = await app.inject({
      method: 'POST',
      url: `/api/weights/${pesoId}/corrections`,
      headers: { cookie },
      payload: { commandId: nuevoId(), version: 1, motivo: 'no', kilos: '1.000' },
    })
    expect(vieja.statusCode).toBe(409)
    expect(vieja.json()).toEqual({ codigo: 'version_conflict' })

    const hueco = await app.inject({
      method: 'POST',
      url: `/api/weights/${huecoId}/corrections`,
      headers: { cookie },
      payload: { commandId: nuevoId(), version: 1, motivo: 'no es peso', calidad: 'declared' },
    })
    expect(hueco.statusCode).toBe(422)
    expect(hueco.json()).toEqual({ codigo: 'no_es_peso' })

    const fecha = filasDe<{ fecha: string }>(
      await db.execute(
        sql`SELECT weighed_on::text as fecha FROM growth.weighing_session WHERE id = ${sesionId}`,
      ),
    )
    expect(fecha).toEqual([{ fecha: '2026-06-01' }])
  })

  it('rechaza kilos que no son texto de peso, un animal repetido y uno que no está', async () => {
    const cookie = await entrar()
    const animalId = await alta(cookie)
    const sesionRepetida = nuevoId()
    const repetido = await app.inject({
      method: 'POST',
      url: '/api/weighing-sessions',
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        id: sesionRepetida,
        fecha: '2026-06-02',
        filas: [
          { id: nuevoId(), animalId, resultado: 'pesado', kilos: '10.000', calidad: 'measured' },
          { id: nuevoId(), animalId, resultado: 'hueco' },
        ],
      },
    })
    expect(repetido.statusCode).toBe(422)
    expect(repetido.json()).toEqual({ codigo: 'animal_repetido' })

    const ausente = await app.inject({
      method: 'POST',
      url: '/api/weighing-sessions',
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        id: nuevoId(),
        fecha: '2026-06-02',
        filas: [{ id: nuevoId(), animalId: nuevoId(), resultado: 'hueco' }],
      },
    })
    expect(ausente.statusCode).toBe(422)
    expect(ausente.json()).toEqual({ codigo: 'animal_ausente' })

    const ceros = await app.inject({
      method: 'POST',
      url: '/api/weighing-sessions',
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        id: nuevoId(),
        fecha: '2026-06-02',
        filas: [{ id: nuevoId(), animalId, resultado: 'pesado', kilos: '0', calidad: 'measured' }],
      },
    })
    expect(ceros.statusCode).toBe(400)
    expect(ceros.json()).toEqual({ codigo: 'cuerpo_invalido' })

    const cientifico = await app.inject({
      method: 'POST',
      url: '/api/weighing-sessions',
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        id: nuevoId(),
        fecha: '2026-06-02',
        filas: [{ id: nuevoId(), animalId, resultado: 'pesado', kilos: '1e3', calidad: 'measured' }],
      },
    })
    expect(cientifico.statusCode).toBe(400)

    const numero = await app.inject({
      method: 'POST',
      url: '/api/weighing-sessions',
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        id: nuevoId(),
        fecha: '2026-06-02',
        filas: [{ id: nuevoId(), animalId, resultado: 'pesado', kilos: 351.125, calidad: 'measured' }],
      },
    })
    expect(numero.statusCode).toBe(400)

    const quedan = filasDe(
      await db.execute(sql`SELECT id FROM growth.weighing_session WHERE id = ${sesionRepetida}`),
    )
    expect(quedan).toEqual([])
  })
})
