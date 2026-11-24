/**
 * Topes de un texto libre. No son reglas del rancho: es el ancho del campo
 * para no guardar un cuaderno entero en una columna.
 */
export const LARGO_MAXIMO_NOTA = 2000
export const LARGO_MAXIMO_MOTIVO = 2000
export const LARGO_MAXIMO_REPORTED_BY = 200

export const CAMPOS_DE_PESO = ['kilos', 'calidad'] as const
export type CampoDePeso = (typeof CAMPOS_DE_PESO)[number]

export function esCampoDePeso(valor: string): valor is CampoDePeso {
  return (CAMPOS_DE_PESO as readonly string[]).includes(valor)
}
