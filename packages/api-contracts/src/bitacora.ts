import { z } from 'zod'

import { LARGO_MAXIMO_MOTIVO, LARGO_MAXIMO_NOTA, diaSchema } from './animales'

/**
 * Bitácora del rancho y pendientes del dueño.
 *
 * Ninguno de los dos es un hecho de un animal. El tipo de la nota y si el
 * día es exacto o aproximado son obligatorios: omitirlos no elige «Otro» ni
 * «fecha exacta». El pendiente no trae un estado en el alta: nace pendiente.
 * Marcarlo hecho no anota sanidad.
 *
 * Quién lo dijo es texto. No es un id de usuario.
 */

export const LARGO_MAXIMO_QUIEN_LO_DIJO = 200

export const tipoDeBitacoraSchema = z.enum(['lluvia', 'quema', 'agua', 'cerca', 'otro'])
export const precisionDeNotaSchema = z.enum(['exact', 'approximate'])
export const estadoDePendienteSchema = z.enum(['pendiente', 'hecho', 'ya_no_aplica'])

const textoSchema = z.string().trim().min(1).max(LARGO_MAXIMO_NOTA)
const motivoSchema = z.string().trim().min(1).max(LARGO_MAXIMO_MOTIVO)
const quienSchema = z.string().trim().min(1).max(LARGO_MAXIMO_QUIEN_LO_DIJO)
const instanteSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

export const sujetoDePendienteSchema = z.discriminatedUnion('clase', [
  z.strictObject({ clase: z.literal('ninguno') }),
  z.strictObject({ clase: z.literal('animal'), animalId: z.uuid() }),
  z.strictObject({
    clase: z.literal('grupo'),
    animalIds: z.array(z.uuid()).min(2),
  }),
  z.strictObject({ clase: z.literal('potrero'), potreroId: z.uuid() }),
])

export const notaDeBitacoraSchema = z.strictObject({
  id: z.uuid(),
  tipo: tipoDeBitacoraSchema,
  texto: textoSchema,
  fecha: diaSchema,
  precision: precisionDeNotaSchema,
  potreroId: z.uuid().nullable(),
  reportedBy: quienSchema.nullable(),
  evidenciaId: z.uuid().nullable(),
  version: z.number().int().nonnegative(),
  recordedBy: z.string().trim().min(1),
  recordedAt: instanteSchema,
})

export const correccionDeBitacoraSchema = z.strictObject({
  campo: z.enum(['tipo', 'texto', 'fecha', 'precision', 'potrero', 'reportedBy', 'evidencia']),
  valorAnterior: z.string().nullable(),
  motivo: motivoSchema,
  correctedBy: z.string().trim().min(1),
  correctedAt: instanteSchema,
})

export const notaDeBitacoraConHistoriaSchema = notaDeBitacoraSchema.extend({
  correcciones: z.array(correccionDeBitacoraSchema),
})

export const anotarBitacoraSchema = z.strictObject({
  commandId: z.uuid(),
  id: z.uuid(),
  tipo: tipoDeBitacoraSchema,
  texto: textoSchema,
  fecha: diaSchema,
  precision: precisionDeNotaSchema,
  potreroId: z.uuid().nullable().optional(),
  reportedBy: quienSchema.nullable().optional(),
  evidenciaId: z.uuid().nullable().optional(),
})

export const correccionDeNotaDeBitacoraSchema = z
  .strictObject({
    commandId: z.uuid(),
    version: z.number().int().nonnegative(),
    motivo: motivoSchema,
    tipo: tipoDeBitacoraSchema.optional(),
    texto: textoSchema.optional(),
    fecha: diaSchema.optional(),
    precision: precisionDeNotaSchema.optional(),
    potreroId: z.uuid().nullable().optional(),
    reportedBy: quienSchema.nullable().optional(),
    evidenciaId: z.uuid().nullable().optional(),
  })
  .superRefine((valor, ctx) => {
    const campos = [
      valor.tipo,
      valor.texto,
      valor.fecha,
      valor.precision,
      valor.potreroId,
      valor.reportedBy,
      valor.evidenciaId,
    ]
    if (campos.every((campo) => campo === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['texto'], message: 'No hay nada que corregir.' })
    }
  })

export const notasDeBitacoraSchema = z.strictObject({
  notas: z.array(notaDeBitacoraConHistoriaSchema),
})

export const pendienteSchema = z.strictObject({
  id: z.uuid(),
  texto: textoSchema,
  fecha: diaSchema,
  estado: estadoDePendienteSchema,
  sujeto: sujetoDePendienteSchema,
  estadoPor: z.string().trim().min(1),
  estadoEn: instanteSchema,
  version: z.number().int().nonnegative(),
  recordedBy: z.string().trim().min(1),
  recordedAt: instanteSchema,
})

