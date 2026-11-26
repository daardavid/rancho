import type { EdadAlDestete } from '@rancho/api-contracts'

import { calidad } from './etiquetas'
import { diaLegible, kilosLegibles } from './fechas'

/** Cómo se dice el día del destete. «No sé» no se convierte en una fecha. */
export function textoDeCuando(
  fecha: string | null,
  precision: 'exact' | 'approximate' | null,
): string {
  if (fecha === null || precision === null) {
    return 'Destetado, sin día.'
  }
  if (precision === 'approximate') {
    return `Destetado el ${diaLegible(fecha)}, aproximado.`
  }
  return `Destetado el ${diaLegible(fecha)}.`
}

/** La edad solo se dice cuando los dos días son exactos. Lo demás se explica. */
export function textoDeEdad(edad: EdadAlDestete): string {
  switch (edad.clase) {
    case 'dias':
      return edad.dias === 1 ? 'Edad al destete: 1 día.' : `Edad al destete: ${edad.dias} días.`
    case 'nacimiento_aproximado':
      return 'La fecha de nacimiento es aproximada, así que no se calcula la edad al destete.'
    case 'sin_nacimiento':
      return 'No hay fecha de nacimiento, así que no se calcula la edad al destete.'
    case 'sin_dia':
      return 'No se sabe el día del destete, así que no se calcula la edad.'
    case 'destete_aproximado':
      return 'El día del destete es aproximado, así que no se calculan los días.'
    case 'antes_del_nacimiento':
      return 'El destete quedó antes del nacimiento, así que no se calculan los días.'
  }
}

export function textoDePeso(kilos: string | null, calidadDelPeso: string | null): string {
  if (kilos === null || calidadDelPeso === null) {
    return 'Sin peso al destete.'
  }
  return `${kilosLegibles(kilos)}, ${calidad(calidadDelPeso)}.`
}
