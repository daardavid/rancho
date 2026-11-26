import type { Animal, MarcaAnimal } from './tipos'

/**
 * Lo que la pantalla necesita saber de un animal sin volver a preguntar.
 *
 * Son lecturas de lo que la API ya devolvió: no se calcula ninguna parte, no se
 * inventa un arete y no se guarda nada derivado.
 */

/** El arete que trae puesto ahora. Si no hay, se dice: no se inventa uno. */
export function areteVigente(animal: Animal): MarcaAnimal | null {
  const puestos = animal.marcas.filter((marca) => marca.estado === 'active')
  return puestos.find((marca) => marca.tipo === 'siniiga') ?? puestos[0] ?? null
}

export function normalizar(texto: string): string {
  return texto.trim().toLocaleLowerCase('es-MX')
}

/**
 * Nombre y todos los aretes, los puestos y los cambiados. Un animal que perdió
 * su SINIIGA sigue apareciendo al buscar el número viejo.
 */
export function coincide(animal: Animal, busqueda: string): boolean {
  if (animal.nombre !== null && normalizar(animal.nombre).includes(busqueda)) {
    return true
  }
  return animal.marcas.some((marca) => normalizar(marca.valor).includes(busqueda))
}

/** «Sin nombre o seña» en vez de un hueco en blanco. */
export function nombreVisible(animal: { readonly nombre: string | null }): string {
  return animal.nombre ?? 'Sin nombre o seña'
}

/**
 * Una vaca, o una hembra que no es becerro ni toro, puede abrir el nacimiento.
 * Un becerro hembra no: el botón vive en la ficha de una vaca.
 */
export function puedeRegistrarNacimiento(animal: {
  readonly categoria: string
  readonly sexo: string
}): boolean {
  if (animal.categoria === 'cow') {
    return true
  }
  return animal.sexo === 'female' && animal.categoria !== 'calf' && animal.categoria !== 'bull'
}

/**
 * Madre posible en el buscador del nacimiento: una hembra activa o un animal
 * cuyo sexo no se sabe, y que siga en el hato. Un macho no se ofrece nunca, un
 * becerro tampoco (no pare) y un animal dado de baja mucho menos.
 *
 * «No sé» en el sexo no se descarta: el rancho casi siempre sabe que la vaca es
 * vaca, pero cuando el dato falta lo desconocido sigue siendo una respuesta
 * válida, y el dueño la elige a mano.
 */
export function puedeSerMadre(animal: {
  readonly categoria: string
  readonly sexo: string
  readonly activo?: boolean
}): boolean {
  if (animal.activo === false) {
    return false
  }
  if (animal.categoria === 'bull' || animal.categoria === 'calf' || animal.sexo === 'male') {
    return false
  }
  return animal.sexo === 'female' || animal.sexo === 'unknown'
}
