import { z } from 'zod'

/**
 * Contratos de `POST`, `GET` y `DELETE /api/session`.
 *
 * El cuerpo de entrada no acepta un rancho: el alcance sale de la cuenta
 * guardada, no de quien llama ([ADR-013](../../../docs/architecture/adr/ADR-013-ranch-scope.md)).
 */

export const LARGO_MAXIMO_USUARIO = 64
export const LARGO_MAXIMO_CONTRASENA = 200

export const usuarioSchema = z.string().trim().min(1).max(LARGO_MAXIMO_USUARIO)

/** Lo que se teclea al entrar. Crear la cuenta exige un mínimo aparte. */
export const contrasenaDeIngresoSchema = z.string().min(1).max(LARGO_MAXIMO_CONTRASENA)

export const iniciarSesionSchema = z.strictObject({
  usuario: usuarioSchema,
  contrasena: contrasenaDeIngresoSchema,
})

export type IniciarSesion = z.infer<typeof iniciarSesionSchema>

/** Roles que esta instalación puede crear. El resto de ADR-010 queda reservado. */
export const rolDeCuentaSchema = z.enum(['owner', 'support'])
export type RolDeCuenta = z.infer<typeof rolDeCuentaSchema>

export const sesionActualSchema = z.strictObject({
  cuentaId: z.uuid(),
  rol: rolDeCuentaSchema,
  ranchId: z.uuid(),
})

export type SesionActual = z.infer<typeof sesionActualSchema>

export const codigoDeErrorDeSesionSchema = z.enum([
  'cuerpo_invalido',
  'credenciales_invalidas',
  'demasiados_intentos',
  'no_autenticado',
  'prohibido',
])

/**
 * `segundos` solo viene con `demasiados_intentos`: es lo que falta para poder
 * volver a intentar. La pantalla lo usa para decir cuánto esperar en vez de
 * inventar un plazo.
 */
export const errorDeSesionSchema = z.strictObject({
  codigo: codigoDeErrorDeSesionSchema,
  segundos: z.number().int().positive().optional(),
})

export type ErrorDeSesion = z.infer<typeof errorDeSesionSchema>
