/**
 * Vocabulario de la ficha.
 *
 * Los códigos quedan en inglés porque así están fijados en la tarea y en el
 * dominio (`a_la_parte`, `siniiga`). No hay un valor numérico de participación:
 * «a la parte» es tenencia, y la participación es conocida, parcial o desconocida.
 */

export const SEXOS = ['female', 'male', 'unknown'] as const
export type Sexo = (typeof SEXOS)[number]

export const CATEGORIAS = ['calf', 'cow', 'bull', 'other', 'unknown'] as const
export type Categoria = (typeof CATEGORIAS)[number]

export const TENENCIAS = ['ranch', 'a_la_parte', 'third_party', 'unknown'] as const
export type Tenencia = (typeof TENENCIAS)[number]

export const PARTICIPACIONES = ['known', 'partially_known', 'unknown'] as const
export type ParticipacionEconomica = (typeof PARTICIPACIONES)[number]

export const TIPOS_DE_MARCA = ['siniiga', 'other'] as const
export type TipoDeMarca = (typeof TIPOS_DE_MARCA)[number]

export const ESTADOS_DE_MARCA = ['active', 'replaced', 'lost'] as const
export type EstadoDeMarca = (typeof ESTADOS_DE_MARCA)[number]

/**
 * Por qué un animal dejó de estar activo.
 *
 * `unknown` es válido: a veces se sabe que ya no está y no se sabe por qué.
 * No hay precio, reposición ni reparto.
 */
export const MOTIVOS_DE_SALIDA = ['sale', 'death', 'confirmed_missing', 'other', 'unknown'] as const
export type MotivoDeSalida = (typeof MOTIVOS_DE_SALIDA)[number]

/** Campos que una corrección de ficha puede cambiar. El id no está. */
export const CAMPOS_DE_FICHA = [
  'nombre',
  'sexo',
  'categoria',
  'detalleCategoria',
  'tenencia',
  'participacionEconomica',
  'notaDelArreglo',
  'nota',
] as const

export type CampoDeFicha = (typeof CAMPOS_DE_FICHA)[number]

/**
 * Tope de un texto libre. No es una regla del rancho: es el ancho del campo
 * para no guardar un cuaderno entero en una columna.
 */
export const LARGO_MAXIMO_NOMBRE = 200
export const LARGO_MAXIMO_NOTA = 2000
export const LARGO_MAXIMO_MOTIVO = 2000
export const LARGO_MAXIMO_MARCA = 80

export function esSexo(valor: string): valor is Sexo {
  return (SEXOS as readonly string[]).includes(valor)
}

export function esCategoria(valor: string): valor is Categoria {
  return (CATEGORIAS as readonly string[]).includes(valor)
}

export function esTenencia(valor: string): valor is Tenencia {
  return (TENENCIAS as readonly string[]).includes(valor)
}

export function esParticipacion(valor: string): valor is ParticipacionEconomica {
  return (PARTICIPACIONES as readonly string[]).includes(valor)
}

export function esTipoDeMarca(valor: string): valor is TipoDeMarca {
  return (TIPOS_DE_MARCA as readonly string[]).includes(valor)
}

export function esEstadoDeMarca(valor: string): valor is EstadoDeMarca {
  return (ESTADOS_DE_MARCA as readonly string[]).includes(valor)
}

export function esMotivoDeSalida(valor: string): valor is MotivoDeSalida {
  return (MOTIVOS_DE_SALIDA as readonly string[]).includes(valor)
}

export function esCampoDeFicha(valor: string): valor is CampoDeFicha {
  return (CAMPOS_DE_FICHA as readonly string[]).includes(valor)
}
