import { describe, expect, it } from 'vitest'

import {
  corregirAnimalSchema,
  corregirSalidaSchema,
  fichaAnimalSchema,
  fichaConHistoriaSchema,
  registrarAnimalSchema,
  registrarSalidaSchema,
} from '../src/index'

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

describe('registrarSalidaSchema', () => {
  it('acepta el motivo desconocido y rechaza precio, reposición y parte', () => {
    expect(
      registrarSalidaSchema.parse({
        commandId,
        version: 1,
        motivo: 'unknown',
        fecha: '2026-04-02',
      }).motivo,
    ).toBe('unknown')

    for (const deMas of [{ precio: '10.00' }, { reposicion: 1 }, { parte: 'a_la_parte' }]) {
      expect(
        registrarSalidaSchema.safeParse({
          commandId,
          version: 1,
          motivo: 'sale',
          fecha: '2026-04-02',
          ...deMas,
        }).success,
      ).toBe(false)
    }
  })
})

describe('corregirSalidaSchema', () => {
  it('volver a activo no se mezcla con un cambio de la salida', () => {
    expect(
      corregirSalidaSchema.safeParse({
        commandId,
        version: 2,
        motivo: 'seguía aquí',
        activo: true,
        motivoDeSalida: 'sale',
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

describe('quién registró en la salida', () => {
  const base = {
    id: animalId,
    nombre: null,
    sexo: 'unknown',
    categoria: 'unknown',
    detalleCategoria: null,
    tenencia: 'unknown',
    participacionEconomica: 'unknown',
    notaDelArreglo: null,
    nota: null,
    activo: true,
    salida: null,
    version: 1,
    recordedAt: '2026-03-15T18:00:00.000Z',
    marcas: [],
  }

  it('acepta un texto con algo, no solo un UUID', () => {
    // La regla es la de `recordedBySchema` del núcleo: quién registró no es
    // necesariamente un id de cuenta.
    const leida = fichaAnimalSchema.parse({ ...base, recordedBy: 'propietario' })
    expect(leida.recordedBy).toBe('propietario')

    const uuid = fichaAnimalSchema.parse({ ...base, recordedBy: commandId })
    expect(uuid.recordedBy).toBe(commandId)
  })

  it('rechaza vacío y espacios, que no dicen quién registró', () => {
    expect(fichaAnimalSchema.safeParse({ ...base, recordedBy: '' }).success).toBe(false)
    expect(fichaAnimalSchema.safeParse({ ...base, recordedBy: '   ' }).success).toBe(false)
  })

  it('una corrección trae `correctedBy` con la misma regla', () => {
    const leida = fichaConHistoriaSchema.parse({
      ...base,
      recordedBy: 'propietario',
      correccionesDeSalida: [],
      correcciones: [
        {
          campo: 'nombre',
          valorAnterior: null,
          motivo: 'faltaba',
          correctedBy: 'propietario',
          correctedAt: '2026-03-16T18:00:00.000Z',
        },
      ],
    })
    expect(leida.correcciones[0]?.correctedBy).toBe('propietario')

    expect(
      fichaConHistoriaSchema.safeParse({
        ...base,
        recordedBy: 'propietario',
        correccionesDeSalida: [],
        correcciones: [
          {
            campo: 'nombre',
            valorAnterior: null,
            motivo: 'faltaba',
            correctedBy: '',
            correctedAt: '2026-03-16T18:00:00.000Z',
          },
        ],
      }).success,
    ).toBe(false)
  })
})
