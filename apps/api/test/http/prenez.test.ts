import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { crearHerd } from '../../src/modules/herd'
import { crearModelosDeCria } from '../../src/read-models'
import { nuevoId } from '../../src/shared-kernel/ids'
import { SECRETO_DE_PRUEBA, abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO = 'propietario-prenez'

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

describe('diagnóstico de preñez por HTTP', () => {
  beforeAll(async () => {
    const base = await abrirBaseDePruebas()
    db = base.db
    cerrar = base.cerrar
    await sembrarRancho(db, 'Rancho de prueba')
    await crearCuenta(db, { rol: 'owner', usuario: USUARIO, contrasena: CONTRASENA })
    app = construirApp({
      identidad: crearIdentidad(db, SECRETO_DE_PRUEBA),
      herd: crearHerd(db),
      cria: crearModelosDeCria(db),
      nivelDeLog: 'silent',
    })
  }, 60_000)

  afterAll(async () => {
    await app.close()
    await cerrar()
  })

  it('responde 401 sin sesión', async () => {
    const respuesta = await app.inject({
      method: 'POST',
      url: '/api/pregnancy-checks',
      payload: {
        commandId: nuevoId(),
        fecha: '2026-11-20',
        resultado: 'prenada',
        vioAlAnimal: true,
        animales: [{ animalId: nuevoId(), diagnosticoId: nuevoId() }],
      },
    })
    expect(respuesta.statusCode).toBe(401)
  })

  it('el mismo comando devuelve lo guardado y otro contenido con ese id es 409', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const una = await hembra(cabeceras, 'Vaca HTTP una')
    const otra = await hembra(cabeceras, 'Vaca HTTP otra')
    const comando = nuevoId()
    const diagUna = nuevoId()
    const diagOtra = nuevoId()
    const cuerpo = {
      commandId: comando,
      fecha: '2026-11-20',
      resultado: 'vacia' as const,
      reportedBy: 'el trabajador',
      vioAlAnimal: true,
      animales: [
        { animalId: una, diagnosticoId: diagUna },
        { animalId: otra, diagnosticoId: diagOtra },
      ],
    }

    const alta = await app.inject({
      method: 'POST',
      url: '/api/pregnancy-checks',
      headers: cabeceras,
      payload: cuerpo,
    })
    expect(alta.statusCode).toBe(201)
    const repetido = await app.inject({
      method: 'POST',
      url: '/api/pregnancy-checks',
      headers: cabeceras,
      payload: cuerpo,
    })
    expect(repetido.statusCode).toBe(201)
    expect(repetido.json()).toEqual(alta.json())
    const anotados = alta.json<{ diagnosticos: { id: string; animalId: string; resultado: string }[] }>()
    expect(anotados.diagnosticos.map((fila) => fila.animalId).sort()).toEqual([una, otra].sort())
    expect(anotados.diagnosticos.every((fila) => fila.resultado === 'vacia')).toBe(true)

    const distinto = await app.inject({
      method: 'POST',
      url: '/api/pregnancy-checks',
      headers: cabeceras,
      payload: { ...cuerpo, resultado: 'prenada' },
    })
    expect(distinto.statusCode).toBe(409)
    expect(distinto.json()).toEqual({ codigo: 'idempotency_mismatch' })
  })

  it('una corrección con versión vieja no cambia nada', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const animalId = await hembra(cabeceras, 'Vaca HTTP corrección')
    const diagnosticoId = nuevoId()
    const alta = await app.inject({
      method: 'POST',
      url: '/api/pregnancy-checks',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        fecha: '2026-11-01',
        resultado: 'prenada',
        vioAlAnimal: null,
        animales: [{ animalId, diagnosticoId }],
      },
    })
    expect(alta.statusCode).toBe(201)

    const correccion = await app.inject({
      method: 'POST',
      url: `/api/pregnancy-checks/${diagnosticoId}/corrections`,
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        version: 1,
        motivo: 'estaba vacía',
        resultado: 'vacia',
      },
    })
    expect(correccion.statusCode).toBe(200)
    const corregido = correccion.json<{
      version: number
      resultado: string
      correcciones: { campo: string; valorAnterior: string }[]
    }>()
    expect(corregido.version).toBe(2)
    expect(corregido.resultado).toBe('vacia')
    expect(corregido.correcciones).toEqual([
      expect.objectContaining({ campo: 'resultado', valorAnterior: 'prenada' }),
    ])

    const vieja = await app.inject({
      method: 'POST',
      url: `/api/pregnancy-checks/${diagnosticoId}/corrections`,
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        version: 1,
        motivo: 'otra vez con la versión vieja',
        resultado: 'no_se',
      },
    })
    expect(vieja.statusCode).toBe(409)
    expect(vieja.json()).toEqual({ codigo: 'version_conflict' })

    const lectura = await app.inject({
      method: 'GET',
      url: `/api/read-models/cria/${animalId}`,
      headers: cabeceras,
    })
    expect(lectura.statusCode).toBe(200)
    expect(lectura.json<{ diagnosticos: { resultado: string; version: number }[] }>().diagnosticos[0]).toMatchObject({
      resultado: 'vacia',
      version: 2,
    })
  })

  it('rechaza un macho y un animal dado de baja, y no guarda el grupo', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const hembraId = await hembra(cabeceras, 'Vaca HTTP del grupo')
    const machoId = nuevoId()
    const macho = await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: machoId, nombre: 'Toro HTTP', sexo: 'male', categoria: 'bull' },
    })
    expect(macho.statusCode).toBe(201)

    const mezcla = await app.inject({
      method: 'POST',
      url: '/api/pregnancy-checks',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        fecha: '2026-11-20',
        resultado: 'prenada',
        vioAlAnimal: false,
        animales: [
          { animalId: hembraId, diagnosticoId: nuevoId() },
          { animalId: machoId, diagnosticoId: nuevoId() },
        ],
      },
    })
    expect(mezcla.statusCode).toBe(422)
    expect(mezcla.json()).toEqual({ codigo: 'no_es_hembra' })

    const deLaHembra = await app.inject({
      method: 'GET',
      url: `/api/read-models/cria/${hembraId}`,
      headers: cabeceras,
    })
    expect(deLaHembra.json<{ diagnosticos: unknown[] }>().diagnosticos).toEqual([])

    const salioId = await hembra(cabeceras, 'Vaca HTTP que salió')
    const ficha = await app.inject({
      method: 'GET',
      url: `/api/animals/${salioId}`,
      headers: cabeceras,
    })
    const baja = await app.inject({
      method: 'POST',
      url: `/api/animals/${salioId}/exit`,
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        version: ficha.json<{ version: number }>().version,
        motivo: 'sale',
        fecha: '2026-11-20',
      },
    })
    expect(baja.statusCode).toBe(200)

    const diagnostico = await app.inject({
      method: 'POST',
      url: '/api/pregnancy-checks',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        fecha: '2026-11-21',
        resultado: 'no_se',
        vioAlAnimal: null,
        animales: [{ animalId: salioId, diagnosticoId: nuevoId() }],
      },
    })
    expect(diagnostico.statusCode).toBe(422)
    expect(diagnostico.json()).toEqual({ codigo: 'fuera_del_hato' })
  })
})

async function hembra(cabeceras: { cookie: string }, nombre: string): Promise<string> {
  const id = nuevoId()
  const alta = await app.inject({
    method: 'POST',
    url: '/api/animals',
    headers: cabeceras,
    payload: { commandId: nuevoId(), id, nombre, sexo: 'female', categoria: 'cow' },
  })
  expect(alta.statusCode).toBe(201)
  return id
}
