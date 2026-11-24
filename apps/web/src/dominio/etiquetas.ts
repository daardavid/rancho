/**
 * El vocabulario de la pantalla, en palabras del rancho ([UX-09](../../../../../docs/product/ux-principles.md)).
 *
 * Los códigos de la API viajan en inglés porque así están fijados en el
 * dominio. Aquí se traducen una sola vez. «a la parte» se queda como se dice en
 * el rancho: no se calcula ninguna parte ni se convierte en un porcentaje.
 */

/** Una opción tal como la pinta un campo: el código que viaja y lo que se lee. */
export type Etiquetado = { readonly codigo: string; readonly texto: string }

/** La misma opción, con la forma que piden `Mosaicos`, `Segmentado` y `Pildoras`. */
export type OpcionElegible = { readonly valor: string; readonly texto: string }

/**
 * El vocabulario de la pantalla, para un control de una sola elección.
 *
 * Es la misma tabla de siempre con otro nombre de campo: no hay un segundo
 * vocabulario que se pueda desincronizar.
 */
export function opcionesElegibles(tabla: readonly Etiquetado[]): readonly OpcionElegible[] {
  return tabla.map((fila) => ({ valor: fila.codigo, texto: fila.texto }))
}

function textoDe(tabla: readonly Etiquetado[], codigo: string): string {
  return tabla.find((fila) => fila.codigo === codigo)?.texto ?? codigo
}

export const SEXOS: readonly Etiquetado[] = [
  { codigo: 'female', texto: 'Hembra' },
  { codigo: 'male', texto: 'Macho' },
  { codigo: 'unknown', texto: 'No sé' },
]

export const CATEGORIAS: readonly Etiquetado[] = [
  { codigo: 'calf', texto: 'Becerro' },
  { codigo: 'cow', texto: 'Vaca' },
  { codigo: 'bull', texto: 'Toro' },
  { codigo: 'other', texto: 'Otra' },
  { codigo: 'unknown', texto: 'No sé' },
]

export const TENENCIAS: readonly Etiquetado[] = [
  { codigo: 'ranch', texto: 'Del rancho' },
  { codigo: 'a_la_parte', texto: 'A la parte' },
  { codigo: 'third_party', texto: 'De otra persona' },
  { codigo: 'unknown', texto: 'No sé' },
]

export const PARTICIPACIONES: readonly Etiquetado[] = [
  { codigo: 'known', texto: 'Se sabe' },
  { codigo: 'partially_known', texto: 'Se sabe a medias' },
  { codigo: 'unknown', texto: 'No sé' },
]

export const TIPOS_DE_MARCA: readonly Etiquetado[] = [
  { codigo: 'siniiga', texto: 'SINIIGA' },
  { codigo: 'other', texto: 'Otro arete' },
]

export const ESTADOS_DE_MARCA: readonly Etiquetado[] = [
  { codigo: 'active', texto: 'Puesto' },
  { codigo: 'replaced', texto: 'Cambiado' },
  { codigo: 'lost', texto: 'Se cayó' },
]

export const CALIDADES: readonly Etiquetado[] = [
  { codigo: 'measured', texto: 'Medido en la báscula' },
  { codigo: 'observed', texto: 'Visto, no medido' },
  { codigo: 'declared', texto: 'Me lo dijeron' },
]

export const CAMPOS_DE_FICHA: readonly Etiquetado[] = [
  { codigo: 'nombre', texto: 'Nombre o seña' },
  { codigo: 'sexo', texto: 'Sexo' },
  { codigo: 'categoria', texto: 'Categoría' },
  { codigo: 'detalleCategoria', texto: 'Detalle de la categoría' },
  { codigo: 'tenencia', texto: 'Tenencia' },
  { codigo: 'participacionEconomica', texto: 'Participación económica' },
  { codigo: 'notaDelArreglo', texto: 'Nota del arreglo' },
  { codigo: 'nota', texto: 'Nota' },
]

export const sexo = (codigo: string): string => textoDe(SEXOS, codigo)
export const categoria = (codigo: string): string => textoDe(CATEGORIAS, codigo)
export const tenencia = (codigo: string): string => textoDe(TENENCIAS, codigo)
export const participacion = (codigo: string): string => textoDe(PARTICIPACIONES, codigo)
export const tipoDeMarca = (codigo: string): string => textoDe(TIPOS_DE_MARCA, codigo)
export const estadoDeMarca = (codigo: string): string => textoDe(ESTADOS_DE_MARCA, codigo)
export const calidad = (codigo: string): string => textoDe(CALIDADES, codigo)
export const campoDeFicha = (codigo: string): string => textoDe(CAMPOS_DE_FICHA, codigo)

/** El valor guardado de un campo, en palabras. `null` es «sin dato». */
export function valorDeFicha(campo: string, valor: string | null): string {
  if (valor === null) {
    return 'Sin dato'
  }
  switch (campo) {
    case 'sexo':
      return sexo(valor)
    case 'categoria':
      return categoria(valor)
    case 'tenencia':
      return tenencia(valor)
    case 'participacionEconomica':
      return participacion(valor)
    default:
      return valor
  }
}
