import { diaLegible } from './fechas'

/**
 * Cómo se lee la última observación en la ficha y en Inicio.
 *
 * El número de días lo calculó la base. Aquí solo se dice en palabras del
 * rancho. Cero días es «hoy»: «hace 0 días» no se dice. Un día futuro no se
 * disfraza de «hace N días».
 */

export function haceCuantosDias(dias: number): string {
  if (dias === 0) {
    return 'hoy'
  }
  if (dias === 1) {
    return 'hace 1 día'
  }
  if (dias > 1) {
    return `hace ${dias} días`
  }
  return 'con fecha posterior a hoy'
}

export function textoDeUltimaObservacion(observacion: {
  readonly dias: number
  readonly fecha: string
  readonly origen: 'pesaje' | 'sanidad'
}): string {
  const evento =
    observacion.origen === 'pesaje'
      ? `en el pesaje del ${diaLegible(observacion.fecha)}`
      : `en la nota de sanidad del ${diaLegible(observacion.fecha)}`
  return `Visto por última vez: ${haceCuantosDias(observacion.dias)}, ${evento}.`
}
