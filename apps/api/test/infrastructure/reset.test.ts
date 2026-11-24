import { afterEach, describe, expect, it } from 'vitest'

import { afirmarResetPermitido } from '../../src/infrastructure/db/reset'

const LOCAL = 'postgres://rancho:rancho@127.0.0.1:5432/rancho'

describe('db:reset se niega fuera de local', () => {
  const anterior = process.env['NODE_ENV']

  afterEach(() => {
    if (anterior === undefined) {
      delete process.env['NODE_ENV']
    } else {
      process.env['NODE_ENV'] = anterior
    }
  })

  it('acepta localhost, 127.0.0.1 y ::1', () => {
    delete process.env['NODE_ENV']
    expect(() => afirmarResetPermitido('postgres://u:p@localhost:5432/rancho')).not.toThrow()
    expect(() => afirmarResetPermitido(LOCAL)).not.toThrow()
    expect(() => afirmarResetPermitido('postgresql://u:p@[::1]:5432/rancho')).not.toThrow()
  })

  it('se niega cuando NODE_ENV=production, aunque el host sea local', () => {
    process.env['NODE_ENV'] = 'production'
    expect(() => afirmarResetPermitido(LOCAL)).toThrow(/production/)
  })

  it('se niega si el host no es esta máquina', () => {
    delete process.env['NODE_ENV']
    expect(() => afirmarResetPermitido('postgres://u:p@db.ejemplo.com:5432/rancho')).toThrow(/local/)
  })

  it('se niega si la URL no se puede leer', () => {
    delete process.env['NODE_ENV']
    expect(() => afirmarResetPermitido('no es una url')).toThrow(/URL/)
  })
})
