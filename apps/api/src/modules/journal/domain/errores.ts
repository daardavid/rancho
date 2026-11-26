/**
 * Rechazos de la bitácora y de los pendientes. El código viaja hasta HTTP
 * sin Fastify ni Drizzle. No son `version_conflict` ni `idempotency_mismatch`:
 * esos viven en el núcleo.
 */

export const CODIGOS_DE_RECHAZO = [
  'no_encontrado',
  'bitacora_ya_existe',
  'pendiente_ya_existe',
  'tipo_de_bitacora_invalido',
  'precision_sin_elegir',
  'dia_invalido',
  'texto_invalido',
  'motivo_vacio',
  'correccion_vacia',
  'evidencia_ajena',
  'potrero_ausente',
  'animal_de_pendiente_ausente',
  'animal_repetido_en_pendiente',
  'grupo_de_uno',
  'sujeto_incoherente',
  'estado_invalido',
  'estado_sin_cambio',
] as const

export type CodigoDeRechazo = (typeof CODIGOS_DE_RECHAZO)[number]

export class RechazoDeJournal extends Error {
  readonly codigo: CodigoDeRechazo

  constructor(codigo: CodigoDeRechazo) {
    super(codigo)
    this.name = 'RechazoDeJournal'
    this.codigo = codigo
  }
}
