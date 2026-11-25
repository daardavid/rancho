import { sql, type SQL } from 'drizzle-orm'

import type { EjecutorSql } from '../infrastructure/db/filas'
import { filasDe } from '../infrastructure/db/filas'
import type { RanchId } from '../shared-kernel/ids'

/**
 * Presencia, como consulta ([domain-boundaries](../../../../docs/architecture/domain-boundaries.md),
 * «Presence»).
 *
 * La última observación no se guarda en `Animal` ni la escribe el pesaje ni la
 * nota. Se reconstruye de los hechos que dicen que el animal se vio:
 *
 * - un pesaje (`weighed`); un hueco no cuenta
 * - una nota de sanidad con `saw_animal`
 *
 * No cuentan una asignación de lugar, un hueco, ni una nota que no dice que se
 * vio. Si el mismo día hay dos, gana la que se registró después.
 *
 * Los días se cuentan en `America/Mexico_City`, contra el día que se pide, no
 * contra el reloj del proceso. No hay umbral: quien tiene observación entra a
 * la lista, ordenado por esos días.
 */

export type Categoria = 'calf' | 'cow' | 'bull' | 'other' | 'unknown'
export type OrigenDeObservacion = 'pesaje' | 'sanidad'

export type Observacion = {
  readonly fecha: string
  readonly origen: OrigenDeObservacion
  readonly origenId: string
  readonly dias: number
}

export type UltimaObservacion = {
  readonly animalId: string
  readonly observacion: Observacion | null
}

export type AnimalDelInicio = {
  readonly animalId: string
  readonly nombre: string | null
  readonly categoria: Categoria
}

export type AnimalSinVerse = AnimalDelInicio & {
  readonly dias: number
  readonly fecha: string
  readonly origen: OrigenDeObservacion
  readonly origenId: string
}

export type CambioDelPeriodo = AnimalDelInicio & {
  readonly fecha: string
}

export type VistaDeInicio = {
  readonly hoy: string
  readonly desde: string
  readonly activosPorCategoria: readonly { readonly categoria: Categoria; readonly cantidad: number }[]
  readonly cambios: {
    readonly nacimientos: readonly CambioDelPeriodo[]
    readonly nacimientosSinFecha: number
    readonly salidas: readonly CambioDelPeriodo[]
    readonly pesajes: number
    readonly notasDeSanidad: number
  }
  readonly paraRevisar: {
    readonly fechaDeLaUltimaVuelta: string | null
    readonly huecosDeLaUltimaVuelta: readonly AnimalDelInicio[]
    readonly sinLugar: readonly AnimalDelInicio[]
    readonly lugarDesconocido: readonly AnimalDelInicio[]
    readonly sinObservacion: readonly AnimalDelInicio[]
    readonly porDiasSinVerse: readonly AnimalSinVerse[]
  }
}

export type ModelosDePresencia = {
  /** El día de hoy en el rancho. `hoy` fija la prueba. */
  hoy(hoy?: string): Promise<string>
  /**
   * `null` cuando el animal no existe en este rancho. `observacion: null`
   * cuando existe y nadie lo ha visto en un pesaje o en una nota.
   */
  ultimaObservacion(ranchId: RanchId, animalId: string, hoy?: string): Promise<UltimaObservacion | null>
  /**
   * Activos, cambios desde `desde` (por omisión, siete días antes de `hoy`) y
   * lo que hay que revisar. `hoy` fija la prueba.
   */
  inicio(ranchId: RanchId, opciones?: { readonly desde?: string; readonly hoy?: string }): Promise<VistaDeInicio>
}

const CATEGORIAS: readonly Categoria[] = ['calf', 'cow', 'bull', 'other', 'unknown']
const ORIGENES: readonly OrigenDeObservacion[] = ['pesaje', 'sanidad']
const ZONA_DEL_RANCHO = 'America/Mexico_City'

type FilaDeAnimal = {
  animal_id: string
  nombre: string | null
  categoria: string
}

type FilaDeObservacion = FilaDeAnimal & {
  fecha: string | null
  origen: string | null
  origen_id: string | null
  dias: unknown
}

type FilaDeCambio = FilaDeAnimal & {
  fecha: string
}

type FilaDeConteo = {
  categoria: string
  cantidad: unknown
}

type FilaDeNumero = {
  cantidad: unknown
}

type FilaDeDia = {
  dia: string
}

