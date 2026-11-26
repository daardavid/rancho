import { crearAlmacenDeIdempotencia } from '../../infrastructure/db/almacen-idempotencia'
import type { EjecutorSql } from '../../infrastructure/db/filas'
import type { RanchId } from '../../shared-kernel/ids'

import {
  agregarMarca,
  buscarPorMarca,
  corregir,
  existenEnElRancho,
  corregirSalidaDe,
  listarActivos,
  listarSalidas,
  marcarPerdida,
  registrarSalidaDe,
  obtenerFicha,
  reemplazar,
  registrar,
  type AlcanceDeSalida,
  type DepsDeHerd,
  type EntradaAgregarMarca,
  type EntradaCorregir,
  type ConsultaDeEvidencia,
  type EntradaCorregirSalida,
  type EntradaMarcarPerdida,
  type EntradaRegistrarSalida,
  type EntradaReemplazarMarca,
  type EntradaRegistrar,
  type EstadoEnRancho,
  type FichaAnimal,
  type FichaConHistoria,
  type MarcaPublica,
} from './application/servicio'
import {
  asignarLugarAGrupo,
  corregirPotreroDe,
  listarPotreros,
  lugarDeAnimal,
  lugaresDelHato,
  potreroDe,
  potrerosDelRancho,
  registrarPotrero,
  type AnimalDelMovimiento,
  type DepsDeLugar,
  type EntradaAsignarLugar,
  type EntradaCorregirPotrero,
  type EntradaRegistrarPotrero,
} from './application/lugar'
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
import {
  anotarSalud,
  corregirNota,
  notasDeAnimal,
  notasDeAnimales,
  type AlcanceDeSalud,
  type AnimalDeLaNota,
  type DepsDeSalud,
  type EntradaAnotarSalud,
  type EntradaCorregirNota,
} from './application/salud'
import {
  anotarDiagnostico,
  corregirDiagnosticoDe,
  type AnimalDelDiagnostico,
  type DepsDePrenez,
  type EntradaAnotarDiagnostico,
  type EntradaCorregirDiagnostico,
} from './application/prenez'
import {
  asentarDestetes,
  corregirDesteteDe,
  type AlcanceDeDestete,
  type DepsDeDestete,
  type EntradaAsentarDestetes,
  type EntradaCorregirDestete,
} from './application/destete'
import type {
  CorreccionDeNotaPublica,
  NotaDeSaludConHistoria,
  NotaDeSaludPublica,
  NotasAnotadasPublicas,
  NotasDelAnimalPublicas,
} from './application/publicar-salud'
import type {
  CorreccionDeDiagnosticoPublica,
  DiagnosticoConHistoria,
  DiagnosticoPublico,
  DiagnosticosAnotadosPublicos,
} from './application/publicar-prenez'
import type { DesteteConHistoria } from './application/publicar-destete'
import type {
  AsignacionPublica,
  FiliacionConHistoria,
  FiliacionPublica,
  LugarDelAnimal,
  LugaresDelHato,
  PotreroConHistoria,
  PotreroEnLaLista,
  PotreroPublico,
  PotrerosDelRancho,
} from './application/publicar'
import { crearRepositorioDeAnimales } from './persistence/repositorio'
import { crearRepositorioDeFiliacion } from './persistence/repositorio-filiacion'
import { crearRepositorioDeLugar } from './persistence/repositorio-lugar'
import { crearRepositorioDeSalud } from './persistence/repositorio-salud'
import { crearRepositorioDePrenez } from './persistence/repositorio-prenez'
import { crearRepositorioDeDestete } from './persistence/repositorio-destete'

