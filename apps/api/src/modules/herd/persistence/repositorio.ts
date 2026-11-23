import { sql } from 'drizzle-orm'

import { recordedBySchema } from '../../../shared-kernel/actores'
import { animalIdSchema, nuevoId, ranchIdSchema, type AnimalId, type RanchId } from '../../../shared-kernel/ids'
import { actualizarConVersion } from '../../../infrastructure/db/version'
import { filasDe, type EjecutorSql } from '../../../infrastructure/db/filas'

import type { Animal, ValorAnterior } from '../domain/animal'
import type { Correccion } from '../domain/correccion'
import { RechazoDeHerd } from '../domain/errores'
import type { Marca } from '../domain/marca'
import {
  esCampoDeFicha,
  esCategoria,
  esEstadoDeMarca,
  esParticipacion,
  esSexo,
  esTenencia,
  esTipoDeMarca,
  type CampoDeFicha,
} from '../domain/valores'
import type { GuardarCorreccion, RepositorioDeAnimales } from '../application/repositorio'

const COLUMNAS_ANIMAL = sql.raw(
  'id, ranch_id, name, sex, category, category_detail, tenure, economic_participation, arrangement_note, note, active, version, recorded_by, recorded_at',
)

const COLUMNAS_MARCA = sql.raw(
  'id, ranch_id, animal_id, type, value, valid_from::text as valid_from, status, changed_on::text as changed_on, recorded_by, recorded_at',
)

const COLUMNA: Record<CampoDeFicha, string> = {
  nombre: 'name',
  sexo: 'sex',
  categoria: 'category',
  detalleCategoria: 'category_detail',
  tenencia: 'tenure',
  participacionEconomica: 'economic_participation',
  notaDelArreglo: 'arrangement_note',
  nota: 'note',
}

type FilaAnimal = {
  id: string
  ranch_id: string
  name: string | null
  sex: string
  category: string
  category_detail: string | null
  tenure: string
  economic_participation: string
  arrangement_note: string | null
  note: string | null
  active: unknown
  version: unknown
  recorded_by: string
  recorded_at: unknown
}

