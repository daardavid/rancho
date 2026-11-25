/**
 * Rechazos de la ficha. El código viaja hasta HTTP sin Fastify ni Drizzle.
 * No son `version_conflict` ni `idempotency_mismatch`: esos viven en el núcleo.
 */

export const CODIGOS_DE_RECHAZO = [
  'no_encontrado',
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
  'filiacion_incoherente',
  'filiacion_ya_existe',
  'progenitor_ausente',
  'tenencia_de_cria',
  'unico_toro_no_aplica',
  'ya_inactivo',
  'sin_salida',
  'salida_incoherente',
  'evidencia_ajena',
  'potrero_ya_existe',
  'asignacion_ya_existe',
  'asignacion_vacia',
  'animal_repetido',
  'nota_ya_existe',
  'nota_vacia',
  'tipo_invalido',
] as const

export type CodigoDeRechazo = (typeof CODIGOS_DE_RECHAZO)[number]

export class RechazoDeHerd extends Error {
  readonly codigo: CodigoDeRechazo

  constructor(codigo: CodigoDeRechazo) {
    super(codigo)
    this.name = 'RechazoDeHerd'
    this.codigo = codigo
  }
}