export type {
  AnimalDeLaNota,
  AnimalDelMovimiento,
  AsignacionPublica,
  CorreccionDeNotaPublica,
  CriaPublica,
  EntradaAgregarMarca,
  EntradaAnotarSalud,
  EntradaAsignarLugar,
  EntradaCorregir,
  EntradaCorregirFiliacion,
  EntradaCorregirNota,
  EntradaCorregirPotrero,
  EntradaMarcarPerdida,
  EntradaRegistrarPotrero,
  EntradaReemplazarMarca,
  ConsultaDeEvidencia,
  EntradaCorregirSalida,
  EntradaRegistrar,
  EntradaRegistrarNacimiento,
  EntradaRegistrarSalida,
  EstadoEnRancho,
  FamiliaPublica,
  FichaAnimal,
  FichaConHistoria,
  FiliacionConHistoria,
  FiliacionPublica,
  LugarDelAnimal,
  LugaresDelHato,
  MarcaPublica,
  NacimientoPublico,
  NotaDeSaludConHistoria,
  NotaDeSaludPublica,
  NotasAnotadasPublicas,
  NotasDelAnimalPublicas,
  AnimalDelDiagnostico,
  CorreccionDeDiagnosticoPublica,
  DiagnosticoConHistoria,
  DiagnosticoPublico,
  DiagnosticosAnotadosPublicos,
  EntradaAnotarDiagnostico,
  EntradaCorregirDiagnostico,
  DepsDeDestete,
  DesteteConHistoria,
  EntradaAsentarDestetes,
  EntradaCorregirDestete,
  PotreroConHistoria,
  PotreroEnLaLista,
  PotreroPublico,
  PotrerosDelRancho,
  ResumenDeAnimal,
}
export { RechazoDeHerd } from './domain/errores'
export { asentarDestetes }

/**
 * Ficha, correcciones, marcas, filiación, potreros y lugar esperado. Quien
 * llama no ve Drizzle: la transacción se abre aquí y el servicio solo recibe
 * los repositorios.
 *
 * `existenEnElRancho` es la consulta pública que Growth usará para saber si
 * unos ids están activos en este rancho.
 *
 * El lugar esperado no es una observación: nada de este módulo escribe en
 * `growth`, y asignar un lugar no toca la última observación del animal.
 */
