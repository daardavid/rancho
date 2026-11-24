import { crearAlmacenDeIdempotencia } from '../../infrastructure/db/almacen-idempotencia'
import type { EjecutorSql } from '../../infrastructure/db/filas'
import type { Herd } from '../herd'

import {
  corregir,
  obtener,
  pesosDe,
  registrar,
  ultima,
  type AlcanceDeGrowth,
  type DepsDeGrowth,
  type EntradaCorregir,
  type EntradaRegistrar,
  type PesoPublico,
  type PesosDelAnimal,
  type SesionPublica,
} from './application/servicio'
import { crearRepositorioDePesajes } from './persistence/repositorio'

export type { EntradaCorregir, EntradaRegistrar, PesoPublico, PesosDelAnimal, SesionPublica }
export { RechazoDeGrowth } from './domain/errores'

/**
 * Sesiones de pesaje y corrección de un peso.
 *
 * Quien llama no ve Drizzle. La consulta de animales es la pública de Herd
 * (`existenEnElRancho`): Growth no importa su dominio ni su persistencia, y
 * no escribe en sus tablas.
 */
export type Growth = {
  registrar(entrada: EntradaRegistrar): Promise<SesionPublica>
  corregir(entrada: EntradaCorregir): Promise<PesoPublico>
  obtener(ranchId: EntradaRegistrar['ranchId'], id: string): Promise<SesionPublica | null>
  ultima(ranchId: EntradaRegistrar['ranchId']): Promise<SesionPublica | null>
  pesosDe(ranchId: EntradaRegistrar['ranchId'], animalId: string): Promise<PesosDelAnimal>
}

export type ClienteDeGrowth = {
  execute: EjecutorSql['execute']
  transaction<T>(correr: (tx: EjecutorSql) => Promise<T>): Promise<T>
}

export function crearGrowth(db: ClienteDeGrowth, herd: Pick<Herd, 'existenEnElRancho'>): Growth {
  const escribir = <T>(trabajo: (deps: DepsDeGrowth) => Promise<T>): Promise<T> =>
    db.transaction(async (tx) => trabajo(depsDe(tx)))

  const alcance: AlcanceDeGrowth = {
    leerRecibo: (commandId) => db.transaction(async (tx) => crearAlmacenDeIdempotencia(tx).buscar(commandId)),
    escribir,
    animales: herd,
  }

  return {
    registrar: (entrada) => registrar(alcance, entrada),
    corregir: (entrada) => escribir((deps) => corregir(deps, entrada)),
    obtener: (ranchId, id) => escribir((deps) => obtener(deps, ranchId, id)),
    ultima: (ranchId) => escribir((deps) => ultima(deps, ranchId)),
    pesosDe: (ranchId, animalId) => escribir((deps) => pesosDe(deps, ranchId, animalId)),
  }
}

function depsDe(tx: EjecutorSql): DepsDeGrowth {
  return {
    sesiones: crearRepositorioDePesajes(tx),
    idempotencia: crearAlmacenDeIdempotencia(tx),
  }
}
