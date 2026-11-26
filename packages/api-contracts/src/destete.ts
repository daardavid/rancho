import { z } from 'zod'

import { LARGO_MAXIMO_MOTIVO, LARGO_MAXIMO_NOTA, diaSchema } from './animales'
import { LARGO_MAXIMO_REPORTED_BY, calidadDePesoSchema, kilosConTresDecimalesSchema } from './pesajes'

/**
 * Destete de una cría, y los kilos destetados por vaca.
 *
 * El día es exacto, aproximado o «No sé». Nada viene preelegido. El peso, si
 * se anota, es un peso con su calidad. Los promedios se calculan al leer y no
 * se guardan. No hay ajuste a 205 días.
 */

const instanteSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
const motivoSchema = z.string().trim().min(1).max(LARGO_MAXIMO_MOTIVO)
const notaSchema = z.string().trim().min(1).max(LARGO_MAXIMO_NOTA)
const quienLoDijoSchema = z.string().trim().min(1).max(LARGO_MAXIMO_REPORTED_BY)

export const precisionDeDesteteSchema = z.enum(['exact', 'approximate', 'no_se'])

export const edadAlDesteteSchema = z.discriminatedUnion('clase', [
  z.strictObject({ clase: z.literal('dias'), dias: z.number().int().nonnegative() }),
  z.strictObject({ clase: z.literal('nacimiento_aproximado') }),
  z.strictObject({ clase: z.literal('sin_nacimiento') }),
  z.strictObject({ clase: z.literal('sin_dia') }),
  z.strictObject({ clase: z.literal('destete_aproximado') }),
  z.strictObject({ clase: z.literal('antes_del_nacimiento') }),
])

export const pesoAlDesteteSchema = z.strictObject({
  kilos: kilosConTresDecimalesSchema,
  calidad: calidadDePesoSchema,
})

/** Lo que se ve en la cría de la madre: sin la historia de la corrección. */
export const desteteDeCriaSchema = z.strictObject({
  fecha: diaSchema.nullable(),
  precisionFecha: z.enum(['exact', 'approximate']).nullable(),
  peso: pesoAlDesteteSchema.nullable(),
  edad: edadAlDesteteSchema,
})

export const resumenDeKilosSchema = z.strictObject({
  conPeso: z.number().int().nonnegative(),
  sinPeso: z.number().int().nonnegative(),
  total: kilosConTresDecimalesSchema.nullable(),
  promedio: kilosConTresDecimalesSchema.nullable(),
})

export const criaSinPesoSchema = z.strictObject({
  criaId: z.uuid(),
  nombre: z.string().nullable(),
  certezaMadre: z.enum(['observed', 'inferred']),
})

export const kilosDestetadosDeLaVacaSchema = z.strictObject({
  observadas: resumenDeKilosSchema,
  inferidas: resumenDeKilosSchema,
  sinPeso: z.array(criaSinPesoSchema),
})

export const correccionDeDesteteSchema = z.strictObject({
  campo: z.enum(['fecha', 'precision', 'nota', 'reportedBy']),
  valorAnterior: z.string().nullable(),
  motivo: motivoSchema,
  correctedBy: z.string().trim().min(1),
  correctedAt: instanteSchema,
})

export const desteteEnLaFichaSchema = z.strictObject({
  id: z.uuid(),
  fecha: diaSchema.nullable(),
  precisionFecha: z.enum(['exact', 'approximate']).nullable(),
  nota: notaSchema.nullable(),
  reportedBy: quienLoDijoSchema.nullable(),
  version: z.number().int().positive(),
  peso: pesoAlDesteteSchema
    .extend({ id: z.uuid(), evidenciaId: z.uuid().nullable() })
    .nullable(),
  edad: edadAlDesteteSchema,
  correcciones: z.array(correccionDeDesteteSchema),
})

export const desteteDelAnimalSchema = z.strictObject({
  animalId: z.uuid(),
  destete: desteteEnLaFichaSchema.nullable(),
})

export const filaDeKilosDestetadosSchema = z.strictObject({
  animalId: z.uuid(),
  nombre: z.string().nullable(),
  activo: z.boolean(),
  observadas: resumenDeKilosSchema,
  inferidas: resumenDeKilosSchema,
})

export const listaDeKilosDestetadosSchema = z.strictObject({
  porPromedio: z.array(filaDeKilosDestetadosSchema),
})

/**
 * Lo que se escribe en el campo, no lo que guarda la columna.
 * `200`, `200.5` y `200.500` son el mismo peso. El servidor lo deja en tres
 * decimales. Cero y un texto que no es un peso se rechazan.
 */
const kilosDeEntradaSchema = z
  .string()
  .regex(/^(\d+)(?:\.\d{1,3})?$/)
  .refine((valor) => !/^0+(?:\.0{1,3})?$/.test(valor), 'El peso tiene que ser mayor que cero')

export const pesoDelDesteteSchema = z.strictObject({
  id: z.uuid(),
  kilos: kilosDeEntradaSchema,
  calidad: calidadDePesoSchema,
  evidenciaId: z.uuid().nullable().optional(),
})

