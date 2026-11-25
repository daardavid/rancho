import { sql } from 'drizzle-orm'

import { recordedBySchema } from '../../../shared-kernel/actores'
import { animalIdSchema, nuevoId, ranchIdSchema, type AnimalId, type RanchId } from '../../../shared-kernel/ids'
import { ConflictoDeVersion } from '../../../shared-kernel/conflictos'
import { filasDe, type EjecutorSql } from '../../../infrastructure/db/filas'

import type {
  CorreccionDeFiliacionGuardada,
  CriaGuardada,
  GuardarCorreccionDeFiliacion,
  RepositorioDeFiliacion,
} from '../application/repositorio-filiacion'
import {
  esCertezaDeFiliacion,
  esMotivoDeInferencia,
  esPrecisionDeFecha,
  type Filiacion,
  type LadoDeFiliacion,
  type MotivoDeInferencia,
  type PrecisionDeFecha,
} from '../domain/filiacion'
import { RechazoDeHerd } from '../domain/errores'

const COLUMNAS = sql.raw(
  `id, ranch_id, offspring_id, dam_certainty, dam_id, dam_reason, sire_certainty, sire_id, sire_reason,
   note, birth_date::text as birth_date, birth_date_precision, version, recorded_by, recorded_at`,
)

type FilaFiliacion = {
  id: string
  ranch_id: string
  offspring_id: string
  dam_certainty: string
  dam_id: string | null
  dam_reason: string | null
  sire_certainty: string
  sire_id: string | null
  sire_reason: string | null
  note: string | null
  birth_date: unknown
  birth_date_precision: string | null
  version: unknown
  recorded_by: string
  recorded_at: unknown
}

type FilaCorreccion = {
  previous_dam_certainty: string
  previous_dam_id: string | null
  previous_dam_reason: string | null
  previous_sire_certainty: string
  previous_sire_id: string | null
  previous_sire_reason: string | null
  previous_note: string | null
  previous_birth_date: unknown
  previous_birth_date_precision: string | null
  reason: string
  corrected_by: string
  corrected_at: unknown
}

type FilaCria = {
  offspring_id: string
  dam_id: string | null
  dam_certainty: string
  dam_reason: string | null
  sire_id: string | null
  sire_certainty: string
  sire_reason: string | null
}

export function crearRepositorioDeFiliacion(db: EjecutorSql): RepositorioDeFiliacion {
  return {
    async insertar(filiacion) {
      try {
        await db.execute(sql`
          INSERT INTO herd.parentage_record (
            id, ranch_id, offspring_id, dam_certainty, dam_id, dam_reason,
            sire_certainty, sire_id, sire_reason, note, birth_date, birth_date_precision,
            version, recorded_by, recorded_at
          ) VALUES (
            ${filiacion.id}, ${filiacion.ranchId}, ${filiacion.criaId},
            ${filiacion.madre.certeza}, ${filiacion.madre.animalId}::uuid, ${filiacion.madre.motivo},
            ${filiacion.padre.certeza}, ${filiacion.padre.animalId}::uuid, ${filiacion.padre.motivo},
            ${filiacion.nota}, ${filiacion.fechaNacimiento}::date, ${filiacion.precisionFecha},
            ${filiacion.version}, ${filiacion.recordedBy}, ${filiacion.recordedAt}
          )
        `)
      } catch (error) {
        throw traducirEscritura(error)
      }
    },

    obtenerPorCria(ranchId, criaId, bloquear) {
      return leer(db, ranchId, criaId, bloquear)
    },

    async guardarCorreccion(entrada) {
      const filas = filasDe(
        await db.execute(sql`
          UPDATE herd.parentage_record
          SET dam_certainty = ${entrada.filiacion.madre.certeza},
              dam_id = ${entrada.filiacion.madre.animalId}::uuid,
              dam_reason = ${entrada.filiacion.madre.motivo},
              sire_certainty = ${entrada.filiacion.padre.certeza},
              sire_id = ${entrada.filiacion.padre.animalId}::uuid,
              sire_reason = ${entrada.filiacion.padre.motivo},
              note = ${entrada.filiacion.nota},
              birth_date = ${entrada.filiacion.fechaNacimiento}::date,
              birth_date_precision = ${entrada.filiacion.precisionFecha},
              version = version + 1
          WHERE id = ${entrada.filiacion.id}
            AND ranch_id = ${entrada.filiacion.ranchId}
            AND version = ${entrada.versionLeida}
          RETURNING id
        `),
      )
      if (filas.length === 0) {
        throw new ConflictoDeVersion()
      }
      await insertarCorreccion(db, entrada)
    },

    async correccionesDe(ranchId, filiacionId) {
      const filas = filasDe<FilaCorreccion>(
        await db.execute(sql`
          SELECT previous_dam_certainty, previous_dam_id, previous_dam_reason,
                 previous_sire_certainty, previous_sire_id, previous_sire_reason,
                 previous_note, previous_birth_date::text as previous_birth_date,
                 previous_birth_date_precision, reason, corrected_by, corrected_at
          FROM herd.parentage_correction
          WHERE ranch_id = ${ranchId} AND parentage_id = ${filiacionId}
          ORDER BY corrected_at, id
        `),
      )
      return filas.map(correccionDesde)
    },

    async criasDe(ranchId, animalId) {
      const filas = filasDe<FilaCria>(
        await db.execute(sql`
          SELECT offspring_id, dam_id, dam_certainty, dam_reason, sire_id, sire_certainty, sire_reason
          FROM herd.parentage_record
          WHERE ranch_id = ${ranchId}
            AND (dam_id = ${animalId} OR sire_id = ${animalId})
          ORDER BY recorded_at, id
        `),
      )
      return filas.flatMap((fila) => criasDesde(fila, animalId))
    },
  }
}

