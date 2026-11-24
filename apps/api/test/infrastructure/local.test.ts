import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { LARGO_MINIMO_DEL_SECRETO, anunciarModoLocal, cargarConfiguracion } from '../../src/infrastructure/configuracion'
import { filasDe } from '../../src/infrastructure/db/filas'
import { abrirCliente } from '../../src/infrastructure/db/cliente'
import { escribirVariable, leerVariable } from '../../src/infrastructure/local/archivo-env'
import {
  ROL_DE_LA_PRIMERA_CUENTA,
  abrirBaseLocal,
  exponerBaseLocal,
  prepararInstalacionLocal,
} from '../../src/infrastructure/local/base'
import { haceFaltaConstruir, raizDelRepo } from '../../src/infrastructure/local/construir'
import { direccionesIpv4, lineasParaAbrir } from '../../src/infrastructure/local/direcciones'
import { asegurarSecreto, asegurarSecretoEnArchivo } from '../../src/infrastructure/local/secreto'

const SECRETO = 'a'.repeat(LARGO_MINIMO_DEL_SECRETO)
const URL = 'postgres://rancho:rancho@127.0.0.1:5432/rancho'
const CONTRASENA = 'contrasena-de-prueba'

function entorno(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return { DATABASE_URL: URL, SESSION_SECRET: SECRETO, ...extra }
}

describe('cookie en producción y en modo local', () => {
  it('en producción la cookie queda Secure', () => {
    const configuracion = cargarConfiguracion(entorno({ NODE_ENV: 'production' }))
    expect(configuracion.produccion).toBe(true)
    expect(configuracion.cookieSegura).toBe(true)
  })

  it('MODO=local no le quita Secure a producción', () => {
    expect(() => cargarConfiguracion(entorno({ NODE_ENV: 'production', MODO: 'local' }))).toThrow(
      /Secure/,
    )
  })

  it('en modo local la cookie no lleva Secure y el arranque lo dice', () => {
    const configuracion = cargarConfiguracion(entorno({ MODO: 'local' }))
    expect(configuracion.modoLocal).toBe(true)
    expect(configuracion.cookieSegura).toBe(false)

    const lineas: string[] = []
    anunciarModoLocal(configuracion, (linea) => {
      lineas.push(linea)
    })
    expect(lineas.join('\n')).toMatch(/no lleva Secure/)
    expect(lineas.join('\n')).toMatch(/sin excepción/)
  })

  it('sin modo local no anuncia esa excepción', () => {
    const lineas: string[] = []
    anunciarModoLocal(cargarConfiguracion(entorno()), (linea) => {
      lineas.push(linea)
    })
    expect(lineas).toEqual([])
  })
})

describe('secreto de la instalación local', () => {
  const temporales: string[] = []

  afterEach(() => {
    for (const dir of temporales.splice(0)) {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
    }
  })

  it('lo genera una sola vez y no toca el resto del archivo', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rancho-secreto-'))
    temporales.push(dir)
    const ruta = join(dir, '.env')
    writeFileSync(ruta, 'DATABASE_URL=postgres://ejemplo\n# comentario\n', 'utf8')

    const primero = asegurarSecretoEnArchivo(ruta)
    expect(primero.generado).toBe(true)
    expect(primero.secreto.length).toBeGreaterThanOrEqual(LARGO_MINIMO_DEL_SECRETO)

    const texto = readFileSync(ruta, 'utf8')
    expect(texto).toContain('DATABASE_URL=postgres://ejemplo')
    expect(texto).toContain('# comentario')
    expect(leerVariable(texto, 'SESSION_SECRET')).toBe(primero.secreto)

    const segundo = asegurarSecretoEnArchivo(ruta, () => {
      throw new Error('no debe generar otro secreto')
    })
    expect(segundo).toEqual({ secreto: primero.secreto, generado: false })
    expect(readFileSync(ruta, 'utf8')).toBe(texto)
  })

  it('un secreto corto que ya está no se reemplaza solo', () => {
    expect(() => asegurarSecreto('SESSION_SECRET=corto\n', () => SECRETO)).toThrow(/No lo reemplazo/)
  })

  it('guarda un nombre con espacios y no pierde el secreto', () => {
    const texto = escribirVariable('SESSION_SECRET=abcdefghij0123456789abcdefghij01\n', 'RANCH_NAME', 'Rancho de prueba')
    expect(leerVariable(texto, 'RANCH_NAME')).toBe('Rancho de prueba')
    expect(leerVariable(texto, 'SESSION_SECRET')).toBe('abcdefghij0123456789abcdefghij01')
  })
})

