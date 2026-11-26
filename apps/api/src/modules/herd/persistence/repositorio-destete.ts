import { sql } from 'drizzle-orm'
import { z } from 'zod'

import { filasDe, type EjecutorSql } from '../../../infrastructure/db/filas'
import { actualizarConVersion } from '../../../infrastructure/db/version'
import { recordedBySchema, reportedBySchema } from '../../../shared-kernel/actores'
import { animalIdSchema, ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'

import type {
  CorreccionDeDesteteGuardada,
  GuardarCorreccionDeDestete,
  RepositorioDeDestete,
} from '../application/repositorio-destete'
import {
  type CampoDeDestete,
  type Destete,
  type PrecisionDeDestete,
} from '../domain/destete'
import { RechazoDeHerd } from '../domain/errores'

const COLUMNAS = sql.raw(
  'id, ranch_id, animal_id, occurred_on::text as occurred_on, date_precision, note, reported_by, weight_id, version, recorded_by, recorded_at',
)

const COLUMNA: Record<CampoDeDestete, string> = {
  fecha: 'occurred_on',
  precision: 'date_precision',
  nota: 'note',
  reportedBy: 'reported_by',
}

type FilaDestete = {
  id: string
  ranch_id: string
  animal_id: string
  occurred_on: unknown
  date_precision: string | null
  note: string | null
  reported_by: string | null
  weight_id: string | null
  version: unknown
  recorded_by: string
  recorded_at: unknown
}

type FilaCorreccion = {
  field: string
  previous_value: string | null
  reason: string
  corrected_by: string
  corrected_at: unknown
}

export function crearRepositorioDeDestete(db: EjecutorSql): RepositorioDeDestete {
  return {
    async insertar(destete) {
      try {
        await db.execute(sql`
          INSERT INTO herd.weaning (
            id, ranch_id, animal_id, occurred_on, date_precision, note, reported_by,
            weight_id, version, recorded_by, recorded_at
          ) VALUES (
            ${destete.id}, ${destete.ranchId}, ${destete.animalId},
            ${destete.fecha}::date, ${destete.precision}, ${destete.nota}, ${destete.reportedBy},
            ${destete.pesoId}, ${destete.version}, ${destete.recordedBy}, ${destete.recordedAt}
          )
        `)
      } catch (error) {
        throw traducirEscritura(error, () => new RechazoDeHerd('destete_ya_existe'))
      }
    },

    obtener(ranchId, desteteId, bloquear) {
      return leer(db, ranchId, exigirId(desteteId), bloquear)
    },

    async guardarCorreccion(entrada) {
      const cambios: Record<string, string | number | boolean | null> = {}
      for (const anterior of entrada.anteriores) {
        cambios[COLUMNA[anterior.campo]] = valorNuevo(entrada, anterior.campo)
      }

      await actualizarConVersion(db, {
        esquema: 'herd',
        tabla: 'weaning',
        id: entrada.destete.id,
        version: entrada.versionLeida,
        cambios,
      })

      for (const anterior of entrada.anteriores) {
        await db.execute(sql`
          INSERT INTO herd.weaning_correction (
            id, ranch_id, weaning_id, field, previous_value, reason, corrected_by, corrected_at
          ) VALUES (
            ${crypto.randomUUID()}, ${entrada.destete.ranchId}, ${entrada.destete.id},
            ${anterior.campo}, ${anterior.valorAnterior}, ${entrada.motivo},
            ${entrada.correctedBy}, ${entrada.correctedAt}
          )
        `)
      }
    },

    async correcciones(ranchId, desteteId) {
      const filas = filasDe<FilaCorreccion>(
        await db.execute(sql`
          SELECT field, previous_value, reason, corrected_by, corrected_at
          FROM herd.weaning_correction
          WHERE ranch_id = ${ranchId} AND weaning_id = ${exigirId(desteteId)}
          ORDER BY corrected_at, field, id
        `),
      )
      return filas.map(correccionDesde)
    },
  }
}

async function leer(
  db: EjecutorSql,
  ranchId: RanchId,
  desteteId: string,
  bloquear: boolean,
): Promise<Destete | null> {
  const bloqueo = bloquear ? sql.raw('FOR UPDATE') : sql.raw('')
  const filas = filasDe<FilaDestete>(
    await db.execute(sql`
      SELECT ${COLUMNAS}
      FROM herd.weaning
      WHERE ranch_id = ${ranchId} AND id = ${desteteId}
      ${bloqueo}
    `),
  )
  const fila = filas[0]
  return fila === undefined ? null : desde(fila)
}

function valorNuevo(
  entrada: GuardarCorreccionDeDestete,
  campo: CampoDeDestete,
): string | null {
  const destete = entrada.destete
  switch (campo) {
    case 'fecha':
      return destete.fecha
    case 'precision':
      return destete.precision
    case 'nota':
      return destete.nota
    case 'reportedBy':
      return destete.reportedBy
  }
}

function desde(fila: FilaDestete): Destete {
  return {
    id: fila.id,
    ranchId: ranchIdSchema.parse(fila.ranch_id),
    animalId: animalIdSchema.parse(fila.animal_id),
    fecha: fila.occurred_on === null ? null : dia(fila.occurred_on),
    precision: precisionDe(fila.date_precision),
    nota: fila.note,
    reportedBy: fila.reported_by === null ? null : reportedBySchema.parse(fila.reported_by),
    pesoId: fila.weight_id,
    version: entero(fila.version),
    recordedBy: recordedBySchema.parse(fila.recorded_by),
    recordedAt: instante(fila.recorded_at),
  }
}

function correccionDesde(fila: FilaCorreccion): CorreccionDeDesteteGuardada {
  return {
    campo: campoDe(fila.field),
    valorAnterior: fila.previous_value,
    motivo: fila.reason,
    correctedBy: recordedBySchema.parse(fila.corrected_by),
    correctedAt: instante(fila.corrected_at),
  }
}

function precisionDe(valor: string | null): PrecisionDeDestete | null {
  if (valor === null) {
    return null
  }
  if (valor === 'exact' || valor === 'approximate') {
    return valor
  }
  throw new Error('El destete tiene una precisión que no se puede leer.')
}

function campoDe(valor: string): CampoDeDestete {
  if (valor === 'fecha' || valor === 'precision' || valor === 'nota' || valor === 'reportedBy') {
    return valor
  }
  throw new Error('La historia del destete tiene un campo que no se puede leer.')
}

function exigirId(valor: string): string {
  const leido = z.uuid().safeParse(valor)
  if (!leido.success) {
    throw new RechazoDeHerd('no_encontrado')
  }
  return leido.data
}

function traducirEscritura(error: unknown, alUnico: () => RechazoDeHerd): Error {
  const detalle = detallePg(error)
  if (detalle.unica) {
    return alUnico()
  }
  if (detalle.foranea) {
    return new RechazoDeHerd('no_encontrado')
  }
  if (detalle.chequeo) {
    return new RechazoDeHerd('texto_invalido')
  }
  return error instanceof Error ? error : new Error('No se pudo guardar el destete.')
}

function detallePg(error: unknown): { unica: boolean; foranea: boolean; chequeo: boolean } {
  const vistos = new Set<unknown>()
  let actual: unknown = error
  let unica = false
  let foranea = false
  let chequeo = false

  while (typeof actual === 'object' && actual !== null && !vistos.has(actual)) {
    vistos.add(actual)
    const fila = actual as { code?: unknown; cause?: unknown }
    if (fila.code === '23505') {
      unica = true
    }
    if (fila.code === '23503') {
      foranea = true
    }
    if (fila.code === '23514') {
      chequeo = true
    }
    actual = fila.cause
  }

  return { unica, foranea, chequeo }
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