export const animalDelDesteteSchema = z.strictObject({
  animalId: z.uuid(),
  desteteId: z.uuid(),
  peso: pesoDelDesteteSchema.optional(),
})

export const anotarDesteteSchema = z
  .strictObject({
    commandId: z.uuid(),
    precisionFecha: precisionDeDesteteSchema,
    fecha: diaSchema.nullable(),
    nota: notaSchema.nullable().optional(),
    reportedBy: quienLoDijoSchema.nullable().optional(),
    fechaDelPeso: diaSchema.nullable().optional(),
    animales: z.array(animalDelDesteteSchema).min(1),
  })
  .superRefine((valor, ctx) => {
    if (valor.precisionFecha === 'no_se' && valor.fecha !== null) {
      ctx.addIssue({ code: 'custom', path: ['fecha'], message: '«No sé» no lleva día.' })
    }
    if (valor.precisionFecha !== 'no_se' && valor.fecha === null) {
      ctx.addIssue({ code: 'custom', path: ['fecha'], message: 'Falta el día.' })
    }
  })

export const correccionDeDesteteComandoSchema = z
  .strictObject({
    commandId: z.uuid(),
    version: z.number().int().positive(),
    motivo: motivoSchema,
    precisionFecha: precisionDeDesteteSchema.optional(),
    fecha: diaSchema.nullable().optional(),
    nota: notaSchema.nullable().optional(),
    reportedBy: quienLoDijoSchema.nullable().optional(),
  })
  .superRefine((valor, ctx) => {
    const campos = [valor.precisionFecha, valor.fecha, valor.nota, valor.reportedBy]
    if (campos.every((campo) => campo === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['motivo'], message: 'No hay nada que corregir.' })
    }
    if (valor.fecha !== undefined && valor.precisionFecha === undefined) {
      ctx.addIssue({ code: 'custom', path: ['precisionFecha'], message: 'Falta decir si el día es exacto.' })
    }
    if (valor.precisionFecha === 'no_se' && valor.fecha !== undefined && valor.fecha !== null) {
      ctx.addIssue({ code: 'custom', path: ['fecha'], message: '«No sé» no lleva día.' })
    }
    if (
      valor.precisionFecha !== undefined &&
      valor.precisionFecha !== 'no_se' &&
      (valor.fecha === undefined || valor.fecha === null)
    ) {
      ctx.addIssue({ code: 'custom', path: ['fecha'], message: 'Falta el día.' })
    }
  })

export const pesoAnotadoSchema = z.strictObject({
  id: z.uuid(),
  animalId: z.uuid(),
  kilos: kilosConTresDecimalesSchema,
  calidad: calidadDePesoSchema,
  evidenciaId: z.uuid().nullable(),
})

export const desteteAnotadoPublicoSchema = z.strictObject({
  id: z.uuid(),
  animalId: z.uuid(),
  fecha: diaSchema.nullable(),
  precisionFecha: z.enum(['exact', 'approximate']).nullable(),
  nota: notaSchema.nullable(),
  reportedBy: quienLoDijoSchema.nullable(),
  pesoId: z.uuid().nullable(),
  version: z.number().int().positive(),
  recordedBy: z.string().trim().min(1),
  recordedAt: instanteSchema,
  correcciones: z.array(correccionDeDesteteSchema),
})

export const destetesAnotadosSchema = z.strictObject({
  destetes: z.array(desteteAnotadoPublicoSchema),
  pesos: z.array(pesoAnotadoSchema),
})

export const codigoDeErrorDeDesteteSchema = z.enum([
  'cuerpo_invalido',
  'no_encontrado',
  'version_conflict',
  'idempotency_mismatch',
  'destete_ya_existe',
  'destete_vacio',
  'fecha_sin_elegir',
  'fecha_incoherente',
  'peso_sin_fecha',
  'animal_repetido',
  'correccion_vacia',
  'motivo_vacio',
  'dia_invalido',
  'texto_invalido',
  'peso_invalido',
  'peso_sin_calidad',
  'evidencia_ajena',
  'fila_repetida',
  'fila_ya_existe',
  'sesion_ya_existe',
])

export const errorDeDesteteSchema = z.strictObject({
  codigo: codigoDeErrorDeDesteteSchema,
})

export type AnotarDestete = z.infer<typeof anotarDesteteSchema>
export type CorreccionDeDesteteComando = z.infer<typeof correccionDeDesteteComandoSchema>
export type DesteteDelAnimal = z.infer<typeof desteteDelAnimalSchema>
export type DesteteEnLaFicha = z.infer<typeof desteteEnLaFichaSchema>
export type DesteteDeCria = z.infer<typeof desteteDeCriaSchema>
export type KilosDestetadosDeLaVaca = z.infer<typeof kilosDestetadosDeLaVacaSchema>
export type ListaDeKilosDestetados = z.infer<typeof listaDeKilosDestetadosSchema>
export type FilaDeKilosDestetados = z.infer<typeof filaDeKilosDestetadosSchema>
export type EdadAlDestete = z.infer<typeof edadAlDesteteSchema>
export type ErrorDeDestete = z.infer<typeof errorDeDesteteSchema>
export type ResumenDeKilos = z.infer<typeof resumenDeKilosSchema>
