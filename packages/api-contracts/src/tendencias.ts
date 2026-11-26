import { z } from 'zod'

import { LARGO_MAXIMO_NOMBRE, categoriaSchema, diaSchema, motivoDeSalidaSchema } from './animales'
import { kilosConSignoSchema } from './crecimiento'
import { calidadDePesoSchema, kilosConTresDecimalesSchema } from './pesajes'

/**
 * Contrato de la pantalla de tendencias.
 *
 * Es una consulta: no hay comando ni cuerpo. Los kilos y la ganancia media
 * viajan como texto. La media se calcula en la consulta, igual que en
 * Crecimiento, y no se guarda. Un hueco de pesaje no es un punto de la serie.
 */

/** Un mes de calendario, `YYYY-MM`. No es un día inventado. */
export const mesSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

/** Un peso real de la serie. No trae ganancia: eso no es un hecho. */
export const puntoDeTendenciaSchema = z.strictObject({
  pesoId: z.uuid(),
  fecha: diaSchema,
  kilos: kilosConTresDecimalesSchema,
  calidad: calidadDePesoSchema,
})

/** Los pesos de un animal, del más viejo al más nuevo, y los huecos aparte. */
export const serieDeTendenciaSchema = z.strictObject({
  animalId: z.uuid(),
  nombre: z.string().trim().min(1).max(LARGO_MAXIMO_NOMBRE).nullable(),
  categoria: categoriaSchema,
  activo: z.boolean(),
  pesos: z.array(puntoDeTendenciaSchema),
  huecos: z.array(z.strictObject({ fecha: diaSchema })),
})

/**
 * Una vuelta de pesaje y la media de kilos por día de quienes tienen un par.
 *
 * `gananciaMediaKilosPorDia` es `null` cuando nadie tiene par: no se inventa
 * un cero. `animalesConPar` no cuenta al que no tiene peso anterior ni al
 * intervalo de cero días.
 */
export const vueltaDeTendenciaSchema = z.strictObject({
  sesionId: z.uuid(),
  fecha: diaSchema,
  gananciaMediaKilosPorDia: kilosConSignoSchema.nullable(),
  animalesConPar: z.number().int().nonnegative(),
})

/** Salidas de un mes, agrupadas por la razón que se anotó. */
export const salidasDelMesSchema = z.strictObject({
  motivo: motivoDeSalidaSchema,
  cantidad: z.number().int().positive(),
})

/**
 * Un mes que tiene al menos un nacimiento con fecha o una salida con fecha.
 * Un hecho sin fecha no abre un mes.
 */
export const mesDeTendenciaSchema = z.strictObject({
  mes: mesSchema,
  nacimientos: z.number().int().nonnegative(),
  salidas: z.array(salidasDelMesSchema),
})

export const tendenciasSchema = z.strictObject({
  series: z.array(serieDeTendenciaSchema),
  vueltas: z.array(vueltaDeTendenciaSchema),
  meses: z.array(mesDeTendenciaSchema),
  /** Nacimientos anotados sin día. No se les inventa un mes. */
  nacimientosSinFecha: z.number().int().nonnegative(),
  /** Bajas sin día. La ficha no las deja hoy; si aparecieran, no se les inventa un mes. */
  salidasSinFecha: z.number().int().nonnegative(),
})

export type PuntoDeTendencia = z.infer<typeof puntoDeTendenciaSchema>
export type SerieDeTendencia = z.infer<typeof serieDeTendenciaSchema>
export type VueltaDeTendencia = z.infer<typeof vueltaDeTendenciaSchema>
export type MesDeTendencia = z.infer<typeof mesDeTendenciaSchema>
export type Tendencias = z.infer<typeof tendenciasSchema>
