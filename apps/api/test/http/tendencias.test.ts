import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { crearModelosDeTendencias } from '../../src/read-models'
import { SECRETO_DE_PRUEBA, abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO = 'propietario-tendencias'

let cerrar: () => Promise<void> = async () => {}
let app: ReturnType<typeof construirApp>

describe('lectura de tendencias por HTTP', () => {
  beforeAll(async () => {
    const base = await abrirBaseDePruebas()
    cerrar = base.cerrar
    await sembrarRancho(base.db, 'Rancho de prueba')
    await crearCuenta(base.db, { rol: 'owner', usuario: USUARIO, contrasena: CONTRASENA })
    app = construirApp({
      identidad: crearIdentidad(base.db, SECRETO_DE_PRUEBA),
      tendencias: crearModelosDeTendencias(base.db),
      nivelDeLog: 'silent',
    })
  }, 60_000)

  afterAll(async () => {
    await app.close()
    await cerrar()
  })

  it('responde 401 sin sesión', async () => {
    const respuesta = await app.inject({ method: 'GET', url: '/api/read-models/tendencias' })

    expect(respuesta.statusCode).toBe(401)
    expect(respuesta.json()).toEqual({ codigo: 'no_autenticado' })
  })

  it('devuelve la lectura vacía, sin guardar nada', async () => {
    const entrada = await app.inject({
      method: 'POST',
      url: '/api/session',
      payload: { usuario: USUARIO, contrasena: CONTRASENA },
    })
    expect(entrada.statusCode).toBe(200)
    const cookie = String(entrada.headers['set-cookie']).split(';')[0] ?? ''

    const respuesta = await app.inject({
      method: 'GET',
      url: '/api/read-models/tendencias',
      headers: { cookie },
    })

    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.headers['cache-control']).toBe('no-store')
    expect(respuesta.json()).toEqual({
      series: [],
      vueltas: [],
      meses: [],
      nacimientosSinFecha: 0,
      salidasSinFecha: 0,
    })
  })
})
