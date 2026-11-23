import { describe, expect, it } from 'vitest'

import { iniciarSesionSchema, sesionActualSchema } from '../src/index'

describe('iniciarSesionSchema', () => {
  it('acepta usuario y contraseña', () => {
    expect(
      iniciarSesionSchema.parse({ usuario: '  propietario  ', contrasena: 'una-contraseña' }),
    ).toEqual({ usuario: 'propietario', contrasena: 'una-contraseña' })
  })

  it('rechaza un rancho mandado por el cliente', () => {
    const resultado = iniciarSesionSchema.safeParse({
      usuario: 'propietario',
      contrasena: 'una-contraseña',
      ranchId: '6b9e3c2a-1d4f-4a8b-9c7e-0f1a2b3c4d5e',
    })

    expect(resultado.success).toBe(false)
  })

  it('rechaza un cuerpo vacío', () => {
    expect(iniciarSesionSchema.safeParse({}).success).toBe(false)
  })
})

describe('sesionActualSchema', () => {
  it('describe quién está en la sesión, sin contraseña', () => {
    const cuerpo = {
      cuentaId: '6b9e3c2a-1d4f-4a8b-9c7e-0f1a2b3c4d5e',
      rol: 'owner' as const,
      ranchId: '11111111-1111-4111-8111-111111111111',
    }

    expect(sesionActualSchema.parse(cuerpo)).toEqual(cuerpo)
    expect(sesionActualSchema.safeParse({ ...cuerpo, contrasena: 'no' }).success).toBe(false)
    expect(sesionActualSchema.safeParse({ ...cuerpo, rol: 'worker' }).success).toBe(false)
  })
})
