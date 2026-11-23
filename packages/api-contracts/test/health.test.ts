import { describe, expect, it } from 'vitest'

import { healthResponseSchema } from '../src/index'

describe('healthResponseSchema', () => {
  it('acepta la respuesta sana de la API', () => {
    expect(healthResponseSchema.parse({ ok: true })).toEqual({ ok: true })
  })

  it('rechaza una respuesta que no confirma el estado', () => {
    expect(healthResponseSchema.safeParse({ ok: false }).success).toBe(false)
    expect(healthResponseSchema.safeParse({}).success).toBe(false)
    expect(healthResponseSchema.safeParse({ ok: 'true' }).success).toBe(false)
  })
})
