import { z } from 'zod'

import { diaSchema, registradoPorSchema } from './animales'

/**
 * Contratos de la sesión de pesaje y de la corrección de un peso.
 *
 * El rancho y quién registra salen de la sesión, no del cuerpo. Los kilos
 * viajan como texto: quien arma el esquema de entrada le pasa el validador
 * de `kilos.ts` (`kilosTextoSchema`). Un número de JavaScript no es un peso.
 * La calidad es obligatoria en un pesado; un hueco no trae kilos ni calidad.
 *
 * Los largos son un tope del campo, no una regla del rancho.
 */

export const LARGO_MAXIMO_NOTA_DE_PESAJE = 2000
export const LARGO_MAXIMO_MOTIVO_DE_PESAJE = 2000
export const LARGO_MAXIMO_REPORTED_BY = 200

export const calidadDePesoSchema = z.enum(['measured', 'observed', 'declared'])
export const campoDePesoSchema = z.enum(['kilos', 'calidad', 'evidencia'])

/**
 * Lo que guarda la historia cuando el peso no tenía foto.
 * El mismo texto lo escribe Growth al corregir.
 */
export const AUSENCIA_DE_FOTO = 'ninguna'

const notaSchema = z.string().trim().min(1).max(LARGO_MAXIMO_NOTA_DE_PESAJE)
const motivoSchema = z.string().trim().min(1).max(LARGO_MAXIMO_MOTIVO_DE_PESAJE)
const reportedBySchema = z.string().trim().min(1).max(LARGO_MAXIMO_REPORTED_BY)
const instanteSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

/** Texto con tres decimales, tal como se lee de `numeric(12,3)`. */
export const kilosConTresDecimalesSchema = z.string().regex(/^\d+\.\d{3}$/)

type ValidadorDeKilos = z.ZodType<string>

/**
 * El cuerpo de «registrar sesión». `kilos` es el esquema de `kilos.ts`:
 * así el contrato y el núcleo rechazan el mismo texto.
 */
export function crearRegistrarSesionSchema(kilos: ValidadorDeKilos) {
  const filaPesada = z.strictObject({
    id: z.uuid(),
    animalId: z.uuid(),
    resultado: z.literal('pesado'),
    kilos,
    calidad: calidadDePesoSchema,
    evidenciaId: z.uuid().optional(),
  })
  const filaHueco = z.strictObject({
    id: z.uuid(),
    animalId: z.uuid(),
    resultado: z.literal('hueco'),
  })

  return z.strictObject({
    commandId: z.uuid(),
    id: z.uuid(),
    fecha: diaSchema,
    nota: notaSchema.optional(),
    reportedBy: reportedBySchema.optional(),
    filas: z.array(z.discriminatedUnion('resultado', [filaPesada, filaHueco])),
  })
}

/**
 * El cuerpo de «corregir peso».
 *
 * Hace falta kilos, calidad o la foto. `evidenciaId: null` quita la foto del
 * peso; omitirla no la toca. La foto no sustituye a la calidad.
 */
export function crearCorregirPesoSchema(kilos: ValidadorDeKilos) {
  return z
    .strictObject({
      commandId: z.uuid(),
      version: z.number().int().nonnegative(),
      motivo: motivoSchema,
      kilos: kilos.optional(),
      calidad: calidadDePesoSchema.optional(),
      evidenciaId: z.uuid().nullable().optional(),
    })
    .superRefine((valor, ctx) => {
      if (valor.kilos === undefined && valor.calidad === undefined && valor.evidenciaId === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'La corrección tiene que cambiar los kilos, la calidad, la foto o alguno de ellos.',
        })
      }
    })
}

export const filaDeSesionSchema = z.discriminatedUnion('resultado', [
  z.strictObject({
    id: z.uuid(),
    animalId: z.uuid(),
    resultado: z.literal('pesado'),
    kilos: kilosConTresDecimalesSchema,
    calidad: calidadDePesoSchema,
    version: z.number().int().positive(),
    /**
     * Foto del indicador. El servidor la manda; `null` es no tenerla.
     * Opcional para no romper una lectura que todavía no la trae.
     */
    evidenciaId: z.uuid().nullable().optional(),
  }),
  z.strictObject({
    id: z.uuid(),
    animalId: z.uuid(),
    resultado: z.literal('hueco'),
  }),
])

export const sesionDePesajeSchema = z.strictObject({
  id: z.uuid(),
  fecha: diaSchema,
  nota: notaSchema.nullable(),
  reportedBy: reportedBySchema.nullable(),
  commandId: z.uuid(),
  recordedBy: registradoPorSchema,
  recordedAt: instanteSchema,
  filas: z.array(filaDeSesionSchema),
})

export const correccionDePesoSchema = z.strictObject({
  campo: campoDePesoSchema,
  valorAnterior: z.string().trim().min(1),
  motivo: motivoSchema,
  correctedBy: registradoPorSchema,
  correctedAt: instanteSchema,
})

export const pesoSchema = z.strictObject({
  id: z.uuid(),
  animalId: z.uuid(),
  sesionId: z.uuid(),
  fecha: diaSchema,
  kilos: kilosConTresDecimalesSchema,
  calidad: calidadDePesoSchema,
  version: z.number().int().positive(),
  evidenciaId: z.uuid().nullable().optional(),
  correcciones: z.array(correccionDePesoSchema),
})

export const pesosDeAnimalSchema = z.strictObject({
  animalId: z.uuid(),
  pesos: z.array(pesoSchema),
})

export const codigoDeErrorDePesajeSchema = z.enum([
  'cuerpo_invalido',
  'no_encontrado',
  'version_conflict',
  'idempotency_mismatch',
  'animal_repetido',
  'fila_repetida',
  'peso_sin_calidad',
  'peso_invalido',
  'animal_ausente',
  'animal_inactivo',
  'no_es_peso',
  'correccion_vacia',
  'motivo_vacio',
  'dia_invalido',
  'texto_invalido',
  'sesion_ya_existe',
  'fila_ya_existe',
  'evidencia_ajena',
])

export const errorDePesajeSchema = z.strictObject({
  codigo: codigoDeErrorDePesajeSchema,
})

export type RegistrarSesion = z.infer<ReturnType<typeof crearRegistrarSesionSchema>>
export type CorregirPeso = z.infer<ReturnType<typeof crearCorregirPesoSchema>>
export type SesionDePesaje = z.infer<typeof sesionDePesajeSchema>
export type Peso = z.infer<typeof pesoSchema>
export type PesosDeAnimal = z.infer<typeof pesosDeAnimalSchema>
export type ErrorDePesaje = z.infer<typeof errorDePesajeSchema>
