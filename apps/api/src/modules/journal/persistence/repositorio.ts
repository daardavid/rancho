import { sql } from 'drizzle-orm'
import { z } from 'zod'

import { actualizarConVersion } from '../../../infrastructure/db/version'
import { filasDe, type EjecutorSql } from '../../../infrastructure/db/filas'
import { recordedBySchema } from '../../../shared-kernel/actores'
import { nuevoId, ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'

import type {
  CambioDeEstadoGuardado,
  CorreccionDeNotaGuardada,
  CorreccionDePendienteGuardada,
  GuardarCorreccionDeNota,
  GuardarCorreccionDePendiente,
  RepositorioDeJournal,
} from '../application/repositorio'
import { RechazoDeJournal } from '../domain/errores'
import {
  esPrecisionDeNota,
  esTipoDeBitacora,
  type CampoDeNota,
  type NotaDeBitacora,
} from '../domain/nota'
import {
  esEstadoDePendiente,
  type CampoDePendiente,
  type EstadoDePendiente,
  type Pendiente,
  type SujetoDePendiente,
} from '../domain/pendiente'

const COLUMNAS_NOTA = sql.raw(
  'id, ranch_id, type, body, occurred_on::text as occurred_on, date_precision, paddock_id, reported_by, evidence_id, version, recorded_by, recorded_at',
)

const COLUMNAS_PENDIENTE = sql.raw(
  'id, ranch_id, body, due_on::text as due_on, status, subject_kind, paddock_id, status_changed_by, status_changed_at, version, recorded_by, recorded_at',
)

const COLUMNA_NOTA: Record<CampoDeNota, string> = {
  tipo: 'type',
  texto: 'body',
  fecha: 'occurred_on',
  precision: 'date_precision',
  potrero: 'paddock_id',
  reportedBy: 'reported_by',
  evidencia: 'evidence_id',
}

export function crearRepositorioDeJournal(db: EjecutorSql): RepositorioDeJournal {
  return {
    async insertarNota(nota) {
      try {
        await db.execute(sql`
          INSERT INTO journal.note (
            id, ranch_id, type, body, occurred_on, date_precision, paddock_id,
            reported_by, evidence_id, version, recorded_by, recorded_at
          ) VALUES (
            ${nota.id}, ${nota.ranchId}, ${nota.tipo}, ${nota.texto}, ${nota.fecha}::date,
            ${nota.precision}, ${nota.potreroId}::uuid, ${nota.reportedBy},
            ${nota.evidenciaId}::uuid, ${nota.version}, ${nota.recordedBy}, ${nota.recordedAt}
          )
        `)
      } catch (error) {
        throw traducirEscritura(error, () => new RechazoDeJournal('bitacora_ya_existe'))
      }
    },

    obtenerNota(ranchId, notaId, bloquear) {
      return leerNota(db, ranchId, notaId, bloquear)
    },

    async guardarCorreccionDeNota(entrada) {
      const cambios: Record<string, string | number | boolean | null> = {}
      for (const anterior of entrada.anteriores) {
        cambios[COLUMNA_NOTA[anterior.campo]] = valorNuevoDeNota(entrada, anterior.campo)
      }
      await actualizarConVersion(db, {
        esquema: 'journal',
        tabla: 'note',
        id: entrada.nota.id,
        version: entrada.versionLeida,
        cambios,
      })
      for (const anterior of entrada.anteriores) {
        await db.execute(sql`
          INSERT INTO journal.note_correction (
            id, ranch_id, note_id, field, previous_value, reason, corrected_by, corrected_at
          ) VALUES (
            ${nuevoId()}, ${entrada.nota.ranchId}, ${entrada.nota.id}, ${anterior.campo},
            ${anterior.valorAnterior}, ${entrada.motivo}, ${entrada.correctedBy}, ${entrada.correctedAt}
          )
        `)
      }
    },

    correccionesDeNota(ranchId, notaId) {
      return leerCorreccionesDeNota(db, ranchId, notaId)
    },

    async listarNotas(ranchId) {
      const filas = filasDe<FilaNota>(
        await db.execute(sql`
          SELECT ${COLUMNAS_NOTA}
          FROM journal.note
          WHERE ranch_id = ${ranchId}
          ORDER BY occurred_on DESC, id
        `),
      )
      return filas.map(notaDe)
    },

    async insertarPendiente(pendiente) {
      const clase = claseDe(pendiente.sujeto)
      try {
        await db.execute(sql`
          INSERT INTO journal.reminder (
            id, ranch_id, body, due_on, status, subject_kind, paddock_id,
            status_changed_by, status_changed_at, version, recorded_by, recorded_at
          ) VALUES (
            ${pendiente.id}, ${pendiente.ranchId}, ${pendiente.texto}, ${pendiente.fecha}::date,
            ${pendiente.estado}, ${clase}, ${potreroDe(pendiente.sujeto)}::uuid,
            ${pendiente.estadoPor}, ${pendiente.estadoEn}, ${pendiente.version},
            ${pendiente.recordedBy}, ${pendiente.recordedAt}
          )
        `)
        await escribirAnimales(db, pendiente)
      } catch (error) {
        throw traducirEscritura(error, () => new RechazoDeJournal('pendiente_ya_existe'))
      }
    },

    obtenerPendiente(ranchId, pendienteId, bloquear) {
      return leerPendiente(db, ranchId, pendienteId, bloquear)
    },

    async guardarCorreccionDePendiente(entrada) {
      const cambios: Record<string, string | number | boolean | null> = {}
      let cambiaSujeto = false
      for (const anterior of entrada.anteriores) {
        if (anterior.campo === 'sujeto') {
          cambiaSujeto = true
          continue
        }
        cambios[anterior.campo === 'texto' ? 'body' : 'due_on'] = valorNuevoDePendiente(
          entrada,
          anterior.campo,
        )
      }
      if (cambiaSujeto) {
        cambios.subject_kind = claseDe(entrada.pendiente.sujeto)
        cambios.paddock_id = potreroDe(entrada.pendiente.sujeto)
      }
      await actualizarConVersion(db, {
        esquema: 'journal',
        tabla: 'reminder',
        id: entrada.pendiente.id,
        version: entrada.versionLeida,
        cambios,
      })
      if (cambiaSujeto) {
        await db.execute(sql`
          DELETE FROM journal.reminder_animal
          WHERE reminder_id = ${entrada.pendiente.id} AND ranch_id = ${entrada.pendiente.ranchId}
        `)
        await escribirAnimales(db, entrada.pendiente)
      }
      for (const anterior of entrada.anteriores) {
        await db.execute(sql`
          INSERT INTO journal.reminder_correction (
            id, ranch_id, reminder_id, field, previous_value, reason, corrected_by, corrected_at
          ) VALUES (
            ${nuevoId()}, ${entrada.pendiente.ranchId}, ${entrada.pendiente.id}, ${anterior.campo},
            ${anterior.valorAnterior}, ${entrada.motivo}, ${entrada.correctedBy}, ${entrada.correctedAt}
          )
        `)
      }
    },

    async guardarEstado(entrada) {
      await actualizarConVersion(db, {
        esquema: 'journal',
        tabla: 'reminder',
        id: entrada.pendiente.id,
        version: entrada.versionLeida,
        cambios: {
          status: entrada.pendiente.estado,
          status_changed_by: entrada.changedBy,
          status_changed_at: entrada.changedAt.toISOString(),
        },
      })
      await db.execute(sql`
        INSERT INTO journal.reminder_status_change (
          id, ranch_id, reminder_id, previous_status, new_status, changed_by, changed_at
        ) VALUES (
          ${nuevoId()}, ${entrada.pendiente.ranchId}, ${entrada.pendiente.id},
          ${entrada.estadoAnterior}, ${entrada.pendiente.estado}, ${entrada.changedBy},
          ${entrada.changedAt}
        )
      `)
    },

    correccionesDePendiente(ranchId, pendienteId) {
      return leerCorreccionesDePendiente(db, ranchId, pendienteId)
    },

    cambiosDeEstado(ranchId, pendienteId) {
      return leerCambiosDeEstado(db, ranchId, pendienteId)
    },

    async listarPendientes(ranchId) {
      const filas = filasDe<FilaPendiente>(
        await db.execute(sql`
          SELECT ${COLUMNAS_PENDIENTE}
          FROM journal.reminder
          WHERE ranch_id = ${ranchId}
          ORDER BY due_on, id
        `),
      )
      const animales = await animalesDelRancho(db, ranchId)
      return filas.map((fila) => pendienteDe(fila, animales.get(fila.id) ?? []))
    },
  }
}

type FilaNota = {
  id: string
  ranch_id: string
  type: string
  body: string
  occurred_on: unknown
  date_precision: string
  paddock_id: string | null
  reported_by: string | null
  evidence_id: string | null
  version: unknown
  recorded_by: string
  recorded_at: unknown
}

type FilaPendiente = {
  id: string
  ranch_id: string
  body: string
  due_on: unknown
  status: string
  subject_kind: string | null
  paddock_id: string | null
  status_changed_by: string
  status_changed_at: unknown
  version: unknown
  recorded_by: string
  recorded_at: unknown
}

async function leerNota(
  db: EjecutorSql,
  ranchId: RanchId,
  notaId: string,
  bloquear: boolean,
): Promise<NotaDeBitacora | null> {
  const bloqueo = bloquear ? sql`FOR UPDATE` : sql``
  const filas = filasDe<FilaNota>(
    await db.execute(sql`
      SELECT ${COLUMNAS_NOTA}
      FROM journal.note
      WHERE ranch_id = ${ranchId} AND id = ${notaId}
      ${bloqueo}
    `),
  )
  const fila = filas[0]
  return fila === undefined ? null : notaDe(fila)
}

async function leerPendiente(
  db: EjecutorSql,
  ranchId: RanchId,
  pendienteId: string,
  bloquear: boolean,
): Promise<Pendiente | null> {
  const bloqueo = bloquear ? sql`FOR UPDATE` : sql``
  const filas = filasDe<FilaPendiente>(
    await db.execute(sql`
      SELECT ${COLUMNAS_PENDIENTE}
      FROM journal.reminder
      WHERE ranch_id = ${ranchId} AND id = ${pendienteId}
      ${bloqueo}
    `),
  )
  const fila = filas[0]
  if (fila === undefined) {
    return null
  }
  const animales = filasDe<{ animal_id: string }>(
    await db.execute(sql`
      SELECT animal_id
      FROM journal.reminder_animal
      WHERE reminder_id = ${pendienteId} AND ranch_id = ${ranchId}
      ORDER BY animal_id
    `),
  )
  return pendienteDe(
    fila,
    animales.map((animal) => animal.animal_id),
  )
}

async function animalesDelRancho(db: EjecutorSql, ranchId: RanchId): Promise<Map<string, string[]>> {
  const filas = filasDe<{ reminder_id: string; animal_id: string }>(
    await db.execute(sql`
      SELECT reminder_id, animal_id
      FROM journal.reminder_animal
      WHERE ranch_id = ${ranchId}
      ORDER BY animal_id
    `),
  )
  const porPendiente = new Map<string, string[]>()
  for (const fila of filas) {
    const lista = porPendiente.get(fila.reminder_id) ?? []
    lista.push(fila.animal_id)
    porPendiente.set(fila.reminder_id, lista)
  }
  return porPendiente
}

async function escribirAnimales(db: EjecutorSql, pendiente: Pendiente): Promise<void> {
  const ids = idsDe(pendiente.sujeto)
  for (const animalId of ids) {
    await db.execute(sql`
      INSERT INTO journal.reminder_animal (reminder_id, animal_id, ranch_id)
      VALUES (${pendiente.id}, ${animalId}, ${pendiente.ranchId})
    `)
  }
}

function idsDe(sujeto: SujetoDePendiente): readonly string[] {
  if (sujeto.clase === 'animal') {
    return [sujeto.animalId]
  }
  if (sujeto.clase === 'grupo') {
    return sujeto.animalIds
  }
  return []
}

function claseDe(sujeto: SujetoDePendiente): string | null {
  return sujeto.clase === 'ninguno' ? null : sujeto.clase
}

function potreroDe(sujeto: SujetoDePendiente): string | null {
  return sujeto.clase === 'potrero' ? sujeto.potreroId : null
}

function notaDe(fila: FilaNota): NotaDeBitacora {
  if (!esTipoDeBitacora(fila.type) || !esPrecisionDeNota(fila.date_precision)) {
    throw new Error('La base devolvió una nota de bitácora que no se puede leer.')
  }
  return {
    id: fila.id,
    ranchId: ranchIdSchema.parse(fila.ranch_id),
    tipo: fila.type,
    texto: fila.body,
    fecha: dia(fila.occurred_on),
    precision: fila.date_precision,
    potreroId: fila.paddock_id,
    reportedBy: fila.reported_by,
    evidenciaId: fila.evidence_id,
    version: entero(fila.version),
    recordedBy: recordedBySchema.parse(fila.recorded_by),
    recordedAt: instante(fila.recorded_at),
  }
}

function pendienteDe(fila: FilaPendiente, animales: readonly string[]): Pendiente {
  if (!esEstadoDePendiente(fila.status)) {
    throw new Error('La base devolvió un pendiente que no se puede leer.')
  }
  return {
    id: fila.id,
    ranchId: ranchIdSchema.parse(fila.ranch_id),
    texto: fila.body,
    fecha: dia(fila.due_on),
    estado: fila.status,
    sujeto: sujetoLeido(fila.subject_kind, fila.paddock_id, animales),
    estadoPor: recordedBySchema.parse(fila.status_changed_by),
    estadoEn: instante(fila.status_changed_at),
    version: entero(fila.version),
    recordedBy: recordedBySchema.parse(fila.recorded_by),
    recordedAt: instante(fila.recorded_at),
  }
}

function sujetoLeido(
  clase: string | null,
  potreroId: string | null,
  animales: readonly string[],
): SujetoDePendiente {
  if (clase === null) {
    if (potreroId !== null || animales.length > 0) {
      throw new Error('Un pendiente sin sujeto tiene potrero o animales.')
    }
    return { clase: 'ninguno' }
  }
  if (clase === 'animal') {
    const animalId = animales[0]
    if (animales.length !== 1 || animalId === undefined || potreroId !== null) {
      throw new Error('Un pendiente de un animal no cuadra con sus filas.')
    }
    return { clase: 'animal', animalId }
  }
  if (clase === 'grupo') {
    if (animales.length < 2 || potreroId !== null) {
      throw new Error('Un pendiente de un grupo no cuadra con sus filas.')
    }
    return { clase: 'grupo', animalIds: [...animales] }
  }
  if (clase === 'potrero') {
    if (potreroId === null || animales.length > 0) {
      throw new Error('Un pendiente de un potrero no cuadra con sus filas.')
    }
    return { clase: 'potrero', potreroId }
  }
  throw new Error('La base devolvió un sujeto de pendiente que no se puede leer.')
}

function valorNuevoDeNota(entrada: GuardarCorreccionDeNota, campo: CampoDeNota): string | null {
  const nota = entrada.nota
  switch (campo) {
    case 'tipo':
      return nota.tipo
    case 'texto':
      return nota.texto
    case 'fecha':
      return nota.fecha
    case 'precision':
      return nota.precision
    case 'potrero':
      return nota.potreroId
    case 'reportedBy':
      return nota.reportedBy
    case 'evidencia':
      return nota.evidenciaId
  }
}

function valorNuevoDePendiente(
  entrada: GuardarCorreccionDePendiente,
  campo: CampoDePendiente,
): string | null {
  if (campo === 'texto') {
    return entrada.pendiente.texto
  }
  if (campo === 'fecha') {
    return entrada.pendiente.fecha
  }
  return null
}

async function leerCorreccionesDeNota(
  db: EjecutorSql,
  ranchId: RanchId,
  notaId: string,
): Promise<readonly CorreccionDeNotaGuardada[]> {
  const filas = filasDe<{
    field: string
    previous_value: string | null
    reason: string
    corrected_by: string
    corrected_at: unknown
  }>(
    await db.execute(sql`
      SELECT field, previous_value, reason, corrected_by, corrected_at
      FROM journal.note_correction
      WHERE ranch_id = ${ranchId} AND note_id = ${notaId}
      ORDER BY corrected_at, field
    `),
  )
  return filas.map((fila) => ({
    campo: campoDeNota(fila.field),
    valorAnterior: fila.previous_value,
    motivo: fila.reason,
    correctedBy: fila.corrected_by,
    correctedAt: instante(fila.corrected_at),
  }))
}

async function leerCorreccionesDePendiente(
  db: EjecutorSql,
  ranchId: RanchId,
  pendienteId: string,
): Promise<readonly CorreccionDePendienteGuardada[]> {
  const filas = filasDe<{
    field: string
    previous_value: string | null
    reason: string
    corrected_by: string
    corrected_at: unknown
  }>(
    await db.execute(sql`
      SELECT field, previous_value, reason, corrected_by, corrected_at
      FROM journal.reminder_correction
      WHERE ranch_id = ${ranchId} AND reminder_id = ${pendienteId}
      ORDER BY corrected_at, field
    `),
  )
  return filas.map((fila) => ({
    campo: campoDePendiente(fila.field),
    valorAnterior: fila.previous_value,
    motivo: fila.reason,
    correctedBy: fila.corrected_by,
    correctedAt: instante(fila.corrected_at),
  }))
}

async function leerCambiosDeEstado(
  db: EjecutorSql,
  ranchId: RanchId,
  pendienteId: string,
): Promise<readonly CambioDeEstadoGuardado[]> {
  const filas = filasDe<{
    previous_status: string
    new_status: string
    changed_by: string
    changed_at: unknown
  }>(
    await db.execute(sql`
      SELECT previous_status, new_status, changed_by, changed_at
      FROM journal.reminder_status_change
      WHERE ranch_id = ${ranchId} AND reminder_id = ${pendienteId}
      ORDER BY changed_at, id
    `),
  )
  return filas.map((fila) => ({
    estadoAnterior: estadoDe(fila.previous_status),
    estadoNuevo: estadoDe(fila.new_status),
    changedBy: fila.changed_by,
    changedAt: instante(fila.changed_at),
  }))
}

function campoDeNota(valor: string): CampoDeNota {
  const leido = z.enum(Object.keys(COLUMNA_NOTA) as [CampoDeNota, ...CampoDeNota[]]).safeParse(valor)
  if (!leido.success) {
    throw new Error('La base devolvió un campo de nota que no se puede leer.')
  }
  return leido.data
}

function campoDePendiente(valor: string): CampoDePendiente {
  if (valor === 'texto' || valor === 'fecha' || valor === 'sujeto') {
    return valor
  }
  throw new Error('La base devolvió un campo de pendiente que no se puede leer.')
}

function estadoDe(valor: string): EstadoDePendiente {
  if (!esEstadoDePendiente(valor)) {
    throw new Error('La base devolvió un estado que no se puede leer.')
  }
  return valor
}

function traducirEscritura(error: unknown, alUnico: () => RechazoDeJournal): Error {
  const detalle = detallePg(error)
  if (detalle.unica) {
    return alUnico()
  }
  if (detalle.chequeo) {
    return new RechazoDeJournal('texto_invalido')
  }
  return error instanceof Error ? error : new Error('No se pudo guardar en la bitácora.')
}

function detallePg(error: unknown): { unica: boolean; chequeo: boolean } {
  const vistos = new Set<unknown>()
  let actual: unknown = error
  let unica = false
  let chequeo = false
  while (typeof actual === 'object' && actual !== null && !vistos.has(actual)) {
    vistos.add(actual)
    const fila = actual as { code?: unknown; cause?: unknown }
    if (fila.code === '23505') {
      unica = true
    }
    if (fila.code === '23514') {
      chequeo = true
    }
    actual = fila.cause
  }
  return { unica, chequeo }
}

function entero(valor: unknown): number {
  if (typeof valor === 'number' && Number.isInteger(valor)) {
    return valor
  }
  if (typeof valor === 'string' && /^-?\d+$/.test(valor)) {
    return Number(valor)
  }
  throw new Error('La base devolvió una versión que no se puede leer.')
}

function instante(valor: unknown): Date {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor
  }
  if (typeof valor === 'string' || typeof valor === 'number') {
    const fecha = new Date(valor)
    if (!Number.isNaN(fecha.getTime())) {
      return fecha
    }
  }
  throw new Error('La base devolvió un instante que no se puede leer.')
}

function dia(valor: unknown): string {
  if (typeof valor === 'string') {
    const texto = valor.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return texto
    }
  }
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const mes = String(valor.getUTCMonth() + 1).padStart(2, '0')
    const diaDelMes = String(valor.getUTCDate()).padStart(2, '0')
    return `${String(valor.getUTCFullYear())}-${mes}-${diaDelMes}`
  }
  throw new Error('La base devolvió un día que no se puede leer.')
}
