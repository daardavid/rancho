import { z } from 'zod'

import { LARGO_MAXIMO_NOMBRE, categoriaSchema, diaSchema } from './animales'
import { calidadDePesoSchema, kilosConTresDecimalesSchema } from './pesajes'

/**
 * Contratos de las vistas de crecimiento (`AnimalGrowthView` y el resumen del
 * hato).
 *
 * Son consultas: no hay comando ni cuerpo. Todo lo derivado —kilos ganados,
 * kilos por día, días entre pesajes, días desde el último pesaje— viaja como
 * texto o entero calculado por PostgreSQL. La ganancia no es un hecho editable
 * y no vive en ninguna tabla.
 *
 * `kilosPorDia` es `null` cuando el intervalo tiene 0 días: no se divide entre
 * cero ni se inventa un número.
 */

/** Texto con tres decimales que puede ir en negativo: una ganancia o una pérdida. */
export const kilosConSignoSchema = z.string().regex(/^-?\d+\.\d{3}$/)

/** Un peso tal como lo usa la vista: el hecho guardado, sin nada derivado. */
export const pesoEnLaVistaSchema = z.strictObject({
  pesoId: z.uuid(),
  sesionId: z.uuid(),
  fecha: diaSchema,
  kilos: kilosConTresDecimalesSchema,
  calidad: calidadDePesoSchema,
  version: z.number().int().positive(),
})

/**
 * Lo que va entre dos pesos consecutivos del mismo animal.
 *
 * `calidades` son las de los dos pesos que forman el intervalo y
 * `incluyeCalidadNoMedida` lo dice en una sola bandera. Un intervalo que
 * descansa en un peso `declared` u `observed` se ve; no se esconde.
 */
export const intervaloDeCrecimientoSchema = z.strictObject({
  fechaPrevia: diaSchema,
  dias: z.number().int().nonnegative(),
  kilosGanados: kilosConSignoSchema,
  kilosPorDia: kilosConSignoSchema.nullable(),
  calidades: z.tuple([calidadDePesoSchema, calidadDePesoSchema]),
  incluyeCalidadNoMedida: z.boolean(),
})

/** Un peso de la serie. El primero no tiene intervalo. */
export const puntoDeCrecimientoSchema = pesoEnLaVistaSchema.extend({
  intervalo: intervaloDeCrecimientoSchema.nullable(),
})

/** Sesión en la que el animal se esperaba y no pasó por la báscula. */
export const huecoDePesajeSchema = z.strictObject({
  sesionId: z.uuid(),
  fecha: diaSchema,
})

export const animalGrowthViewSchema = z.strictObject({
  animalId: z.uuid(),
  nombre: z.string().trim().min(1).max(LARGO_MAXIMO_NOMBRE).nullable(),
  categoria: categoriaSchema,
  activo: z.boolean(),
  /** Pesos en orden de fecha, del más viejo al más nuevo. */
  pesos: z.array(puntoDeCrecimientoSchema),
  /** `null` cuando el animal no tiene ningún peso. Unknown se queda unknown. */
  ultimoPesaje: pesoEnLaVistaSchema.nullable(),
  huecos: z.array(huecoDePesajeSchema),
})

export const filaDeCrecimientoSchema = z.strictObject({
  animalId: z.uuid(),
  nombre: z.string().trim().min(1).max(LARGO_MAXIMO_NOMBRE).nullable(),
  categoria: categoriaSchema,
  ultimoPeso: pesoEnLaVistaSchema.nullable(),
  /** El último intervalo: entre el penúltimo y el último peso. */
  ultimoIntervalo: intervaloDeCrecimientoSchema.nullable(),
  /**
   * El intervalo anterior a ese: entre el antepenúltimo y el penúltimo peso.
   * Sirve para ver si la ganancia por día bajó contra la vuelta anterior del
   * mismo animal. `null` cuando no hay tres pesos.
   */
  intervaloAnterior: intervaloDeCrecimientoSchema.nullable(),
  /** Entero de días de calendario del rancho. `null` si no hay peso. */
  diasDesdeElUltimoPesaje: z.number().int().nullable(),
  /** El animal estaba en la sesión más reciente del rancho y no se pesó. */
  fueHuecoEnLaUltimaSesion: z.boolean(),
})

/**
 * El resumen del hato para la pantalla de crecimiento.
 *
 * `gananciaMediaKilosPorDia` es la media de los kilos por día del último
 * intervalo de los animales que lo tienen. La calcula PostgreSQL sobre
 * `numeric` y viaja como texto de tres decimales. `null` cuando nadie tiene
 * kilos por día. No es un hecho guardado.
 */
export const crecimientoDelHatoSchema = z.strictObject({
  animales: z.array(filaDeCrecimientoSchema),
  gananciaMediaKilosPorDia: kilosConSignoSchema.nullable(),
  pesadosEnLaUltimaVuelta: z.number().int().nonnegative(),
  esperadosEnLaUltimaVuelta: z.number().int().nonnegative(),
  /** Día de la sesión más reciente. `null` si el rancho no tiene vueltas. */
  fechaDeLaUltimaVuelta: diaSchema.nullable(),
})

export const codigoDeErrorDeCrecimientoSchema = z.enum(['cuerpo_invalido', 'no_encontrado'])

export const errorDeCrecimientoSchema = z.strictObject({
  codigo: codigoDeErrorDeCrecimientoSchema,
})

export type KilosConSigno = z.infer<typeof kilosConSignoSchema>
export type PesoEnLaVista = z.infer<typeof pesoEnLaVistaSchema>
export type IntervaloDeCrecimiento = z.infer<typeof intervaloDeCrecimientoSchema>
export type PuntoDeCrecimiento = z.infer<typeof puntoDeCrecimientoSchema>
export type HuecoDePesaje = z.infer<typeof huecoDePesajeSchema>
export type AnimalGrowthView = z.infer<typeof animalGrowthViewSchema>
export type FilaDeCrecimiento = z.infer<typeof filaDeCrecimientoSchema>
export type CrecimientoDelHato = z.infer<typeof crecimientoDelHatoSchema>
export type ErrorDeCrecimiento = z.infer<typeof errorDeCrecimientoSchema>
