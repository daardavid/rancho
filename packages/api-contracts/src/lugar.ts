import { z } from 'zod'

import {
  LARGO_MAXIMO_MOTIVO,
  LARGO_MAXIMO_NOMBRE,
  LARGO_MAXIMO_NOTA,
  diaSchema,
} from './animales'
import { LARGO_MAXIMO_REPORTED_BY } from './pesajes'

/**
 * Contratos de los potreros y del lugar esperado.
 *
 * Un potrero es una referencia del rancho: un id y un nombre que el rancho
 * usa. No viajan hectáreas, carga animal ni mapa, y no se afirma que los
 * potreros cubran el rancho (`docs/architecture/domain-boundaries.md`,
 * «Paddock reference and expected location»).
 *
 * El lugar esperado es una asignación con fecha, no una observación: asignar
 * no dice que alguien vio al animal. `potreroId: null` es «No sé», un valor
 * pleno del rancho.
 */

const nombreSchema = z.string().trim().min(1).max(LARGO_MAXIMO_NOMBRE)
const notaSchema = z.string().trim().min(1).max(LARGO_MAXIMO_NOTA)
const motivoSchema = z.string().trim().min(1).max(LARGO_MAXIMO_MOTIVO)
const instanteSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

/**
 * Quién lo dijo: texto libre, no una cuenta. El tope es el mismo que el de la
 * sesión de pesaje, porque es el mismo dato dicho por la misma gente. Un origen
 * en blanco no es un origen: si no se sabe, no se manda.
 */
const reportedBySchema = z.string().trim().min(1).max(LARGO_MAXIMO_REPORTED_BY)

export const potreroSchema = z.strictObject({
  id: z.uuid(),
  nombre: nombreSchema.nullable(),
  nota: notaSchema.nullable(),
  version: z.number().int().nonnegative(),
  recordedBy: z.string().trim().min(1),
  recordedAt: instanteSchema,
})

export const correccionDePotreroSchema = z.strictObject({
  campo: z.enum(['nombre', 'nota']),
  valorAnterior: z.string().nullable(),
  motivo: motivoSchema,
  correctedBy: z.string().trim().min(1),
  correctedAt: instanteSchema,
})

export const potreroConHistoriaSchema = potreroSchema.extend({
  correcciones: z.array(correccionDePotreroSchema),
})

/**
 * Crear el potrero. El nombre es opcional: el rancho puede identificar el
 * potrero antes de tener claro cómo llamarlo, y se le pone nombre después sin
 * crear otro. Lo que no se inventa es un nombre.
 */
export const registrarPotreroSchema = z.strictObject({
  commandId: z.uuid(),
  id: z.uuid(),
  nombre: nombreSchema.optional(),
  nota: notaSchema.optional(),
})

export const corregirPotreroSchema = z
  .strictObject({
    commandId: z.uuid(),
    version: z.number().int().nonnegative(),
    motivo: motivoSchema,
    nombre: nombreSchema.nullable().optional(),
    nota: notaSchema.nullable().optional(),
  })
  .superRefine((valor, ctx) => {
    if (valor.nombre === undefined && valor.nota === undefined) {
      ctx.addIssue({ code: 'custom', path: ['nombre'], message: 'No hay nada que corregir.' })
    }
  })

export const asignacionDeLugarSchema = z.strictObject({
  id: z.uuid(),
  potreroId: z.uuid().nullable(),
  desde: diaSchema,
  nota: notaSchema.nullable(),
  /** Quién lo dijo, en texto libre. `null`: no se anotó. */
  reportedBy: reportedBySchema.nullable(),
  recordedBy: z.string().trim().min(1),
  recordedAt: instanteSchema,
})

export const lugarDelAnimalSchema = z.strictObject({
  vigente: asignacionDeLugarSchema.nullable(),
  historia: z.array(asignacionDeLugarSchema),
})

/** El lugar vigente de un animal activo. Los que nunca se movieron no salen. */
export const lugarEnElHatoSchema = z.strictObject({
  animalId: z.uuid(),
  potreroId: z.uuid().nullable(),
  desde: diaSchema,
})

export const lugaresDelHatoSchema = z.strictObject({
  animales: z.array(lugarEnElHatoSchema),
})

/**
 * Una asignación del grupo. El id lo acuña el cliente, igual que el del animal:
 * reintentar el mismo comando no duplica renglones.
 */
export const movimientosDeLugarSchema = z.strictObject({
  animalId: z.uuid(),
  asignacionId: z.uuid(),
})

export const asignarLugarSchema = z.strictObject({
  commandId: z.uuid(),
  potreroId: z.uuid().nullable(),
  desde: diaSchema,
  nota: notaSchema.nullable().optional(),
  /**
   * Quién lo dijo. Es opcional: no saber quién avisó del movimiento no impide
   * anotarlo, y un texto en blanco no es un origen (se rechaza).
   */
  reportedBy: reportedBySchema.optional(),
  animales: z.array(movimientosDeLugarSchema).min(1),
})

export const asignacionesDeLugarSchema = z.strictObject({
  asignaciones: z.array(asignacionDeLugarSchema),
})

export const potreroEnLaListaSchema = potreroConHistoriaSchema.extend({
  esperados: z.number().int().nonnegative(),
})

export const potrerosDelRanchoSchema = z.strictObject({
  potreros: z.array(potreroEnLaListaSchema),
  /** Activos que nunca se movieron en la app. */
  sinAsignacion: z.number().int().nonnegative(),
  /** Activos con una asignación «No sé» vigente. */
  desconocidos: z.number().int().nonnegative(),
})

export const codigoDeErrorDeLugarSchema = z.enum([
  'cuerpo_invalido',
  'no_encontrado',
  'version_conflict',
  'idempotency_mismatch',
  'potrero_ya_existe',
  'asignacion_ya_existe',
  'asignacion_vacia',
  'animal_repetido',
  'correccion_vacia',
  'motivo_vacio',
  'dia_invalido',
  'texto_invalido',
])

export const errorDeLugarSchema = z.strictObject({
  codigo: codigoDeErrorDeLugarSchema,
})

export type Potrero = z.infer<typeof potreroSchema>
export type PotreroConHistoria = z.infer<typeof potreroConHistoriaSchema>
export type RegistrarPotrero = z.infer<typeof registrarPotreroSchema>
export type CorregirPotrero = z.infer<typeof corregirPotreroSchema>
export type AsignacionDeLugar = z.infer<typeof asignacionDeLugarSchema>
export type LugarDelAnimal = z.infer<typeof lugarDelAnimalSchema>
export type LugarEnElHato = z.infer<typeof lugarEnElHatoSchema>
export type LugaresDelHato = z.infer<typeof lugaresDelHatoSchema>
export type AsignarLugar = z.infer<typeof asignarLugarSchema>
export type AsignacionesDeLugar = z.infer<typeof asignacionesDeLugarSchema>
export type PotreroEnLaLista = z.infer<typeof potreroEnLaListaSchema>
export type PotrerosDelRancho = z.infer<typeof potrerosDelRanchoSchema>
export type ErrorDeLugar = z.infer<typeof errorDeLugarSchema>
