import {
  ejecutarComandoIdempotente,
  huellaDeContenido,
  type AlmacenDeIdempotencia,
  type ReciboGuardado,
} from '../../../shared-kernel/idempotencia'
import { ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'
import type { RecordedBy } from '../../../shared-kernel/actores'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../../shared-kernel/conflictos'
import { z } from 'zod'

import { RechazoDeJournal } from '../domain/errores'
import { abrirNota, corregirNota, type CambiosDeNota } from '../domain/nota'
import { publicarNota, type NotaConHistoria, type NotasPublicas } from './publicar'
import type { RepositorioDeJournal } from './repositorio'

export type EntradaAnotarNota = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly id: string
  readonly tipo: string
  readonly texto: string
  readonly fecha: string
  readonly precision: string
  readonly potreroId?: string | null
  readonly reportedBy?: string | null
  readonly evidenciaId?: string | null
}

export type EntradaCorregirNota = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly notaId: string
  readonly version: number
  readonly motivo: string
  readonly cambios: CambiosDeNota
}

/** Herd dice si el potrero es de este rancho. Journal no escribe potreros. */
export type ConsultaDePotreros = {
  existe(ranchId: RanchId, potreroId: string): Promise<boolean>
}

/**
 * Herd dice si esos animales existen aquí. Un animal que ya salió sigue
 * existiendo: el pendiente puede hablar de él. Journal no escribe fichas.
 */
export type ConsultaDeAnimales = {
  existenEnElRancho(
    ranchId: RanchId,
    ids: readonly string[],
  ): Promise<readonly { readonly id: string; readonly existe: boolean }[]>
}

export type ConsultaDeEvidencia = {
  perteneceAlRancho(ranchId: RanchId, evidenciaId: string): Promise<boolean>
}

export type DepsDeJournal = {
  readonly journal: RepositorioDeJournal
  readonly idempotencia: AlmacenDeIdempotencia
}

/**
 * El recibo y las lecturas de afuera van antes de la escritura.
 *
 * Herd y el puerto de evidencia abren su propia transacción. Con la de la
 * nota abierta, en la base embebida esas consultas no vuelven.
 */
export type AlcanceDeJournal = {
  readonly leerRecibo: (commandId: string) => Promise<ReciboGuardado | null>
  readonly escribir: <T>(trabajo: (deps: DepsDeJournal) => Promise<T>) => Promise<T>
  readonly potreros: ConsultaDePotreros
  readonly animales: ConsultaDeAnimales
  readonly evidencia: ConsultaDeEvidencia | null
}

const idSchema = z.uuid()

export async function anotarNota(
  alcance: AlcanceDeJournal,
  entrada: EntradaAnotarNota,
): Promise<NotaConHistoria> {
  const contenido = {
    ranchId: entrada.ranchId,
    id: entrada.id,
    tipo: entrada.tipo,
    texto: entrada.texto,
    fecha: entrada.fecha,
    precision: entrada.precision,
    potreroId: entrada.potreroId ?? null,
    reportedBy: entrada.reportedBy ?? null,
    evidenciaId: entrada.evidenciaId ?? null,
  }

  const previo = await alcance.leerRecibo(entrada.commandId)
  if (previo !== null) {
    if (previo.huella !== huellaDeContenido(contenido)) {
      throw new ConflictoDeIdempotencia(entrada.commandId)
    }
    return JSON.parse(previo.resultado) as NotaConHistoria
  }

  const ranchId = ranchIdSchema.parse(entrada.ranchId)
  const notaId = exigirId(entrada.id)
  const potreroId = idOpcional(entrada.potreroId)
  const evidenciaId = idOpcional(entrada.evidenciaId)
  await exigirPotrero(alcance.potreros, ranchId, potreroId)
  await exigirEvidencia(alcance.evidencia, ranchId, evidenciaId)

  return alcance.escribir((deps) =>
    ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
      const nota = abrirNota({
        id: notaId,
        ranchId,
        tipo: entrada.tipo,
        texto: entrada.texto,
        fecha: entrada.fecha,
        precision: entrada.precision,
        potreroId,
        reportedBy: entrada.reportedBy ?? null,
        evidenciaId,
        recordedBy: entrada.recordedBy,
        recordedAt: new Date(),
      })
      await deps.journal.insertarNota(nota)
      return publicarNota(nota, [])
    }),
  )
}

