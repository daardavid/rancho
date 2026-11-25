import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { crearHerd } from '../../src/modules/herd'
import { nuevoId } from '../../src/shared-kernel/ids'
import { SECRETO_DE_PRUEBA, abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO = 'propietario-sanidad'

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

describe('notas de sanidad por HTTP', () => {
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
    const animalId = nuevoId()
    const notaId = nuevoId()
    const rutas = [
      {
        method: 'POST' as const,
        url: '/api/health-notes',
        payload: {
          commandId: nuevoId(),
          tipo: 'vacuna',
          detalle: 'Algo',
          fecha: '2026-11-20',
          animales: [{ animalId, notaId }],
        },
      },
      {
        method: 'POST' as const,
        url: `/api/health-notes/${notaId}/corrections`,
        payload: { commandId: nuevoId(), version: 1, motivo: 'no', detalle: 'x' },
      },
      { method: 'GET' as const, url: `/api/animals/${animalId}/health-notes` },
      { method: 'GET' as const, url: `/api/health-notes?animales=${animalId}` },
    ]

    for (const ruta of rutas) {
      const respuesta = await app.inject(ruta)
      expect(respuesta.statusCode, `${ruta.method} ${ruta.url}`).toBe(401)
    }
  })

  it('anota a un grupo, lo lee por animal y la corrección conserva la anterior', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }

    async function animal(nombre: string): Promise<string> {
      const id = nuevoId()
      const alta = await app.inject({
        method: 'POST',
        url: '/api/animals',
        headers: cabeceras,
        payload: { commandId: nuevoId(), id, nombre },
      })
      expect(alta.statusCode).toBe(201)
      return id
    }

    const uno = await animal('Sanidad HTTP uno')
    const dos = await animal('Sanidad HTTP dos')
    const notaUno = nuevoId()
    const notaDos = nuevoId()

    const alta = await app.inject({
      method: 'POST',
      url: '/api/health-notes',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        tipo: 'vacuna',
        detalle: 'Vacuna contra el ántrax',
        fecha: '2026-11-20',
        producto: 'Ántrax 200',
        vioAlAnimal: true,
        animales: [
          { animalId: uno, notaId: notaUno },
          { animalId: dos, notaId: notaDos },
        ],
      },
    })
    expect(alta.statusCode).toBe(201)
    const anotadas = alta.json<{ notas: { id: string; animalId: string; vioAlAnimal: boolean }[] }>()
    expect(anotadas.notas).toHaveLength(2)
    expect(anotadas.notas.map((nota) => nota.animalId).sort()).toEqual([uno, dos].sort())
    expect(anotadas.notas.every((nota) => nota.vioAlAnimal)).toBe(true)

    const lectura = await app.inject({
      method: 'GET',
      url: `/api/animals/${uno}/health-notes`,
      headers: cabeceras,
    })
    expect(lectura.statusCode).toBe(200)
    const notasDeUno = lectura.json<{ notas: { id: string; producto: string }[] }>()
    expect(notasDeUno.notas).toHaveLength(1)
    expect(notasDeUno.notas[0]?.id).toBe(notaUno)
    expect(notasDeUno.notas[0]?.producto).toBe('Ántrax 200')

    const correccion = await app.inject({
      method: 'POST',
      url: `/api/health-notes/${notaUno}/corrections`,
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        version: 1,
        motivo: 'el producto era otro',
        producto: 'Ántrax 400',
      },
    })
    expect(correccion.statusCode).toBe(200)
    const corregida = correccion.json<{ producto: string; correcciones: { valorAnterior: string }[] }>()
    expect(corregida.producto).toBe('Ántrax 400')
    expect(corregida.correcciones).toEqual([
      expect.objectContaining({ campo: 'producto', valorAnterior: 'Ántrax 200' }),
    ])

    // La otra nota del grupo no se tocó.
    const otra = await app.inject({
      method: 'GET',
      url: `/api/animals/${dos}/health-notes`,
      headers: cabeceras,
    })
    expect(otra.json<{ notas: { producto: string }[] }>().notas[0]?.producto).toBe('Ántrax 200')
  })

  it('sin decir si se vio, no guarda la nota', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const animalId = nuevoId()
    await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: animalId, nombre: 'Sin visto HTTP' },
    })

    const alta = await app.inject({
      method: 'POST',
      url: '/api/health-notes',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        tipo: 'problema',
        detalle: 'Dijeron que se veía mal',
        fecha: '2026-11-21',
        animales: [{ animalId, notaId: nuevoId() }],
      },
    })
    expect(alta.statusCode).toBe(400)
    expect(alta.json<{ codigo: string }>()).toEqual({ codigo: 'cuerpo_invalido' })

    const notas = await app.inject({
      method: 'GET',
      url: `/api/animals/${animalId}/health-notes`,
      headers: cabeceras,
    })
    expect(notas.json<{ notas: unknown[] }>().notas).toEqual([])
  })

  it('si se elige «no se vio», eso es lo que queda guardado', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const animalId = nuevoId()
    await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: animalId, nombre: 'No se vio HTTP' },
    })

    const alta = await app.inject({
      method: 'POST',
      url: '/api/health-notes',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        tipo: 'problema',
        detalle: 'Dijeron que se veía mal',
        fecha: '2026-11-21',
        vioAlAnimal: false,
        animales: [{ animalId, notaId: nuevoId() }],
      },
    })
    expect(alta.statusCode).toBe(201)
    expect(alta.json<{ notas: { vioAlAnimal: boolean; tipo: string }[] }>().notas[0]).toMatchObject({
      vioAlAnimal: false,
      tipo: 'problema',
    })
  })

  it('un cuerpo mal formado es 400 y un tipo inventado es 422', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const animalId = nuevoId()
    await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: animalId, nombre: 'Cuerpo malo' },
    })

    const malFormado = await app.inject({
      method: 'POST',
      url: '/api/health-notes',
      headers: cabeceras,
      payload: { commandId: nuevoId(), tipo: 'vacuna', fecha: '2026-11-22', animales: [] },
    })
    expect(malFormado.statusCode).toBe(400)
    expect(malFormado.json<{ codigo: string }>().codigo).toBe('cuerpo_invalido')

    const tipoInventado = await app.inject({
      method: 'POST',
      url: '/api/health-notes',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        tipo: 'inyeccion',
        detalle: 'Algo',
        fecha: '2026-11-22',
        vioAlAnimal: false,
        animales: [{ animalId, notaId: nuevoId() }],
      },
    })
    expect(tipoInventado.statusCode).toBe(400)
  })

  it('una versión vieja es 409 y el mismo comando devuelve lo guardado', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const animalId = nuevoId()
    await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: animalId, nombre: 'Versión HTTP' },
    })

    const notaId = nuevoId()
    const commandId = nuevoId()
    const cuerpo = {
      commandId,
      tipo: 'medicamento',
      detalle: 'Se le puso la vacuna',
      fecha: '2026-11-23',
      vioAlAnimal: false,
      animales: [{ animalId, notaId }],
    }
    const primera = await app.inject({ method: 'POST', url: '/api/health-notes', headers: cabeceras, payload: cuerpo })
    const repetida = await app.inject({ method: 'POST', url: '/api/health-notes', headers: cabeceras, payload: cuerpo })
    expect(repetida.statusCode).toBe(201)
    expect(repetida.json()).toEqual(primera.json())

    const correccion = {
      commandId: nuevoId(),
      version: 1,
      motivo: 'se corrige la fecha',
      fecha: '2026-11-22',
    }
    const buena = await app.inject({
      method: 'POST',
      url: `/api/health-notes/${notaId}/corrections`,
      headers: cabeceras,
      payload: correccion,
    })
    expect(buena.statusCode).toBe(200)

    const vieja = await app.inject({
      method: 'POST',
      url: `/api/health-notes/${notaId}/corrections`,
      headers: cabeceras,
      payload: { ...correccion, commandId: nuevoId(), detalle: 'Otra cosa' },
    })
    expect(vieja.statusCode).toBe(409)
    expect(vieja.json<{ codigo: string }>().codigo).toBe('version_conflict')
  })

  it('una nota que no existe es 404', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }

    const lectura = await app.inject({
      method: 'GET',
      url: `/api/animals/${nuevoId()}/health-notes`,
      headers: cabeceras,
    })
    expect(lectura.statusCode).toBe(404)

    const correccion = await app.inject({
      method: 'POST',
      url: `/api/health-notes/${nuevoId()}/corrections`,
      headers: cabeceras,
      payload: { commandId: nuevoId(), version: 1, motivo: 'no existe', detalle: 'x' },
    })
    expect(correccion.statusCode).toBe(404)
  })

  it('un animal dado de baja no acepta una nota y no la guarda', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const animalId = nuevoId()
    const alta = await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: animalId, nombre: 'Salió HTTP sanidad' },
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

    const nota = await app.inject({
      method: 'POST',
      url: '/api/health-notes',
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        tipo: 'vacuna',
        detalle: 'Vacuna después de la venta',
        fecha: '2026-11-21',
        vioAlAnimal: true,
        animales: [{ animalId, notaId: nuevoId() }],
      },
    })
    expect(nota.statusCode).toBe(422)
    expect(nota.json()).toEqual({ codigo: 'fuera_del_hato' })

    const notas = await app.inject({
      method: 'GET',
      url: `/api/animals/${animalId}/health-notes`,
      headers: cabeceras,
    })
    expect(notas.statusCode).toBe(200)
    expect(notas.json<{ notas: unknown[] }>().notas).toEqual([])
  })
})
