import { z } from 'zod'

/**
 * Quién registró el hecho en la aplicación.
 *
 * En la primera etapa es la cuenta del propietario. No es un trabajador ni un
 * nombre suelto: cuando exista la sesión, este valor sale de ella y no del cuerpo
 * de la petición ([ADR-010](../../../../docs/architecture/adr/ADR-010-authentication.md)).
 */
export const recordedBySchema = z
  .string()
  .trim()
  .min(1, 'Hace falta quién registró el hecho')
  .brand<'RecordedBy'>()
export type RecordedBy = z.infer<typeof recordedBySchema>

/**
 * Quién contó el hecho en el rancho: un trabajador, un proveedor o el canal por el
 * que llegó la noticia.
 *
 * Es texto libre a propósito. No es un usuario, no es un id de cuenta y no se
 * cruza con `RecordedBy`. Cuando el propietario teclea lo que le dijeron, el
 * `RecordedBy` es él y esto es el trabajador.
 */
export const reportedBySchema = z
  .string()
  .trim()
  .min(1, 'Un origen vacío no es un origen; si no se sabe, no se manda')
  .brand<'ReportedBy'>()
export type ReportedBy = z.infer<typeof reportedBySchema>
