/**
 * Rechazos de un comando que ya chocó con un hecho guardado.
 *
 * El código viaja tal cual hasta HTTP (`idempotency_mismatch`, `version_conflict`).
 * Aquí no hay Drizzle ni Fastify: el dominio y la aplicación pueden lanzarlos
 * sin conocer la base.
 */

export class ConflictoDeIdempotencia extends Error {
  readonly codigo = 'idempotency_mismatch' as const

  constructor(commandId: string) {
    super(`El comando ${commandId} ya se ejecutó con otro contenido.`)
    this.name = 'ConflictoDeIdempotencia'
  }
}

export class ConflictoDeVersion extends Error {
  readonly codigo = 'version_conflict' as const

  constructor() {
    super('La versión que se envió ya no coincide. No se cambió nada.')
    this.name = 'ConflictoDeVersion'
  }
}
