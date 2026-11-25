import { z } from 'zod'

import { LARGO_MAXIMO_NOMBRE, LARGO_MAXIMO_NOTA, LARGO_MAXIMO_MOTIVO, diaSchema } from './animales'

/**
 * Contratos de las notas de sanidad.
 *
 * Una nota es para un animal: una nota a un grupo llega como una nota por
 * animal, escritas en la misma captura. No hay calendario, dosis, retiro ni
 * flujo de veterinario (`OQ-HEALTH-001`): el contrato no tiene esos campos.
 *
 * `vioAlAnimal` es obligatorio. Si no viene, la nota no se acepta: no se
 * guarda «no se vio» porque el cuerpo lo omitió. Solo cuenta como observación
 * cuando dice que el animal se vio (`TGT-SEC-001`).
 */

export const LARGO_MAXIMO_PRODUCTO = LARGO_MAXIMO_NOMBRE

export const tipoDeNotaDeSaludSchema = z.enum([
  'vacuna',
  'medicamento',
  'bano',
  'problema',
  'otro',
])

const detalleSchema = z.string().trim().min(1).max(LARGO_MAXIMO_NOTA)
const productoSchema = z.string().trim().min(1).max(LARGO_MAXIMO_PRODUCTO)
const motivoSchema = z.string().trim().min(1).max(LARGO_MAXIMO_MOTIVO)
const instanteSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

/** Una nota tal como se lee. La fecha es el día en que se hizo o se vio. */
export const notaDeSaludSchema = z.strictObject({
  id: z.uuid(),
  animalId: z.uuid(),
  tipo: tipoDeNotaDeSaludSchema,
  detalle: detalleSchema,
  fecha: diaSchema,
  producto: productoSchema.nullable(),
  evidenciaId: z.uuid().nullable(),
  vioAlAnimal: z.boolean(),
  version: z.number().int().nonnegative(),
  recordedBy: z.string().trim().min(1),
  recordedAt: instanteSchema,
})

export const correccionDeNotaDeSaludSchema = z.strictObject({
  campo: z.enum(['tipo', 'detalle', 'fecha', 'producto', 'evidencia', 'vioAlAnimal']),
  /** El valor que estaba, como texto. `null` es «no había producto ni foto». */
  valorAnterior: z.string().nullable(),
  motivo: motivoSchema,
  correctedBy: z.string().trim().min(1),
  correctedAt: instanteSchema,
})

export const notaConHistoriaSchema = notaDeSaludSchema.extend({
  correcciones: z.array(correccionDeNotaDeSaludSchema),
})

/** Una nota del animal y el id que el cliente acuñó para ella. */
export const notaDelGrupoSchema = z.strictObject({
  animalId: z.uuid(),
  notaId: z.uuid(),
})

/**
 * Anotar sanidad a uno o a varios animales en una sola captura.
 *
 * Todo lo que se anota es el mismo hecho para el grupo: el tipo, qué se hizo o
 * se vio, el día, el producto, la foto y si se vio al animal. Lo único que
 * cambia por renglón es el animal y el id de su nota, que el cliente acuña para
 * que reintentar no duplique.
 */
export const anotarSaludSchema = z.strictObject({
  commandId: z.uuid(),
  tipo: tipoDeNotaDeSaludSchema,
  detalle: detalleSchema,
  fecha: diaSchema,
  producto: productoSchema.nullable().optional(),
  evidenciaId: z.uuid().nullable().optional(),
  /** Obligatorio. Omitirlo no se interpreta como «no se vio». */
  vioAlAnimal: z.boolean(),
  animales: z.array(notaDelGrupoSchema).min(1),
})

export const correccionDeNotaSchema = z
  .strictObject({
    commandId: z.uuid(),
    version: z.number().int().nonnegative(),
    motivo: motivoSchema,
    tipo: tipoDeNotaDeSaludSchema.optional(),
    detalle: detalleSchema.optional(),
    fecha: diaSchema.optional(),
    producto: productoSchema.nullable().optional(),
    evidenciaId: z.uuid().nullable().optional(),
    vioAlAnimal: z.boolean().optional(),
  })
  .superRefine((valor, ctx) => {
    const campos = [
      valor.tipo,
      valor.detalle,
      valor.fecha,
      valor.producto,
      valor.evidenciaId,
      valor.vioAlAnimal,
    ]
    if (campos.every((campo) => campo === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['detalle'], message: 'No hay nada que corregir.' })
    }
  })

export const notasAnotadasSchema = z.strictObject({
  notas: z.array(notaConHistoriaSchema),
})

export const notasDelAnimalSchema = z.strictObject({
  animalId: z.uuid(),
  /** De la más vieja a la más nueva, para que la ficha las lea en orden. */
  notas: z.array(notaConHistoriaSchema),
})

/** Las notas de varios animales: un renglón por animal pedido. */
export const notasDeAnimalesSchema = z.array(notasDelAnimalSchema)

export const codigoDeErrorDeSaludSchema = z.enum([
  'cuerpo_invalido',
  'no_encontrado',
  'version_conflict',
  'idempotency_mismatch',
  'nota_ya_existe',
  'nota_vacia',
  'tipo_invalido',
  'visto_sin_elegir',
  'fuera_del_hato',
  'animal_repetido',
  'correccion_vacia',
  'motivo_vacio',
  'dia_invalido',
  'texto_invalido',
  'evidencia_ajena',
])

export const errorDeSaludSchema = z.strictObject({
  codigo: codigoDeErrorDeSaludSchema,
})

export type NotaDeSalud = z.infer<typeof notaDeSaludSchema>
export type NotaConHistoria = z.infer<typeof notaConHistoriaSchema>
export type CorreccionDeNotaDeSalud = z.infer<typeof correccionDeNotaDeSaludSchema>
export type AnotarSalud = z.infer<typeof anotarSaludSchema>
export type CorreccionDeNota = z.infer<typeof correccionDeNotaSchema>
export type NotasAnotadas = z.infer<typeof notasAnotadasSchema>
export type NotasDelAnimal = z.infer<typeof notasDelAnimalSchema>
export type ErrorDeSalud = z.infer<typeof errorDeSaludSchema>
