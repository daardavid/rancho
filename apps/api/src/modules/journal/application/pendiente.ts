import {
  ejecutarComandoIdempotente,
  huellaDeContenido,
} from '../../../shared-kernel/idempotencia'
import { ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'
import type { RecordedBy } from '../../../shared-kernel/actores'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../../shared-kernel/conflictos'
import { z } from 'zod'

import { RechazoDeJournal } from '../domain/errores'
import {
  abrirPendiente,
  cambiarEstado,
  corregirPendiente,
  textoDeSujeto,
  type CambiosDePendiente,
  type SujetoDePendiente,
} from '../domain/pendiente'
import { publicarPendiente, type PendienteConHistoria, type PendientesPublicos } from './publicar'
import type { AlcanceDeJournal } from './nota'
import type { RepositorioDeJournal } from './repositorio'

export type EntradaAnotarPendiente = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly id: string
  readonly texto: string
  readonly fecha: string
  readonly sujeto?: SujetoDePendiente
}

export type EntradaCorregirPendiente = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly pendienteId: string
  readonly version: number
  readonly motivo: string
  readonly cambios: CambiosDePendiente
}

export type EntradaCambiarEstado = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly pendienteId: string
  readonly version: number
  readonly estado: string
}

const idSchema = z.uuid()

/**
 * Anota un pendiente. Marcarlo hecho, después, no escribe sanidad ni ningún
 * otro hecho del hato: si fue una vacuna, esa nota se anota aparte.
 */
export async function anotarPendiente(
  alcance: AlcanceDeJournal,
  entrada: EntradaAnotarPendiente,
): Promise<PendienteConHistoria> {
  const sujeto = entrada.sujeto ?? { clase: 'ninguno' as const }
  const contenido = {
    ranchId: entrada.ranchId,
    id: entrada.id,
    texto: entrada.texto,
    fecha: entrada.fecha,
    sujeto: sujetoCanonico(sujeto),
  }

  const previo = await alcance.leerRecibo(entrada.commandId)
  if (previo !== null) {
    if (previo.huella !== huellaDeContenido(contenido)) {
      throw new ConflictoDeIdempotencia(entrada.commandId)
    }
    return JSON.parse(previo.resultado) as PendienteConHistoria
  }

  const ranchId = ranchIdSchema.parse(entrada.ranchId)
  await exigirSujeto(alcance, ranchId, sujeto)

  return alcance.escribir((deps) =>
    ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
      const cuando = new Date()
      const pendiente = abrirPendiente({
        id: exigirId(entrada.id),
        ranchId,
        texto: entrada.texto,
        fecha: entrada.fecha,
        sujeto,
        recordedBy: entrada.recordedBy,
        recordedAt: cuando,
      })
      await deps.journal.insertarPendiente(pendiente)
      return publicarPendiente(pendiente, [], [])
    }),
  )
}

export async function corregirPendienteDe(
  alcance: AlcanceDeJournal,
  entrada: EntradaCorregirPendiente,
): Promise<PendienteConHistoria> {
  const contenido = {
    ranchId: entrada.ranchId,
    pendienteId: entrada.pendienteId,
    version: entrada.version,
    motivo: entrada.motivo,
    cambios: {
      ...entrada.cambios,
      ...(entrada.cambios.sujeto === undefined
        ? {}
        : { sujeto: sujetoCanonico(entrada.cambios.sujeto) }),
    },
  }

  const previo = await alcance.leerRecibo(entrada.commandId)
  if (previo !== null) {
    if (previo.huella !== huellaDeContenido(contenido)) {
      throw new ConflictoDeIdempotencia(entrada.commandId)
    }
    return JSON.parse(previo.resultado) as PendienteConHistoria
  }

  const ranchId = ranchIdSchema.parse(entrada.ranchId)
  if (entrada.cambios.sujeto !== undefined) {
    await exigirSujeto(alcance, ranchId, entrada.cambios.sujeto)
  }
  const pendienteId = exigirId(entrada.pendienteId)

  return alcance.escribir((deps) =>
    ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
      const actual = await deps.journal.obtenerPendiente(ranchId, pendienteId, true)
      if (actual === null) {
        throw new RechazoDeJournal('no_encontrado')
      }
      if (actual.version !== entrada.version) {
        throw new ConflictoDeVersion()
      }
      const corregido = corregirPendiente(actual, entrada.cambios, entrada.motivo)
      await deps.journal.guardarCorreccionDePendiente({
        pendiente: corregido.pendiente,
        versionLeida: entrada.version,
        anteriores: corregido.anteriores,
        motivo: corregido.motivo,
        correctedBy: entrada.recordedBy,
        correctedAt: new Date(),
      })
      return await conHistoria(deps.journal, ranchId, corregido.pendiente)
    }),
  )
}