export const correccionDePendientePublicaSchema = z.strictObject({
  campo: z.enum(['texto', 'fecha', 'sujeto']),
  valorAnterior: z.string().nullable(),
  motivo: motivoSchema,
  correctedBy: z.string().trim().min(1),
  correctedAt: instanteSchema,
})

export const cambioDeEstadoSchema = z.strictObject({
  estadoAnterior: estadoDePendienteSchema,
  estadoNuevo: estadoDePendienteSchema,
  changedBy: z.string().trim().min(1),
  changedAt: instanteSchema,
})

export const pendienteConHistoriaSchema = pendienteSchema.extend({
  correcciones: z.array(correccionDePendientePublicaSchema),
  cambiosDeEstado: z.array(cambioDeEstadoSchema),
})

export const anotarPendienteSchema = z.strictObject({
  commandId: z.uuid(),
  id: z.uuid(),
  texto: textoSchema,
  fecha: diaSchema,
  sujeto: sujetoDePendienteSchema.optional(),
})

export const correccionDePendienteSchema = z
  .strictObject({
    commandId: z.uuid(),
    version: z.number().int().nonnegative(),
    motivo: motivoSchema,
    texto: textoSchema.optional(),
    fecha: diaSchema.optional(),
    sujeto: sujetoDePendienteSchema.optional(),
  })
  .superRefine((valor, ctx) => {
    if (valor.texto === undefined && valor.fecha === undefined && valor.sujeto === undefined) {
      ctx.addIssue({ code: 'custom', path: ['texto'], message: 'No hay nada que corregir.' })
    }
  })

export const cambiarEstadoDePendienteSchema = z.strictObject({
  commandId: z.uuid(),
  version: z.number().int().nonnegative(),
  estado: estadoDePendienteSchema,
})

export const pendientesSchema = z.strictObject({
  pendientes: z.array(pendienteConHistoriaSchema),
})

/** Lo que Inicio muestra en «Para revisar»: solo los que siguen pendientes y ya tocan. */
export const pendienteDelInicioSchema = z.strictObject({
  id: z.uuid(),
  texto: textoSchema,
  fecha: diaSchema,
  /** `true` si el día ya pasó. El de hoy va en `false`. */
  vencido: z.boolean(),
})

/** Nota cuyo día cae en el periodo que Inicio está mirando. */
export const notaDelPeriodoSchema = z.strictObject({
  id: z.uuid(),
  tipo: tipoDeBitacoraSchema,
  texto: textoSchema,
  fecha: diaSchema,
  precision: precisionDeNotaSchema,
})

export const codigoDeErrorDeBitacoraSchema = z.enum([
  'cuerpo_invalido',
  'no_encontrado',
  'version_conflict',
  'idempotency_mismatch',
  'bitacora_ya_existe',
  'pendiente_ya_existe',
  'tipo_de_bitacora_invalido',
  'precision_sin_elegir',
  'dia_invalido',
  'texto_invalido',
  'motivo_vacio',
  'correccion_vacia',
  'evidencia_ajena',
  'potrero_ausente',
  'animal_de_pendiente_ausente',
  'animal_repetido_en_pendiente',
  'grupo_de_uno',
  'sujeto_incoherente',
  'estado_invalido',
  'estado_sin_cambio',
])

export const errorDeBitacoraSchema = z.strictObject({
  codigo: codigoDeErrorDeBitacoraSchema,
})

export type NotaDeBitacora = z.infer<typeof notaDeBitacoraSchema>
export type NotaDeBitacoraConHistoria = z.infer<typeof notaDeBitacoraConHistoriaSchema>
export type AnotarBitacora = z.infer<typeof anotarBitacoraSchema>
export type CorreccionDeNotaDeBitacora = z.infer<typeof correccionDeNotaDeBitacoraSchema>
export type NotasDeBitacora = z.infer<typeof notasDeBitacoraSchema>
export type SujetoDePendiente = z.infer<typeof sujetoDePendienteSchema>
export type Pendiente = z.infer<typeof pendienteSchema>
export type PendienteConHistoria = z.infer<typeof pendienteConHistoriaSchema>
export type AnotarPendiente = z.infer<typeof anotarPendienteSchema>
export type CorreccionDePendiente = z.infer<typeof correccionDePendienteSchema>
export type CambiarEstadoDePendiente = z.infer<typeof cambiarEstadoDePendienteSchema>
export type Pendientes = z.infer<typeof pendientesSchema>
export type PendienteDelInicio = z.infer<typeof pendienteDelInicioSchema>
export type NotaDelPeriodo = z.infer<typeof notaDelPeriodoSchema>
export type ErrorDeBitacora = z.infer<typeof errorDeBitacoraSchema>
