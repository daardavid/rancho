import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { crearModelosDePresencia, crearModelosDeResumen } from '../../src/read-models'
import { nuevoId } from '../../src/shared-kernel/ids'
import { SECRETO_DE_PRUEBA, abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO = 'propietario-resumen'

let cerrar: () => Promise<void> = async () => {}
let app: ReturnType<typeof construirApp>

describe('resumen de la semana por HTTP', () => {
  beforeAll(async () => {
    const base = await abrirBaseDePruebas()
    cerrar = base.cerrar
    await sembrarRancho(base.db, 'Rancho de prueba')
    await crearCuenta(base.db, { rol: 'owner', usuario: USUARIO, contrasena: CONTRASENA })
    app = construirApp({
      identidad: crearIdentidad(base.db, SECRETO_DE_PRUEBA),
      resumen: crearModelosDeResumen(base.db, crearModelosDePresencia(base.db)),
      nivelDeLog: 'silent',
    })
  }, 60_000)

  afterAll(async () => {
    await app.close()
    await cerrar()
  })

  it('responde 401 sin sesión', async () => {
    const respuesta = await app.inject({ method: 'GET', url: '/api/read-models/resumen' })

    expect(respuesta.statusCode).toBe(401)
    expect(respuesta.json()).toEqual({ codigo: 'no_autenticado' })
  })

  it('devuelve el resumen del periodo por omisión, sin nada inventado', async () => {
    const entrada = await app.inject({
      method: 'POST',
      url: '/api/session',
      payload: { usuario: USUARIO, contrasena: CONTRASENA },
    })
    expect(entrada.statusCode).toBe(200)
    const cookie = String(entrada.headers['set-cookie']).split(';')[0] ?? ''

    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/read-models/resumen',
      headers: { cookie },
    })

    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.headers['cache-control']).toBe('no-store')
    const cuerpo = respuesta.json()
    expect(cuerpo).toMatchObject({
      rancho: 'Rancho de prueba',
      activos: { total: 0, porCategoria: [] },
      nacimientos: { total: 0, sinFecha: 0 },
      salidas: { total: 0, porMotivo: [] },
      destetes: { total: 0, conPeso: 0, sinPeso: 0, sinFecha: 0 },
      prenez: { total: 0, porResultado: [] },
      revisar: { sinObservacion: 0, huecosDeLaUltimaVuelta: 0, porDiasSinVerse: [] },
    })
    expect(typeof cuerpo.hoy).toBe('string')
    expect(typeof cuerpo.desde).toBe('string')
  })

  it('rechaza un periodo que empieza después de hoy y un día mal formado', async () => {
    const entrada = await app.inject({
      method: 'POST',
      url: '/api/session',
      payload: { usuario: USUARIO, contrasena: CONTRASENA },
    })
    const cookie = String(entrada.headers['set-cookie']).split(';')[0] ?? ''

    const futuro = await app.inject({
      method: 'GET',
      url: '/api/read-models/resumen?desde=2999-01-01',
      headers: { cookie },
    })
    expect(futuro.statusCode).toBe(400)
    expect(futuro.json()).toEqual({ codigo: 'cuerpo_invalido' })

    const invalido = await app.inject({
      method: 'GET',
      url: '/api/read-models/resumen?desde=ayer',
      headers: { cookie },
    })
    expect(invalido.statusCode).toBe(400)
    expect(invalido.json()).toEqual({ codigo: 'cuerpo_invalido' })
  })

  it('no mezcla lo que no es del periodo ni devuelve identificadores internos', async () => {
    const entrada = await app.inject({
      method: 'POST',
      url: '/api/session',
      payload: { usuario: USUARIO, contrasena: CONTRASENA },
    })
    const cookie = String(entrada.headers['set-cookie']).split(';')[0] ?? ''

    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/read-models/resumen?desde=2026-01-01',
      headers: { cookie },
    })
    expect(respuesta.statusCode).toBe(200)
    const texto = respuesta.body
    expect(texto).not.toContain(nuevoId().slice(0, 8))
    expect(texto).not.toContain('ranchId')
    expect(texto).not.toContain('cuentaId')
  })
})
