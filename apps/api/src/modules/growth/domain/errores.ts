/**
 * Rechazos del pesaje. El código viaja hasta HTTP sin Fastify ni Drizzle.
 * No son `version_conflict` ni `idempotency_mismatch`: esos viven en el núcleo.
 */

export const CODIGOS_DE_RECHAZO = [
  'no_encontrado',
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
] as const

export type CodigoDeRechazo = (typeof CODIGOS_DE_RECHAZO)[number]

export class RechazoDeGrowth extends Error {
  readonly codigo: CodigoDeRechazo

  constructor(codigo: CodigoDeRechazo) {
    super(codigo)
    this.name = 'RechazoDeGrowth'
    this.codigo = codigo
  }
}
