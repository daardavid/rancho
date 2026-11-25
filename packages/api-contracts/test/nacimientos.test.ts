import { describe, expect, it } from 'vitest'

import { registrarNacimientoSchema } from '../src/nacimientos'

const base = {
  commandId: '11111111-1111-4111-8111-111111111111',
  id: '22222222-2222-4222-8222-222222222222',
  filiacionId: '33333333-3333-4333-8333-333333333333',
  fechaNacimiento: null,
  precisionFecha: null,
  madre: { certeza: 'unknown', animalId: null, motivo: null },
  padre: { certeza: 'unknown', animalId: null, motivo: null },
}

describe('contrato de nacimiento', () => {
  it('acepta un parto con todo desconocido', () => {
    expect(registrarNacimientoSchema.safeParse(base).success).toBe(true)
  })

  it('no acepta único toro como observado ni como motivo de la madre', () => {
    const observado = registrarNacimientoSchema.safeParse({
      ...base,
      padre: {
        certeza: 'observed',
        animalId: '44444444-4444-4444-8444-444444444444',
        motivo: 'unico_toro',
      },
    })
    const madre = registrarNacimientoSchema.safeParse({
      ...base,
      madre: {
        certeza: 'inferred',
        animalId: '44444444-4444-4444-8444-444444444444',
        motivo: 'unico_toro',
      },
    })

    expect(observado.success).toBe(false)
    expect(madre.success).toBe(false)
  })
})