type FilaMarca = {
  id: string
  ranch_id: string
  animal_id: string
  type: string
  value: string
  valid_from: unknown
  status: string
  changed_on: unknown
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

export function crearRepositorioDeAnimales(db: EjecutorSql): RepositorioDeAnimales {
  return {
    async insertar(animal) {
      try {
        await db.execute(sql`
          INSERT INTO herd.animal (
            id, ranch_id, name, sex, category, category_detail, tenure,
            economic_participation, arrangement_note, note, active, version,
            recorded_by, recorded_at
          ) VALUES (
            ${animal.id}, ${animal.ranchId}, ${animal.nombre}, ${animal.sexo},
            ${animal.categoria}, ${animal.detalleCategoria}, ${animal.tenencia},
            ${animal.participacionEconomica}, ${animal.notaDelArreglo}, ${animal.nota},
            ${animal.activo}, ${animal.version}, ${animal.recordedBy}, ${animal.recordedAt}
          )
        `)
      } catch (error) {
        throw traducirEscritura(error, () => new RechazoDeHerd('animal_ya_existe'))
      }
    },

    obtener(ranchId, id, bloquear) {
      return leerAnimal(db, ranchId, id, bloquear)
    },

    async guardarCorreccion(entrada) {
      const cambios: Record<string, string | number | null> = {}
      for (const anterior of entrada.anteriores) {
        cambios[COLUMNA[anterior.campo]] = valorNuevo(entrada.animal, anterior.campo)
      }

      await actualizarConVersion(db, {
        esquema: 'herd',
        tabla: 'animal',
        id: entrada.animal.id,
        version: entrada.versionLeida,
        cambios,
      })

      for (const anterior of entrada.anteriores) {
        await insertarCorreccion(db, entrada, anterior)
      }
    },

    async insertarMarca(marca) {
      try {
        await db.execute(sql`
          INSERT INTO herd.animal_mark (
            id, ranch_id, animal_id, type, value, valid_from, status, changed_on,
            recorded_by, recorded_at
          ) VALUES (
            ${marca.id}, ${marca.ranchId}, ${marca.animalId}, ${marca.tipo}, ${marca.valor},
            ${marca.desde}::date, 'active', null,
            ${marca.recordedBy}, ${marca.recordedAt}
          )
        `)
      } catch (error) {
        throw traducirEscritura(error, (restriccion) =>
          restriccion.includes('siniiga')
            ? new RechazoDeHerd('marca_siniiga_duplicada')
            : new RechazoDeHerd('marca_ya_existe'),
        )
      }
    },

    obtenerMarca(ranchId, animalId, marcaId, bloquear) {
      return leerMarca(db, ranchId, animalId, marcaId, bloquear)
    },

    async cerrarMarca(marca) {
      const filas = filasDe(
        await db.execute(sql`
          UPDATE herd.animal_mark
          SET status = ${marca.estado}, changed_on = ${marca.cambiadaEl}::date
          WHERE id = ${marca.id}
            AND ranch_id = ${marca.ranchId}
            AND animal_id = ${marca.animalId}
            AND status = 'active'
          RETURNING id
        `),
      )
      if (filas.length === 0) {
        throw new RechazoDeHerd('marca_no_activa')
      }
    },

    async siniigaActiva(ranchId, valor, exceptoMarcaId) {
      const filas = filasDe(
        await db.execute(sql`
          SELECT id
          FROM herd.animal_mark
          WHERE ranch_id = ${ranchId}
            AND type = 'siniiga'
            AND status = 'active'
            AND value = ${valor}
            AND (${exceptoMarcaId}::uuid IS NULL OR id <> ${exceptoMarcaId}::uuid)
          LIMIT 1
        `),
      )
      return filas.length > 0
    },

    async listarActivos(ranchId) {
      const filas = filasDe<FilaAnimal>(
        await db.execute(sql`
          SELECT ${COLUMNAS_ANIMAL}
          FROM herd.animal
          WHERE ranch_id = ${ranchId} AND active = true
          ORDER BY recorded_at, id
        `),
      )
      return filas.map(animalDesde)
    },

    async obtenerVarios(ranchId, ids) {
      if (ids.length === 0) {
        return []
      }
      const filas = filasDe<FilaAnimal>(
        await db.execute(sql`
          SELECT ${COLUMNAS_ANIMAL}
          FROM herd.animal
          WHERE ranch_id = ${ranchId}
            AND id IN (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})
          ORDER BY recorded_at, id
        `),
      )
      return filas.map(animalDesde)
    },

    async marcasDe(ranchId, animalIds) {
      if (animalIds.length === 0) {
        return []
      }
      const filas = filasDe<FilaMarca>(
        await db.execute(sql`
          SELECT ${COLUMNAS_MARCA}
          FROM herd.animal_mark
          WHERE ranch_id = ${ranchId}
            AND animal_id IN (${sql.join(animalIds.map((id) => sql`${id}::uuid`), sql`, `)})
          ORDER BY recorded_at, id
        `),
      )
      return filas.map(marcaDesde)
    },

    async correccionesDe(ranchId, animalId) {
      const filas = filasDe<FilaCorreccion>(
        await db.execute(sql`
          SELECT field, previous_value, reason, corrected_by, corrected_at
          FROM herd.animal_correction
          WHERE ranch_id = ${ranchId} AND animal_id = ${animalId}
          ORDER BY corrected_at, field, id
        `),
      )
      return filas.map(correccionDesde)
    },

    async idsPorMarca(ranchId, valor) {
      const filas = filasDe<{ animal_id: string }>(
        await db.execute(sql`
          SELECT DISTINCT animal_id
          FROM herd.animal_mark
          WHERE ranch_id = ${ranchId} AND value = ${valor}
        `),
      )
      return filas.map((fila) => fila.animal_id)
    },

    async estados(ranchId, ids) {
      if (ids.length === 0) {
        return []
      }
      const filas = filasDe<{ id: string; active: unknown }>(
        await db.execute(sql`
          SELECT id, active
          FROM herd.animal
          WHERE ranch_id = ${ranchId}
            AND id IN (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})
        `),
      )
      return filas.map((fila) => ({ id: fila.id, activo: bandera(fila.active) }))
    },
  }
}

async function leerAnimal(
  db: EjecutorSql,
  ranchId: RanchId,
  id: AnimalId,
  bloquear: boolean,
): Promise<Animal | null> {
  const bloqueo = bloquear ? sql.raw('FOR UPDATE') : sql.raw('')
  const filas = filasDe<FilaAnimal>(
    await db.execute(sql`
      SELECT ${COLUMNAS_ANIMAL}
      FROM herd.animal
      WHERE ranch_id = ${ranchId} AND id = ${id}
      ${bloqueo}
    `),
  )
  const fila = filas[0]
  return fila === undefined ? null : animalDesde(fila)
}

async function leerMarca(
  db: EjecutorSql,
  ranchId: RanchId,
  animalId: AnimalId,
  marcaId: string,
  bloquear: boolean,
): Promise<Marca | null> {
  const bloqueo = bloquear ? sql.raw('FOR UPDATE') : sql.raw('')
  const filas = filasDe<FilaMarca>(
    await db.execute(sql`
      SELECT ${COLUMNAS_MARCA}
      FROM herd.animal_mark
      WHERE ranch_id = ${ranchId} AND animal_id = ${animalId} AND id = ${marcaId}
      ${bloqueo}
    `),
  )
  const fila = filas[0]
  return fila === undefined ? null : marcaDesde(fila)
}

async function insertarCorreccion(
  db: EjecutorSql,
  entrada: GuardarCorreccion,
  anterior: ValorAnterior,
): Promise<void> {
  await db.execute(sql`
    INSERT INTO herd.animal_correction (
      id, ranch_id, animal_id, field, previous_value, reason, corrected_by, corrected_at
    ) VALUES (
      ${nuevoId()}, ${entrada.animal.ranchId}, ${entrada.animal.id}, ${anterior.campo},
      ${anterior.valorAnterior}, ${entrada.motivo}, ${entrada.correctedBy}, ${entrada.correctedAt}
    )
  `)
}

function valorNuevo(animal: Animal, campo: CampoDeFicha): string | null {
  switch (campo) {
    case 'nombre':
      return animal.nombre
    case 'sexo':
      return animal.sexo
    case 'categoria':
      return animal.categoria
    case 'detalleCategoria':
      return animal.detalleCategoria
    case 'tenencia':
      return animal.tenencia
    case 'participacionEconomica':
      return animal.participacionEconomica
    case 'notaDelArreglo':
      return animal.notaDelArreglo
    case 'nota':
      return animal.nota
  }
}

function animalDesde(fila: FilaAnimal): Animal {
  if (!esSexo(fila.sex) || !esCategoria(fila.category) || !esTenencia(fila.tenure) || !esParticipacion(fila.economic_participation)) {
    throw new Error('La ficha guardada tiene un código que no se puede leer.')
  }

  return {
    id: animalIdSchema.parse(fila.id),
    ranchId: ranchIdSchema.parse(fila.ranch_id),
    nombre: fila.name,
    sexo: fila.sex,
    categoria: fila.category,
    detalleCategoria: fila.category_detail,
    tenencia: fila.tenure,
    participacionEconomica: fila.economic_participation,
    notaDelArreglo: fila.arrangement_note,
    nota: fila.note,
    activo: bandera(fila.active),
    version: entero(fila.version),
    recordedBy: recordedBySchema.parse(fila.recorded_by),
    recordedAt: instante(fila.recorded_at),
  }
}

function marcaDesde(fila: FilaMarca): Marca {
  if (!esTipoDeMarca(fila.type) || !esEstadoDeMarca(fila.status)) {
    throw new Error('La marca guardada tiene un código que no se puede leer.')
  }

  return {
    id: fila.id,
    ranchId: ranchIdSchema.parse(fila.ranch_id),
    animalId: animalIdSchema.parse(fila.animal_id),
    tipo: fila.type,
    valor: fila.value,
    desde: dia(fila.valid_from),
    estado: fila.status,
    cambiadaEl: dia(fila.changed_on),
    recordedBy: recordedBySchema.parse(fila.recorded_by),
    recordedAt: instante(fila.recorded_at),
  }
}

function correccionDesde(fila: FilaCorreccion): Correccion {
  if (!esCampoDeFicha(fila.field)) {
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

function traducirEscritura(error: unknown, alUnico: (restriccion: string) => RechazoDeHerd): Error {
  const detalle = detallePg(error)
  if (detalle.unica) {
    return alUnico(detalle.texto)
  }
  if (detalle.foranea) {
    return new RechazoDeHerd('no_encontrado')
  }
  return error instanceof Error ? error : new Error('No se pudo guardar la ficha.')
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

function bandera(valor: unknown): boolean {
  if (typeof valor === 'boolean') {
    return valor
  }
  if (valor === 't' || valor === 'true' || valor === 1) {
    return true
  }
  if (valor === 'f' || valor === 'false' || valor === 0) {
    return false
  }
  throw new Error('La base devolvió un activo que no se puede leer.')
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