async function leer(
  db: EjecutorSql,
  ranchId: RanchId,
  criaId: AnimalId,
  bloquear: boolean,
): Promise<Filiacion | null> {
  const bloqueo = bloquear ? sql.raw('FOR UPDATE') : sql.raw('')
  const filas = filasDe<FilaFiliacion>(
    await db.execute(sql`
      SELECT ${COLUMNAS}
      FROM herd.parentage_record
      WHERE ranch_id = ${ranchId} AND offspring_id = ${criaId}
      ${bloqueo}
    `),
  )
  const fila = filas[0]
  return fila === undefined ? null : filiacionDesde(fila)
}

async function insertarCorreccion(db: EjecutorSql, entrada: GuardarCorreccionDeFiliacion): Promise<void> {
  const anterior = entrada.anterior
  await db.execute(sql`
    INSERT INTO herd.parentage_correction (
      id, ranch_id, parentage_id, offspring_id,
      previous_dam_certainty, previous_dam_id, previous_dam_reason,
      previous_sire_certainty, previous_sire_id, previous_sire_reason,
      previous_note, previous_birth_date, previous_birth_date_precision,
      reason, corrected_by, corrected_at
    ) VALUES (
      ${nuevoId()}, ${entrada.filiacion.ranchId}, ${entrada.filiacion.id}, ${entrada.filiacion.criaId},
      ${anterior.madre.certeza}, ${anterior.madre.animalId}::uuid, ${anterior.madre.motivo},
      ${anterior.padre.certeza}, ${anterior.padre.animalId}::uuid, ${anterior.padre.motivo},
      ${anterior.nota}, ${anterior.fechaNacimiento}::date, ${anterior.precisionFecha},
      ${entrada.motivo}, ${entrada.correctedBy}, ${entrada.correctedAt}
    )
  `)
}

function filiacionDesde(fila: FilaFiliacion): Filiacion {
  const fecha = dia(fila.birth_date)
  const precision = precisionDe(fila.birth_date_precision)
  return {
    id: fila.id,
    ranchId: ranchIdSchema.parse(fila.ranch_id),
    criaId: animalIdSchema.parse(fila.offspring_id),
    madre: ladoDesde(fila.dam_certainty, fila.dam_id, fila.dam_reason),
    padre: ladoDesde(fila.sire_certainty, fila.sire_id, fila.sire_reason),
    nota: fila.note,
    fechaNacimiento: fecha,
    precisionFecha: precision,
    version: entero(fila.version),
    recordedBy: recordedBySchema.parse(fila.recorded_by),
    recordedAt: instante(fila.recorded_at),
  }
}

