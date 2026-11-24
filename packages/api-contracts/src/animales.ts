import { z } from 'zod'

/**
 * Contratos de la ficha y de sus marcas.
 *
 * El rancho no viaja en el cuerpo: sale de la sesión. No hay campo de
 * porcentaje ni de parte. «a la parte» es un valor de tenencia. Los códigos
 * de sexo, categoría, tenencia, participación y marca son los de la tarea.
 *
 * Los largos son un tope del campo, no una regla del rancho.
 */

export const LARGO_MAXIMO_NOMBRE = 200
export const LARGO_MAXIMO_NOTA = 2000
export const LARGO_MAXIMO_MOTIVO = 2000
export const LARGO_MAXIMO_MARCA = 80

export const sexoSchema = z.enum(['female', 'male', 'unknown'])
export const categoriaSchema = z.enum(['calf', 'cow', 'bull', 'other', 'unknown'])
export const tenenciaSchema = z.enum(['ranch', 'a_la_parte', 'third_party', 'unknown'])
export const participacionEconomicaSchema = z.enum(['known', 'partially_known', 'unknown'])
export const tipoDeMarcaSchema = z.enum(['siniiga', 'other'])
export const estadoDeMarcaSchema = z.enum(['active', 'replaced', 'lost'])
export const campoDeFichaSchema = z.enum([
  'nombre',
  'sexo',
  'categoria',
  'detalleCategoria',
  'tenencia',
  'participacionEconomica',
  'notaDelArreglo',
  'nota',
])

const nombreSchema = z.string().trim().min(1).max(LARGO_MAXIMO_NOMBRE)
const notaSchema = z.string().trim().min(1).max(LARGO_MAXIMO_NOTA)
const motivoSchema = z.string().trim().min(1).max(LARGO_MAXIMO_MOTIVO)
const valorDeMarcaSchema = z.string().trim().min(1).max(LARGO_MAXIMO_MARCA)

/** Día de calendario, sin hora. El 31 de febrero no pasa. */
export const diaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(esDiaReal, 'Día inválido')

const instanteSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

/**
 * Quién registró (o corrigió) el hecho, tal como sale del servidor.
 *
 * Es la misma regla que `recordedBySchema` del núcleo: un texto con algo, sin
 * espacios de sobra. No se exige UUID porque en la primera etapa es la cuenta
 * del propietario y más adelante puede no ser un id; el contrato de salida no
 * decide eso. Lo que sí es un id es el animal, la marca y la sesión.
 */
export const registradoPorSchema = z.string().trim().min(1)

export const registrarAnimalSchema = z
  .strictObject({
    commandId: z.uuid(),
    id: z.uuid(),
    nombre: nombreSchema.optional(),
    sexo: sexoSchema.optional(),
    categoria: categoriaSchema.optional(),
    detalleCategoria: nombreSchema.optional(),
    tenencia: tenenciaSchema.optional(),
    participacionEconomica: participacionEconomicaSchema.optional(),
    notaDelArreglo: notaSchema.optional(),
    nota: notaSchema.optional(),
  })
  .superRefine((valor, ctx) => {
    if (valor.detalleCategoria !== undefined && valor.categoria !== 'other') {
      ctx.addIssue({
        code: 'custom',
        path: ['detalleCategoria'],
        message: 'El texto libre solo acompaña a la categoría other.',
      })
    }
  })

export const corregirAnimalSchema = z
  .strictObject({
    commandId: z.uuid(),
    version: z.number().int().nonnegative(),
    motivo: motivoSchema,
    nombre: nombreSchema.nullable().optional(),
    sexo: sexoSchema.optional(),
    categoria: categoriaSchema.optional(),
    detalleCategoria: nombreSchema.nullable().optional(),
    tenencia: tenenciaSchema.optional(),
    participacionEconomica: participacionEconomicaSchema.optional(),
    notaDelArreglo: notaSchema.nullable().optional(),
    nota: notaSchema.nullable().optional(),
  })
  .superRefine((valor, ctx) => {
    if (
      valor.detalleCategoria !== undefined &&
      valor.detalleCategoria !== null &&
      valor.categoria !== undefined &&
      valor.categoria !== 'other'
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['detalleCategoria'],
        message: 'El texto libre solo acompaña a la categoría other.',
      })
    }
  })

