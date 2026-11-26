import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { crearHerd } from '../../src/modules/herd'
import { crearJournal } from '../../src/modules/journal'
import { crearModelosDePresencia } from '../../src/read-models'
import { nuevoId } from '../../src/shared-kernel/ids'
import { SECRETO_DE_PRUEBA, abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO = 'propietario-bitacora'

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

/** Suma días de calendario a un `YYYY-MM-DD` sin pasar por la zona del proceso. */
function diaMas(dia: string, dias: number): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia)
  if (partes === null) {
    throw new Error(`Día inválido: ${dia}`)
  }
  const fecha = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]) + dias))
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  const diaDelMes = String(fecha.getUTCDate()).padStart(2, '0')
  return `${String(fecha.getUTCFullYear())}-${mes}-${diaDelMes}`
}

describe('bitácora y pendientes por HTTP', () => {
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
      journal: crearJournal(db, herd),
      presencia: crearModelosDePresencia(db),
      nivelDeLog: 'silent',
    })
  }, 60_000)

  afterAll(async () => {
    await app.close()
    await cerrar()
  })

  it('responde 401 sin sesión', async () => {
    const id = nuevoId()
    const rutas = [
      { method: 'POST' as const, url: '/api/journal-notes', payload: { commandId: nuevoId(), id } },
      { method: 'GET' as const, url: '/api/journal-notes' },
      { method: 'POST' as const, url: '/api/reminders', payload: { commandId: nuevoId(), id } },
      { method: 'GET' as const, url: '/api/reminders' },
    ]
    for (const ruta of rutas) {
      const respuesta = await app.inject(ruta)
      expect(respuesta.statusCode, `${ruta.method} ${ruta.url}`).toBe(401)
    }
  })

  it('la nota es idempotente, guarda la aproximación y la corrección deja la anterior', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const commandId = nuevoId()
    const id = nuevoId()
    const cuerpo = {
      commandId,
      id,
      tipo: 'lluvia',
      texto: 'Llovió en la noche',
      fecha: '2026-11-20',
      precision: 'approximate',
      reportedBy: 'el vaquero',
    }

    const alta = await app.inject({
      method: 'POST',
      url: '/api/journal-notes',
      headers: cabeceras,
      payload: cuerpo,
    })
    expect(alta.statusCode).toBe(201)
    const nota = alta.json()
    expect(nota.precision).toBe('approximate')
    expect(nota.tipo).toBe('lluvia')
    expect(nota.reportedBy).toBe('el vaquero')
    expect(nota.version).toBe(1)

    const reintento = await app.inject({
      method: 'POST',
      url: '/api/journal-notes',
      headers: cabeceras,
      payload: cuerpo,
    })
    expect(reintento.statusCode).toBe(201)
    expect(reintento.json().id).toBe(id)

    const distinto = await app.inject({
      method: 'POST',
      url: '/api/journal-notes',
      headers: cabeceras,
      payload: { ...cuerpo, texto: 'No llovió' },
    })
    expect(distinto.statusCode).toBe(409)
    expect(distinto.json().codigo).toBe('idempotency_mismatch')

    const correccion = await app.inject({
      method: 'POST',
      url: `/api/journal-notes/${id}/corrections`,
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        version: 1,
        motivo: 'Era llovizna',
        texto: 'Lloviznó en la noche',
      },
    })
    expect(correccion.statusCode).toBe(200)
    const corregida = correccion.json()
    expect(corregida.texto).toBe('Lloviznó en la noche')
    expect(corregida.version).toBe(2)
    expect(corregida.correcciones).toEqual([
      expect.objectContaining({
        campo: 'texto',
        valorAnterior: 'Llovió en la noche',
        motivo: 'Era llovizna',
      }),
    ])
    expect(corregida.precision).toBe('approximate')

    const vieja = await app.inject({
      method: 'POST',
      url: `/api/journal-notes/${id}/corrections`,
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        version: 1,
        motivo: 'otra vez',
        texto: 'Nada',
      },
    })
    expect(vieja.statusCode).toBe(409)
    expect(vieja.json().codigo).toBe('version_conflict')

    const lista = await app.inject({ method: 'GET', url: '/api/journal-notes', headers: cabeceras })
    expect(lista.statusCode).toBe(200)
    const guardadas = lista.json().notas as { id: string; texto: string }[]
    expect(guardadas.filter((item) => item.id === id)).toEqual([
      expect.objectContaining({ texto: 'Lloviznó en la noche' }),
    ])
  })

  it('rechaza la nota si no se elige tipo', async () => {
    const cookie = await entrar()
    const respuesta = await app.inject({
      method: 'POST',
      url: '/api/journal-notes',
      headers: { cookie },
      payload: {
        commandId: nuevoId(),
        id: nuevoId(),
        texto: 'Algo',
        fecha: '2026-11-20',
        precision: 'exact',
      },
    })
    expect(respuesta.statusCode).toBe(400)
    expect(respuesta.json().codigo).toBe('cuerpo_invalido')
  })

  it('el pendiente es idempotente, la corrección guarda lo anterior y el estado dice quién y cuándo', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const animalId = nuevoId()
    const altaAnimal = await app.inject({
      method: 'POST',
      url: '/api/animals',
      headers: cabeceras,
      payload: { commandId: nuevoId(), id: animalId, nombre: 'Para el pendiente' },
    })
    expect(altaAnimal.statusCode).toBe(201)

    const commandId = nuevoId()
    const id = nuevoId()
    const cuerpo = {
      commandId,
      id,
      texto: 'Vacunar el lote',
      fecha: '2026-12-05',
      sujeto: { clase: 'animal', animalId },
    }
    const alta = await app.inject({
      method: 'POST',
      url: '/api/reminders',
      headers: cabeceras,
      payload: cuerpo,
    })
    expect(alta.statusCode).toBe(201)
    expect(alta.json().estado).toBe('pendiente')
    expect(typeof alta.json().estadoPor).toBe('string')
    expect(alta.json().estadoEn).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const reintento = await app.inject({
      method: 'POST',
      url: '/api/reminders',
      headers: cabeceras,
      payload: cuerpo,
    })
    expect(reintento.statusCode).toBe(201)
    expect(reintento.json().id).toBe(id)

    const distinto = await app.inject({
      method: 'POST',
      url: '/api/reminders',
      headers: cabeceras,
      payload: { ...cuerpo, texto: 'Otro texto' },
    })
    expect(distinto.statusCode).toBe(409)
    expect(distinto.json().codigo).toBe('idempotency_mismatch')

    const correccion = await app.inject({
      method: 'POST',
      url: `/api/reminders/${id}/corrections`,
      headers: cabeceras,
      payload: {
        commandId: nuevoId(),
        version: 1,
        motivo: 'Era el día 6',
        fecha: '2026-12-06',
      },
    })
    expect(correccion.statusCode).toBe(200)
    expect(correccion.json().fecha).toBe('2026-12-06')
    expect(correccion.json().correcciones).toEqual([
      expect.objectContaining({ campo: 'fecha', valorAnterior: '2026-12-05', motivo: 'Era el día 6' }),
    ])

    const hecho = await app.inject({
      method: 'POST',
      url: `/api/reminders/${id}/status`,
      headers: cabeceras,
      payload: { commandId: nuevoId(), version: 2, estado: 'hecho' },
    })
    expect(hecho.statusCode).toBe(200)
    const marcado = hecho.json()
    expect(marcado.estado).toBe('hecho')
    expect(marcado.estadoPor).toBe(alta.json().estadoPor)
    expect(marcado.estadoEn).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(marcado.cambiosDeEstado).toEqual([
      expect.objectContaining({
        estadoAnterior: 'pendiente',
        estadoNuevo: 'hecho',
        changedBy: marcado.estadoPor,
      }),
    ])

    const viejo = await app.inject({
      method: 'POST',
      url: `/api/reminders/${id}/status`,
      headers: cabeceras,
      payload: { commandId: nuevoId(), version: 2, estado: 'pendiente' },
    })
    expect(viejo.statusCode).toBe(409)
    expect(viejo.json().codigo).toBe('version_conflict')

    const sanidad = await app.inject({
      method: 'GET',
      url: `/api/animals/${animalId}/health-notes`,
      headers: cabeceras,
    })
    expect(sanidad.statusCode).toBe(200)
    expect(sanidad.json().notas).toEqual([])
  })

  it('Inicio muestra el vencido y el de hoy, no el hecho ni el de después, y la nota del periodo', async () => {
    const cookie = await entrar()
    const cabeceras = { cookie }
    const primero = await app.inject({
      method: 'GET',
      url: '/api/read-models/inicio',
      headers: cabeceras,
    })
    expect(primero.statusCode).toBe(200)
    const hoy = primero.json().hoy as string
    const ayer = diaMas(hoy, -1)
    const manana = diaMas(hoy, 1)
    const fuera = '2020-01-01'

    async function pendiente(texto: string, fecha: string): Promise<string> {
      const id = nuevoId()
      const alta = await app.inject({
        method: 'POST',
        url: '/api/reminders',
        headers: cabeceras,
        payload: { commandId: nuevoId(), id, texto, fecha },
      })
      expect(alta.statusCode).toBe(201)
      return id
    }

    const vencido = await pendiente('Cerca que ya tocó', ayer)
    const deHoy = await pendiente('Pozo de hoy', hoy)
    const futuro = await pendiente('Vacunar en diciembre', manana)
    const cerrado = await pendiente('Ya se hizo', ayer)
    const cierre = await app.inject({
      method: 'POST',
      url: `/api/reminders/${cerrado}/status`,
      headers: cabeceras,
      payload: { commandId: nuevoId(), version: 1, estado: 'hecho' },
    })
    expect(cierre.statusCode).toBe(200)

    async function nota(texto: string, fecha: string): Promise<void> {
      const alta = await app.inject({
        method: 'POST',
        url: '/api/journal-notes',
        headers: cabeceras,
        payload: {
          commandId: nuevoId(),
          id: nuevoId(),
          tipo: 'quema',
          texto,
          fecha,
          precision: 'exact',
        },
      })
      expect(alta.statusCode).toBe(201)
    }

    await nota('Quema de hoy', hoy)
    await nota('Quema vieja', fuera)

    const inicio = await app.inject({
      method: 'GET',
      url: `/api/read-models/inicio?desde=${hoy}`,
      headers: cabeceras,
    })
    expect(inicio.statusCode).toBe(200)
    const vista = inicio.json()
    const ids = (vista.paraRevisar.pendientes as { id: string; texto: string; vencido: boolean }[]).map(
      (item) => item.id,
    )
    expect(ids).toContain(vencido)
    expect(ids).toContain(deHoy)
    expect(ids).not.toContain(futuro)
    expect(ids).not.toContain(cerrado)
    const elVencido = (vista.paraRevisar.pendientes as { id: string; vencido: boolean }[]).find(
      (item) => item.id === vencido,
    )
    expect(elVencido?.vencido).toBe(true)

    const textos = (vista.cambios.notasDeBitacora as { texto: string }[]).map((item) => item.texto)
    expect(textos).toContain('Quema de hoy')
    expect(textos).not.toContain('Quema vieja')
  })
})
