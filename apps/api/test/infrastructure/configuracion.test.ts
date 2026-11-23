import { describe, expect, it } from 'vitest'

import { LARGO_MINIMO_DEL_SECRETO, cargarConfiguracion } from '../../src/infrastructure/configuracion'

const SECRETO = 'a'.repeat(LARGO_MINIMO_DEL_SECRETO)
const URL = 'postgres://rancho:rancho@127.0.0.1:5432/rancho'

function entorno(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return { DATABASE_URL: URL, SESSION_SECRET: SECRETO, ...extra }
}

describe('cargarConfiguracion', () => {
  it('arma la configuración con lo que el proceso necesita', () => {
    const configuracion = cargarConfiguracion(entorno({ PORT: '8080', NODE_ENV: 'production' }))

    expect(configuracion).toEqual({
      databaseUrl: URL,
      puerto: 8080,
      host: '127.0.0.1',
      secretoDeSesion: SECRETO,
      produccion: true,
    })
  })

  it('el puerto y el host tienen omisión; el secreto y la base no', () => {
    const configuracion = cargarConfiguracion(entorno())

    expect(configuracion.puerto).toBe(3000)
    expect(configuracion.host).toBe('127.0.0.1')
    expect(configuracion.produccion).toBe(false)
  })

  it('sin DATABASE_URL no arranca y lo dice', () => {
    expect(() => cargarConfiguracion({ SESSION_SECRET: SECRETO })).toThrow(/Falta DATABASE_URL/)
  })

  it('sin SESSION_SECRET no arranca: no se inventa un secreto', () => {
    expect(() => cargarConfiguracion({ DATABASE_URL: URL })).toThrow(/Falta SESSION_SECRET/)
  })

  it('un SESSION_SECRET vacío cuenta como faltante', () => {
    expect(() => cargarConfiguracion({ DATABASE_URL: URL, SESSION_SECRET: '   ' })).toThrow(
      /Falta SESSION_SECRET/,
    )
  })

  it('un SESSION_SECRET corto se rechaza con el largo mínimo en el mensaje', () => {
    expect(() => cargarConfiguracion({ DATABASE_URL: URL, SESSION_SECRET: 'corto' })).toThrow(
      new RegExp(`al menos ${String(LARGO_MINIMO_DEL_SECRETO)}`),
    )
  })

  it('un PORT que no es puerto no se acepta en silencio', () => {
    for (const valor of ['0', '-1', '70000', 'ochenta', '3.5']) {
      expect(() => cargarConfiguracion(entorno({ PORT: valor }))).toThrow(/PORT no es un puerto/)
    }
  })
})
