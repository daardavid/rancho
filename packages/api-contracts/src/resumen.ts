import { z } from 'zod'

import { LARGO_MAXIMO_NOMBRE, diaSchema } from './animales'
import { conteoDeCategoriaSchema, origenDeObservacionSchema } from './inicio'

/**
 * El resumen de la semana que se manda por WhatsApp o se guarda como PDF
 * (INC-007, R-38).
 *
 * Es una consulta: no hay comando y no se escribe nada. Todo lo que trae ya
 * existe en los modelos de lectura de Inicio y de crecimiento, o se cuenta
 * aquí con el mismo criterio. No hay cifras calculadas de nuevo ni un dato
 * derivado guardado.
 *
 * No lleva identificadores internos ni datos de la sesión: lo que el dueño
 * comparte con su familia son nombres, días y conteos. Un animal que no se ha
 * visto, un nacimiento sin fecha o un destete sin peso se dicen; no se
 * esconden detrás de un cero.
 */

export const motivoDeSalidaDelResumenSchema = z.enum([
  'sale',
  'death',
  'confirmed_missing',
  'other',
  'unknown',
])

export const resultadoDePrenezDelResumenSchema = z.enum(['prenada', 'vacia', 'no_se'])

export const conteoDeMotivoDeSalidaSchema = z.strictObject({
  motivo: motivoDeSalidaDelResumenSchema,
  cantidad: z.number().int().positive(),
})

export const conteoDeResultadoDePrenezSchema = z.strictObject({
  resultado: resultadoDePrenezDelResumenSchema,
  cantidad: z.number().int().positive(),
})

/** Un animal en «Días sin verse». Sin id: el resumen se comparte fuera de la app. */
export const animalSinVerseEnElResumenSchema = z.strictObject({
  nombre: z.string().trim().min(1).max(LARGO_MAXIMO_NOMBRE).nullable(),
  dias: z.number().int(),
  origen: origenDeObservacionSchema,
})

export const resumenSemanalSchema = z.strictObject({
  /** El nombre del rancho. Es de la ficha del rancho, no de la sesión. */
  rancho: z.string().trim().min(1),
  hoy: diaSchema,
  desde: diaSchema,
  activos: z.strictObject({
    total: z.number().int().nonnegative(),
    porCategoria: z.array(conteoDeCategoriaSchema),
  }),
  nacimientos: z.strictObject({
    total: z.number().int().nonnegative(),
    /** Partos anotados sin día. No entran al periodo y no se callan. */
    sinFecha: z.number().int().nonnegative(),
  }),
  salidas: z.strictObject({
    total: z.number().int().nonnegative(),
    /** Un renglón por motivo con al menos una salida en el periodo. */
    porMotivo: z.array(conteoDeMotivoDeSalidaSchema),
  }),
  destetes: z.strictObject({
    total: z.number().int().nonnegative(),
    conPeso: z.number().int().nonnegative(),
    sinPeso: z.number().int().nonnegative(),
    /** Destetes «No sé» de cualquier día: no se les inventa un periodo. */
    sinFecha: z.number().int().nonnegative(),
  }),
  prenez: z.strictObject({
    total: z.number().int().nonnegative(),
    porResultado: z.array(conteoDeResultadoDePrenezSchema),
  }),
  revisar: z.strictObject({
    /** Activos sin ningún pesaje ni nota en la que se les viera. */
    sinObservacion: z.number().int().nonnegative(),
    /** Se esperaban en la última vuelta y no se pesaron. No es una baja. */
    huecosDeLaUltimaVuelta: z.number().int().nonnegative(),
    /** Todos los activos con observación, de más días a menos. Sin umbral. */
    porDiasSinVerse: z.array(animalSinVerseEnElResumenSchema),
  }),
})

export const errorDeResumenSchema = z.strictObject({
  codigo: z.enum(['cuerpo_invalido']),
})

export type MotivoDeSalidaDelResumen = z.infer<typeof motivoDeSalidaDelResumenSchema>
export type ResultadoDePrenezDelResumen = z.infer<typeof resultadoDePrenezDelResumenSchema>
export type ConteoDeMotivoDeSalida = z.infer<typeof conteoDeMotivoDeSalidaSchema>
export type ConteoDeResultadoDePrenez = z.infer<typeof conteoDeResultadoDePrenezSchema>
export type AnimalSinVerseEnElResumen = z.infer<typeof animalSinVerseEnElResumenSchema>
export type ResumenSemanal = z.infer<typeof resumenSemanalSchema>
export type ErrorDeResumen = z.infer<typeof errorDeResumenSchema>
