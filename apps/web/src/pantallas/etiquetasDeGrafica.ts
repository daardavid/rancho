/**
 * Ancho de una etiqueta en unidades del viewBox de la gráfica.
 *
 * La fuente va en las mismas unidades que el dibujo, así al achicar la gráfica
 * en un celular de 360 px el texto se achica con ella y no se sale del cuadro.
 * Ocho unidades por letra cubren un dígito de Inter a 11: «140.25 kg» cabe.
 */
export const ANCHO_POR_LETRA = 8
export const TAMANO_DE_ETIQUETA = 11

export function anchoDeEtiqueta(texto: string): number {
  return texto.length * ANCHO_POR_LETRA
}
