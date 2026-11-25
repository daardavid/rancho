import { describe, expect, it } from 'vitest'

import { recordedBySchema } from '../../../src/shared-kernel/actores'
import { animalIdSchema, ranchIdSchema } from '../../../src/shared-kernel/ids'
import { RechazoDeHerd } from '../../../src/modules/herd/domain/errores'
import { abrirFiliacion, corregirFiliacion, exigirUnicoToro } from '../../../src/modules/herd/domain/filiacion'
import { animalDeNacimiento } from '../../../src/modules/herd/domain/nacimiento'

const ranchId = ranchIdSchema.parse('11111111-1111-4111-8111-111111111111')
const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')
const criaId = animalIdSchema.parse('33333333-3333-4333-8333-333333333333')
const madreId = '44444444-4444-4444-8444-444444444444'
const padreId = '55555555-5555-4555-8555-555555555555'
const cuando = new Date('2026-03-01T18:00:00.000Z')

const desconocido = { certeza: 'unknown' as const, animalId: null, motivo: null }

function abrir(parcial: Parameters<typeof abrirFiliacion>[0] = {
  id: '66666666-6666-4666-8666-666666666666',
  ranchId,
  criaId,
  madre: desconocido,
  padre: desconocido,
  recordedBy,
  recordedAt: cuando,
}) {
  return abrirFiliacion(parcial)
}

describe('filiación', () => {
  it('acepta madre y padre desconocidos, y una fecha aproximada', () => {
    const filiacion = abrir({
      id: '66666666-6666-4666-8666-666666666666',
      ranchId,
      criaId,
      madre: desconocido,
      padre: desconocido,
      fechaNacimiento: '2026-03-02',
      precisionFecha: 'approximate',
      recordedBy,
      recordedAt: cuando,
    })

    expect(filiacion.madre).toEqual(desconocido)
    expect(filiacion.padre).toEqual(desconocido)
    expect(filiacion.fechaNacimiento).toBe('2026-03-02')
    expect(filiacion.precisionFecha).toBe('approximate')
    expect(filiacion.version).toBe(1)
    expect(filiacion).not.toHaveProperty('porcentaje')
  })

  it('no guarda único toro como observado ni como motivo de la madre', () => {
    expect(() =>
      abrir({
        id: '66666666-6666-4666-8666-666666666666',
        ranchId,
        criaId,
        madre: desconocido,
        padre: { certeza: 'observed', animalId: padreId, motivo: 'unico_toro' },
        recordedBy,
        recordedAt: cuando,
      }),
    ).toThrow(RechazoDeHerd)

    expect(() =>
      abrir({
        id: '66666666-6666-4666-8666-666666666666',
        ranchId,
        criaId,
        madre: { certeza: 'inferred', animalId: madreId, motivo: 'unico_toro' },
        padre: desconocido,
        recordedBy,
        recordedAt: cuando,
      }),
    ).toThrow(RechazoDeHerd)
  })

  it('exige animal y motivo cuando el lado es inferido, y ninguno cuando es desconocido', () => {
    expect(() =>
      abrir({
        id: '66666666-6666-4666-8666-666666666666',
        ranchId,
        criaId,
        madre: { certeza: 'inferred', animalId: madreId, motivo: null },
        padre: desconocido,
        recordedBy,
        recordedAt: cuando,
      }),
    ).toThrow(RechazoDeHerd)

    expect(() =>
      abrir({
        id: '66666666-6666-4666-8666-666666666666',
        ranchId,
        criaId,
        madre: { certeza: 'unknown', animalId: madreId, motivo: null },
        padre: desconocido,
        recordedBy,
        recordedAt: cuando,
      }),
    ).toThrow(RechazoDeHerd)
  })

  it('único toro solo aplica si ese toro es el único activo', () => {
    const padre = { certeza: 'inferred' as const, animalId: padreId, motivo: 'unico_toro' as const }
    expect(() => exigirUnicoToro(padre, [])).toThrow(RechazoDeHerd)
    expect(() => exigirUnicoToro(padre, [padreId, madreId])).toThrow(RechazoDeHerd)
    expect(() => exigirUnicoToro(padre, [madreId])).toThrow(RechazoDeHerd)
    expect(() => exigirUnicoToro(padre, [padreId])).not.toThrow()
    expect(() => exigirUnicoToro(desconocido, [])).not.toThrow()
  })
})

describe('corregir la filiación', () => {
  it('guarda la certeza anterior y no cambia la cría', () => {
    const actual = abrir()
    const corregida = corregirFiliacion(
      actual,
      { madre: { certeza: 'observed', animalId: madreId, motivo: null } },
      'la vieron parir',
    )

    expect(corregida.filiacion.criaId).toBe(actual.criaId)
    expect(corregida.filiacion.version).toBe(2)
    expect(corregida.filiacion.recordedAt).toEqual(cuando)
    expect(corregida.anterior.madre).toEqual(desconocido)
    expect(corregida.filiacion.madre.certeza).toBe('observed')
    expect(corregida.motivo).toBe('la vieron parir')
  })

  it('rechaza una corrección que no cambia nada', () => {
    expect(() => corregirFiliacion(abrir(), {}, 'sin cambio')).toThrow(RechazoDeHerd)
  })
})

describe('cría del nacimiento', () => {
  it('nace activa, becerro, y sin participación calculada', () => {
    const cria = animalDeNacimiento({
      id: criaId,
      ranchId,
      recordedBy,
      recordedAt: cuando,
      tenencia: 'unknown',
      sexo: 'female',
    })

    expect(cria.activo).toBe(true)
    expect(cria.categoria).toBe('calf')
    expect(cria.sexo).toBe('female')
    expect(cria.tenencia).toBe('unknown')
    expect(cria.participacionEconomica).toBe('unknown')
    expect(cria).not.toHaveProperty('madre')
    expect(cria).not.toHaveProperty('padre')
  })
})
