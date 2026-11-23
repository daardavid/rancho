import { z } from 'zod'

/**
 * Versión optimista de una fila editable.
 *
 * Una corrección que puede competir manda la versión que el usuario leyó. Una
 * versión vieja se rechaza y no cambia nada ([ADR-009](../../../../docs/architecture/adr/ADR-009-api-style.md)).
 * Los registros que solo se agregan no llevan versión.
 *
 * El valor inicial de una fila nueva lo fija la persistencia cuando exista; aquí
 * solo se valida que sea un entero no negativo.
 */
export const versionSchema = z.number().int().nonnegative().brand<'Version'>()
export type Version = z.infer<typeof versionSchema>
