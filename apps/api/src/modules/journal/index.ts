import { crearAlmacenDeIdempotencia } from '../../infrastructure/db/almacen-idempotencia'
import type { EjecutorSql } from '../../infrastructure/db/filas'
import type { RanchId } from '../../shared-kernel/ids'
import type { Herd } from '../herd'

import {
  anotarNota,
  corregirNotaDe,
  listarNotas,
  type AlcanceDeJournal,
  type ConsultaDeEvidencia,
  type DepsDeJournal,
  type EntradaAnotarNota,
  type EntradaCorregirNota,
} from './application/nota'
import {
  anotarPendiente,
  cambiarEstadoDe,
  corregirPendienteDe,
  listarPendientes,
  type EntradaAnotarPendiente,
  type EntradaCambiarEstado,
  type EntradaCorregirPendiente,
} from './application/pendiente'
import type { NotaConHistoria, NotasPublicas, PendienteConHistoria, PendientesPublicos } from './application/publicar'
import { crearRepositorioDeJournal } from './persistence/repositorio'

export type {
  EntradaAnotarNota,
  EntradaAnotarPendiente,
  EntradaCambiarEstado,
  EntradaCorregirNota,
  EntradaCorregirPendiente,
  NotaConHistoria,
  NotasPublicas,
  PendienteConHistoria,
  PendientesPublicos,
}
export { RechazoDeJournal } from './domain/errores'

/**
 * Bitácora y pendientes del dueño.
 *
 * Quien llama no ve Drizzle. La pregunta de si un potrero o un animal existe
 * es la pública de Herd: Journal no importa su dominio ni su persistencia, y
 * no escribe en sus tablas. Marcar un pendiente hecho no anota sanidad.
 */
export type Journal = {
  anotarNota(entrada: EntradaAnotarNota): Promise<NotaConHistoria>
  corregirNota(entrada: EntradaCorregirNota): Promise<NotaConHistoria>
  notas(ranchId: RanchId): Promise<NotasPublicas>
  anotarPendiente(entrada: EntradaAnotarPendiente): Promise<PendienteConHistoria>
  corregirPendiente(entrada: EntradaCorregirPendiente): Promise<PendienteConHistoria>
  cambiarEstado(entrada: EntradaCambiarEstado): Promise<PendienteConHistoria>
  pendientes(ranchId: RanchId): Promise<PendientesPublicos>
}

export type ClienteDeJournal = {
  execute: EjecutorSql['execute']
  transaction<T>(correr: (tx: EjecutorSql) => Promise<T>): Promise<T>
}

export function crearJournal(
  db: ClienteDeJournal,
  herd: Pick<Herd, 'existenEnElRancho' | 'potrero'>,
  evidencia: ConsultaDeEvidencia | null = null,
): Journal {
  const escribir = <T>(trabajo: (deps: DepsDeJournal) => Promise<T>): Promise<T> =>
    db.transaction(async (tx) => trabajo(depsDe(tx)))

  const alcance: AlcanceDeJournal = {
    leerRecibo: (commandId) =>
      db.transaction(async (tx) => crearAlmacenDeIdempotencia(tx).buscar(commandId)),
    escribir,
    potreros: {
      existe: async (ranchId, potreroId) => (await herd.potrero(ranchId, potreroId)) !== null,
    },
    animales: herd,
    evidencia,
  }

  return {
    anotarNota: (entrada) => anotarNota(alcance, entrada),
    corregirNota: (entrada) => corregirNotaDe(alcance, entrada),
    notas: (ranchId) => escribir((deps) => listarNotas(deps, ranchId)),
    anotarPendiente: (entrada) => anotarPendiente(alcance, entrada),
    corregirPendiente: (entrada) => corregirPendienteDe(alcance, entrada),
    cambiarEstado: (entrada) => cambiarEstadoDe(alcance, entrada),
    pendientes: (ranchId) => escribir((deps) => listarPendientes(deps, ranchId)),
  }
}

function depsDe(tx: EjecutorSql): DepsDeJournal {
  return {
    journal: crearRepositorioDeJournal(tx),
    idempotencia: crearAlmacenDeIdempotencia(tx),
  }
}
