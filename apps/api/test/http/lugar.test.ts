import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { crearHerd } from '../../src/modules/herd'
import { nuevoId } from '../../src/shared-kernel/ids'
import { SECRETO_DE_PRUEBA, abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO = 'propietario-potreros'

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

describe('potreros y lugar esperado por HTTP', () => {
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

  it('responde 401 en cada ruta cuando no hay sesión', async () => {
    const potreroId = nuevoId()
    const animalId = nuevoId()
    const rutas = [
      { method: 'POST' as const, url: '/api/paddocks', payload: { commandId: nuevoId(), id: potreroId } },
      {
        method: 'POST' as const,
        url: `/api/paddocks/${potreroId}/corrections`,
        payload: { commandId: nuevoId(), version: 1, motivo: 'no', nombre: 'x' },
      },
      { method: 'GET' as const, url: '/api/paddocks' },
      { method: 'GET' as const, url: `/api/paddocks/${potreroId}` },
      {
        method: 'POST' as const,
        url: '/api/locations',
        payload: {
          commandId: nuevoId(),
          potreroId: null,
          desde: '2026-11-20',
          animales: [{ animalId, asignacionId: nuevoId() }],
        },
      },
      { method: 'GET' as const, url: '/api/locations' },
      { method: 'GET' as const, url: `/api/animals/${animalId}/location` },
    ]

    for (const ruta of rutas) {
      const respuesta = await app.inject(ruta)
      expect(respuesta.statusCode, `${ruta.method} ${ruta.url}`).toBe(401)
    }
  })

  it('crea el potrero, lo renombra con historia y lo lista con los esperados', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }

    const alta = await app.inject({
      method: 'POST',
      url: '/api/paddocks',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: nuevoId(), nombre: 'Potrero HTTP' },
    })
    expect(alta.statusCode).toBe(201)
    const potrero = alta.json<{ id: string; nombre: string; version: number }>()
    expect(potrero.nombre).toBe('Potrero HTTP')
    expect(potrero.version).toBe(1)

    const cambio = await app.inject({
      method: 'POST',
      url: `/api/paddocks/${potrero.id}/corrections`,
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        version: 1,
        motivo: 'así se llama ahora',
        nombre: 'Potrero HTTP renombrado',
      },
    })
    expect(cambio.statusCode).toBe(200)
    expect(cambio.json<{ correcciones: unknown[] }>().correcciones).toHaveLength(1)

    const lista = await app.inject({ method: 'GET', url: '/api/paddocks', headers: cabeceras })
    expect(lista.statusCode).toBe(200)
    const cuerpo = lista.json<{
      potreros: { id: string; nombre: string; esperados: number }[]
      sinAsignacion: number
      desconocidos: number
    }>()
    expect(cuerpo.potreros).toContainEqual(
      expect.objectContaining({ id: potrero.id, nombre: 'Potrero HTTP renombrado', esperados: 0 }),
    )
    expect(cuerpo.sinAsignacion).toBeGreaterThanOrEqual(0)
    expect(cuerpo.desconocidos).toBeGreaterThanOrEqual(0)
  })

  it('mueve un grupo y la ficha del animal muestra el lugar vigente', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }

    const potrero = nuevoId()
    await app.inject({
      method: 'POST',
      url: '/api/paddocks',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: potrero, nombre: 'Potrero del grupo HTTP' },
    })

    const uno = nuevoId()
    const dos = nuevoId()
    for (const id of [uno, dos]) {
      await app.inject({
        method: 'POST',
        url: '/api/animals',
        headers: cabeceras,
        payload: { commandId: nuevoId(), id },
      })
    }

    const movimiento = await app.inject({
      method: 'POST',
      url: '/api/locations',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        potreroId: potrero,
        desde: '2026-11-20',
        animales: [
          { animalId: uno, asignacionId: nuevoId() },
          { animalId: dos, asignacionId: nuevoId() },
        ],
      },
    })
    expect(movimiento.statusCode).toBe(201)
    expect(movimiento.json<{ asignaciones: unknown[] }>().asignaciones).toHaveLength(2)

    const lugar = await app.inject({
      method: 'GET',
      url: `/api/animals/${uno}/location`,
      headers: cabeceras,
    })
    expect(lugar.statusCode).toBe(200)
    expect(lugar.json<{ vigente: { potreroId: string } }>().vigente.potreroId).toBe(potrero)

    const lugares = await app.inject({ method: 'GET', url: '/api/locations', headers: cabeceras })
    expect(lugares.statusCode).toBe(200)
    const delHato = lugares.json<{ animales: { animalId: string; potreroId: string }[] }>()
    expect(delHato.animales).toEqual(
      expect.arrayContaining([
        { animalId: uno, potreroId: potrero, desde: '2026-11-20' },
        { animalId: dos, potreroId: potrero, desde: '2026-11-20' },
      ]),
    )
  })

  it('«no sé» viaja como potrero nulo y un cuerpo vacío se rechaza', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const animalId = nuevoId()
    await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: animalId },
    })

    const desconocido = await app.inject({
      method: 'POST',
      url: '/api/locations',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        potreroId: null,
        desde: '2026-11-21',
        animales: [{ animalId, asignacionId: nuevoId() }],
      },
    })
    expect(desconocido.statusCode).toBe(201)
    expect(desconocido.json<{ asignaciones: { potreroId: string | null }[] }>().asignaciones[0]?.potreroId).toBeNull()

    const vacio = await app.inject({
      method: 'POST',
      url: '/api/locations',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        potreroId: null,
        desde: '2026-11-21',
        animales: [],
      },
    })
    expect(vacio.statusCode).toBe(400)
  })

  it('guarda quién lo dijo por HTTP y lo devuelve distinto de la cuenta', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const animalId = nuevoId()
    await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: animalId },
    })

    const movimiento = await app.inject({
      method: 'POST',
      url: '/api/locations',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        potreroId: null,
        desde: '2026-11-23',
        reportedBy: 'el vaquero de la tarde',
        animales: [{ animalId, asignacionId: nuevoId() }],
      },
    })
    expect(movimiento.statusCode).toBe(201)
    const asignacion = movimiento.json<{
      asignaciones: { reportedBy: string | null; recordedBy: string }[]
    }>().asignaciones[0]
    expect(asignacion?.reportedBy).toBe('el vaquero de la tarde')
    expect(asignacion?.recordedBy).not.toBe('el vaquero de la tarde')

    const lugar = await app.inject({
      method: 'GET',
      url: `/api/animals/${animalId}/location`,
      headers: cabeceras,
    })
    expect(lugar.json<{ vigente: { reportedBy: string | null } }>().vigente.reportedBy).toBe(
      'el vaquero de la tarde',
    )
  })

  it('sin quién lo dijo el campo llega en nulo y un origen en blanco no entra', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const animalId = nuevoId()
    await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: animalId },
    })

    const sinOrigen = await app.inject({
      method: 'POST',
      url: '/api/locations',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        potreroId: null,
        desde: '2026-11-24',
        animales: [{ animalId, asignacionId: nuevoId() }],
      },
    })
    expect(sinOrigen.statusCode).toBe(201)
    expect(
      sinOrigen.json<{ asignaciones: { reportedBy: string | null }[] }>().asignaciones[0]
        ?.reportedBy,
    ).toBeNull()

    const enBlanco = await app.inject({
      method: 'POST',
      url: '/api/locations',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        potreroId: null,
        desde: '2026-11-24',
        reportedBy: '   ',
        animales: [{ animalId, asignacionId: nuevoId() }],
      },
    })
    expect(enBlanco.statusCode).toBe(400)
    expect(enBlanco.json<{ codigo: string }>().codigo).toBe('cuerpo_invalido')
  })

  it('un id de asignación ya guardado con otro comando responde 409 y no escribe', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const uno = nuevoId()
    const dos = nuevoId()
    for (const id of [uno, dos]) {
      await app.inject({
        method: 'POST',
        url: '/api/animals',
        headers: cabeceras,
        payload: { commandId: nuevoId(), id },
      })
    }

    const asignacionId = nuevoId()
    const primera = await app.inject({
      method: 'POST',
      url: '/api/locations',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        potreroId: null,
        desde: '2026-11-25',
        animales: [{ animalId: uno, asignacionId }],
      },
    })
    expect(primera.statusCode).toBe(201)

    const repetida = await app.inject({
      method: 'POST',
      url: '/api/locations',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        potreroId: null,
        desde: '2026-11-26',
        animales: [{ animalId: dos, asignacionId }],
      },
    })
    expect(repetida.statusCode).toBe(409)
    expect(repetida.json<{ codigo: string }>().codigo).toBe('asignacion_ya_existe')

    const segundoLugar = await app.inject({
      method: 'GET',
      url: `/api/animals/${dos}/location`,
      headers: cabeceras,
    })
    expect(segundoLugar.json<{ historia: unknown[] }>().historia).toEqual([])
  })

  it('el mismo id de asignación repetido en el grupo responde 409 y no deja filas', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const uno = nuevoId()
    const dos = nuevoId()
    for (const id of [uno, dos]) {
      await app.inject({
        method: 'POST',
        url: '/api/animals',
        headers: cabeceras,
        payload: { commandId: nuevoId(), id },
      })
    }

    const asignacionId = nuevoId()
    const respuesta = await app.inject({
      method: 'POST',
      url: '/api/locations',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        potreroId: null,
        desde: '2026-11-27',
        animales: [
          { animalId: uno, asignacionId },
          { animalId: dos, asignacionId },
        ],
      },
    })
    expect(respuesta.statusCode).toBe(409)
    expect(respuesta.json<{ codigo: string }>().codigo).toBe('asignacion_ya_existe')

    for (const id of [uno, dos]) {
      const lugar = await app.inject({
        method: 'GET',
        url: `/api/animals/${id}/location`,
        headers: cabeceras,
      })
      expect(lugar.json<{ historia: unknown[] }>().historia).toEqual([])
    }
  })

  it('un potrero que no existe responde 404 y no inventa fila', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const animalId = nuevoId()
    await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: animalId },
    })

    const respuesta = await app.inject({
      method: 'POST',
      url: '/api/locations',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        potreroId: nuevoId(),
        desde: '2026-11-22',
        animales: [{ animalId, asignacionId: nuevoId() }],
      },
    })
    expect(respuesta.statusCode).toBe(404)
    expect(respuesta.json<{ codigo: string }>().codigo).toBe('no_encontrado')
  })

  it('un animal dado de baja no acepta un lugar y no lo guarda', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const animalId = nuevoId()
    const alta = await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: animalId, nombre: 'Salió HTTP lugar' },
    })
    expect(alta.statusCode).toBe(201)

    const baja = await app.inject({
      method: 'POST',
      url: `/api/animals/${animalId}/exit`,
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        version: alta.json<{ version: number }>().version,
        motivo: 'sale',
        fecha: '2026-11-20',
      },
    })
    expect(baja.statusCode).toBe(200)

    const movimiento = await app.inject({
      method: 'POST',
      url: '/api/locations',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        potreroId: null,
        desde: '2026-11-21',
        animales: [{ animalId, asignacionId: nuevoId() }],
      },
    })
    expect(movimiento.statusCode).toBe(422)
    expect(movimiento.json()).toEqual({ codigo: 'fuera_del_hato' })

    const lugar = await app.inject({
      method: 'GET',
      url: `/api/animals/${animalId}/location`,
      headers: cabeceras,
    })
    expect(lugar.statusCode).toBe(200)
    expect(lugar.json()).toEqual({ vigente: null, historia: [] })
  })
})