export async function corregirNotaDe(
  alcance: AlcanceDeJournal,
  entrada: EntradaCorregirNota,
): Promise<NotaConHistoria> {
  const contenido = {
    ranchId: entrada.ranchId,
    notaId: entrada.notaId,
    version: entrada.version,
    motivo: entrada.motivo,
    cambios: entrada.cambios,
  }

  const previo = await alcance.leerRecibo(entrada.commandId)
  if (previo !== null) {
    if (previo.huella !== huellaDeContenido(contenido)) {
      throw new ConflictoDeIdempotencia(entrada.commandId)
    }
    return JSON.parse(previo.resultado) as NotaConHistoria
  }

  const ranchId = ranchIdSchema.parse(entrada.ranchId)
  const notaId = exigirId(entrada.notaId)
  const potreroNuevo = idOpcional(entrada.cambios.potreroId)
  const evidenciaNueva = idOpcional(entrada.cambios.evidenciaId)
  if (entrada.cambios.potreroId !== undefined) {
    await exigirPotrero(alcance.potreros, ranchId, potreroNuevo)
  }
  if (entrada.cambios.evidenciaId !== undefined) {
    await exigirEvidencia(alcance.evidencia, ranchId, evidenciaNueva)
  }

  return alcance.escribir((deps) =>
    ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
      const actual = await deps.journal.obtenerNota(ranchId, notaId, true)
      if (actual === null) {
        throw new RechazoDeJournal('no_encontrado')
      }
      if (actual.version !== entrada.version) {
        throw new ConflictoDeVersion()
      }

      const corregida = corregirNota(actual, entrada.cambios, entrada.motivo)
      await deps.journal.guardarCorreccionDeNota({
        nota: corregida.nota,
        versionLeida: entrada.version,
        anteriores: corregida.anteriores,
        motivo: corregida.motivo,
        correctedBy: entrada.recordedBy,
        correctedAt: new Date(),
      })
      const correcciones = await deps.journal.correccionesDeNota(ranchId, notaId)
      return publicarNota(corregida.nota, correcciones)
    }),
  )
}

export async function listarNotas(deps: DepsDeJournal, ranchId: RanchId): Promise<NotasPublicas> {
  const notas = await deps.journal.listarNotas(ranchId)
  const conHistoria: NotaConHistoria[] = []
  for (const nota of notas) {
    const correcciones = await deps.journal.correccionesDeNota(ranchId, nota.id)
    conHistoria.push(publicarNota(nota, correcciones))
  }
  return { notas: conHistoria }
}

async function exigirPotrero(
  potreros: ConsultaDePotreros,
  ranchId: RanchId,
  potreroId: string | null,
): Promise<void> {
  if (potreroId === null) {
    return
  }
  if (!(await potreros.existe(ranchId, potreroId))) {
    throw new RechazoDeJournal('potrero_ausente')
  }
}

async function exigirEvidencia(
  evidencia: ConsultaDeEvidencia | null,
  ranchId: RanchId,
  evidenciaId: string | null,
): Promise<void> {
  if (evidenciaId === null) {
    return
  }
  if (evidencia === null || !(await evidencia.perteneceAlRancho(ranchId, evidenciaId))) {
    throw new RechazoDeJournal('evidencia_ajena')
  }
}

function exigirId(valor: string): string {
  const leido = idSchema.safeParse(valor)
  if (!leido.success) {
    throw new RechazoDeJournal('texto_invalido')
  }
  return leido.data
}

function idOpcional(valor: string | null | undefined): string | null {
  if (valor === undefined || valor === null) {
    return null
  }
  return exigirId(valor)
}
