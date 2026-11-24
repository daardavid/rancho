import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { crearGrowth } from '../../src/modules/growth'
import { crearHerd } from '../../src/modules/herd'
import { crearModelosDeCrecimiento } from '../../src/read-models'
import { nuevoId } from '../../src/shared-kernel/ids'
import { SECRETO_DE_PRUEBA, abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO = 'propietario-crecimiento'

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

async function pesar(
  cookie: string,
  fecha: string,
  filas: readonly Record<string, unknown>[],
): Promise<void> {
  const respuesta = await app.inject({
    method: 'POST',
    url: '/api/weighing-sessions',
    headers: { cookie },
    payload: { commandId: nuevoId(), id: nuevoId(), fecha, filas },
  })
  expect(respuesta.statusCode).toBe(201)
}

describe('vistas de crecimiento por HTTP', () => {
  beforeAll(async () => {
    const base = await abrirBaseDePruebas()
    db = base.db
    cerrar = base.cerrar
    await sembrarRancho(db, 'Rancho de prueba')
    await crearCuenta(db, { rol: 'owner', usuario: USUARIO, contrasena: CONTRASENA })
    const herd = crearHerd(db)
    app = construirApp({
      identidad: crearIdentidad(db, SECRETO_DE_PRUEBA),
      herd,
      growth: crearGrowth(db, herd),
      crecimiento: crearModelosDeCrecimiento(db),
      nivelDeLog: 'silent',
    })
  }, 60_000)

  afterAll(async () => {
    await app.close()
    await cerrar()
  })

  it('responde 401 en las dos rutas cuando no hay sesión', async () => {
    const id = nuevoId()
    for (const url of [`/api/read-models/animal-growth/${id}`, '/api/read-models/growth-overview']) {
      const respuesta = await app.inject({ method: 'GET', url })
      expect(respuesta.statusCode, url).toBe(401)
      expect(respuesta.json()).toEqual({ codigo: 'no_autenticado' })
    }
  })

  it('devuelve la serie con la ganancia del intervalo calculada y el último pesaje', async () => {
    const cookie = await entrar()
    const animalId = await alta(cookie, { nombre: 'Becerro de prueba', categoria: 'calf' })

    await pesar(cookie, '2026-03-01', [
      { id: nuevoId(), animalId, resultado: 'pesado', kilos: '180.500', calidad: 'measured' },
    ])
    await pesar(cookie, '2026-03-21', [
      { id: nuevoId(), animalId, resultado: 'pesado', kilos: '219.875', calidad: 'observed' },
    ])

    const respuesta = await app.inject({
      method: 'GET',
      url: `/api/read-models/animal-growth/${animalId}`,
      headers: { cookie },
    })
    expect(respuesta.statusCode).toBe(200)

    const cuerpo = respuesta.json()
    expect(cuerpo).toMatchObject({
      animalId,
      nombre: 'Becerro de prueba',
      categoria: 'calf',
      activo: true,
      huecos: [],
    })
    expect(cuerpo.pesos).toHaveLength(2)
    expect(cuerpo.pesos[0].intervalo).toBeNull()
    expect(cuerpo.pesos[1].intervalo).toEqual({
      fechaPrevia: '2026-03-01',
      dias: 20,
      kilosGanados: '39.375',
      kilosPorDia: '1.969',
      calidades: ['measured', 'observed'],
      incluyeCalidadNoMedida: true,
    })
    expect(cuerpo.ultimoPesaje).toMatchObject({ kilos: '219.875', calidad: 'observed' })
  })

  it('un animal sin pesos responde 200 con la serie vacía', async () => {
    const cookie = await entrar()
    const animalId = await alta(cookie)

    const respuesta = await app.inject({
      method: 'GET',
      url: `/api/read-models/animal-growth/${animalId}`,
      headers: { cookie },
    })
    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.json()).toMatchObject({ animalId, pesos: [], ultimoPesaje: null, huecos: [] })
  })

  it('un animal que no existe en el rancho responde 404 y un id mal formado responde 400', async () => {
    const cookie = await entrar()

    const ausente = await app.inject({
      method: 'GET',
      url: `/api/read-models/animal-growth/${nuevoId()}`,
      headers: { cookie },
    })
    expect(ausente.statusCode).toBe(404)
    expect(ausente.json()).toEqual({ codigo: 'no_encontrado' })

    const invalido = await app.inject({
      method: 'GET',
      url: '/api/read-models/animal-growth/no-es-uuid',
      headers: { cookie },
    })
    expect(invalido.statusCode).toBe(400)
    expect(invalido.json()).toEqual({ codigo: 'cuerpo_invalido' })
  })

  it('el resumen del hato pone primero el hueco de la última sesión', async () => {
    const cookie = await entrar()
    const animalId = await alta(cookie, { nombre: 'Becerro con hueco' })

    await pesar(cookie, '2026-07-20', [
      { id: nuevoId(), animalId, resultado: 'hueco' },
    ])

    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/read-models/growth-overview',
      headers: { cookie },
    })
    expect(respuesta.statusCode).toBe(200)

    const filas: { animalId: string; fueHuecoEnLaUltimaSesion: boolean }[] = respuesta.json().animales
    expect(filas[0]).toMatchObject({ animalId, fueHuecoEnLaUltimaSesion: true })
  })
})
