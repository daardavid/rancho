import { sql } from 'drizzle-orm'

import { recordedBySchema, reportedBySchema } from '../../../shared-kernel/actores'
import { animalIdSchema, nuevoId, ranchIdSchema, type AnimalId, type RanchId } from '../../../shared-kernel/ids'
import { formatearGramosATexto, interpretarKilos, type Gramos } from '../../../shared-kernel/kilos'
import type { SourceQuality } from '../../../shared-kernel/source-quality'
import { actualizarConVersion } from '../../../infrastructure/db/version'
import { filasDe, type EjecutorSql } from '../../../infrastructure/db/filas'

import type { CorreccionDePeso, ValorAnteriorDePeso } from '../domain/correccion'
import { RechazoDeGrowth } from '../domain/errores'
import type { FilaDeSesion, FilaPesada, SesionDePesaje } from '../domain/sesion'
import { esCampoDePeso } from '../domain/valores'
import type { PesoConHistoria, RepositorioDePesajes } from '../application/repositorio'

const COLUMNAS_SESION = sql.raw(
  'id, ranch_id, weighed_on::text as weighed_on, note, reported_by, recorded_by, recorded_at, command_id',
)

const COLUMNAS_LINEA = sql.raw('id, animal_id, result, kilos::text as kilos, quality, version')

type FilaSesion = {
  id: string
  ranch_id: string
  weighed_on: unknown
  note: string | null
  reported_by: string | null
  recorded_by: string
  recorded_at: unknown
  command_id: string
}

type FilaLinea = {
  id: string
  animal_id: string
  result: string
  kilos: unknown
  quality: string | null
  version: unknown
}

type FilaPeso = FilaLinea & {
  session_id: string
  fecha: unknown
}

type FilaHistoria = {
  line_id: string
  field: string
  previous_value: string
  reason: string
  corrected_by: string
  corrected_at: unknown
}

export function crearRepositorioDePesajes(db: EjecutorSql): RepositorioDePesajes {
  return {
    async insertar(sesion) {
      try {
        await db.execute(sql`
          INSERT INTO growth.weighing_session (
            id, ranch_id, weighed_on, note, reported_by, recorded_by, recorded_at, command_id
          ) VALUES (
            ${sesion.id}, ${sesion.ranchId}, ${sesion.fecha}::date, ${sesion.nota},
            ${sesion.reportedBy}, ${sesion.recordedBy}, ${sesion.recordedAt}, ${sesion.commandId}
          )
        `)
        for (const [indice, fila] of sesion.filas.entries()) {
          await insertarFila(db, sesion, fila, indice)
        }
      } catch (error) {
        throw traducirEscritura(error)
      }
    },

    obtener(ranchId, id) {
      return leerSesion(db, ranchId, id)
    },

    async ultima(ranchId) {
      const filas = filasDe<{ id: string }>(
        await db.execute(sql`
          SELECT id
          FROM growth.weighing_session
          WHERE ranch_id = ${ranchId}
          ORDER BY weighed_on DESC, recorded_at DESC, id DESC
          LIMIT 1
        `),
      )
      const primera = filas[0]
      if (primera === undefined) {
        return null
      }
      return leerSesion(db, ranchId, primera.id)
    },

    async pesosDe(ranchId, animalId) {
      const filas = filasDe<FilaPeso>(
        await db.execute(sql`
          SELECT
            line.id,
            line.animal_id,
            line.result,
            line.kilos::text as kilos,
            line.quality,
            line.version,
            session.id as session_id,
            session.weighed_on::text as fecha
          FROM growth.weighing_line line
          JOIN growth.weighing_session session
            ON session.id = line.session_id AND session.ranch_id = line.ranch_id
          WHERE line.ranch_id = ${ranchId}
            AND line.animal_id = ${animalId}
            AND line.result = 'weighed'
          ORDER BY session.weighed_on, line.position, line.id
        `),
      )
      const historia = await leerCorrecciones(
        db,
        ranchId,
        filas.map((fila) => fila.id),
      )
      return filas.map((fila) => pesoDesde(fila, historia.get(fila.id) ?? []))
    },

    async obtenerLinea(ranchId, id, bloquear) {
      const bloqueo = bloquear ? sql.raw('FOR UPDATE OF line') : sql.raw('')
      const filas = filasDe<FilaPeso>(
        await db.execute(sql`
          SELECT
            line.id,
            line.animal_id,
            line.result,
            line.kilos::text as kilos,
            line.quality,
            line.version,
            session.id as session_id,
            session.weighed_on::text as fecha
          FROM growth.weighing_line line
          JOIN growth.weighing_session session
            ON session.id = line.session_id AND session.ranch_id = line.ranch_id
          WHERE line.ranch_id = ${ranchId} AND line.id = ${id}
          ${bloqueo}
        `),
      )
      const fila = filas[0]
      if (fila === undefined) {
        return null
      }
      if (fila.result === 'gap') {
        return {
          resultado: 'hueco',
          id: fila.id,
          animalId: animalIdSchema.parse(fila.animal_id),
          sesionId: fila.session_id,
          fecha: dia(fila.fecha),
        }
      }
      const historia = await leerCorrecciones(db, ranchId, [fila.id])
      return { resultado: 'pesado', ...pesoDesde(fila, historia.get(fila.id) ?? []) }
    },

    async guardarCorreccion(entrada) {
      const cambios: Record<string, string | number | null> = {}
      for (const anterior of entrada.anteriores) {
        cambios[columnaDe(anterior)] = valorNuevo(entrada.fila, anterior)
      }

      await actualizarConVersion(db, {
        esquema: 'growth',
        tabla: 'weighing_line',
        id: entrada.fila.id,
        version: entrada.versionLeida,
        cambios,
      })

      for (const anterior of entrada.anteriores) {
        await db.execute(sql`
          INSERT INTO growth.weight_correction (
            id, ranch_id, line_id, field, previous_value, reason, corrected_by, corrected_at
          ) VALUES (
            ${nuevoId()}, ${entrada.ranchId}, ${entrada.fila.id}, ${anterior.campo},
            ${anterior.valorAnterior}, ${entrada.motivo}, ${entrada.correctedBy}, ${entrada.correctedAt}
          )
        `)
      }
    },
  }
}

