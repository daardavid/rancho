import { z } from 'zod'

/**
 * La subida de una foto del indicador.
 *
 * El cuerpo no es JSON: son los bytes. Esto es la respuesta y el error.
 * El tipo lo decide el servidor mirando los bytes, no el encabezado.
 */

export const tiposDeImagenSchema = z.enum(['image/jpeg', 'image/png', 'image/webp'])

export const evidenciaCreadaSchema = z.strictObject({
  id: z.uuid(),
  tipo: tiposDeImagenSchema,
  tamano: z.number().int().positive(),
})

export const codigoDeErrorDeEvidenciaSchema = z.enum([
  'foto_no_es_imagen',
  'foto_demasiado_grande',
  'foto_vacia',
  'cuerpo_invalido',
  'no_encontrado',
])

export const errorDeEvidenciaSchema = z.strictObject({
  codigo: codigoDeErrorDeEvidenciaSchema,
  mensaje: z.string().trim().min(1),
})

export type EvidenciaCreada = z.infer<typeof evidenciaCreadaSchema>
export type ErrorDeEvidencia = z.infer<typeof errorDeEvidenciaSchema>
