import { sql } from 'drizzle-orm'

import { actualizarConVersion } from '../../../infrastructure/db/version'
import { filasDe, type EjecutorSql } from '../../../infrastructure/db/filas'
import { recordedBySchema, reportedBySchema } from '../../../shared-kernel/actores'
import { animalIdSchema, nuevoId, ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'

import type {
  GuardarCorreccionDePotrero,
  RepositorioDeLugar,
} from '../application/repositorio-lugar'
import { RechazoDeHerd } from '../domain/errores'
import type { AsignacionDeLugar } from '../domain/lugar'
import type { CampoDePotrero, Potrero } from '../domain/potrero'

const COLUMNAS_POTRERO = sql.raw('id, ranch_id, name, note, version, recorded_by, recorded_at')

const COLUMNAS_ASIGNACION = sql.raw(
  'id, ranch_id, animal_id, paddock_id, valid_from::text as valid_from, note, reported_by, recorded_by, recorded_at',
)

const COLUMNA: Record<CampoDePotrero, string> = {
  nombre: 'name',
  nota: 'note',
}

type FilaPotrero = {
  id: string
  ranch_id: string
  name: string | null
  note: string | null
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

type FilaAsignacion = {
  id: string
  ranch_id: string
  animal_id: string
  paddock_id: string | null
  valid_from: unknown
  note: string | null
  reported_by: string | null
  recorded_by: string
  recorded_at: unknown
}

export function crearRepositorioDeLugar(db: EjecutorSql): RepositorioDeLugar {
  return {
    async insertarPotrero(potrero) {
      try {
        await db.execute(sql`
          INSERT INTO herd.paddock (id, ranch_id, name, note, version, recorded_by, recorded_at)
          VALUES (
            ${potrero.id}, ${potrero.ranchId}, ${potrero.nombre}, ${potrero.nota},
            ${potrero.version}, ${potrero.recordedBy}, ${potrero.recordedAt}
          )
        `)
      } catch (error) {
        throw traducirEscritura(error, () => new RechazoDeHerd('potrero_ya_existe'))
      }
    },

    obtenerPotrero(ranchId, potreroId, bloquear) {
      return leerPotrero(db, ranchId, potreroId, bloquear)
    },

    async guardarCorreccionDePotrero(entrada) {
      const cambios: Record<string, string | number | null> = {}
      for (const anterior of entrada.anteriores) {
        cambios[COLUMNA[anterior.campo]] = entrada.potrero[anterior.campo]
      }

      await actualizarConVersion(db, {
        esquema: 'herd',
        tabla: 'paddock',
        id: entrada.potrero.id,
        version: entrada.versionLeida,
        cambios,
      })

      for (const anterior of entrada.anteriores) {
        await insertarCorreccion(db, entrada, anterior)
      }
    },

    async correccionesDePotrero(ranchId, potreroId) {
      const filas = filasDe<FilaCorreccion>(
        await db.execute(sql`
          SELECT field, previous_value, reason, corrected_by, corrected_at
          FROM herd.paddock_correction
          WHERE ranch_id = ${ranchId} AND paddock_id = ${potreroId}
          ORDER BY corrected_at, field, id
        `),
      )
      return filas.map((fila) => {
        if (fila.field !== 'nombre' && fila.field !== 'nota') {
          throw new Error('La historia del potrero tiene un campo que no se puede leer.')
        }
        return {
          campo: fila.field,
          valorAnterior: fila.previous_value,
          motivo: fila.reason,
          correctedBy: recordedBySchema.parse(fila.corrected_by),
          correctedAt: instante(fila.corrected_at),
        }
      })
    },

    async listarPotreros(ranchId) {
      const filas = filasDe<FilaPotrero>(
        await db.execute(sql`
          SELECT ${COLUMNAS_POTRERO}
          FROM herd.paddock
          WHERE ranch_id = ${ranchId}
          ORDER BY name NULLS LAST, recorded_at, id
        `),
      )
      return filas.map(potreroDesde)
    },

    async insertarAsignacion(asignacion) {
      try {
        await db.execute(sql`
          INSERT INTO herd.location_assignment (
            id, ranch_id, animal_id, paddock_id, valid_from, note, reported_by, recorded_by,
            recorded_at
          ) VALUES (
            ${asignacion.id}, ${asignacion.ranchId}, ${asignacion.animalId},
            ${asignacion.potreroId}, ${asignacion.desde}::date, ${asignacion.nota},
            ${asignacion.reportedBy}, ${asignacion.recordedBy}, ${asignacion.recordedAt}
          )
        `)
      } catch (error) {
        // Una clave repetida es el mismo id de asignación dos veces: el cliente
        // lo acuñó y ya está guardado. Es un 409, no un «no encontrado».
        throw traducirEscritura(error, () => new RechazoDeHerd('asignacion_ya_existe'))
      }
    },

    async asignacionesDeAnimal(ranchId, animalId) {
      const filas = filasDe<FilaAsignacion>(
        await db.execute(sql`
          SELECT ${COLUMNAS_ASIGNACION}
          FROM herd.location_assignment
          WHERE ranch_id = ${ranchId} AND animal_id = ${animalId}
          ORDER BY valid_from, recorded_at, id
        `),
      )
      return filas.map(asignacionDesde)
    },

    async asignacionesDeAnimales(ranchId, animalIds) {
      if (animalIds.length === 0) {
        return []
      }
      const filas = filasDe<FilaAsignacion>(
        await db.execute(sql`
          SELECT ${COLUMNAS_ASIGNACION}
          FROM herd.location_assignment
          WHERE ranch_id = ${ranchId}
            AND animal_id IN (${sql.join(animalIds.map((id) => sql`${id}::uuid`), sql`, `)})
          ORDER BY valid_from, recorded_at, id
        `),
      )
      return filas.map(asignacionDesde)
    },

    async asignacionesDelRancho(ranchId) {
      const filas = filasDe<FilaAsignacion>(
        await db.execute(sql`
          SELECT ${COLUMNAS_ASIGNACION}
          FROM herd.location_assignment
          WHERE ranch_id = ${ranchId}
          ORDER BY valid_from, recorded_at, id
        `),
      )
      return filas.map(asignacionDesde)
    },
  }
}

async function leerPotrero(
  db: EjecutorSql,
  ranchId: RanchId,
  potreroId: string,
  bloquear: boolean,
): Promise<Potrero | null> {
  const bloqueo = bloquear ? sql.raw('FOR UPDATE') : sql.raw('')
  const filas = filasDe<FilaPotrero>(
    await db.execute(sql`
      SELECT ${COLUMNAS_POTRERO}
      FROM herd.paddock
      WHERE ranch_id = ${ranchId} AND id = ${potreroId}
      ${bloqueo}
    `),
  )
  const fila = filas[0]
  return fila === undefined ? null : potreroDesde(fila)
}

async function insertarCorreccion(
  db: EjecutorSql,
  entrada: GuardarCorreccionDePotrero,
  anterior: GuardarCorreccionDePotrero['anteriores'][number],
): Promise<void> {
  await db.execute(sql`
    INSERT INTO herd.paddock_correction (
      id, ranch_id, paddock_id, field, previous_value, reason, corrected_by, corrected_at
    ) VALUES (
      ${nuevoId()}, ${entrada.potrero.ranchId}, ${entrada.potrero.id}, ${anterior.campo},
      ${anterior.valorAnterior}, ${entrada.motivo}, ${entrada.correctedBy}, ${entrada.correctedAt}
    )
  `)
}

function potreroDesde(fila: FilaPotrero): Potrero {
  return {
    id: fila.id,
    ranchId: ranchIdSchema.parse(fila.ranch_id),
    nombre: fila.name,
    nota: fila.note,
    version: entero(fila.version),
    recordedBy: recordedBySchema.parse(fila.recorded_by),
    recordedAt: instante(fila.recorded_at),
  }
}

function asignacionDesde(fila: FilaAsignacion): AsignacionDeLugar {
  return {
    id: fila.id,
    ranchId: ranchIdSchema.parse(fila.ranch_id),
    animalId: animalIdSchema.parse(fila.animal_id),
    potreroId: fila.paddock_id,
    desde: dia(fila.valid_from),
    nota: fila.note,
    reportedBy: fila.reported_by === null ? null : reportedBySchema.parse(fila.reported_by),
    recordedBy: recordedBySchema.parse(fila.recorded_by),
    recordedAt: instante(fila.recorded_at),
  }
}

function traducirEscritura(error: unknown, alUnico: () => RechazoDeHerd): Error {
  const detalle = detallePg(error)
  if (detalle.unica) {
    return alUnico()
  }
  if (detalle.foranea) {
    return new RechazoDeHerd('no_encontrado')
  }
  return error instanceof Error ? error : new Error('No se pudo guardar el lugar.')
}

function detallePg(error: unknown): { unica: boolean; foranea: boolean; texto: string } {
  const vistos = new Set<unknown>()
  let actual: unknown = error
  let unica = false
  let foranea = false
  let texto = ''

  while (typeof actual === 'object' && actual !== null && !vistos.has(actual)) {
    vistos.add(actual)
    const fila = actual as { code?: unknown; message?: unknown; cause?: unknown }
    if (fila.code === '23505') {
      unica = true
    }
    if (fila.code === '23503') {
      foranea = true
    }
    if (typeof fila.message === 'string') {
      texto = `${texto} ${fila.message}`
    }
    actual = fila.cause
  }

  return { unica, foranea, texto }
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
