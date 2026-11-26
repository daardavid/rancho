/**
 * El último peso guardado de cada animal.
 *
 * `pesosConocidos` viene del más viejo al más nuevo, así que el último que
 * aparece de un animal es su último peso. No se calcula nada: es el kilo que
 * ya guardó el pesaje. Quien no tiene peso no entra en el mapa.
 */
export function ultimosKilos(
  pesos: readonly { readonly animalId: string; readonly kilos: string }[],
): ReadonlyMap<string, string> {
  const mapa = new Map<string, string>()
  for (const peso of pesos) {
    mapa.set(peso.animalId, peso.kilos)
  }
  return mapa
}
