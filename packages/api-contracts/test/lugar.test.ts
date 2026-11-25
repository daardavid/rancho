import { describe, expect, it } from 'vitest'

import {
  asignarLugarSchema,
  lugarDelAnimalSchema,
  potrerosDelRanchoSchema,
  registrarPotreroSchema,
} from '../src/lugar'

const COMMAND = '11111111-1111-4111-8111-111111111111'
const ANIMAL = '22222222-2222-4222-8222-222222222222'
const POTRERO = '33333333-3333-4333-8333-333333333333'
const ASIGNACION = '44444444-4444-4444-8444-444444444444'
const CUANDO = '2026-11-22T15:04:05.678Z'

describe('contrato del potrero', () => {
  it('acepta un potrero sin nombre: el id es la identidad, el nombre es cómo se le dice', () => {
    const leido = registrarPotreroSchema.safeParse({ commandId: COMMAND, id: POTRERO })
    expect(leido.success).toBe(true)
  })

  it('no acepta hectáreas ni mapa: no son parte del potrero', () => {
    const leido = registrarPotreroSchema.safeParse({
      commandId: COMMAND,
      id: POTRERO,
      nombre: 'El Zapote',
      hectareas: '12.5',
    })
    expect(leido.success).toBe(false)
  })

  it('un nombre vacío no es un nombre', () => {
    expect(
      registrarPotreroSchema.safeParse({ commandId: COMMAND, id: POTRERO, nombre: '   ' }).success,
    ).toBe(false)
  })

  it('la lista exige los dos huecos por separado y el conteo por potrero', () => {
    const valido = potrerosDelRanchoSchema.safeParse({
      potreros: [
        {
          id: POTRERO,
          nombre: 'El Zapote',
          nota: null,
          version: 1,
          recordedBy: ANIMAL,
          recordedAt: CUANDO,
          correcciones: [],
          esperados: 8,
        },
      ],
      sinAsignacion: 2,
      desconocidos: 1,
    })
    expect(valido.success).toBe(true)

    const sinHuecos = potrerosDelRanchoSchema.safeParse({ potreros: [] })
    expect(sinHuecos.success).toBe(false)
  })
})

describe('contrato del lugar esperado', () => {
  it('«No sé» viaja como potrero nulo y es una asignación válida', () => {
    const leido = asignarLugarSchema.safeParse({
      commandId: COMMAND,
      potreroId: null,
      desde: '2026-11-20',
      animales: [{ animalId: ANIMAL, asignacionId: ASIGNACION }],
    })
    expect(leido.success).toBe(true)
  })

  it('un grupo vacío no es un movimiento', () => {
    const leido = asignarLugarSchema.safeParse({
      commandId: COMMAND,
      potreroId: POTRERO,
      desde: '2026-11-20',
      animales: [],
    })
    expect(leido.success).toBe(false)
  })

  it('un día que no existe se rechaza', () => {
    const leido = asignarLugarSchema.safeParse({
      commandId: COMMAND,
      potreroId: POTRERO,
      desde: '2026-02-31',
      animales: [{ animalId: ANIMAL, asignacionId: ASIGNACION }],
    })
    expect(leido.success).toBe(false)
  })

  it('el lugar del animal no trae calidad de dato: no es una observación', () => {
    const leido = lugarDelAnimalSchema.safeParse({
      vigente: {
        id: ASIGNACION,
        potreroId: POTRERO,
        desde: '2026-11-20',
        nota: null,
        recordedBy: ANIMAL,
        recordedAt: CUANDO,
      },
      historia: [],
    })
    expect(leido.success).toBe(true)

    const conCalidad = lugarDelAnimalSchema.safeParse({
      vigente: {
        id: ASIGNACION,
        potreroId: POTRERO,
        desde: '2026-11-20',
        nota: null,
        recordedBy: ANIMAL,
        recordedAt: CUANDO,
        calidad: 'measured',
      },
      historia: [],
    })
    expect(conCalidad.success).toBe(false)
  })
})