export function crearModelosDePresencia(db: EjecutorSql): ModelosDePresencia {
  return {
    async hoy(hoy) {
      return diaDelRancho(db, hoy)
    },

    async ultimaObservacion(ranchId, animalId, hoy) {
      const dia = await diaDelRancho(db, hoy)
      const filas = filasDe<FilaDeObservacion>(
        await db.execute(sql`
          WITH observaciones AS (
            ${observacionesDe(ranchId)}
          )
          SELECT
            animal.id AS animal_id,
            animal.name AS nombre,
            animal.category AS categoria,
            observaciones.fecha::text AS fecha,
            observaciones.origen,
            observaciones.origen_id,
            CASE
              WHEN observaciones.fecha IS NULL THEN NULL
              ELSE (${dia}::date - observaciones.fecha)::int
            END AS dias
          FROM herd.animal animal
          LEFT JOIN observaciones ON observaciones.animal_id = animal.id
          WHERE animal.ranch_id = ${ranchId} AND animal.id = ${animalId}
        `),
      )
      const fila = filas[0]
      if (fila === undefined) {
        return null
      }
      return { animalId: fila.animal_id, observacion: observacionDe(fila) }
    },

    async inicio(ranchId, opciones) {
      const dia = await diaDelRancho(db, opciones?.hoy)
      const desde = await desdeDelPeriodo(db, dia, opciones?.desde)
      const [categorias, nacimientos, sinFecha, salidas, pesajes, notas, vuelta, huecos, sinLugar, lugarDesconocido, vistos] =
        await Promise.all([
          filasDe<FilaDeConteo>(
            await db.execute(sql`
              SELECT category AS categoria, count(*)::int AS cantidad
              FROM herd.animal
              WHERE ranch_id = ${ranchId} AND active
              GROUP BY category
              ORDER BY CASE category
                WHEN 'calf' THEN 1
                WHEN 'cow' THEN 2
                WHEN 'bull' THEN 3
                WHEN 'other' THEN 4
                ELSE 5
              END
            `),
          ),
          filasDe<FilaDeCambio>(
            await db.execute(sql`
              SELECT
                animal.id AS animal_id,
                animal.name AS nombre,
                animal.category AS categoria,
                filiacion.birth_date::text AS fecha
              FROM herd.parentage_record filiacion
              JOIN herd.animal animal
                ON animal.id = filiacion.offspring_id AND animal.ranch_id = filiacion.ranch_id
              WHERE filiacion.ranch_id = ${ranchId}
                AND filiacion.birth_date IS NOT NULL
                AND filiacion.birth_date >= ${desde}::date
                AND filiacion.birth_date <= ${dia}::date
              ORDER BY filiacion.birth_date DESC, animal.name NULLS LAST, animal.id
            `),
          ),
          filasDe<FilaDeNumero>(
            await db.execute(sql`
              SELECT count(*)::int AS cantidad
              FROM herd.parentage_record
              WHERE ranch_id = ${ranchId} AND birth_date IS NULL
            `),
          ),
          filasDe<FilaDeCambio>(
            await db.execute(sql`
              SELECT
                id AS animal_id,
                name AS nombre,
                category AS categoria,
                exit_known_on::text AS fecha
              FROM herd.animal
              WHERE ranch_id = ${ranchId}
                AND active = false
                AND exit_known_on >= ${desde}::date
                AND exit_known_on <= ${dia}::date
              ORDER BY exit_known_on DESC, name NULLS LAST, id
            `),
          ),
          filasDe<FilaDeNumero>(
            await db.execute(sql`
              SELECT count(*)::int AS cantidad
              FROM growth.weighing_line linea
              JOIN growth.weighing_session sesion
                ON sesion.id = linea.session_id AND sesion.ranch_id = linea.ranch_id
              WHERE linea.ranch_id = ${ranchId}
                AND linea.result = 'weighed'
                AND sesion.weighed_on >= ${desde}::date
                AND sesion.weighed_on <= ${dia}::date
            `),
          ),
          filasDe<FilaDeNumero>(
            await db.execute(sql`
              SELECT count(*)::int AS cantidad
              FROM herd.health_event
              WHERE ranch_id = ${ranchId}
                AND occurred_on >= ${desde}::date
                AND occurred_on <= ${dia}::date
            `),
          ),
          filasDe<{ fecha: string }>(
            await db.execute(sql`
              SELECT weighed_on::text AS fecha
              FROM growth.weighing_session
              WHERE ranch_id = ${ranchId}
              ORDER BY weighed_on DESC, recorded_at DESC, id DESC
              LIMIT 1
            `),
          ),
          filasDe<FilaDeAnimal>(
            await db.execute(sql`
              WITH ultima AS (
                SELECT id
                FROM growth.weighing_session
                WHERE ranch_id = ${ranchId}
                ORDER BY weighed_on DESC, recorded_at DESC, id DESC
                LIMIT 1
              )
              SELECT
                animal.id AS animal_id,
                animal.name AS nombre,
                animal.category AS categoria
              FROM herd.animal animal
              JOIN growth.weighing_line linea
                ON linea.animal_id = animal.id
               AND linea.ranch_id = animal.ranch_id
               AND linea.result = 'gap'
               AND linea.session_id = (SELECT id FROM ultima)
              WHERE animal.ranch_id = ${ranchId}
                AND animal.active
              ORDER BY animal.name NULLS LAST, animal.id
            `),
          ),
          filasDe<FilaDeAnimal>(
            await db.execute(sql`
              SELECT
                animal.id AS animal_id,
                animal.name AS nombre,
                animal.category AS categoria
              FROM herd.animal animal
              WHERE animal.ranch_id = ${ranchId}
                AND animal.active
                AND NOT EXISTS (
                  SELECT 1
                  FROM herd.location_assignment asignacion
                  WHERE asignacion.animal_id = animal.id
                    AND asignacion.ranch_id = animal.ranch_id
                )
              ORDER BY animal.name NULLS LAST, animal.id
            `),
          ),
          filasDe<FilaDeAnimal>(
            await db.execute(sql`
              WITH vigente AS (
                SELECT DISTINCT ON (animal_id)
                  animal_id,
                  paddock_id
                FROM herd.location_assignment
                WHERE ranch_id = ${ranchId}
                ORDER BY animal_id, valid_from DESC, recorded_at DESC, id DESC
              )
              SELECT
                animal.id AS animal_id,
                animal.name AS nombre,
                animal.category AS categoria
              FROM herd.animal animal
              JOIN vigente ON vigente.animal_id = animal.id
              WHERE animal.ranch_id = ${ranchId}
                AND animal.active
                AND vigente.paddock_id IS NULL
              ORDER BY animal.name NULLS LAST, animal.id
            `),
          ),
          filasDe<FilaDeObservacion>(
            await db.execute(sql`
              WITH observaciones AS (
                ${observacionesDe(ranchId)}
              )
              SELECT
                animal.id AS animal_id,
                animal.name AS nombre,
                animal.category AS categoria,
                observaciones.fecha::text AS fecha,
                observaciones.origen,
                observaciones.origen_id,
                CASE
                  WHEN observaciones.fecha IS NULL THEN NULL
                  ELSE (${dia}::date - observaciones.fecha)::int
                END AS dias
              FROM herd.animal animal
              LEFT JOIN observaciones ON observaciones.animal_id = animal.id
              WHERE animal.ranch_id = ${ranchId}
                AND animal.active
              ORDER BY
                observaciones.fecha IS NULL,
                dias DESC NULLS LAST,
                animal.name NULLS LAST,
                animal.id
            `),
          ),
        ])

      const sinObservacion: AnimalDelInicio[] = []
      const porDiasSinVerse: AnimalSinVerse[] = []
      for (const fila of vistos) {
        const observacion = observacionDe(fila)
        if (observacion === null) {
          sinObservacion.push(animalDe(fila))
          continue
        }
        porDiasSinVerse.push({ ...animalDe(fila), ...observacion })
      }

      const cantidadSinFecha = sinFecha[0]
      const cantidadDePesajes = pesajes[0]
      const cantidadDeNotas = notas[0]
      if (cantidadSinFecha === undefined || cantidadDePesajes === undefined || cantidadDeNotas === undefined) {
        throw new Error('La cuenta del periodo no devolvió una fila.')
      }

      return {
        hoy: dia,
        desde,
        activosPorCategoria: categorias.map((fila) => ({
          categoria: categoria(fila.categoria),
          cantidad: entero(fila.cantidad),
        })),
        cambios: {
          nacimientos: nacimientos.map(cambioDe),
          nacimientosSinFecha: entero(cantidadSinFecha.cantidad),
          salidas: salidas.map(cambioDe),
          pesajes: entero(cantidadDePesajes.cantidad),
          notasDeSanidad: entero(cantidadDeNotas.cantidad),
        },
        paraRevisar: {
          fechaDeLaUltimaVuelta: vuelta[0]?.fecha ?? null,
          huecosDeLaUltimaVuelta: huecos.map(animalDe),
          sinLugar: sinLugar.map(animalDe),
          lugarDesconocido: lugarDesconocido.map(animalDe),
          sinObservacion,
          porDiasSinVerse,
        },
      }
    },
  }
}

