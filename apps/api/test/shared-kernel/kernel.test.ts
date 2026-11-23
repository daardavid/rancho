import { describe, expect, it } from 'vitest'

import { animalIdSchema, commandIdSchema, nuevoId, ranchIdSchema } from '../../src/shared-kernel/ids'
import { recordedBySchema, reportedBySchema } from '../../src/shared-kernel/actores'
import { sourceQualitySchema } from '../../src/shared-kernel/source-quality'
import { versionSchema } from '../../src/shared-kernel/version'

const UUID = '1f0a3c9e-6f2b-4d5a-9a41-7c0d2e8b1a33'

describe('ids del núcleo', () => {
  it('aceptan un UUID', () => {
    expect(ranchIdSchema.parse(UUID)).toBe(UUID)
    expect(animalIdSchema.parse(UUID)).toBe(UUID)
    expect(commandIdSchema.parse(UUID)).toBe(UUID)
  })

  it('rechazan un texto que no es un id', () => {
    expect(ranchIdSchema.safeParse('rancho-1').success).toBe(false)
    expect(animalIdSchema.safeParse('').success).toBe(false)
    expect(commandIdSchema.safeParse('123').success).toBe(false)
  })

  it('generan UUID v4', () => {
    expect(nuevoId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

describe('actores', () => {
  it('RecordedBy exige algo', () => {
    expect(recordedBySchema.parse('propietario')).toBe('propietario')
    expect(recordedBySchema.safeParse('   ').success).toBe(false)
  })

  it('ReportedBy es texto libre y no un id', () => {
    // Un nombre de trabajador o un canal, tal como lo dijo el rancho.
    expect(reportedBySchema.parse('Don Chico, por WhatsApp')).toBe('Don Chico, por WhatsApp')
    expect(reportedBySchema.safeParse('').success).toBe(false)
  })
})

describe('calidad de la fuente', () => {
  it('acepta los tres valores del dominio', () => {
    expect(sourceQualitySchema.parse('measured')).toBe('measured')
    expect(sourceQualitySchema.parse('observed')).toBe('observed')
    expect(sourceQualitySchema.parse('declared')).toBe('declared')
  })

  it('no acepta sinónimos ni traducciones', () => {
    expect(sourceQualitySchema.safeParse('medido').success).toBe(false)
    expect(sourceQualitySchema.safeParse('MEDIDO').success).toBe(false)
    expect(sourceQualitySchema.safeParse('estimated').success).toBe(false)
  })
})

describe('versión', () => {
  it('acepta enteros no negativos', () => {
    expect(versionSchema.parse(0)).toBe(0)
    expect(versionSchema.parse(7)).toBe(7)
  })

  it('rechaza fracciones y negativos', () => {
    expect(versionSchema.safeParse(1.5).success).toBe(false)
    expect(versionSchema.safeParse(-1).success).toBe(false)
    expect(versionSchema.safeParse(Number.NaN).success).toBe(false)
  })
})
