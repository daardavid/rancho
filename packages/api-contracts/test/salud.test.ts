import { describe, expect, it } from 'vitest'

import {
  anotarSaludSchema,
  correccionDeNotaSchema,
  notaDeSaludSchema,
  notasDelAnimalSchema,
} from '../src/salud'

const COMMAND = '11111111-1111-4111-8111-111111111111'
const ANIMAL = '22222222-2222-4222-8222-222222222222'
const NOTA = '33333333-3333-4333-8333-333333333333'
const CUANDO = '2026-11-22T15:04:05.678Z'

const notaBase = {
  commandId: COMMAND,
  tipo: 'vacuna',
  detalle: 'Vacuna contra el ántrax en la manga',
  fecha: '2026-11-20',
  vioAlAnimal: false,
  animales: [{ animalId: ANIMAL, notaId: NOTA }],
}

describe('contrato de la nota de sanidad', () => {
  it('acepta una nota con lo mínimo elegido: tipo, qué se hizo, el día y si se vio', () => {
    expect(anotarSaludSchema.safeParse(notaBase).success).toBe(true)
  })

  it('no tiene calendario, dosis, retiro ni veterinario: no son parte de la nota', () => {
    for (const campo of ['dosis', 'proximaDosis', 'retiro', 'veterinario', 'calendario']) {
      const leido = anotarSaludSchema.safeParse({ ...notaBase, [campo]: 'algo' })
      expect(leido.success, campo).toBe(false)
    }
  })

  it('el tipo es el del rancho: vacuna, medicamento, baño, problema u otro', () => {
    for (const tipo of ['vacuna', 'medicamento', 'bano', 'problema', 'otro']) {
      expect(anotarSaludSchema.safeParse({ ...notaBase, tipo }).success, tipo).toBe(true)
    }
    expect(anotarSaludSchema.safeParse({ ...notaBase, tipo: 'inyeccion' }).success).toBe(false)
  })

  it('«No sé» es null y se acepta; omitirlo o mandar un texto, no', () => {
    expect(anotarSaludSchema.safeParse({ ...notaBase, vioAlAnimal: undefined }).success).toBe(false)
    expect(anotarSaludSchema.safeParse({ ...notaBase, vioAlAnimal: true }).success).toBe(true)
    expect(anotarSaludSchema.safeParse({ ...notaBase, vioAlAnimal: null }).success).toBe(true)
    expect(anotarSaludSchema.safeParse({ ...notaBase, vioAlAnimal: 'si' }).success).toBe(false)
    expect(notaDeSaludSchema.safeParse({
      id: NOTA,
      animalId: ANIMAL,
      tipo: 'problema',
      detalle: 'No se sabe si se le vio',
      fecha: '2026-11-20',
      producto: null,
      evidenciaId: null,
      vioAlAnimal: null,
      version: 1,
      recordedBy: 'cuenta',
      recordedAt: CUANDO,
    }).success).toBe(true)
  })

  it('el contrato no esconde el grupo: quien rechaza el animal repetido es la aplicación', () => {
    const leido = anotarSaludSchema.safeParse({
      ...notaBase,
      animales: [
        { animalId: ANIMAL, notaId: NOTA },
        { animalId: ANIMAL, notaId: '44444444-4444-4444-8444-444444444444' },
      ],
    })
    // El contrato solo valida la forma; el animal repetido lo dice Herd antes
    // de escribir, porque es quien escribe una nota por animal.
    expect(leido.success).toBe(true)
  })

  it('sin animales no hay nota', () => {
    expect(anotarSaludSchema.safeParse({ ...notaBase, animales: [] }).success).toBe(false)
  })

  it('la nota leída trae el producto nulo, la foto nula y si se vio al animal', () => {
    const leido = notaDeSaludSchema.safeParse({
      id: NOTA,
      animalId: ANIMAL,
      tipo: 'problema',
      detalle: 'Se le vio cojera',
      fecha: '2026-11-20',
      producto: null,
      evidenciaId: null,
      vioAlAnimal: true,
      version: 1,
      recordedBy: 'cuenta',
      recordedAt: CUANDO,
    })
    expect(leido.success).toBe(true)
  })

  it('la corrección exige el motivo y al menos un cambio', () => {
    expect(
      correccionDeNotaSchema.safeParse({
        commandId: COMMAND,
        version: 1,
        motivo: 'el producto era otro',
      }).success,
    ).toBe(false)

    expect(
      correccionDeNotaSchema.safeParse({
        commandId: COMMAND,
        version: 1,
        motivo: 'el producto era otro',
        producto: 'Ántrax 400',
      }).success,
    ).toBe(true)

    expect(
      correccionDeNotaSchema.safeParse({
        commandId: COMMAND,
        version: 1,
        motivo: '   ',
        producto: 'Ántrax 400',
      }).success,
    ).toBe(false)
  })

  it('las notas del animal llegan en una lista, no como un solo renglón', () => {
    const leido = notasDelAnimalSchema.safeParse({ animalId: ANIMAL, notas: [] })
    expect(leido.success).toBe(true)
  })
})