/**
 * Una fila por animal: el hecho más reciente que cuenta como haberlo visto.
 * El hueco y la asignación de lugar no están en esta unión.
 */
function observacionesDe(ranchId: RanchId): SQL {
  return sql`
    SELECT DISTINCT ON (animal_id)
      animal_id,
      fecha,
      origen,
      origen_id
    FROM (
      SELECT
        linea.animal_id,
        sesion.weighed_on AS fecha,
        'pesaje' AS origen,
        linea.id AS origen_id,
        sesion.recorded_at AS registrado_en
      FROM growth.weighing_line linea
      JOIN growth.weighing_session sesion
        ON sesion.id = linea.session_id AND sesion.ranch_id = linea.ranch_id
      WHERE linea.ranch_id = ${ranchId}
        AND linea.result = 'weighed'
      UNION ALL
      SELECT
        nota.animal_id,
        nota.occurred_on AS fecha,
        'sanidad' AS origen,
        nota.id AS origen_id,
        nota.recorded_at AS registrado_en
      FROM herd.health_event nota
      WHERE nota.ranch_id = ${ranchId}
        AND nota.saw_animal
    ) fuentes
    ORDER BY animal_id, fecha DESC, registrado_en DESC, origen_id DESC
  `
}

async function diaDelRancho(db: EjecutorSql, hoy: string | undefined): Promise<string> {
  if (hoy !== undefined) {
    return hoy
  }
  const filas = filasDe<FilaDeDia>(
    await db.execute(sql`
      SELECT (timezone(${ZONA_DEL_RANCHO}, now()))::date::text AS dia
    `),
  )
  const fila = filas[0]
  if (fila === undefined) {
    throw new Error('La base no devolvió el día del rancho.')
  }
  return fila.dia
}

