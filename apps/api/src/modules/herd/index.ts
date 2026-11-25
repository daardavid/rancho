import { crearAlmacenDeIdempotencia } from '../../infrastructure/db/almacen-idempotencia'
import type { EjecutorSql } from '../../infrastructure/db/filas'
import type { RanchId } from '../../shared-kernel/ids'

import {
  agregarMarca,
  buscarPorMarca,
  corregir,
  existenEnElRancho,
  listarActivos,
  marcarPerdida,
  obtenerFicha,
  reemplazar,
  registrar,
  type DepsDeHerd,
  type EntradaAgregarMarca,
  type EntradaCorregir,
  type EntradaMarcarPerdida,
  type EntradaReemplazarMarca,
  type EntradaRegistrar,
  type EstadoEnRancho,
  type FichaAnimal,
  type FichaConHistoria,
  type MarcaPublica,
} from './application/servicio'
import {
  corregirFiliacionDeCria,
  familiaDe,
  registrarNacimiento,
  type CriaPublica,
  type EntradaCorregirFiliacion,
  type EntradaRegistrarNacimiento,
  type FamiliaPublica,
  type NacimientoPublico,
  type ResumenDeAnimal,
} from './application/nacimiento'
import type { FiliacionConHistoria, FiliacionPublica } from './application/publicar'
import { crearRepositorioDeAnimales } from './persistence/repositorio'
import { crearRepositorioDeFiliacion } from './persistence/repositorio-filiacion'

export type {
  CriaPublica,
  EntradaAgregarMarca,
  EntradaCorregir,
  EntradaCorregirFiliacion,
  EntradaMarcarPerdida,
  EntradaReemplazarMarca,
  EntradaRegistrar,
  EntradaRegistrarNacimiento,
  EstadoEnRancho,
  FamiliaPublica,
  FichaAnimal,
  FichaConHistoria,
  FiliacionConHistoria,
  FiliacionPublica,
  MarcaPublica,
  NacimientoPublico,
  ResumenDeAnimal,
}
export { RechazoDeHerd } from './domain/errores'

/**
 * Ficha, correcciones y marcas. Quien llama no ve Drizzle: la transacción se
 * abre aquí y el servicio solo recibe el repositorio.
 *
 * `existenEnElRancho` es la consulta pública que Growth usará para saber si
 * unos ids están activos en este rancho.
 */
export type Herd = {
  registrar(entrada: EntradaRegistrar): Promise<FichaAnimal>
  corregir(entrada: EntradaCorregir): Promise<FichaAnimal>
  agregarMarca(entrada: EntradaAgregarMarca): Promise<MarcaPublica>
  reemplazarMarca(entrada: EntradaReemplazarMarca): Promise<{ anterior: MarcaPublica; nueva: MarcaPublica }>
  marcarPerdida(entrada: EntradaMarcarPerdida): Promise<MarcaPublica>
  listarActivos(ranchId: RanchId): Promise<FichaAnimal[]>
  obtener(ranchId: RanchId, animalId: string): Promise<FichaConHistoria | null>
  buscarPorMarca(ranchId: RanchId, marca: string): Promise<FichaAnimal[]>
  existenEnElRancho(ranchId: RanchId, ids: readonly string[]): Promise<EstadoEnRancho[]>
  registrarNacimiento(entrada: EntradaRegistrarNacimiento): Promise<NacimientoPublico>
  corregirFiliacion(entrada: EntradaCorregirFiliacion): Promise<FiliacionConHistoria>
  familia(ranchId: RanchId, animalId: string): Promise<FamiliaPublica | null>
}

/**
 * Los dos clientes de Drizzle (node-postgres y PGlite) cumplen esto. El
 * genérico está en el método para que un `Promise<T>` no se fije en `unknown`
 * y los dos drivers quepan en la misma firma.
 */
export type ClienteDeHerd = {
  execute: EjecutorSql['execute']
  transaction<T>(correr: (tx: EjecutorSql) => Promise<T>): Promise<T>
}

export function crearHerd(db: ClienteDeHerd): Herd {
  const correr = <T>(trabajo: (repos: DepsDeHerd) => Promise<T>): Promise<T> =>
    db.transaction(async (tx) => trabajo(reposDe(tx)))

  return {
    registrar: (entrada) => correr((repos) => registrar(repos, entrada)),
    corregir: (entrada) => correr((repos) => corregir(repos, entrada)),
    agregarMarca: (entrada) => correr((repos) => agregarMarca(repos, entrada)),
    reemplazarMarca: (entrada) => correr((repos) => reemplazar(repos, entrada)),
    marcarPerdida: (entrada) => correr((repos) => marcarPerdida(repos, entrada)),
    listarActivos: (ranchId) => correr((repos) => listarActivos(repos.animales, ranchId)),
    obtener: (ranchId, animalId) => correr((repos) => obtenerFicha(repos.animales, ranchId, animalId)),
    buscarPorMarca: (ranchId, marca) => correr((repos) => buscarPorMarca(repos.animales, ranchId, marca)),
    existenEnElRancho: (ranchId, ids) => correr((repos) => existenEnElRancho(repos.animales, ranchId, ids)),
    registrarNacimiento: (entrada) => correr((repos) => registrarNacimiento(repos, entrada)),
    corregirFiliacion: (entrada) => correr((repos) => corregirFiliacionDeCria(repos, entrada)),
    familia: (ranchId, animalId) => correr((repos) => familiaDe(repos, ranchId, animalId)),
  }
}

function reposDe(tx: EjecutorSql): DepsDeHerd {
  return {
    animales: crearRepositorioDeAnimales(tx),
    filiacion: crearRepositorioDeFiliacion(tx),
    idempotencia: crearAlmacenDeIdempotencia(tx),
  }
}
