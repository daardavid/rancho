import { sql } from 'drizzle-orm'

import type { EjecutorSql } from '../infrastructure/db/filas'
import { filasDe } from '../infrastructure/db/filas'
import type { RanchId } from '../shared-kernel/ids'

import { crearModelosDePresencia, type ModelosDePresencia, type VistaDeInicio } from './presencia'

/**
 * El resumen de la semana para compartir (INC-007, R-38).
 *
 * Es una consulta y no guarda nada. Lo que ya calcula Inicio —activos por
 * categoría, nacimientos, salidas, huecos de la última vuelta, días sin verse—
 * se toma de `presencia`, con el mismo criterio y sin una segunda regla que se
 * pueda desincronizar. Aquí solo se agrega lo que Inicio todavía no cuenta:
 * los motivos de las salidas, los destetes y los diagnósticos de preñez del
 * periodo, y el nombre del rancho.
 *
 * Lo que no se sabe se dice: un nacimiento sin día, un destete sin peso y un
 * destete sin fecha viajan como conteos propios y no se suman al total del
 * periodo como si fueran datos completos. No hay cifras inventadas ni un
 * porcentaje que no salga de un hecho.
 */

export type ResumenSemanalSemanal = {
  readonly rancho: string
  readonly hoy: string
  readonly desde: string
  readonly activos: {
    readonly total: number
    readonly porCategoria: VistaDeInicio['activosPorCategoria']
  }
  readonly nacimientos: { readonly total: number; readonly sinFecha: number }
  readonly salidas: {
    readonly total: number
    readonly porMotivo: readonly { readonly motivo: string; readonly cantidad: number }[]
  }
  readonly destetes: {
    readonly total: number
    readonly conPeso: number
    readonly sinPeso: number
    readonly sinFecha: number
  }
  readonly prenez: {
    readonly total: number
    readonly porResultado: readonly { readonly resultado: string; readonly cantidad: number }[]
  }
  readonly revisar: {
    readonly sinObservacion: number
    readonly huecosDeLaUltimaVuelta: number
    readonly porDiasSinVerse: readonly {
      readonly nombre: string | null
      readonly dias: number
      readonly origen: VistaDeInicio['paraRevisar']['porDiasSinVerse'][number]['origen']
    }[]
  }
}

export type ModelosDeResumen = {
  /** El día de hoy en el rancho. `hoy` fija la prueba. */
  hoy(hoy?: string): Promise<string>
  /** `hoy` fija la prueba. Sin `desde`, siete días antes del día del rancho. */
  semanal(
    ranchId: RanchId,
    opciones?: { readonly desde?: string; readonly hoy?: string },
  ): Promise<ResumenSemanalSemanal>
}

type FilaDeMotivo = {
  motivo: string
  cantidad: unknown
}

type FilaDeResultado = {
  resultado: string
  cantidad: unknown
}

type FilaDeConteo = {
  total: unknown
  con_peso: unknown
  sin_fecha: unknown
}

