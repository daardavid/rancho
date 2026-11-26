import { z } from 'zod'

import { LARGO_MAXIMO_NOMBRE, categoriaSchema, diaSchema } from './animales'

/**
 * Lecturas de presencia: la última observación y la pantalla de Inicio.
 *
 * Son consultas. La última observación no es una columna de `Animal` y no se
 * corrige aquí: si el dato está mal, se corrige el pesaje o la nota que la
 * produjo, o el nacimiento si la madre quedó en «La vi» y hay fecha: ese día
 * cuenta para la cría y para la madre. Un hueco, una asignación de lugar, una
 * nota que no dice que el animal se vio (incluido «No sé»), un diagnóstico de
 * preñez que no dice que se vio, y un parto inferido o en «No sé» no son una
 * observación. Un diagnóstico que dice que sí se vio, sí cuenta.
 *
 * `dias` lo calcula PostgreSQL contra el día del rancho. No hay un umbral de
 * «lleva mucho sin verse»: la lista trae a todos los que tienen observación,
 * ordenados por esos días.
 */

export const origenDeObservacionSchema = z.enum([
  'pesaje',
  'sanidad',
  'nacimiento',
  'diagnostico',
])

export const observacionSchema = z.strictObject({
  fecha: diaSchema,
  origen: origenDeObservacionSchema,
  origenId: z.uuid(),
  /** Días de calendario del rancho desde `fecha`. Puede ser 0. */
  dias: z.number().int(),
})

export const ultimaObservacionSchema = z.strictObject({
  animalId: z.uuid(),
  /** `null` cuando no hay pesaje, nota vista ni parto visto. No es un cero. */
  observacion: observacionSchema.nullable(),
})

export const animalDelInicioSchema = z.strictObject({
  animalId: z.uuid(),
  nombre: z.string().trim().min(1).max(LARGO_MAXIMO_NOMBRE).nullable(),
  categoria: categoriaSchema,
})

export const animalSinVerseSchema = animalDelInicioSchema.extend({
  dias: z.number().int(),
  fecha: diaSchema,
  origen: origenDeObservacionSchema,
  origenId: z.uuid(),
})

export const cambioDelPeriodoSchema = animalDelInicioSchema.extend({
  fecha: diaSchema,
})

export const conteoDeCategoriaSchema = z.strictObject({
  categoria: categoriaSchema,
  cantidad: z.number().int().positive(),
})

/**
 * La revisión del periodo.
 *
 * `nacimientos` solo cuenta partos con fecha. `nacimientosSinFecha` son los
 * que no tienen día: no se suman al periodo ni se esconden. `pesajes` son
 * animales pesados, no huecos. `notasDeSanidad` son todas las notas del
 * periodo, se haya visto al animal o no.
 */
export const inicioSchema = z.strictObject({
  hoy: diaSchema,
  desde: diaSchema,
  activosPorCategoria: z.array(conteoDeCategoriaSchema),
  cambios: z.strictObject({
    nacimientos: z.array(cambioDelPeriodoSchema),
    nacimientosSinFecha: z.number().int().nonnegative(),
    salidas: z.array(cambioDelPeriodoSchema),
    pesajes: z.number().int().nonnegative(),
    notasDeSanidad: z.number().int().nonnegative(),
  }),
  paraRevisar: z.strictObject({
    /** `null` cuando el rancho no tiene ninguna vuelta. No es «cero huecos». */
    fechaDeLaUltimaVuelta: diaSchema.nullable(),
    huecosDeLaUltimaVuelta: z.array(animalDelInicioSchema),
    sinLugar: z.array(animalDelInicioSchema),
    /**
     * La asignación vigente dice «No sé». Es un hecho, no la falta de
     * asignación, y no se cuenta como lugar conocido.
     */
    lugarDesconocido: z.array(animalDelInicioSchema),
    sinObservacion: z.array(animalDelInicioSchema),
    /** Todos los activos con observación, de más días a menos. Sin umbral. */
    porDiasSinVerse: z.array(animalSinVerseSchema),
  }),
})

export const codigoDeErrorDeInicioSchema = z.enum(['cuerpo_invalido', 'no_encontrado'])

export const errorDeInicioSchema = z.strictObject({
  codigo: codigoDeErrorDeInicioSchema,
})

export type OrigenDeObservacion = z.infer<typeof origenDeObservacionSchema>
export type Observacion = z.infer<typeof observacionSchema>
export type UltimaObservacion = z.infer<typeof ultimaObservacionSchema>
export type AnimalDelInicio = z.infer<typeof animalDelInicioSchema>
export type AnimalSinVerse = z.infer<typeof animalSinVerseSchema>
export type CambioDelPeriodo = z.infer<typeof cambioDelPeriodoSchema>
export type Inicio = z.infer<typeof inicioSchema>
export type ErrorDeInicio = z.infer<typeof errorDeInicioSchema>