async function insertarFila(
  db: EjecutorSql,
  sesion: SesionDePesaje,
  fila: FilaDeSesion,
  indice: number,
): Promise<void> {
  if (fila.resultado === 'hueco') {
    await db.execute(sql`
      INSERT INTO growth.weighing_line (
        id, ranch_id, session_id, animal_id, position, result, kilos, quality, version
      ) VALUES (
        ${fila.id}, ${sesion.ranchId}, ${sesion.id}, ${fila.animalId}, ${indice},
        'gap', null, null, null
      )
    `)
    return
  }

  const texto = formatearGramosATexto(fila.kilos)
  await db.execute(sql`
    INSERT INTO growth.weighing_line (
      id, ranch_id, session_id, animal_id, position, result, kilos, quality, version
    ) VALUES (
      ${fila.id}, ${sesion.ranchId}, ${sesion.id}, ${fila.animalId}, ${indice},
      'weighed', ${texto}::numeric, ${fila.calidad}, ${fila.version}
    )
  `)
}

async function leerSesion(db: EjecutorSql, ranchId: RanchId, id: string): Promise<SesionDePesaje | null> {
  const sesiones = filasDe<FilaSesion>(
    await db.execute(sql`
      SELECT ${COLUMNAS_SESION}
      FROM growth.weighing_session
      WHERE ranch_id = ${ranchId} AND id = ${id}
    `),
  )
  const sesion = sesiones[0]
  if (sesion === undefined) {
    return null
  }

  const lineas = filasDe<FilaLinea>(
    await db.execute(sql`
      SELECT ${COLUMNAS_LINEA}
      FROM growth.weighing_line
      WHERE ranch_id = ${ranchId} AND session_id = ${id}
      ORDER BY position, id
    `),
  )

  return sesionDesde(sesion, lineas)
}

async function leerCorrecciones(
  db: EjecutorSql,
  ranchId: RanchId,
  ids: readonly string[],
): Promise<Map<string, CorreccionDePeso[]>> {
  const grupos = new Map<string, CorreccionDePeso[]>()
  if (ids.length === 0) {
    return grupos
  }

  const filas = filasDe<FilaHistoria>(
    await db.execute(sql`
      SELECT line_id, field, previous_value, reason, corrected_by, corrected_at
      FROM growth.weight_correction
      WHERE ranch_id = ${ranchId}
        AND line_id IN (${sql.join(
          ids.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})
      ORDER BY corrected_at, field
    `),
  )

  for (const fila of filas) {
    const correccion = correccionDesde(fila)
    const grupo = grupos.get(fila.line_id)
    if (grupo === undefined) {
      grupos.set(fila.line_id, [correccion])
    } else {
      grupo.push(correccion)
    }
  }

  return grupos
}

