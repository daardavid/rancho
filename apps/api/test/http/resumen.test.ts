import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { construirApp } from '../../src/http/app'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { crearModelosDePresencia, crearModelosDeResumen } from '../../src/read-models'
import { SECRETO_DE_PRUEBA, abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO = 'propietario-resumen'

let cerrar: () => Promise<void> = async () => {}
let app: ReturnType<typeof construirApp>
/** El id real del rancho sembrado: lo que no debe salir en el resumen. */
let ranchIdSembrado = ''
let cuentaCreadaId = ''

describe('resumen de la semana por HTTP', () => {
  beforeAll(async () => {
    const base = await abrirBaseDePruebas()
    cerrar = base.cerrar
    const sembrado = await sembrarRancho(base.db, 'Rancho de prueba')
    ranchIdSembrado = sembrado.id
    const cuenta = await crearCuenta(base.db, {
      rol: 'owner',
      usuario: USUARIO,
      contrasena: CONTRASENA,
    })
    cuentaCreadaId = cuenta.id
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

    // Un día con la forma correcta pero que no existe en el calendario se
    // rechaza aquí: no se le pasa a PostgreSQL como un `::date` que revienta.
    const inexistente = await app.inject({
      method: 'GET',
      url: '/api/read-models/resumen?desde=2026-02-31',
      headers: { cookie },
    })
    expect(inexistente.statusCode).toBe(400)
    expect(inexistente.json()).toEqual({ codigo: 'cuerpo_invalido' })
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
    // Ni el id real del rancho ni el de la cuenta salen en lo que se comparte.
    expect(texto).not.toContain(ranchIdSembrado)
    expect(texto).not.toContain(cuentaCreadaId)
    // Y ningún otro identificador interno, con la forma de un UUID.
    expect(texto).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    expect(texto).not.toContain('ranchId')
    expect(texto).not.toContain('cuentaId')
  })
})