export function crearModelosDeResumen(
  db: EjecutorSql,
  presencia: ModelosDePresencia = crearModelosDePresencia(db),
): ModelosDeResumen {
  return {
    hoy(hoy) {
      return presencia.hoy(hoy)
    },

    async semanal(ranchId, opciones) {
      const inicio = await presencia.inicio(ranchId, opciones)

      const [rancho, motivos, destetes, prenez] = await Promise.all([
        nombreDelRancho(db, ranchId),
        filasDe<FilaDeMotivo>(
          await db.execute(sql`
            SELECT exit_reason AS motivo, count(*)::int AS cantidad
            FROM herd.animal
            WHERE ranch_id = ${ranchId}
              AND active = false
              AND exit_known_on >= ${inicio.desde}::date
              AND exit_known_on <= ${inicio.hoy}::date
            GROUP BY exit_reason
            ORDER BY count(*) DESC, exit_reason
          `),
        ),
        conteoDeDestetes(db, ranchId, inicio.desde, inicio.hoy),
        filasDe<FilaDeResultado>(
          await db.execute(sql`
            SELECT result AS resultado, count(*)::int AS cantidad
            FROM herd.pregnancy_check
            WHERE ranch_id = ${ranchId}
              AND occurred_on >= ${inicio.desde}::date
              AND occurred_on <= ${inicio.hoy}::date
            GROUP BY result
            ORDER BY count(*) DESC, result
          `),
        ),
      ])

      return {
        rancho,
        hoy: inicio.hoy,
        desde: inicio.desde,
        activos: {
          total: inicio.activosPorCategoria.reduce((suma, fila) => suma + fila.cantidad, 0),
          porCategoria: inicio.activosPorCategoria,
        },
        nacimientos: {
          total: inicio.cambios.nacimientos.length,
          sinFecha: inicio.cambios.nacimientosSinFecha,
        },
        salidas: {
          total: inicio.cambios.salidas.length,
          porMotivo: motivos.map((fila) => ({
            motivo: fila.motivo,
            cantidad: entero(fila.cantidad),
          })),
        },
        destetes,
        prenez: {
          total: filasSumadas(prenez),
          porResultado: prenez.map((fila) => ({
            resultado: fila.resultado,
            cantidad: entero(fila.cantidad),
          })),
        },
        revisar: {
          sinObservacion: inicio.paraRevisar.sinObservacion.length,
          huecosDeLaUltimaVuelta: inicio.paraRevisar.huecosDeLaUltimaVuelta.length,
          porDiasSinVerse: inicio.paraRevisar.porDiasSinVerse.map((animal) => ({
            nombre: animal.nombre,
            dias: animal.dias,
            origen: animal.origen,
          })),
        },
      }
    },
  }
}

/**
 * Los destetes del periodo, con su peso contado aparte y los que no tienen
 * fecha. Un destete sin peso no se cuenta como si pesara cero: se dice.
 */
async function conteoDeDestetes(
  db: EjecutorSql,
  ranchId: RanchId,
  desde: string,
  hoy: string,
): Promise<ResumenSemanalSemanal['destetes']> {
  const filas = filasDe<FilaDeConteo>(
    await db.execute(sql`
      SELECT
        count(*) FILTER (
          WHERE occurred_on >= ${desde}::date AND occurred_on <= ${hoy}::date
        )::int AS total,
        count(*) FILTER (
          WHERE occurred_on >= ${desde}::date
            AND occurred_on <= ${hoy}::date
            AND weight_id IS NOT NULL
        )::int AS con_peso,
        count(*) FILTER (WHERE occurred_on IS NULL)::int AS sin_fecha
      FROM herd.weaning
      WHERE ranch_id = ${ranchId}
    `),
  )
  const fila = filas[0]
  if (fila === undefined) {
    throw new Error('La cuenta de destetes no devolvió una fila.')
  }
  const total = entero(fila.total)
  const conPeso = entero(fila.con_peso)
  return { total, conPeso, sinPeso: total - conPeso, sinFecha: entero(fila.sin_fecha) }
}

async function nombreDelRancho(db: EjecutorSql, ranchId: RanchId): Promise<string> {
  const filas = filasDe<{ nombre: string | null }>(
    await db.execute(sql`
      SELECT nombre
      FROM identity.ranch
      WHERE id = ${ranchId}
    `),
  )
  const nombre = filas[0]?.nombre?.trim() ?? ''
  if (nombre === '') {
    // El nombre lo puso quien sembró el rancho y no se reescribe: si falta, el
    // resumen se lo dice al dueño en vez de inventarle uno.
    throw new Error('El rancho no tiene nombre registrado: el resumen no lo inventa.')
  }
  return nombre
}

function filasSumadas(filas: readonly { cantidad: unknown }[]): number {
  let suma = 0
  for (const fila of filas) {
    suma += entero(fila.cantidad)
  }
  return suma
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
