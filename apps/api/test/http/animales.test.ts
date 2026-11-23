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
const USUARIO = 'propietario-ficha'

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

describe('ficha por HTTP', () => {
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

  it('responde 401 en cada ruta cuando no hay sesión y no guarda la ficha', async () => {
    const animalId = nuevoId()
    const marcaId = nuevoId()
    const rutas = [
      { method: 'POST' as const, url: '/api/animals', payload: { commandId: nuevoId(), id: animalId } },
      {
        method: 'POST' as const,
        url: `/api/animals/${animalId}/corrections`,
        payload: { commandId: nuevoId(), version: 1, motivo: 'no' },
      },
      {
        method: 'POST' as const,
        url: `/api/animals/${animalId}/marks`,
        payload: { commandId: nuevoId(), marcaId, tipo: 'other', valor: 'seña' },
      },
      {
        method: 'POST' as const,
        url: `/api/animals/${animalId}/marks/${marcaId}/replace`,
        payload: { commandId: nuevoId(), marcaId: nuevoId(), tipo: 'other', valor: 'otra' },
      },
      {
        method: 'POST' as const,
        url: `/api/animals/${animalId}/marks/${marcaId}/lost`,
        payload: { commandId: nuevoId() },
      },
      { method: 'GET' as const, url: '/api/animals' },
      { method: 'GET' as const, url: '/api/animals?mark=PRUEBA' },
      { method: 'GET' as const, url: `/api/animals/${animalId}` },
    ]

    for (const ruta of rutas) {
      const respuesta = await app.inject(ruta)
      expect(respuesta.statusCode, ruta.url).toBe(401)
      expect(respuesta.json()).toEqual({ codigo: 'no_autenticado' })
    }

    const filas = filasDe(await db.execute(sql`SELECT id FROM herd.animal WHERE id = ${animalId}`))
    expect(filas).toEqual([])
  })

  it('registra, corrige, marca y encuentra por el arete anterior', async () => {
    const cookie = await entrar()
    const animalId = nuevoId()
    const commandId = nuevoId()
    const alta = await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: { cookie },
      payload: { commandId, id: animalId, tenencia: 'a_la_parte' },
    })
    expect(alta.statusCode).toBe(201)
    expect(alta.json()).toMatchObject({
      id: animalId,
      tenencia: 'a_la_parte',
      participacionEconomica: 'unknown',
      sexo: 'unknown',
      categoria: 'unknown',
      activo: true,
      version: 1,
      marcas: [],
    })
    expect(alta.json()).not.toHaveProperty('porcentaje')

    const repetida = await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: { cookie },
      payload: { commandId, id: animalId, tenencia: 'a_la_parte' },
    })
    expect(repetida.statusCode).toBe(201)
    expect(repetida.json()).toEqual(alta.json())

    const distinta = await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: { cookie },
      payload: { commandId, id: animalId, tenencia: 'ranch' },
    })
    expect(distinta.statusCode).toBe(409)
    expect(distinta.json()).toEqual({ codigo: 'idempotency_mismatch' })

    const conPorcentaje = await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: { cookie },
      payload: { commandId: nuevoId(), id: nuevoId(), tenencia: 'a_la_parte', porcentaje: 50 },
    })
    expect(conPorcentaje.statusCode).toBe(400)
    expect(conPorcentaje.json()).toEqual({ codigo: 'cuerpo_invalido' })

    const correccion = await app.inject({
      method: 'POST',
      url: `/api/animals/${animalId}/corrections`,
      headers: { cookie },
      payload: { commandId: nuevoId(), version: 1, motivo: 'tenía seña', nombre: 'Seña de prueba' },
    })
    expect(correccion.statusCode).toBe(200)
    expect(correccion.json()).toMatchObject({ nombre: 'Seña de prueba', version: 2 })

    const vieja = await app.inject({
      method: 'POST',
      url: `/api/animals/${animalId}/corrections`,
      headers: { cookie },
      payload: { commandId: nuevoId(), version: 1, motivo: 'no debe', nombre: 'No debe quedar' },
    })
    expect(vieja.statusCode).toBe(409)
    expect(vieja.json()).toEqual({ codigo: 'version_conflict' })

    const marcaId = nuevoId()
    const marca = await app.inject({
      method: 'POST',
      url: `/api/animals/${animalId}/marks`,
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        marcaId,
        tipo: 'siniiga',
        valor: 'PRUEBA-ARETE-VIEJO',
        desde: '2026-01-15',
      },
    })
    expect(marca.statusCode).toBe(201)
    expect(marca.json()).toMatchObject({ id: marcaId, estado: 'active', valor: 'PRUEBA-ARETE-VIEJO' })

    const nuevaId = nuevoId()
    const reemplazo = await app.inject({
      method: 'POST',
      url: `/api/animals/${animalId}/marks/${marcaId}/replace`,
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        marcaId: nuevaId,
        tipo: 'siniiga',
        valor: 'PRUEBA-ARETE-NUEVO',
        cambiadaEl: '2026-02-01',
      },
    })
    expect(reemplazo.statusCode).toBe(200)
    expect(reemplazo.json()).toMatchObject({
      anterior: { id: marcaId, estado: 'replaced', valor: 'PRUEBA-ARETE-VIEJO' },
      nueva: { id: nuevaId, estado: 'active', valor: 'PRUEBA-ARETE-NUEVO' },
    })

    const perdida = await app.inject({
      method: 'POST',
      url: `/api/animals/${animalId}/marks/${nuevaId}/lost`,
      headers: { cookie },
      payload: { commandId: nuevoId(), cambiadaEl: null },
    })
    expect(perdida.statusCode).toBe(200)
    expect(perdida.json()).toMatchObject({ id: nuevaId, estado: 'lost' })

    const busqueda = await app.inject({
      method: 'GET',
      url: '/api/animals?mark=PRUEBA-ARETE-VIEJO',
      headers: { cookie },
    })
    expect(busqueda.statusCode).toBe(200)
    expect(busqueda.json().animales.map((animal: { id: string }) => animal.id)).toEqual([animalId])

    const ficha = await app.inject({
      method: 'GET',
      url: `/api/animals/${animalId}`,
      headers: { cookie },
    })
    expect(ficha.statusCode).toBe(200)
    expect(ficha.json()).toMatchObject({
      id: animalId,
      nombre: 'Seña de prueba',
      tenencia: 'a_la_parte',
    })
    expect(ficha.json().correcciones).toEqual([
      expect.objectContaining({ campo: 'nombre', valorAnterior: null, motivo: 'tenía seña' }),
    ])

    const lista = await app.inject({ method: 'GET', url: '/api/animals', headers: { cookie } })
    expect(lista.statusCode).toBe(200)
    expect(lista.json().animales.map((animal: { id: string }) => animal.id)).toContain(animalId)
  })
})
