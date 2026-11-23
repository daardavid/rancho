import { describe, expect, it } from 'vitest'

import { idDePeticion } from '../../src/http/request-id'

const UUID = '1f0a3c9e-6f2b-4d5a-9a41-7c0d2e8b1a33'

describe('idDePeticion', () => {
  it('usa el id del cliente cuando es un UUID', () => {
    expect(idDePeticion(UUID)).toBe(UUID)
  })

  it('normaliza un UUID en mayúsculas', () => {
    expect(idDePeticion(UUID.toUpperCase())).toBe(UUID)
  })

  it('genera uno cuando no viene', () => {
    expect(idDePeticion(undefined)).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('no copia texto arbitrario al log', () => {
    const inyectado = 'x\n{"nivel":"error","mensaje":"falso"}'

    expect(idDePeticion(inyectado)).not.toBe(inyectado)
    expect(idDePeticion(inyectado)).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('toma el primer valor cuando la cabecera llega repetida', () => {
    expect(idDePeticion([UUID, 'otro'])).toBe(UUID)
  })
})