describe('arranque de la base local', () => {
  const temporales: string[] = []

  afterEach(() => {
    for (const dir of temporales.splice(0)) {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    }
  })

  it('los datos sobreviven y la segunda corrida no duplica rancho ni cuenta', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rancho-local-'))
    temporales.push(dir)
    const datos = join(dir, 'pglite')
    const animalId = randomUUID()
    let ranchId = ''

    const primera = await abrirBaseLocal(datos)
    try {
      const preparacion = await prepararInstalacionLocal(primera.db, {
        nombreDelRancho: 'Rancho de prueba',
        pedirCuenta: async () => ({ usuario: 'soporte-local', contrasena: CONTRASENA }),
      })
      expect(preparacion.ranchoCreado).toBe(true)
      expect(preparacion.cuentaCreada).toBe(true)
      expect(preparacion.cuentas).toBe(1)
      expect(preparacion.rol).toBe(ROL_DE_LA_PRIMERA_CUENTA)
      ranchId = preparacion.ranchId
      await primera.db.execute(sql`
        INSERT INTO herd.animal (
          id, ranch_id, name, sex, category, tenure, economic_participation,
          active, version, recorded_by, recorded_at
        ) VALUES (
          ${animalId},
          ${ranchId},
          ${'Becerro de prueba'},
          ${'unknown'},
          ${'unknown'},
          ${'unknown'},
          ${'unknown'},
          ${true},
          ${1},
          ${'cuenta-de-prueba'},
          ${new Date()}
        )
      `)
    } finally {
      await primera.cerrar()
    }

    const segunda = await abrirBaseLocal(datos)
    let socket: Awaited<ReturnType<typeof exponerBaseLocal>> | undefined
    let cliente: ReturnType<typeof abrirCliente> | undefined
    try {
      let pedidos = 0
      const preparacion = await prepararInstalacionLocal(segunda.db, {
        nombreDelRancho: 'Otro nombre que no debe usarse',
        pedirCuenta: async () => {
          pedidos += 1
          return { usuario: 'otro-usuario', contrasena: CONTRASENA }
        },
      })
      expect(preparacion.ranchoCreado).toBe(false)
      expect(preparacion.cuentaCreada).toBe(false)
      expect(preparacion.cuentas).toBe(1)
      expect(preparacion.ranchId).toBe(ranchId)
      expect(pedidos).toBe(0)

      socket = await exponerBaseLocal(segunda.cliente)
      cliente = abrirCliente(socket.url, 1)
      const animales = filasDe<{ id: string; name: string }>(
        await cliente.db.execute(sql`
          SELECT id, name FROM herd.animal WHERE id = ${animalId}
        `),
      )
      expect(animales).toEqual([{ id: animalId, name: 'Becerro de prueba' }])
      const cuentas = filasDe<{ total: unknown }>(
        await cliente.db.execute(sql`SELECT count(*) AS total FROM identity.account`),
      )
      expect(Number(cuentas[0]?.total)).toBe(1)
      const ranchos = filasDe<{ id: string; nombre: string }>(
        await cliente.db.execute(sql`SELECT id, nombre FROM identity.ranch`),
      )
      expect(ranchos).toEqual([{ id: ranchId, nombre: 'Rancho de prueba' }])
    } finally {
      await cliente?.cerrar()
      await socket?.cerrar()
      await segunda.cerrar()
    }
  }, 60_000)
})

describe('direcciones y construcción', () => {
  it('arma las direcciones de esta máquina y del celular', () => {
    const direcciones = direccionesIpv4({
      lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
      wifi: [{ address: '192.168.1.20', family: 'IPv4', internal: false }],
      seis: [{ address: 'fe80::1', family: 'IPv6', internal: false }],
    })
    expect(direcciones).toEqual(['192.168.1.20'])
    expect(lineasParaAbrir(3000, direcciones)).toEqual([
      'En esta máquina: http://127.0.0.1:3000/',
      'Desde el celular, en la misma WiFi: http://192.168.1.20:3000/',
    ])
  })

  it('la raíz del repo es la carpeta que contiene la API', () => {
    const raiz = raizDelRepo()
    expect(existsSync(join(raiz, 'apps', 'api', 'package.json'))).toBe(true)
  })

  it('construye cuando falta la salida y no cuando ya está', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rancho-build-'))
    try {
      expect(haceFaltaConstruir(dir)).toBe(true)
      mkdirSync(join(dir, 'apps', 'api', 'dist'), { recursive: true })
      mkdirSync(join(dir, 'apps', 'web', 'dist'), { recursive: true })
      writeFileSync(join(dir, 'apps', 'api', 'dist', 'main.js'), '')
      writeFileSync(join(dir, 'apps', 'web', 'dist', 'index.html'), '')
      expect(haceFaltaConstruir(dir)).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
