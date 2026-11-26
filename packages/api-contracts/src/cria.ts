import { z } from 'zod'

import {
  LARGO_MAXIMO_NOTA,
  LARGO_MAXIMO_MOTIVO,
  categoriaSchema,
  diaSchema,
} from './animales'
import { desteteDeCriaSchema, kilosDestetadosDeLaVacaSchema } from './destete'
import { LARGO_MAXIMO_REPORTED_BY } from './pesajes'

/**
 * Historial de cría y diagnóstico de preñez.
 *
 * Los partos salen de la filiación (ella como madre). Los días se calculan al
 * leer: no se guardan. Un parto sin fecha no entra a esa cuenta.
 *
 * El diagnóstico es lo que alguien dijo: Preñada, Vacía o No sé. No hay valor
 * por omisión ni en el resultado ni en si se vio al animal. `null` en
 * `vioAlAnimal` es «No sé», elegido. Solo cuenta como observación cuando es
 * `true`. Quién lo dijo es texto, no un usuario; si no se anotó, es `null`.
 */

const instanteSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
const motivoSchema = z.string().trim().min(1).max(LARGO_MAXIMO_MOTIVO)
const notaSchema = z.string().trim().min(1).max(LARGO_MAXIMO_NOTA)
const quienLoDijoSchema = z.string().trim().min(1).max(LARGO_MAXIMO_REPORTED_BY)

export const resultadoDePrenezSchema = z.enum(['prenada', 'vacia', 'no_se'])

export const partoDeCriaSchema = z.strictObject({
  criaId: z.uuid(),
  nombre: z.string().nullable(),
  fecha: diaSchema.nullable(),
  precisionFecha: z.enum(['exact', 'approximate']).nullable(),
  certezaMadre: z.enum(['observed', 'inferred']),
  motivo: z.enum(['parto_visto', 'dicho_de_trabajador', 'otro']).nullable(),
  /** `null` cuando esa cría no tiene destete anotado. */
  destete: desteteDeCriaSchema.nullable(),
})

export const intervaloEntrePartosSchema = z.strictObject({
  criaPreviaId: z.uuid(),
  criaId: z.uuid(),
  fechaPrevia: diaSchema,
  fecha: diaSchema,
  dias: z.number().int(),
})

export const correccionDeDiagnosticoSchema = z.strictObject({
  campo: z.enum(['resultado', 'fecha', 'reportedBy', 'nota', 'vioAlAnimal']),
  valorAnterior: z.string().nullable(),
  motivo: motivoSchema,
  correctedBy: z.string().trim().min(1),
  correctedAt: instanteSchema,
})

export const diagnosticoDePrenezSchema = z.strictObject({
  id: z.uuid(),
  animalId: z.uuid(),
  fecha: diaSchema,
  resultado: resultadoDePrenezSchema,
  reportedBy: quienLoDijoSchema.nullable(),
  nota: notaSchema.nullable(),
  vioAlAnimal: z.boolean().nullable(),
  version: z.number().int().nonnegative(),
  recordedBy: z.string().trim().min(1),
  recordedAt: instanteSchema,
})

export const diagnosticoConHistoriaSchema = diagnosticoDePrenezSchema.extend({
  correcciones: z.array(correccionDeDiagnosticoSchema),
})

export const historialDeCriaSchema = z.strictObject({
  animalId: z.uuid(),
  partos: z.array(partoDeCriaSchema),
  intervalos: z.array(intervaloEntrePartosSchema),
  partosSinFecha: z.number().int().nonnegative(),
  diasDesdeElUltimoParto: z.number().int().nullable(),
  diagnosticos: z.array(diagnosticoConHistoriaSchema),
  /** Madre vista e inferida, por separado. Se calcula al leer. */
  kilosDestetados: kilosDestetadosDeLaVacaSchema,
})

export const diagnosticoEnLaListaSchema = z.strictObject({
  fecha: diaSchema,
  resultado: resultadoDePrenezSchema,
  vioAlAnimal: z.boolean().nullable(),
})