function sesionDesde(fila: FilaSesion, lineas: readonly FilaLinea[]): SesionDePesaje {
  return {
    id: fila.id,
    ranchId: ranchIdSchema.parse(fila.ranch_id),
    fecha: dia(fila.weighed_on),
    nota: fila.note,
    reportedBy: fila.reported_by === null ? null : reportedBySchema.parse(fila.reported_by),
    recordedBy: recordedBySchema.parse(fila.recorded_by),
    recordedAt: instante(fila.recorded_at),
    commandId: fila.command_id,
    filas: lineas.map(filaDesde),
  }
}

function filaDesde(fila: FilaLinea): FilaDeSesion {
  const animalId = animalIdSchema.parse(fila.animal_id)
  if (fila.result === 'gap') {
    return { id: fila.id, animalId, resultado: 'hueco' }
  }
  if (fila.result !== 'weighed') {
    throw new Error('La fila guardada tiene un resultado que no se puede leer.')
  }
  return pesoFilaDesde(fila, animalId)
}

function pesoDesde(fila: FilaPeso, correcciones: readonly CorreccionDePeso[]): PesoConHistoria {
  return {
    fila: pesoFilaDesde(fila, animalIdSchema.parse(fila.animal_id)),
    sesionId: fila.session_id,
    fecha: dia(fila.fecha),
    correcciones,
  }
}

function pesoFilaDesde(fila: FilaLinea, animalId: AnimalId): FilaPesada {
  if (fila.quality === null || !esCalidad(fila.quality)) {
    throw new Error('La fila guardada tiene una calidad que no se puede leer.')
  }
  return {
    id: fila.id,
    animalId,
    resultado: 'pesado',
    kilos: gramosDe(fila.kilos),
    calidad: fila.quality,
    version: entero(fila.version),
  }
}

function correccionDesde(fila: FilaHistoria): CorreccionDePeso {
  if (!esCampoDePeso(fila.field)) {
    throw new Error('La historia guardada tiene un campo que no se puede leer.')
  }
  return {
    campo: fila.field,
    valorAnterior: fila.previous_value,
    motivo: fila.reason,
    correctedBy: recordedBySchema.parse(fila.corrected_by),
    correctedAt: instante(fila.corrected_at),
  }
}

function columnaDe(anterior: ValorAnteriorDePeso): string {
  return anterior.campo === 'kilos' ? 'kilos' : 'quality'
}

function valorNuevo(fila: FilaPesada, anterior: ValorAnteriorDePeso): string {
  return anterior.campo === 'kilos' ? formatearGramosATexto(fila.kilos) : fila.calidad
}

function esCalidad(valor: string): valor is SourceQuality {
  return valor === 'measured' || valor === 'observed' || valor === 'declared'
}

function gramosDe(valor: unknown): Gramos {
  if (typeof valor !== 'string') {
    throw new Error('El peso guardado no volvió como texto.')
  }
  const lectura = interpretarKilos(valor.trim())
  if (!lectura.ok) {
    throw new Error(`El peso guardado no se puede leer: ${valor}`)
  }
  return lectura.gramos
}

function traducirEscritura(error: unknown): Error {
  if (error instanceof RechazoDeGrowth) {
    return error
  }
  const detalle = detallePg(error)
  if (detalle.foranea) {
    return new RechazoDeGrowth('animal_ausente')
  }
  if (detalle.unica) {
    if (detalle.texto.includes('weighing_line_session_animal')) {
      return new RechazoDeGrowth('animal_repetido')
    }
    if (detalle.texto.includes('weighing_line')) {
      return new RechazoDeGrowth('fila_ya_existe')
    }
    return new RechazoDeGrowth('sesion_ya_existe')
  }
  return error instanceof Error ? error : new Error('No se pudo guardar la sesión.')
}

function detallePg(error: unknown): { unica: boolean; foranea: boolean; texto: string } {
  const vistos = new Set<unknown>()
  let actual: unknown = error
  let unica = false
  let foranea = false
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