/**
 * Cambia el estado y deja quién y cuándo. No abre una nota de sanidad ni
 * toca un animal: el atajo para anotar la vacuna vive en la pantalla.
 */
export async function cambiarEstadoDe(
  alcance: AlcanceDeJournal,
  entrada: EntradaCambiarEstado,
): Promise<PendienteConHistoria> {
  const contenido = {
    ranchId: entrada.ranchId,
    pendienteId: entrada.pendienteId,
    version: entrada.version,
    estado: entrada.estado,
  }

  const previo = await alcance.leerRecibo(entrada.commandId)
  if (previo !== null) {
    if (previo.huella !== huellaDeContenido(contenido)) {
      throw new ConflictoDeIdempotencia(entrada.commandId)
    }
    return JSON.parse(previo.resultado) as PendienteConHistoria
  }

  const ranchId = ranchIdSchema.parse(entrada.ranchId)
  const pendienteId = exigirId(entrada.pendienteId)

  return alcance.escribir((deps) =>
    ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
      const actual = await deps.journal.obtenerPendiente(ranchId, pendienteId, true)
      if (actual === null) {
        throw new RechazoDeJournal('no_encontrado')
      }
      if (actual.version !== entrada.version) {
        throw new ConflictoDeVersion()
      }
      const cuando = new Date()
      const cambiado = cambiarEstado(actual, entrada.estado, entrada.recordedBy, cuando)
      await deps.journal.guardarEstado({
        pendiente: cambiado.pendiente,
        versionLeida: entrada.version,
        estadoAnterior: cambiado.estadoAnterior,
        changedBy: entrada.recordedBy,
        changedAt: cuando,
      })
      return await conHistoria(deps.journal, ranchId, cambiado.pendiente)
    }),
  )
}

export async function listarPendientes(
  deps: { readonly journal: RepositorioDeJournal },
  ranchId: RanchId,
): Promise<PendientesPublicos> {
  const pendientes = await deps.journal.listarPendientes(ranchId)
  const conSusHistorias: PendienteConHistoria[] = []
  for (const pendiente of pendientes) {
    conSusHistorias.push(await conHistoria(deps.journal, ranchId, pendiente))
  }
  return { pendientes: conSusHistorias }
}

async function conHistoria(
  journal: RepositorioDeJournal,
  ranchId: RanchId,
  pendiente: Parameters<typeof publicarPendiente>[0],
): Promise<PendienteConHistoria> {
  const correcciones = await journal.correccionesDePendiente(ranchId, pendiente.id)
  const cambios = await journal.cambiosDeEstado(ranchId, pendiente.id)
  return publicarPendiente(pendiente, correcciones, cambios)
}

async function exigirSujeto(
  alcance: AlcanceDeJournal,
  ranchId: RanchId,
  sujeto: SujetoDePendiente,
): Promise<void> {
  if (sujeto.clase === 'ninguno') {
    return
  }
  if (sujeto.clase === 'potrero') {
    if (!(await alcance.potreros.existe(ranchId, exigirId(sujeto.potreroId)))) {
      throw new RechazoDeJournal('potrero_ausente')
    }
    return
  }
  const ids = sujeto.clase === 'animal' ? [sujeto.animalId] : sujeto.animalIds
  const leidos = ids.map((id) => exigirId(id))
  const estados = await alcance.animales.existenEnElRancho(ranchId, leidos)
  const porId = new Map(estados.map((estado) => [estado.id, estado.existe]))
  if (leidos.some((id) => porId.get(id) !== true)) {
    throw new RechazoDeJournal('animal_de_pendiente_ausente')
  }
}

/** El mismo grupo en otro orden es el mismo contenido. */
function sujetoCanonico(sujeto: SujetoDePendiente): SujetoDePendiente {
  if (sujeto.clase === 'grupo') {
    return { clase: 'grupo', animalIds: [...sujeto.animalIds].sort() }
  }
  return sujeto
}

function exigirId(valor: string): string {
  const leido = idSchema.safeParse(valor)
  if (!leido.success) {
    throw new RechazoDeJournal('texto_invalido')
  }
  return leido.data
}

export { textoDeSujeto }
