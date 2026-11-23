import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { crearCorregirPesoSchema, crearRegistrarSesionSchema, sesionDePesajeSchema } from '../src/index'

const commandId = '33333333-3333-4333-8333-333333333333'
const sesionId = '44444444-4444-4444-8444-444444444444'
const filaId = '55555555-5555-4555-8555-555555555555'
const animalId = '66666666-6666-4666-8666-666666666666'

const registrar = crearRegistrarSesionSchema(z.string())

describe('registrar sesión', () => {
  it('acepta un pesado y un hueco, y no deja pasar un peso sin calidad', () => {
    const leido = registrar.parse({
      commandId,
      id: sesionId,
      fecha: '2026-03-15',
      filas: [
        { id: filaId, animalId, resultado: 'pesado', kilos: '351.125', calidad: 'measured' },
        {
          id: '77777777-7777-4777-8777-777777777777',
          animalId: '88888888-8888-4888-8888-888888888888',
          resultado: 'hueco',
        },
      ],
    })

    expect(leido.filas[0]).toMatchObject({ kilos: '351.125', calidad: 'measured' })
    expect(leido.filas[1]).toEqual({
      id: '77777777-7777-4777-8777-777777777777',
      animalId: '88888888-8888-4888-8888-888888888888',
      resultado: 'hueco',
    })

    expect(
      registrar.safeParse({
        commandId,
        id: sesionId,
        fecha: '2026-03-15',
        filas: [{ id: filaId, animalId, resultado: 'pesado', kilos: '10' }],
      }).success,
    ).toBe(false)
  })

  it('rechaza el rancho, un número en los kilos y una fecha imposible', () => {
    expect(
      registrar.safeParse({
        commandId,
        id: sesionId,
        fecha: '2026-03-15',
        ranchId: animalId,
        filas: [],
      }).success,
    ).toBe(false)
    expect(
      registrar.safeParse({
        commandId,
        id: sesionId,
        fecha: '2026-02-31',
        filas: [],
      }).success,
    ).toBe(false)
    expect(
      registrar.safeParse({
        commandId,
        id: sesionId,
        fecha: '2026-03-15',
        filas: [{ id: filaId, animalId, resultado: 'pesado', kilos: 351.125, calidad: 'measured' }],
      }).success,
    ).toBe(false)
  })
})

describe('corregir peso', () => {
  const corregir = crearCorregirPesoSchema(z.string())

  it('pide kilos o calidad, y la versión', () => {
    expect(
      corregir.parse({ commandId, version: 1, motivo: 'leí mal', kilos: '351.125' }).kilos,
    ).toBe('351.125')
    expect(corregir.safeParse({ commandId, version: 1, motivo: 'leí mal' }).success).toBe(false)
  })
})

describe('sesión leída', () => {
  it('un hueco no trae kilos ni calidad', () => {
    const sesion = sesionDePesajeSchema.parse({
      id: sesionId,
      fecha: '2026-03-15',
      nota: null,
      reportedBy: null,
      commandId,
      recordedBy: '22222222-2222-4222-8222-222222222222',
      recordedAt: '2026-03-15T18:00:00.000Z',
      filas: [{ id: filaId, animalId, resultado: 'hueco' }],
    })

    expect(sesion.filas[0]).toEqual({ id: filaId, animalId, resultado: 'hueco' })
    expect(sesion.filas[0]).not.toHaveProperty('kilos')
    expect(sesion.filas[0]).not.toHaveProperty('baja')
  })
})