function correccionDesde(fila: FilaCorreccion): CorreccionDeFiliacionGuardada {
  return {
    madre: ladoDesde(fila.previous_dam_certainty, fila.previous_dam_id, fila.previous_dam_reason),
    padre: ladoDesde(fila.previous_sire_certainty, fila.previous_sire_id, fila.previous_sire_reason),
    nota: fila.previous_note,
    fechaNacimiento: dia(fila.previous_birth_date),
    precisionFecha: precisionDe(fila.previous_birth_date_precision),
    motivo: fila.reason,
    correctedBy: recordedBySchema.parse(fila.corrected_by),
    correctedAt: instante(fila.corrected_at),
  }
}

function criasDesde(fila: FilaCria, animalId: string): CriaGuardada[] {
  const crias: CriaGuardada[] = []
  if (fila.dam_id === animalId) {
    crias.push({
      criaId: fila.offspring_id,
      como: 'madre',
      certeza: certezaDe(fila.dam_certainty),
      motivo: motivoDe(fila.dam_reason),
    })
  }
  if (fila.sire_id === animalId) {
    crias.push({
      criaId: fila.offspring_id,
      como: 'padre',
      certeza: certezaDe(fila.sire_certainty),
      motivo: motivoDe(fila.sire_reason),
    })
  }
  return crias
}

function ladoDesde(certeza: string, animalId: string | null, motivo: string | null): LadoDeFiliacion {
  return {
    certeza: certezaDe(certeza),
    animalId,
    motivo: motivoDe(motivo),
  }
}

function certezaDe(valor: string): Filiacion['madre']['certeza'] {
  if (!esCertezaDeFiliacion(valor)) {
    throw new Error('La filiación guardada tiene una certeza que no se puede leer.')
  }
  return valor
}

function motivoDe(valor: string | null): MotivoDeInferencia | null {
  if (valor === null) {
    return null
  }
  if (!esMotivoDeInferencia(valor)) {
    throw new Error('La filiación guardada tiene un motivo que no se puede leer.')
  }
  return valor
}

function precisionDe(valor: string | null): PrecisionDeFecha | null {
  if (valor === null) {
    return null
  }
  if (!esPrecisionDeFecha(valor)) {
    throw new Error('La filiación guardada tiene una precisión de fecha que no se puede leer.')
  }
  return valor
}

function traducirEscritura(error: unknown): Error {
  const detalle = detallePg(error)
  if (detalle.unica) {
    return new RechazoDeHerd(
      detalle.texto.includes('offspring') ? 'filiacion_ya_existe' : 'animal_ya_existe',
    )
  }
  if (detalle.foranea) {
    return new RechazoDeHerd('progenitor_ausente')
  }
  if (detalle.chequeo) {
    return new RechazoDeHerd('filiacion_incoherente')
  }
  return error instanceof Error ? error : new Error('No se pudo guardar la filiación.')
}

function detallePg(error: unknown): { unica: boolean; foranea: boolean; chequeo: boolean; texto: string } {
  const vistos = new Set<unknown>()
  let actual: unknown = error
  let unica = false
  let foranea = false
  let chequeo = false
  let texto = ''

  while (typeof actual === 'object' && actual !== null && !vistos.has(actual)) {
    vistos.add(actual)
    const fila = actual as {
      code?: unknown
      constraint?: unknown
      constraint_name?: unknown
      message?: unknown
      cause?: unknown
    }
    if (fila.code === '23505') {
      unica = true
    }
    if (fila.code === '23503') {
      foranea = true
    }
    if (fila.code === '23514') {
      chequeo = true
    }
    if (typeof fila.constraint === 'string') {
      texto = `${texto} ${fila.constraint}`
    }
    if (typeof fila.constraint_name === 'string') {
      texto = `${texto} ${fila.constraint_name}`
    }
    if (typeof fila.message === 'string') {
      texto = `${texto} ${fila.message}`
    }
    actual = fila.cause
  }

  return { unica, foranea, chequeo, texto }
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

function dia(valor: unknown): string | null {
  if (valor === null) {
    return null
  }
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
