import { describe, expect, it } from 'vitest'

import { recordedBySchema } from '../../../src/shared-kernel/actores'
import { animalIdSchema, ranchIdSchema } from '../../../src/shared-kernel/ids'
import { abrirDestete, corregirDestete, fechaElegida } from '../../../src/modules/herd/domain/destete'
import { RechazoDeHerd } from '../../../src/modules/herd/domain/errores'

const ranchId = ranchIdSchema.parse('11111111-1111-4111-8111-111111111111')
const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')
const animalId = animalIdSchema.parse('33333333-3333-4333-8333-333333333333')
const cuando = new Date('2026-03-01T18:00:00.000Z')

describe('fecha del destete', () => {
  it('exige una elección y no acepta un día junto a «No sé»', () => {
    expect(fechaElegida({ precision: 'exact', fecha: '2024-08-01' })).toEqual({
      fecha: '2024-08-01',
      precision: 'exact',
    })
    expect(fechaElegida({ precision: 'no_se', fecha: null })).toEqual({
      fecha: null,
      precision: null,
    })
    expect(() => fechaElegida({ precision: 'exact', fecha: null })).toThrow(RechazoDeHerd)
    expect(() => fechaElegida({ precision: 'no_se', fecha: '2024-08-01' })).toThrow(RechazoDeHerd)
  })
})

describe('corregir un destete', () => {
  it('guarda el día anterior y no toca el peso', () => {
    const destete = abrirDestete({
      id: '44444444-4444-4444-8444-444444444444',
      ranchId,
      animalId,
      cuando: { precision: 'exact', fecha: '2024-08-01' },
      nota: 'dicho',
      reportedBy: 'el trabajador',
      pesoId: '55555555-5555-4555-8555-555555555555',
      recordedBy,
      recordedAt: cuando,
    })

    const corregido = corregirDestete(
      destete,
      { cuando: { precision: 'approximate', fecha: '2024-08-15' } },
      'el día era aproximado',
    )

    expect(corregido.destete.fecha).toBe('2024-08-15')
    expect(corregido.destete.precision).toBe('approximate')
    expect(corregido.destete.pesoId).toBe(destete.pesoId)
    expect(corregido.destete.version).toBe(2)
    expect(corregido.anteriores).toEqual([
      { campo: 'fecha', valorAnterior: '2024-08-01' },
      { campo: 'precision', valorAnterior: 'exact' },
    ])
    expect(() => corregirDestete(destete, {}, 'nada cambió')).toThrow(RechazoDeHerd)
  })
})