async function desdeDelPeriodo(db: EjecutorSql, hoy: string, desde: string | undefined): Promise<string> {
  if (desde !== undefined) {
    return desde
  }
  const filas = filasDe<FilaDeDia>(
    await db.execute(sql`
      SELECT (${hoy}::date - 7)::text AS dia
    `),
  )
  const fila = filas[0]
  if (fila === undefined) {
    throw new Error('La base no devolvió el inicio del periodo.')
  }
  return fila.dia
}

function animalDe(fila: FilaDeAnimal): AnimalDelInicio {
  return {
    animalId: fila.animal_id,
    nombre: fila.nombre,
    categoria: categoria(fila.categoria),
  }
}

function cambioDe(fila: FilaDeCambio): CambioDelPeriodo {
  return { ...animalDe(fila), fecha: fila.fecha }
}

function observacionDe(fila: FilaDeObservacion): Observacion | null {
  if (fila.fecha === null || fila.origen === null || fila.origen_id === null || fila.dias === null) {
    return null
  }
  return {
    fecha: fila.fecha,
    origen: origen(fila.origen),
    origenId: fila.origen_id,
    dias: entero(fila.dias),
  }
}

function categoria(valor: string): Categoria {
  const encontrada = CATEGORIAS.find((candidata) => candidata === valor)
  if (encontrada === undefined) {
    throw new Error(`La base devolvió una categoría que no se puede leer: ${valor}`)
  }
  return encontrada
}

function origen(valor: string): OrigenDeObservacion {
  const encontrado = ORIGENES.find((candidato) => candidato === valor)
  if (encontrado === undefined) {
    throw new Error(`La base devolvió un origen que no se puede leer: ${valor}`)
  }
  return encontrado
}

function entero(valor: unknown): number {
  if (typeof valor === 'number' && Number.isInteger(valor)) {
    return valor
  }
  if (typeof valor === 'string' && /^-?\d+$/.test(valor)) {
    return Number(valor)
  }
  throw new Error('La base devolvió un entero que no se puede leer.')
}
