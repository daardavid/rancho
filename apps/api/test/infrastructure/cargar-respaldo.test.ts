import { describe, expect, it } from 'vitest'

import {
  cargarRespaldoEnPostgres,
  confirmarCarga,
  describirDestino,
  esArchivoDeRespaldo,
  leerArchivoDeCarga,
} from '../../src/infrastructure/db/cargar-respaldo'

const RESPALDO = '-- PostgreSQL database dump\nCREATE TABLE herd.animal (id uuid);\n'

describe('cargar un respaldo en Postgres', () => {
  it('pide un solo archivo y nombra este comando', () => {
    expect(leerArchivoDeCarga(['respaldos/rancho.sql'])).toBe('respaldos/rancho.sql')
    expect(() => leerArchivoDeCarga([])).toThrow(/cargar-respaldo/)
    expect(() => leerArchivoDeCarga(['a.sql', 'b.sql'])).toThrow(/Uso:/)
    expect(() => leerArchivoDeCarga(['--forzar'])).toThrow(/Uso:/)
  })

  it('la confirmación es la palabra CARGAR', () => {
    expect(confirmarCarga('CARGAR')).toBe(true)
    expect(confirmarCarga('  CARGAR  ')).toBe(true)
    expect(confirmarCarga('cargar')).toBe(false)
    expect(confirmarCarga('RESTAURAR')).toBe(false)
    expect(confirmarCarga('')).toBe(false)
  })

  it('describe el destino sin la contraseña', () => {
    const destino = describirDestino(
      'postgres://rancho:clave-que-no-sale@ep-ejemplo.us-east-2.aws.neon.tech:5432/neondb',
    )
    expect(destino).toBe('rancho@ep-ejemplo.us-east-2.aws.neon.tech:5432/neondb')
    expect(destino.includes('clave-que-no-sale')).toBe(false)
  })

  it('un puerto omitido se muestra como 5432', () => {
    expect(describirDestino('postgresql://rancho:secreto@127.0.0.1/rancho')).toBe(
      'rancho@127.0.0.1:5432/rancho',
    )
  })

  it('rechaza una dirección que no es Postgres y el mensaje no trae la contraseña', () => {
    expect(() => describirDestino('https://rancho:clave-que-no-sale@ejemplo.test/rancho')).toThrow(
      'DATABASE_URL tiene que ser una dirección de PostgreSQL.',
    )
    expect(() => describirDestino('esto-no-es-una-url')).toThrow(
      'DATABASE_URL no es una dirección que se pueda leer.',
    )
  })

  it('un texto que no es pg_dump no cuenta y no intenta conectar', async () => {
    expect(esArchivoDeRespaldo(RESPALDO)).toBe(true)
    await expect(cargarRespaldoEnPostgres('postgres://invalido', 'hola')).rejects.toThrow(
      /no es un respaldo/,
    )
  })
})