export type Herd = {
  registrar(entrada: EntradaRegistrar): Promise<FichaAnimal>
  corregir(entrada: EntradaCorregir): Promise<FichaAnimal>
  agregarMarca(entrada: EntradaAgregarMarca): Promise<MarcaPublica>
  reemplazarMarca(entrada: EntradaReemplazarMarca): Promise<{ anterior: MarcaPublica; nueva: MarcaPublica }>
  marcarPerdida(entrada: EntradaMarcarPerdida): Promise<MarcaPublica>
  registrarSalida(entrada: EntradaRegistrarSalida): Promise<FichaConHistoria>
  corregirSalida(entrada: EntradaCorregirSalida): Promise<FichaConHistoria>
  listarActivos(ranchId: RanchId): Promise<FichaAnimal[]>
  listarSalidas(ranchId: RanchId): Promise<FichaAnimal[]>
  obtener(ranchId: RanchId, animalId: string): Promise<FichaConHistoria | null>
  buscarPorMarca(ranchId: RanchId, marca: string): Promise<FichaAnimal[]>
  existenEnElRancho(ranchId: RanchId, ids: readonly string[]): Promise<EstadoEnRancho[]>
  registrarNacimiento(entrada: EntradaRegistrarNacimiento): Promise<NacimientoPublico>
  corregirFiliacion(entrada: EntradaCorregirFiliacion): Promise<FiliacionConHistoria>
  familia(ranchId: RanchId, animalId: string): Promise<FamiliaPublica | null>
  registrarPotrero(entrada: EntradaRegistrarPotrero): Promise<PotreroConHistoria>
  corregirPotrero(entrada: EntradaCorregirPotrero): Promise<PotreroConHistoria>
  potrero(ranchId: RanchId, potreroId: string): Promise<PotreroConHistoria | null>
  potreros(ranchId: RanchId): Promise<readonly PotreroConHistoria[]>
  potrerosDelRancho(ranchId: RanchId): Promise<PotrerosDelRancho>
  asignarLugar(entrada: EntradaAsignarLugar): Promise<{ asignaciones: readonly AsignacionPublica[] }>
  lugarDe(ranchId: RanchId, animalId: string): Promise<LugarDelAnimal | null>
  lugaresDelHato(ranchId: RanchId): Promise<LugaresDelHato>
  anotarSalud(entrada: EntradaAnotarSalud): Promise<NotasAnotadasPublicas>
  corregirNota(entrada: EntradaCorregirNota): Promise<NotaDeSaludConHistoria>
  notasDeAnimal(ranchId: RanchId, animalId: string): Promise<NotasDelAnimalPublicas | null>
  notasDeAnimales(
    ranchId: RanchId,
    animalIds: readonly string[],
  ): Promise<readonly NotasDelAnimalPublicas[]>
  anotarDiagnostico(entrada: EntradaAnotarDiagnostico): Promise<DiagnosticosAnotadosPublicos>
  corregirDiagnostico(entrada: EntradaCorregirDiagnostico): Promise<DiagnosticoConHistoria>
  corregirDestete(entrada: EntradaCorregirDestete): Promise<DesteteConHistoria>
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

export function crearHerd(db: ClienteDeHerd, evidencia: ConsultaDeEvidencia | null = null): Herd {
  const correr = <T>(trabajo: (repos: DepsDeHerd) => Promise<T>): Promise<T> =>
    db.transaction(async (tx) => trabajo(reposDe(tx, evidencia)))

  // Recibo y foto fuera de la escritura. El puerto de evidencia no usa `tx`:
  // con la transacción abierta, su SELECT no vuelve.
  const salida: AlcanceDeSalida = {
    leerRecibo: (commandId) =>
      db.transaction(async (tx) => crearAlmacenDeIdempotencia(tx).buscar(commandId)),
    leerAnimal: (ranchId, animalId) =>
      db.transaction(async (tx) => crearRepositorioDeAnimales(tx).obtener(ranchId, animalId, false)),
    escribir: correr,
    evidencia,
  }

  // La nota de sanidad lee el recibo y comprueba la foto antes de abrir la
  // transacción, por la misma razón que la salida.
  const salud: AlcanceDeSalud = {
    leerRecibo: (commandId) =>
      db.transaction(async (tx) => crearAlmacenDeIdempotencia(tx).buscar(commandId)),
    escribir: correr,
    evidencia,
  }

  // Corregir el destete no escribe el peso. El recibo se lee fuera, igual que
  // la sanidad, para no trabar la base embebida.
  const destete: AlcanceDeDestete = {
    leerRecibo: (commandId) =>
      db.transaction(async (tx) => crearAlmacenDeIdempotencia(tx).buscar(commandId)),
    escribir: (trabajo) => correr((repos) => trabajo(desteteDe(repos))),
  }

  return {
    registrar: (entrada) => correr((repos) => registrar(repos, entrada)),
    corregir: (entrada) => correr((repos) => corregir(repos, entrada)),
    agregarMarca: (entrada) => correr((repos) => agregarMarca(repos, entrada)),
    reemplazarMarca: (entrada) => correr((repos) => reemplazar(repos, entrada)),
    marcarPerdida: (entrada) => correr((repos) => marcarPerdida(repos, entrada)),
    registrarSalida: (entrada) => registrarSalidaDe(salida, entrada),
    corregirSalida: (entrada) => corregirSalidaDe(salida, entrada),
    listarActivos: (ranchId) => correr((repos) => listarActivos(repos.animales, ranchId)),
    listarSalidas: (ranchId) => correr((repos) => listarSalidas(repos.animales, ranchId)),
    obtener: (ranchId, animalId) => correr((repos) => obtenerFicha(repos.animales, ranchId, animalId)),
    buscarPorMarca: (ranchId, marca) => correr((repos) => buscarPorMarca(repos.animales, ranchId, marca)),
    existenEnElRancho: (ranchId, ids) => correr((repos) => existenEnElRancho(repos.animales, ranchId, ids)),
    registrarNacimiento: (entrada) => correr((repos) => registrarNacimiento(repos, entrada)),
    corregirFiliacion: (entrada) => correr((repos) => corregirFiliacionDeCria(repos, entrada)),
    familia: (ranchId, animalId) => correr((repos) => familiaDe(repos, ranchId, animalId)),
    registrarPotrero: (entrada) => correr((repos) => registrarPotrero(lugarDe(repos), entrada)),
    corregirPotrero: (entrada) => correr((repos) => corregirPotreroDe(lugarDe(repos), entrada)),
    potrero: (ranchId, potreroId) =>
      correr((repos) => potreroDe(repos.lugar, ranchId, potreroId)),
    potreros: (ranchId) => correr((repos) => listarPotreros(repos.lugar, ranchId)),
    potrerosDelRancho: (ranchId) => correr((repos) => potrerosDelRancho(lugarDe(repos), ranchId)),
    asignarLugar: (entrada) => correr((repos) => asignarLugarAGrupo(lugarDe(repos), entrada)),
    lugarDe: (ranchId, animalId) =>
      correr((repos) => lugarDeAnimal(lugarDe(repos), ranchId, animalId)),
    lugaresDelHato: (ranchId) => correr((repos) => lugaresDelHato(lugarDe(repos), ranchId)),
    anotarSalud: (entrada) => anotarSalud(salud, entrada),
    corregirNota: (entrada) => corregirNota(salud, entrada),
    notasDeAnimal: (ranchId, animalId) =>
      correr((repos) => notasDeAnimal(saludDe(repos), ranchId, animalId)),
    notasDeAnimales: (ranchId, animalIds) =>
      correr((repos) => notasDeAnimales(saludDe(repos), ranchId, animalIds)),
    anotarDiagnostico: (entrada) => correr((repos) => anotarDiagnostico(prenezDe(repos), entrada)),
    corregirDiagnostico: (entrada) =>
      correr((repos) => corregirDiagnosticoDe(prenezDe(repos), entrada)),
    corregirDestete: (entrada) => corregirDesteteDe(destete, entrada),
  }
}

/** Repositorios de Herd atados a una transacción que abrió el orquestador. */
export function repositoriosDeHerd(
  tx: EjecutorSql,
  evidencia: ConsultaDeEvidencia | null = null,
): DepsDeHerd {
  return reposDe(tx, evidencia)
}

function saludDe(repos: DepsDeHerd): DepsDeSalud {
  return { animales: repos.animales, salud: repos.salud, idempotencia: repos.idempotencia }
}

function prenezDe(repos: DepsDeHerd): DepsDePrenez {
  return { animales: repos.animales, prenez: repos.prenez, idempotencia: repos.idempotencia }
}

function desteteDe(repos: DepsDeHerd): DepsDeDestete {
  return { animales: repos.animales, destete: repos.destete, idempotencia: repos.idempotencia }
}

function lugarDe(repos: DepsDeHerd): DepsDeLugar {
  return { animales: repos.animales, lugar: repos.lugar, idempotencia: repos.idempotencia }
}

function reposDe(tx: EjecutorSql, evidencia: ConsultaDeEvidencia | null): DepsDeHerd {
  return {
    animales: crearRepositorioDeAnimales(tx),
    filiacion: crearRepositorioDeFiliacion(tx),
    lugar: crearRepositorioDeLugar(tx),
    salud: crearRepositorioDeSalud(tx),
    prenez: crearRepositorioDePrenez(tx),
    destete: crearRepositorioDeDestete(tx),
    idempotencia: crearAlmacenDeIdempotencia(tx),
    evidencia,
  }
}
