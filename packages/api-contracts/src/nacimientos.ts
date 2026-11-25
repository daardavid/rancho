import { z } from 'zod'

import {
  LARGO_MAXIMO_MARCA,
  LARGO_MAXIMO_MOTIVO,
  LARGO_MAXIMO_NOMBRE,
  LARGO_MAXIMO_NOTA,
  diaSchema,
  fichaConHistoriaSchema,
  sexoSchema,
  tenenciaSchema,
  tipoDeMarcaSchema,
} from './animales'

/**
 * Contratos del nacimiento y de la filiación.
 *
 * La cría y su filiación viajan en un solo comando. La madre y el padre no
 * son columnas de la ficha. `unico_toro` es un motivo del padre inferido:
 * no se acepta como observado ni como motivo de la madre.
 */

export const certezaDeFiliacionSchema = z.enum(['observed', 'inferred', 'unknown'])
export const motivoDeInferenciaSchema = z.enum([
  'parto_visto',
  'dicho_de_trabajador',
  'unico_toro',
  'otro',
])
export const precisionDeFechaSchema = z.enum(['exact', 'approximate'])

const notaSchema = z.string().trim().min(1).max(LARGO_MAXIMO_NOTA)
const motivoSchema = z.string().trim().min(1).max(LARGO_MAXIMO_MOTIVO)
const nombreSchema = z.string().trim().min(1).max(LARGO_MAXIMO_NOMBRE)
const valorDeMarcaSchema = z.string().trim().min(1).max(LARGO_MAXIMO_MARCA)

export const ladoDeFiliacionSchema = z.strictObject({
  certeza: certezaDeFiliacionSchema,
  animalId: z.uuid().nullable(),
  motivo: motivoDeInferenciaSchema.nullable(),
})

export const registrarNacimientoSchema = z
  .strictObject({
    commandId: z.uuid(),
    id: z.uuid(),
    filiacionId: z.uuid(),
    nombre: nombreSchema.optional(),
    sexo: sexoSchema.optional(),
    tenencia: tenenciaSchema.optional(),
    marca: z
      .strictObject({
        marcaId: z.uuid(),
        tipo: tipoDeMarcaSchema,
        valor: valorDeMarcaSchema,
      })
      .optional(),
    fechaNacimiento: diaSchema.nullable(),
    precisionFecha: precisionDeFechaSchema.nullable(),
    madre: ladoDeFiliacionSchema,
    padre: ladoDeFiliacionSchema,
    nota: notaSchema.nullable().optional(),
  })
  .superRefine((valor, ctx) => {
    refinarLado(valor.madre, 'madre', ctx, ['madre'])
    refinarLado(valor.padre, 'padre', ctx, ['padre'])
    refinarFecha(valor.fechaNacimiento, valor.precisionFecha, ctx)
    refinarPadres(valor.id, valor.madre.animalId, valor.padre.animalId, ctx)
  })

export const corregirFiliacionSchema = z
  .strictObject({
    commandId: z.uuid(),
    version: z.number().int().nonnegative(),
    motivo: motivoSchema,
    fechaNacimiento: diaSchema.nullable(),
    precisionFecha: precisionDeFechaSchema.nullable(),
    madre: ladoDeFiliacionSchema,
    padre: ladoDeFiliacionSchema,
    nota: notaSchema.nullable(),
  })
  .superRefine((valor, ctx) => {
    refinarLado(valor.madre, 'madre', ctx, ['madre'])
    refinarLado(valor.padre, 'padre', ctx, ['padre'])
    refinarFecha(valor.fechaNacimiento, valor.precisionFecha, ctx)
  })

export const filiacionSchema = z.strictObject({
  id: z.uuid(),
  criaId: z.uuid(),
  madre: ladoDeFiliacionSchema,
  padre: ladoDeFiliacionSchema,
  nota: notaSchema.nullable(),
  fechaNacimiento: diaSchema.nullable(),
  precisionFecha: precisionDeFechaSchema.nullable(),
  version: z.number().int().nonnegative(),
  recordedBy: z.string().trim().min(1),
  recordedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
})

export const correccionDeFiliacionSchema = z.strictObject({
  madre: ladoDeFiliacionSchema,
  padre: ladoDeFiliacionSchema,
  nota: notaSchema.nullable(),
  fechaNacimiento: diaSchema.nullable(),
  precisionFecha: precisionDeFechaSchema.nullable(),
  motivo: motivoSchema,
  correctedBy: z.string().trim().min(1),
  correctedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
})

