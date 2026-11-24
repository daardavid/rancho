import { z } from 'zod'

/**
 * Ids del núcleo compartido.
 *
 * Los ids son cadenas con marca de tipo: un `AnimalId` no se puede pasar donde se
 * espera un `RanchId`. La marca desaparece al serializar, así que un contrato
 * puede transportarlos como texto sin duplicar el tipo.
 *
 * El tipo se deriva del esquema a propósito: hay una sola definición de la marca y
 * Zod y TypeScript no pueden divergir.
 */

/** Alcance de la aplicación ([ADR-013](../../../../docs/architecture/adr/ADR-013-ranch-scope.md)). No es un agregado ni una organización. */
export const ranchIdSchema = z.uuid().brand<'RanchId'>()
export type RanchId = z.infer<typeof ranchIdSchema>

/** Id interno de un animal. Estable aunque cambien sus marcas y su nombre. */
export const animalIdSchema = z.uuid().brand<'AnimalId'>()
export type AnimalId = z.infer<typeof animalIdSchema>

/**
 * Id de un archivo de evidencia.
 *
 * Es la referencia que guarda el módulo dueño del hecho. No es una ruta ni
 * una URL del almacén ([ADR-011](../../../../docs/architecture/adr/ADR-011-evidence-storage.md)).
 */
export const evidenceIdSchema = z.uuid().brand<'EvidenceId'>()
export type EvidenceId = z.infer<typeof evidenceIdSchema>

/** Id que el cliente acuña para un comando, para que reintentar no duplique hechos. */
export const commandIdSchema = z.uuid().brand<'CommandId'>()
export type CommandId = z.infer<typeof commandIdSchema>

/** Nuevo id UUID v4 para una fila o un comando. */
export function nuevoId(): string {
  return crypto.randomUUID()
}
