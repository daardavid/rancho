import { describe, expect, it } from 'vitest'

import { recordedBySchema } from '../../../src/shared-kernel/actores'
import { animalIdSchema, evidenceIdSchema, ranchIdSchema } from '../../../src/shared-kernel/ids'
import { parsearKilosAGramos } from '../../../src/shared-kernel/kilos'
import { corregirPeso } from '../../../src/modules/growth/domain/correccion'
import { RechazoDeGrowth } from '../../../src/modules/growth/domain/errores'
import { efectoDeHueco, registrarSesion, type FilaHueco } from '../../../src/modules/growth/domain/sesion'

const ranchId = ranchIdSchema.parse('11111111-1111-4111-8111-111111111111')
const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')
const animalA = animalIdSchema.parse('33333333-3333-4333-8333-333333333333')
const animalB = animalIdSchema.parse('44444444-4444-4444-8444-444444444444')
const cuando = new Date('2026-03-15T18:00:00.000Z')

function base() {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    ranchId,
    fecha: '2026-03-15',
    recordedBy,
    recordedAt: cuando,
    commandId: '66666666-6666-4666-8666-666666666666',
  }
}

describe('sesión de pesaje', () => {
  it('un hueco no es una baja ni una verificación del hato', () => {
    const sesion = registrarSesion({
      ...base(),
      filas: [{ id: '77777777-7777-4777-8777-777777777777', animalId: animalA, resultado: 'hueco' }],
    })

    const fila = sesion.filas[0]
    expect(fila).toBeDefined()
    if (fila === undefined || fila.resultado !== 'hueco') {
      throw new Error('Se esperaba un hueco.')
    }

    const hueco: FilaHueco = fila
    expect(efectoDeHueco(hueco)).toEqual({
      animalId: animalA,
      clase: 'esperado_y_no_pesado',
      daDeBaja: false,
      verificaElHato: false,
    })
    expect(Object.keys(hueco).sort()).toEqual(['animalId', 'id', 'resultado'])
    expect(Object.keys(sesion)).not.toContain('verificacion')
    expect(Object.keys(sesion)).not.toContain('bajas')
    expect(hueco).not.toHaveProperty('activo')
    expect(hueco).not.toHaveProperty('kilos')
  })

  it('rechaza un animal repetido en la misma sesión', () => {
    expect(() =>
      registrarSesion({
        ...base(),
        filas: [
          {
            id: '77777777-7777-4777-8777-777777777777',
            animalId: animalA,
            resultado: 'pesado',
            kilos: parsearKilosAGramos('180.000'),
            calidad: 'measured',
          },
          { id: '88888888-8888-4888-8888-888888888888', animalId: animalA, resultado: 'hueco' },
        ],
      }),
    ).toThrow(expect.objectContaining({ codigo: 'animal_repetido' }))
  })

  it('rechaza un peso sin calidad', () => {
    expect(() =>
      registrarSesion({
        ...base(),
        filas: [
          {
            id: '77777777-7777-4777-8777-777777777777',
            animalId: animalA,
            resultado: 'pesado',
            kilos: parsearKilosAGramos('180.000'),
          },
        ],
      }),
    ).toThrow(expect.objectContaining({ codigo: 'peso_sin_calidad' }))
  })
})

describe('corregir un peso', () => {
  it('guarda el valor anterior y no toca la fecha de la sesión, que no vive en el peso', () => {
    const sesion = registrarSesion({
      ...base(),
      filas: [
        {
          id: '77777777-7777-4777-8777-777777777777',
          animalId: animalA,
          resultado: 'pesado',
          kilos: parsearKilosAGramos('351.125'),
          calidad: 'measured',
        },
        { id: '88888888-8888-4888-8888-888888888888', animalId: animalB, resultado: 'hueco' },
      ],
    })
    const peso = sesion.filas[0]
    const hueco = sesion.filas[1]
    if (peso === undefined || hueco === undefined) {
      throw new Error('Faltan las filas.')
    }

    const corregido = corregirPeso(peso, { kilos: parsearKilosAGramos('350.000') }, 'leí de más')

    expect(corregido.fila.version).toBe(2)
    expect(corregido.fila.id).toBe(peso.id)
    expect(corregido.anteriores).toEqual([{ campo: 'kilos', valorAnterior: '351.125' }])
    expect(corregido.fila).not.toHaveProperty('fecha')
    expect(sesion.fecha).toBe('2026-03-15')
    expect(() => corregirPeso(hueco, { calidad: 'declared' }, 'no aplica')).toThrow(RechazoDeGrowth)
  })

  it('poner o quitar la foto no cambia la calidad ni los kilos', () => {
    const foto = evidenceIdSchema.parse('99999999-9999-4999-8999-999999999999')
    const otra = evidenceIdSchema.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    const sesion = registrarSesion({
      ...base(),
      filas: [
        {
          id: '77777777-7777-4777-8777-777777777777',
          animalId: animalA,
          resultado: 'pesado',
          kilos: parsearKilosAGramos('180.000'),
          calidad: 'observed',
          evidenciaId: foto,
        },
      ],
    })
    const peso = sesion.filas[0]
    if (peso === undefined || peso.resultado !== 'pesado') {
      throw new Error('Se esperaba un peso.')
    }

    expect(peso.calidad).toBe('observed')
    expect(peso.evidenciaId).toBe(foto)

    const cambiada = corregirPeso(peso, { evidenciaId: otra }, 'era otra foto')
    expect(cambiada.fila.calidad).toBe('observed')
    expect(cambiada.fila.kilos).toBe(peso.kilos)
    expect(cambiada.fila.evidenciaId).toBe(otra)
    expect(cambiada.anteriores).toEqual([{ campo: 'evidencia', valorAnterior: foto }])

    const quitada = corregirPeso(cambiada.fila, { evidenciaId: null }, 'no era de este becerro')
    expect(quitada.fila.calidad).toBe('observed')
    expect(quitada.fila.kilos).toBe(peso.kilos)
    expect(quitada.fila.evidenciaId).toBeNull()
    expect(quitada.anteriores).toEqual([{ campo: 'evidencia', valorAnterior: otra }])
  })
})
