import { describe, expect, it } from 'vitest'

import { corregirAnimalSchema, registrarAnimalSchema } from '../src/index'

const commandId = '33333333-3333-4333-8333-333333333333'
const animalId = '44444444-4444-4444-8444-444444444444'

describe('registrarAnimalSchema', () => {
  it('acepta solo el id y deja lo demás sin mandar', () => {
    expect(registrarAnimalSchema.parse({ commandId, id: animalId })).toEqual({
      commandId,
      id: animalId,
    })
  })

  it('acepta «a la parte» y rechaza un porcentaje', () => {
    expect(
      registrarAnimalSchema.parse({
        commandId,
        id: animalId,
        tenencia: 'a_la_parte',
        participacionEconomica: 'unknown',
      }).tenencia,
    ).toBe('a_la_parte')

    expect(
      registrarAnimalSchema.safeParse({
        commandId,
        id: animalId,
        tenencia: 'a_la_parte',
        porcentaje: 50,
      }).success,
    ).toBe(false)
  })

  it('rechaza el rancho mandado por el cliente', () => {
    expect(
      registrarAnimalSchema.safeParse({
        commandId,
        id: animalId,
        ranchId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(false)
  })
})

describe('corregirAnimalSchema', () => {
  it('pide versión y motivo, y no acepta cambiar el id', () => {
    expect(
      corregirAnimalSchema.parse({
        commandId,
        version: 1,
        motivo: 'estaba mal la seña',
        nombre: 'Seña de prueba',
      }),
    ).toMatchObject({ version: 1, motivo: 'estaba mal la seña' })

    expect(
      corregirAnimalSchema.safeParse({
        commandId,
        version: 1,
        motivo: 'no',
        id: animalId,
      }).success,
    ).toBe(false)
  })
})
