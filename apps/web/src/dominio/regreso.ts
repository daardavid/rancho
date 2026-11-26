import type { DesdeLaFicha, Ruta } from '../ruta'

/**
 * A dónde regresa la flecha de la ficha, y qué dice.
 *
 * El texto y el destino salen de la misma decisión: no se puede decir «Regresar
 * al hato» y aterrizar en Salidas. David lo encontró así en la prueba de
 * INC-006 (R-42).
 *
 * Si la ficha sabe de dónde se llegó (`desde`), la flecha regresa ahí: abrir a
 * un animal dado de baja desde Salidas no manda al hato, y buscarlo en el hato
 * no manda a Salidas. Si no lo sabe —una recarga, un enlace guardado— se decide
 * por el animal: un activo vive en el hato, uno dado de baja se encuentra en
 * Salidas.
 */
export type Regreso = {
  readonly ruta: Ruta
  readonly etiqueta: string
}

const DEL_ORIGEN: Record<DesdeLaFicha, Regreso> = {
  hato: { ruta: { nombre: 'hato' }, etiqueta: 'Regresar al hato' },
  salidas: { ruta: { nombre: 'salidas' }, etiqueta: 'Regresar a salidas' },
  inicio: { ruta: { nombre: 'inicio' }, etiqueta: 'Regresar al inicio' },
}

export function regresoDeLaFicha(desde: DesdeLaFicha | undefined, activo: boolean): Regreso {
  if (desde !== undefined) {
    return DEL_ORIGEN[desde]
  }
  return activo
    ? DEL_ORIGEN.hato
    : DEL_ORIGEN.salidas
}
