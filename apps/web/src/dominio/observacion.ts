import type { OrigenDeObservacion } from '@rancho/api-contracts'

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
  readonly origen: OrigenDeObservacion
}): string {
  const evento = textoDelOrigen(observacion.origen, observacion.fecha)
  return `Visto por última vez: ${haceCuantosDias(observacion.dias)}, ${evento}.`
}

export function textoDelOrigen(origen: OrigenDeObservacion, fecha: string): string {
  const dia = diaLegible(fecha)
  if (origen === 'pesaje') {
    return `en el pesaje del ${dia}`
  }
  if (origen === 'nacimiento') {
    return `en el nacimiento del ${dia}`
  }
  return `en la nota de sanidad del ${dia}`
}
