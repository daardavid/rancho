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
export function nombreVisible(animal: Animal): string {
  return animal.nombre ?? 'Sin nombre o seña'
}