export const filiacionConHistoriaSchema = filiacionSchema.extend({
  correcciones: z.array(correccionDeFiliacionSchema),
})

export const nacimientoSchema = z.strictObject({
  animal: fichaConHistoriaSchema,
  filiacion: filiacionSchema,
})

const resumenDeAnimalSchema = z.strictObject({
  id: z.uuid(),
  nombre: nombreSchema.nullable(),
  sexo: sexoSchema,
  categoria: z.enum(['calf', 'cow', 'bull', 'other', 'unknown']),
})

export const familiaSchema = z.strictObject({
  filiacion: filiacionConHistoriaSchema.nullable(),
  madre: resumenDeAnimalSchema.nullable(),
  padre: resumenDeAnimalSchema.nullable(),
  crias: z.array(
    z.strictObject({
      animal: resumenDeAnimalSchema,
      como: z.enum(['madre', 'padre']),
      certeza: certezaDeFiliacionSchema,
      motivo: motivoDeInferenciaSchema.nullable(),
    }),
  ),
})

export const codigoDeErrorDeNacimientoSchema = z.enum([
  'cuerpo_invalido',
  'no_encontrado',
  'version_conflict',
  'idempotency_mismatch',
  'animal_ya_existe',
  'filiacion_ya_existe',
  'filiacion_incoherente',
  'progenitor_ausente',
  'tenencia_de_cria',
  'unico_toro_no_aplica',
  'marca_ya_existe',
  'marca_siniiga_duplicada',
  'marca_invalida',
  'correccion_vacia',
  'motivo_vacio',
  'dia_invalido',
  'texto_invalido',
])

export const errorDeNacimientoSchema = z.strictObject({
  codigo: codigoDeErrorDeNacimientoSchema,
})

export type RegistrarNacimiento = z.infer<typeof registrarNacimientoSchema>
export type CorregirFiliacion = z.infer<typeof corregirFiliacionSchema>
export type FiliacionContrato = z.infer<typeof filiacionSchema>
export type Nacimiento = z.infer<typeof nacimientoSchema>
export type Familia = z.infer<typeof familiaSchema>
export type ErrorDeNacimiento = z.infer<typeof errorDeNacimientoSchema>

type Contexto = z.RefinementCtx
type Lado = z.infer<typeof ladoDeFiliacionSchema>

function refinarLado(lado: Lado, rol: 'madre' | 'padre', ctx: Contexto, path: (string | number)[]): void {
  if (lado.certeza === 'unknown') {
    if (lado.animalId !== null || lado.motivo !== null) {
      ctx.addIssue({
        code: 'custom',
        path,
        message: 'Desconocido no apunta a un animal ni trae motivo.',
      })
    }
    return
  }

  if (lado.animalId === null) {
    ctx.addIssue({
      code: 'custom',
      path: [...path, 'animalId'],
      message: 'Hace falta el animal cuando la certeza no es desconocida.',
    })
  }

  if (lado.certeza === 'observed') {
    if (lado.motivo !== null) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'motivo'],
        message: 'Observado no lleva motivo. Único toro no se guarda como seguro.',
      })
    }
    return
  }

  if (lado.motivo === null || (rol === 'madre' && lado.motivo === 'unico_toro')) {
    ctx.addIssue({
      code: 'custom',
      path: [...path, 'motivo'],
      message: 'La inferencia necesita un motivo, y único toro es solo del padre.',
    })
  }
}

function refinarFecha(
  fecha: string | null,
  precision: 'exact' | 'approximate' | null,
  ctx: Contexto,
): void {
  if ((fecha === null) !== (precision === null)) {
    ctx.addIssue({
      code: 'custom',
      path: ['fechaNacimiento'],
      message: 'La fecha y si es exacta o aproximada van juntas, o las dos en blanco.',
    })
  }
}

function refinarPadres(
  criaId: string,
  madreId: string | null,
  padreId: string | null,
  ctx: Contexto,
): void {
  if (madreId !== null && (madreId === criaId || madreId === padreId)) {
    ctx.addIssue({
      code: 'custom',
      path: ['madre', 'animalId'],
      message: 'La madre no puede ser la cría ni el mismo animal que el padre.',
    })
  }
  if (padreId !== null && padreId === criaId) {
    ctx.addIssue({
      code: 'custom',
      path: ['padre', 'animalId'],
      message: 'El padre no puede ser la cría.',
    })
  }
}
