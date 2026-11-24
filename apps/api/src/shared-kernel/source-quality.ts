import { z } from 'zod'

/**
 * Calidad de la fuente de un hecho.
 *
 * - `declared`: alguien lo dijo.
 * - `observed`: se vio directamente, dentro de lo que muestra lo visto.
 * - `measured`: sale de una medición.
 *
 * Vive en el hecho mismo, no en la foto ni en la vista. Una foto no sube un
 * declarado a medido ([cross-cutting-concerns.md](../../../../docs/architecture/cross-cutting-concerns.md)).
 */
export const calidadesDeFuente = ['measured', 'observed', 'declared'] as const

export const sourceQualitySchema = z.enum(calidadesDeFuente)
export type SourceQuality = z.infer<typeof sourceQualitySchema>
