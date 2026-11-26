import { RechazoDeHerd } from './errores'

/**
 * La foto con la que se reconoce al animal.
 *
 * Es evidencia de identificación. No es nombre, sexo, categoría ni un peso, y
 * no convierte nada en medido. `version` es la de esta foto, no la de la ficha.
 */
export type FotoDeIdentificacion = {
  readonly evidenciaId: string
  readonly miniaturaId: string
  readonly version: number
}

export type FotoSiguiente = {
  readonly vigente: FotoDeIdentificacion
  /** La que estaba. `null` si esta es la primera. No se borra. */
  readonly anterior: FotoDeIdentificacion | null
}

/**
 * La foto que queda vigente.
 *
 * La misma foto otra vez no es un cambio. La versión sube en uno: la anterior
 * sigue siendo la que era, para que la historia no se reescriba.
 */
export function siguienteFoto(
  actual: FotoDeIdentificacion | null,
  nueva: { readonly evidenciaId: string; readonly miniaturaId: string },
): FotoSiguiente {
  if (
    actual !== null &&
    actual.evidenciaId === nueva.evidenciaId &&
    actual.miniaturaId === nueva.miniaturaId
  ) {
    throw new RechazoDeHerd('correccion_vacia')
  }

  return {
    vigente: {
      evidenciaId: nueva.evidenciaId,
      miniaturaId: nueva.miniaturaId,
      version: (actual?.version ?? 0) + 1,
    },
    anterior: actual,
  }
}