export const agregarMarcaSchema = z.strictObject({
  commandId: z.uuid(),
  marcaId: z.uuid(),
  tipo: tipoDeMarcaSchema,
  valor: valorDeMarcaSchema,
  desde: diaSchema.nullable().optional(),
})

export const reemplazarMarcaSchema = z.strictObject({
  commandId: z.uuid(),
  marcaId: z.uuid(),
  tipo: tipoDeMarcaSchema,
  valor: valorDeMarcaSchema,
  desde: diaSchema.nullable().optional(),
  cambiadaEl: diaSchema.nullable().optional(),
})

export const marcarPerdidaSchema = z.strictObject({
  commandId: z.uuid(),
  cambiadaEl: diaSchema.nullable().optional(),
})

export const consultaDeAnimalesSchema = z.strictObject({
  mark: valorDeMarcaSchema.optional(),
})

export const marcaSchema = z.strictObject({
  id: z.uuid(),
  tipo: tipoDeMarcaSchema,
  valor: valorDeMarcaSchema,
  desde: diaSchema.nullable(),
  estado: estadoDeMarcaSchema,
  cambiadaEl: diaSchema.nullable(),
  recordedBy: registradoPorSchema,
  recordedAt: instanteSchema,
})

export const fichaAnimalSchema = z.strictObject({
  id: z.uuid(),
  nombre: nombreSchema.nullable(),
  sexo: sexoSchema,
  categoria: categoriaSchema,
  detalleCategoria: nombreSchema.nullable(),
  tenencia: tenenciaSchema,
  participacionEconomica: participacionEconomicaSchema,
  notaDelArreglo: notaSchema.nullable(),
  nota: notaSchema.nullable(),
  activo: z.boolean(),
  version: z.number().int().nonnegative(),
  recordedBy: registradoPorSchema,
  recordedAt: instanteSchema,
  marcas: z.array(marcaSchema),
})

export const correccionSchema = z.strictObject({
  campo: campoDeFichaSchema,
  valorAnterior: z.string().nullable(),
  motivo: motivoSchema,
  correctedBy: registradoPorSchema,
  correctedAt: instanteSchema,
})

export const fichaConHistoriaSchema = fichaAnimalSchema.extend({
  correcciones: z.array(correccionSchema),
})

export const listaDeAnimalesSchema = z.strictObject({
  animales: z.array(fichaAnimalSchema),
})

export const reemplazoDeMarcaSchema = z.strictObject({
  anterior: marcaSchema,
  nueva: marcaSchema,
})

export const codigoDeErrorDeAnimalSchema = z.enum([
  'cuerpo_invalido',
  'no_encontrado',
  'version_conflict',
  'idempotency_mismatch',
  'animal_ya_existe',
  'marca_ya_existe',
  'marca_siniiga_duplicada',
  'marca_no_activa',
  'marca_invalida',
  'correccion_vacia',
  'categoria_incoherente',
  'motivo_vacio',
  'dia_invalido',
  'texto_invalido',
])

export const errorDeAnimalSchema = z.strictObject({
  codigo: codigoDeErrorDeAnimalSchema,
})

export type RegistrarAnimal = z.infer<typeof registrarAnimalSchema>
export type CorregirAnimal = z.infer<typeof corregirAnimalSchema>
export type AgregarMarca = z.infer<typeof agregarMarcaSchema>
export type ReemplazarMarca = z.infer<typeof reemplazarMarcaSchema>
export type MarcarPerdida = z.infer<typeof marcarPerdidaSchema>
export type FichaAnimal = z.infer<typeof fichaAnimalSchema>
export type FichaConHistoria = z.infer<typeof fichaConHistoriaSchema>
export type ErrorDeAnimal = z.infer<typeof errorDeAnimalSchema>

function esDiaReal(valor: string): boolean {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (coincidencia === null) {
    return false
  }
  const anio = Number(coincidencia[1])
  const mes = Number(coincidencia[2])
  const dia = Number(coincidencia[3])
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return (
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
  )
}
