/** Cómo se lee una nota de bitácora. El código viaja; el texto es del rancho. */

export const TIPOS_DE_BITACORA = [
  { codigo: 'lluvia', texto: 'Lluvia' },
  { codigo: 'quema', texto: 'Quema o fuego' },
  { codigo: 'agua', texto: 'Agua' },
  { codigo: 'cerca', texto: 'Cerca o instalación' },
  { codigo: 'otro', texto: 'Otro' },
] as const

export const PRECISIONES_DE_NOTA = [
  { codigo: 'exact', texto: 'Fecha exacta' },
  { codigo: 'approximate', texto: 'Fecha aproximada' },
] as const

export function textoDeTipo(tipo: string): string {
  return TIPOS_DE_BITACORA.find((opcion) => opcion.codigo === tipo)?.texto ?? tipo
}

export function textoDePrecision(precision: string): string {
  return precision === 'approximate' ? 'aproximada' : 'exacta'
}

export function textoDeEstado(estado: string): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente'
    case 'hecho':
      return 'Hecho'
    case 'ya_no_aplica':
      return 'Ya no aplica'
    default:
      return estado
  }
}