export const filaDeVacaSchema = z.strictObject({
  animalId: z.uuid(),
  nombre: z.string().nullable(),
  categoria: categoriaSchema,
  diasDesdeElUltimoParto: z.number().int().nullable(),
  fechaDelUltimoParto: diaSchema.nullable(),
  partosSinFecha: z.number().int().nonnegative(),
  ultimoDiagnostico: diagnosticoEnLaListaSchema.nullable(),
})

export const listaDeVacasSchema = z.strictObject({
  porUltimoParto: z.array(filaDeVacaSchema),
  partoSinFecha: z.array(filaDeVacaSchema),
  sinPartoRegistrado: z.array(filaDeVacaSchema),
})

export const diagnosticoDelGrupoSchema = z.strictObject({
  animalId: z.uuid(),
  diagnosticoId: z.uuid(),
})

export const anotarDiagnosticoSchema = z.strictObject({
  commandId: z.uuid(),
  fecha: diaSchema,
  resultado: resultadoDePrenezSchema,
  reportedBy: quienLoDijoSchema.nullable().optional(),
  nota: notaSchema.nullable().optional(),
  /** Obligatorio. Omitirlo no se interpreta como «no se vio». `null` es «No sé». */
  vioAlAnimal: z.boolean().nullable(),
  animales: z.array(diagnosticoDelGrupoSchema).min(1),
})

export const correccionDeDiagnosticoComandoSchema = z
  .strictObject({
    commandId: z.uuid(),
    version: z.number().int().nonnegative(),
    motivo: motivoSchema,
    resultado: resultadoDePrenezSchema.optional(),
    fecha: diaSchema.optional(),
    reportedBy: quienLoDijoSchema.nullable().optional(),
    nota: notaSchema.nullable().optional(),
    vioAlAnimal: z.boolean().nullable().optional(),
  })
  .superRefine((valor, ctx) => {
    const campos = [valor.resultado, valor.fecha, valor.reportedBy, valor.nota, valor.vioAlAnimal]
    if (campos.every((campo) => campo === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['resultado'], message: 'No hay nada que corregir.' })
    }
  })

export const diagnosticosAnotadosSchema = z.strictObject({
  diagnosticos: z.array(diagnosticoConHistoriaSchema),
})

export const codigoDeErrorDePrenezSchema = z.enum([
  'cuerpo_invalido',
  'no_encontrado',
  'version_conflict',
  'idempotency_mismatch',
  'diagnostico_ya_existe',
  'diagnostico_vacio',
  'resultado_invalido',
  'visto_sin_elegir',
  'fuera_del_hato',
  'no_es_hembra',
  'animal_repetido',
  'correccion_vacia',
  'motivo_vacio',
  'dia_invalido',
  'texto_invalido',
])

export const errorDePrenezSchema = z.strictObject({
  codigo: codigoDeErrorDePrenezSchema,
})

export const errorDeCriaSchema = z.strictObject({
  codigo: z.enum(['no_encontrado', 'cuerpo_invalido']),
})

export type ResultadoDePrenez = z.infer<typeof resultadoDePrenezSchema>
export type HistorialDeCria = z.infer<typeof historialDeCriaSchema>
export type ListaDeVacas = z.infer<typeof listaDeVacasSchema>
export type FilaDeVaca = z.infer<typeof filaDeVacaSchema>
export type PartoDeCria = z.infer<typeof partoDeCriaSchema>
export type DiagnosticoDePrenez = z.infer<typeof diagnosticoDePrenezSchema>
export type DiagnosticoConHistoria = z.infer<typeof diagnosticoConHistoriaSchema>
export type AnotarDiagnostico = z.infer<typeof anotarDiagnosticoSchema>
export type CorreccionDeDiagnosticoComando = z.infer<typeof correccionDeDiagnosticoComandoSchema>
export type ErrorDePrenez = z.infer<typeof errorDePrenezSchema>
