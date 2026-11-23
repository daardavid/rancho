import type { FichaAnimal, FichaConHistoria } from '@rancho/api-contracts'

/**
 * Los tipos del contrato, con los nombres que la pantalla usa.
 *
 * No se redefine ninguna forma: se toma la del contrato compartido. Así, si la
 * API cambia, la web deja de compilar en vez de pintar un campo vacío.
 */

export type MarcaAnimal = FichaAnimal['marcas'][number]
export type Animal = FichaAnimal
export type FichaCompleta = FichaConHistoria
export type Correccion = FichaConHistoria['correcciones'][number]
