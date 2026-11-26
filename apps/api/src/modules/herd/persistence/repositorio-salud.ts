import { sql } from 'drizzle-orm'
import { z } from 'zod'

import { actualizarConVersion } from '../../../infrastructure/db/version'
import { filasDe, type EjecutorSql } from '../../../infrastructure/db/filas'
import { recordedBySchema } from '../../../shared-kernel/actores'
import { animalIdSchema, ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'

import type {
  CorreccionDeNotaGuardada,
  GuardarCorreccionDeNota,
  RepositorioDeSalud,
} from '../application/repositorio-salud'
import { RechazoDeHerd } from '../domain/errores'
import {
  esTipoDeNotaDeSalud,
  type CampoDeNota,
  type NotaDeSalud,
} from '../domain/salud'

const COLUMNAS_NOTA = sql.raw(
  'id, ranch_id, animal_id, type, detail, occurred_on::text as occurred_on, product, evidence_id, saw_animal, version, recorded_by, recorded_at',
)

const COLUMNA: Record<CampoDeNota, string> = {
  tipo: 'type',
  detalle: 'detail',
  fecha: 'occurred_on',
  producto: 'product',
  evidencia: 'evidence_id',
  vioAlAnimal: 'saw_animal',
}

type FilaNota = {
  id: string
  ranch_id: string
  animal_id: string
  type: string
  detail: string
  occurred_on: unknown
  product: string | null
  evidence_id: string | null
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

export function crearRepositorioDeSalud(db: EjecutorSql): RepositorioDeSalud {
  return {
    async insertarNota(nota) {
      try {
        await db.execute(sql`
          INSERT INTO herd.health_event (
            id, ranch_id, animal_id, type, detail, occurred_on, product, evidence_id,
            saw_animal, version, recorded_by, recorded_at
          ) VALUES (
            ${nota.id}, ${nota.ranchId}, ${nota.animalId}, ${nota.tipo}, ${nota.detalle},
            ${nota.fecha}::date, ${nota.producto}, ${nota.evidenciaId}::uuid,
            ${nota.vioAlAnimal}, ${nota.version}, ${nota.recordedBy}, ${nota.recordedAt}
          )
        `)
      } catch (error) {
        // Una clave repetida es el mismo id de nota dos veces: el cliente lo
        // acuñó y ya está guardado. Es un 409, no un «no encontrado».
        throw traducirEscritura(error, () => new RechazoDeHerd('nota_ya_existe'))
      }
    },

    obtenerNota(ranchId, notaId, bloquear) {
      return leerNota(db, ranchId, exigirId(notaId), bloquear)
    },

    async guardarCorreccionDeNota(entrada) {
      const cambios: Record<string, string | number | boolean | null> = {}
      for (const anterior of entrada.anteriores) {
        cambios[COLUMNA[anterior.campo]] = valorNuevo(entrada, anterior.campo)
      }

      await actualizarConVersion(db, {
        esquema: 'herd',
        tabla: 'health_event',
        id: entrada.nota.id,
        version: entrada.versionLeida,
        cambios,
      })

      for (const anterior of entrada.anteriores) {
        await insertarCorreccion(db, entrada, anterior.campo, anterior.valorAnterior)
      }
    },

    async correccionesDeNota(ranchId, notaId) {
      const filas = filasDe<FilaCorreccion>(
        await db.execute(sql`
          SELECT field, previous_value, reason, corrected_by, corrected_at
          FROM herd.health_event_correction
          WHERE ranch_id = ${ranchId} AND health_event_id = ${exigirId(notaId)}
          ORDER BY corrected_at, field, id
        `),
      )
      return filas.map(correccionDesde)
    },

    async notasDeAnimal(ranchId, animalId) {
      const filas = filasDe<FilaNota>(
        await db.execute(sql`
          SELECT ${COLUMNAS_NOTA}
          FROM herd.health_event
          WHERE ranch_id = ${ranchId} AND animal_id = ${exigirId(animalId)}
          ORDER BY occurred_on, recorded_at, id
        `),
      )
      return filas.map(notaDesde)
    },

    async notasDeAnimales(ranchId, animalIds) {
      if (animalIds.length === 0) {
        return []
      }
      const filas = filasDe<FilaNota>(
        await db.execute(sql`
          SELECT ${COLUMNAS_NOTA}
          FROM herd.health_event
          WHERE ranch_id = ${ranchId}
            AND animal_id IN (${sql.join(animalIds.map((id) => sql`${exigirId(id)}::uuid`), sql`, `)})
          ORDER BY occurred_on, recorded_at, id
        `),
      )
      return filas.map(notaDesde)
    },
  }
}

async function leerNota(
  db: EjecutorSql,
  ranchId: RanchId,
  notaId: string,
  bloquear: boolean,
): Promise<NotaDeSalud | null> {
  const bloqueo = bloquear ? sql.raw('FOR UPDATE') : sql.raw('')
  const filas = filasDe<FilaNota>(
    await db.execute(sql`
      SELECT ${COLUMNAS_NOTA}
      FROM herd.health_event
      WHERE ranch_id = ${ranchId} AND id = ${notaId}
      ${bloqueo}
    `),
  )
  const fila = filas[0]
  return fila === undefined ? null : notaDesde(fila)
}

async function insertarCorreccion(
  db: EjecutorSql,
  entrada: GuardarCorreccionDeNota,
  campo: CampoDeNota,
  valorAnterior: string | null,
): Promise<void> {
  await db.execute(sql`
    INSERT INTO herd.health_event_correction (
      id, ranch_id, health_event_id, field, previous_value, reason, corrected_by, corrected_at
    ) VALUES (
      ${crypto.randomUUID()}, ${entrada.nota.ranchId}, ${entrada.nota.id}, ${campo},
      ${valorAnterior}, ${entrada.motivo}, ${entrada.correctedBy}, ${entrada.correctedAt}
    )
  `)
}

/** El valor que tiene ahora la nota en ese campo, ya con la corrección aplicada. */
function valorNuevo(
  entrada: GuardarCorreccionDeNota,
  campo: CampoDeNota,
): string | number | boolean | null {
  const nota = entrada.nota
  switch (campo) {
    case 'tipo':
      return nota.tipo
    case 'detalle':
      return nota.detalle
    case 'fecha':
      return nota.fecha
    case 'producto':
      return nota.producto
    case 'evidencia':
      return nota.evidenciaId
    case 'vioAlAnimal':
      return nota.vioAlAnimal
  }
}

function notaDesde(fila: FilaNota): NotaDeSalud {
  if (!esTipoDeNotaDeSalud(fila.type)) {
    throw new Error('La nota de sanidad tiene un tipo que no se puede leer.')
  }

  return {
    id: fila.id,
    ranchId: ranchIdSchema.parse(fila.ranch_id),
    animalId: animalIdSchema.parse(fila.animal_id),
    tipo: fila.type,
    detalle: fila.detail,
    fecha: dia(fila.occurred_on),
    producto: fila.product,
    evidenciaId: fila.evidence_id,
    vioAlAnimal: vistoDe(fila.saw_animal),
    version: entero(fila.version),
    recordedBy: recordedBySchema.parse(fila.recorded_by),
    recordedAt: instante(fila.recorded_at),
  }
}

function correccionDesde(fila: FilaCorreccion): CorreccionDeNotaGuardada {
  return {
    campo: campoDe(fila.field),
    valorAnterior: fila.previous_value,
    motivo: fila.reason,
    correctedBy: recordedBySchema.parse(fila.corrected_by),
    correctedAt: instante(fila.corrected_at),
  }
}

function campoDe(valor: string): CampoDeNota {
  if (
    valor === 'tipo' ||
    valor === 'detalle' ||
    valor === 'fecha' ||
    valor === 'producto' ||
    valor === 'evidencia' ||
    valor === 'vioAlAnimal'
  ) {
    return valor
  }
  throw new Error('La historia de la nota tiene un campo que no se puede leer.')
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
  return error instanceof Error ? error : new Error('No se pudo guardar la nota de sanidad.')
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

/** `null` es «No sé». No es lo mismo que no haber elegido. */
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
