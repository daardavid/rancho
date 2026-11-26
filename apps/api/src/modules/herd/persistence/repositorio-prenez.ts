import { sql } from 'drizzle-orm'
import { z } from 'zod'

import { actualizarConVersion } from '../../../infrastructure/db/version'
import { filasDe, type EjecutorSql } from '../../../infrastructure/db/filas'
import { recordedBySchema, reportedBySchema } from '../../../shared-kernel/actores'
import { animalIdSchema, ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'

import type {
  CorreccionDeDiagnosticoGuardada,
  GuardarCorreccionDeDiagnostico,
  RepositorioDePrenez,
} from '../application/repositorio-prenez'
import { RechazoDeHerd } from '../domain/errores'
import {
  esResultadoDePrenez,
  type CampoDeDiagnostico,
  type DiagnosticoDePrenez,
} from '../domain/prenez'

const COLUMNAS = sql.raw(
  'id, ranch_id, animal_id, occurred_on::text as occurred_on, result, reported_by, note, saw_animal, version, recorded_by, recorded_at',
)

const COLUMNA: Record<CampoDeDiagnostico, string> = {
  resultado: 'result',
  fecha: 'occurred_on',
  reportedBy: 'reported_by',
  nota: 'note',
  vioAlAnimal: 'saw_animal',
}

type FilaDiagnostico = {
  id: string
  ranch_id: string
  animal_id: string
  occurred_on: unknown
  result: string
  reported_by: string | null
  note: string | null
  saw_animal: unknown
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

export function crearRepositorioDePrenez(db: EjecutorSql): RepositorioDePrenez {
  return {
    async insertar(diagnostico) {
      try {
        await db.execute(sql`
          INSERT INTO herd.pregnancy_check (
            id, ranch_id, animal_id, occurred_on, result, reported_by, note,
            saw_animal, version, recorded_by, recorded_at
          ) VALUES (
            ${diagnostico.id}, ${diagnostico.ranchId}, ${diagnostico.animalId},
            ${diagnostico.fecha}::date, ${diagnostico.resultado}, ${diagnostico.reportedBy},
            ${diagnostico.nota}, ${diagnostico.vioAlAnimal}, ${diagnostico.version},
            ${diagnostico.recordedBy}, ${diagnostico.recordedAt}
          )
        `)
      } catch (error) {
        throw traducirEscritura(error, () => new RechazoDeHerd('diagnostico_ya_existe'))
      }
    },

    obtener(ranchId, diagnosticoId, bloquear) {
      return leer(db, ranchId, exigirId(diagnosticoId), bloquear)
    },

    async guardarCorreccion(entrada) {
      const cambios: Record<string, string | number | boolean | null> = {}
      for (const anterior of entrada.anteriores) {
        cambios[COLUMNA[anterior.campo]] = valorNuevo(entrada, anterior.campo)
      }

      await actualizarConVersion(db, {
        esquema: 'herd',
        tabla: 'pregnancy_check',
        id: entrada.diagnostico.id,
        version: entrada.versionLeida,
        cambios,
      })

      for (const anterior of entrada.anteriores) {
        await db.execute(sql`
          INSERT INTO herd.pregnancy_check_correction (
            id, ranch_id, pregnancy_check_id, field, previous_value, reason, corrected_by, corrected_at
          ) VALUES (
            ${crypto.randomUUID()}, ${entrada.diagnostico.ranchId}, ${entrada.diagnostico.id},
            ${anterior.campo}, ${anterior.valorAnterior}, ${entrada.motivo},
            ${entrada.correctedBy}, ${entrada.correctedAt}
          )
        `)
      }
    },

    async correcciones(ranchId, diagnosticoId) {
      const filas = filasDe<FilaCorreccion>(
        await db.execute(sql`
          SELECT field, previous_value, reason, corrected_by, corrected_at
          FROM herd.pregnancy_check_correction
          WHERE ranch_id = ${ranchId} AND pregnancy_check_id = ${exigirId(diagnosticoId)}
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
  diagnosticoId: string,
  bloquear: boolean,
): Promise<DiagnosticoDePrenez | null> {
  const bloqueo = bloquear ? sql.raw('FOR UPDATE') : sql.raw('')
  const filas = filasDe<FilaDiagnostico>(
    await db.execute(sql`
      SELECT ${COLUMNAS}
      FROM herd.pregnancy_check
      WHERE ranch_id = ${ranchId} AND id = ${diagnosticoId}
      ${bloqueo}
    `),
  )
  const fila = filas[0]
  return fila === undefined ? null : desde(fila)
}

function valorNuevo(
  entrada: GuardarCorreccionDeDiagnostico,
  campo: CampoDeDiagnostico,
): string | number | boolean | null {
  const diagnostico = entrada.diagnostico
  switch (campo) {
    case 'resultado':
      return diagnostico.resultado
    case 'fecha':
      return diagnostico.fecha
    case 'reportedBy':
      return diagnostico.reportedBy
    case 'nota':
      return diagnostico.nota
    case 'vioAlAnimal':
      return diagnostico.vioAlAnimal
  }
}

function desde(fila: FilaDiagnostico): DiagnosticoDePrenez {
  if (!esResultadoDePrenez(fila.result)) {
    throw new Error('El diagnóstico tiene un resultado que no se puede leer.')
  }
  return {
    id: fila.id,
    ranchId: ranchIdSchema.parse(fila.ranch_id),
    animalId: animalIdSchema.parse(fila.animal_id),
    fecha: dia(fila.occurred_on),
    resultado: fila.result,
    reportedBy: fila.reported_by === null ? null : reportedBySchema.parse(fila.reported_by),
    nota: fila.note,
    vioAlAnimal: vistoDe(fila.saw_animal),
    version: entero(fila.version),
    recordedBy: recordedBySchema.parse(fila.recorded_by),
    recordedAt: instante(fila.recorded_at),
  }
}

function correccionDesde(fila: FilaCorreccion): CorreccionDeDiagnosticoGuardada {
  return {
    campo: campoDe(fila.field),
    valorAnterior: fila.previous_value,
    motivo: fila.reason,
    correctedBy: recordedBySchema.parse(fila.corrected_by),
    correctedAt: instante(fila.corrected_at),
  }
}

function campoDe(valor: string): CampoDeDiagnostico {
  if (
    valor === 'resultado' ||
    valor === 'fecha' ||
    valor === 'reportedBy' ||
    valor === 'nota' ||
    valor === 'vioAlAnimal'
  ) {
    return valor
  }
  throw new Error('La historia del diagnóstico tiene un campo que no se puede leer.')
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
  return error instanceof Error ? error : new Error('No se pudo guardar el diagnóstico.')
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

function vistoDe(valor: unknown): boolean | null {
  if (valor === null) {
    return null
  }
  if (typeof valor === 'boolean') {
    return valor
  }
  if (valor === 't' || valor === 'true' || valor === 1) {
    return true
  }
  if (valor === 'f' || valor === 'false' || valor === 0) {
    return false
  }
  throw new Error('La base devolvió un «vio al animal» que no se puede leer.')
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
