import { sql } from 'drizzle-orm'

import type { EjecutorSql } from '../infrastructure/db/filas'
import { filasDe } from '../infrastructure/db/filas'
import type { RanchId } from '../shared-kernel/ids'
import type { SourceQuality } from '../shared-kernel/source-quality'

/**
 * La lectura de tendencias.
 *
 * Consulta `herd` y `growth` y no escribe nada. No hay tabla de lo derivado.
 * La ganancia media de cada vuelta usa la misma cuenta que Crecimiento: pares
 * de pesos consecutivos del mismo animal, kilos por día en `numeric`, y la
 * media solo de quienes tienen par. Un peso suelto entra en el par —es un peso
 * del animal— y no cuenta como vuelta. Un intervalo de cero días no entra. Un
 * hueco no es un peso y no se convierte en punto.
 *
 * Los kilos salen como texto. El mes de un nacimiento o una salida sale de su
 * fecha; si no hay fecha, se cuenta aparte y no se le inventa un mes.
 */

export type PuntoDeTendencia = {
  readonly pesoId: string
  readonly fecha: string
  readonly kilos: string
  readonly calidad: SourceQuality
}

export type SerieDeTendencia = {
  readonly animalId: string
  readonly nombre: string | null
  readonly categoria: Categoria
  readonly activo: boolean
  readonly pesos: readonly PuntoDeTendencia[]
  readonly huecos: readonly { readonly fecha: string }[]
}

export type VueltaDeTendencia = {
  readonly sesionId: string
  readonly fecha: string
  readonly gananciaMediaKilosPorDia: string | null
  readonly animalesConPar: number
}

export type MesDeTendencia = {
  readonly mes: string
  readonly nacimientos: number
  readonly salidas: readonly { readonly motivo: Motivo; readonly cantidad: number }[]
}

export type VistaDeTendencias = {
  readonly series: readonly SerieDeTendencia[]
  readonly vueltas: readonly VueltaDeTendencia[]
  readonly meses: readonly MesDeTendencia[]
  readonly nacimientosSinFecha: number
  readonly salidasSinFecha: number
}

export type ModelosDeTendencias = {
  vista(ranchId: RanchId): Promise<VistaDeTendencias>
}

type Categoria = 'calf' | 'cow' | 'bull' | 'other' | 'unknown'
type Motivo = 'sale' | 'death' | 'confirmed_missing' | 'other' | 'unknown'

const CATEGORIAS: readonly Categoria[] = ['calf', 'cow', 'bull', 'other', 'unknown']
const CALIDADES: readonly SourceQuality[] = ['measured', 'observed', 'declared']
const MOTIVOS: readonly Motivo[] = ['sale', 'death', 'confirmed_missing', 'other', 'unknown']

type FilaDePeso = {
  animal_id: string
  nombre: string | null
  categoria: string
  activo: unknown
  peso_id: string
  fecha: string
  kilos: string
  calidad: string
}

type FilaDeHueco = {
  animal_id: string
  fecha: string
}

type FilaDeVuelta = {
  sesion_id: string
  fecha: string
  animales_con_par: unknown
  ganancia_media: string | null
}

type FilaDeMes = {
  mes: string
  cantidad: unknown
}

type FilaDeSalida = {
  mes: string
  motivo: string
  cantidad: unknown
}

type FilaDeConteo = {
  cantidad: unknown
}

export function crearModelosDeTendencias(db: EjecutorSql): ModelosDeTendencias {
  return {
    async vista(ranchId) {
      const [pesos, huecos, vueltas, nacimientos, sinNacimiento, salidas, sinSalida] =
        await Promise.all([
          filasDe<FilaDePeso>(await db.execute(sqlDePesos(ranchId))),
          filasDe<FilaDeHueco>(await db.execute(sqlDeHuecos(ranchId))),
          filasDe<FilaDeVuelta>(await db.execute(sqlDeVueltas(ranchId))),
          filasDe<FilaDeMes>(await db.execute(sqlDeNacimientos(ranchId))),
          filasDe<FilaDeConteo>(await db.execute(sqlDeNacimientosSinFecha(ranchId))),
          filasDe<FilaDeSalida>(await db.execute(sqlDeSalidas(ranchId))),
          filasDe<FilaDeConteo>(await db.execute(sqlDeSalidasSinFecha(ranchId))),
        ])

      return {
        series: seriesDesde(pesos, huecos),
        vueltas: vueltas.map((fila) => ({
          sesionId: fila.sesion_id,
          fecha: fila.fecha,
          gananciaMediaKilosPorDia:
            fila.ganancia_media === null ? null : tresDecimales(fila.ganancia_media),
          animalesConPar: entero(fila.animales_con_par),
        })),
        meses: mesesDesde(nacimientos, salidas),
        nacimientosSinFecha: entero(sinNacimiento[0]?.cantidad ?? 0),
        salidasSinFecha: entero(sinSalida[0]?.cantidad ?? 0),
      }
    },
  }
}

/**
 * Pesos reales, del más viejo al más nuevo. Un hueco no está en esta consulta.
 */
function sqlDePesos(ranchId: RanchId) {
  return sql`
    SELECT
      animal.id AS animal_id,
      animal.name AS nombre,
      animal.category AS categoria,
      animal.active AS activo,
      linea.id AS peso_id,
      sesion.weighed_on::text AS fecha,
      linea.kilos::text AS kilos,
      linea.quality AS calidad
    FROM growth.weighing_line linea
    JOIN growth.weighing_session sesion
      ON sesion.id = linea.session_id AND sesion.ranch_id = linea.ranch_id
    JOIN herd.animal animal
      ON animal.id = linea.animal_id AND animal.ranch_id = linea.ranch_id
    WHERE linea.ranch_id = ${ranchId}
      AND linea.result = 'weighed'
      AND linea.kilos IS NOT NULL
    ORDER BY animal.name NULLS LAST, animal.id,
      sesion.weighed_on, sesion.recorded_at, linea.position, linea.id
  `
}

function sqlDeHuecos(ranchId: RanchId) {
  return sql`
    SELECT
      linea.animal_id AS animal_id,
      sesion.weighed_on::text AS fecha
    FROM growth.weighing_line linea
    JOIN growth.weighing_session sesion
      ON sesion.id = linea.session_id AND sesion.ranch_id = linea.ranch_id
    WHERE linea.ranch_id = ${ranchId}
      AND linea.result = 'gap'
    ORDER BY linea.animal_id, sesion.weighed_on, sesion.recorded_at, sesion.id
  `
}

/**
 * La misma cuenta que la serie de Crecimiento: `LAG` del peso anterior del
 * mismo animal, `round((kilos - kilos_previos) / días, 3)`, y `null` si no hay
 * anterior o el intervalo tiene cero días. La media de la vuelta es el
 * `avg` de esos kilos por día, también en `numeric`.
 */
function sqlDeVueltas(ranchId: RanchId) {
  return sql`
    WITH pesos AS (
      SELECT
        linea.animal_id,
        sesion.id AS sesion_id,
        sesion.weighed_on AS fecha,
        sesion.recorded_at AS registrado_en,
        linea.position AS posicion,
        linea.id AS peso_id,
        linea.kilos AS kilos
      FROM growth.weighing_line linea
      JOIN growth.weighing_session sesion
        ON sesion.id = linea.session_id AND sesion.ranch_id = linea.ranch_id
      WHERE linea.ranch_id = ${ranchId}
        AND linea.result = 'weighed'
        AND linea.kilos IS NOT NULL
    ),
    con_anterior AS (
      SELECT
        pesos.*,
        LAG(fecha) OVER w AS fecha_previa,
        LAG(kilos) OVER w AS kilos_previos
      FROM pesos
      WINDOW w AS (PARTITION BY animal_id ORDER BY fecha, registrado_en, posicion, peso_id)
    ),
    por_dia AS (
      SELECT
        sesion_id,
        CASE
          WHEN fecha_previa IS NULL OR fecha = fecha_previa THEN NULL
          ELSE round((kilos - kilos_previos) / (fecha - fecha_previa), 3)
        END AS kilos_por_dia
      FROM con_anterior
    )
    SELECT
      sesion.id AS sesion_id,
      sesion.weighed_on::text AS fecha,
      count(por_dia.kilos_por_dia)::int AS animales_con_par,
      CASE
        WHEN count(por_dia.kilos_por_dia) = 0 THEN NULL
        ELSE round(avg(por_dia.kilos_por_dia), 3)::text
      END AS ganancia_media
    FROM growth.weighing_session sesion
    LEFT JOIN por_dia ON por_dia.sesion_id = sesion.id
    WHERE sesion.ranch_id = ${ranchId}
      AND sesion.kind = 'vuelta'
    GROUP BY sesion.id, sesion.weighed_on, sesion.recorded_at
    ORDER BY sesion.weighed_on, sesion.recorded_at, sesion.id
  `
}

function sqlDeNacimientos(ranchId: RanchId) {
  return sql`
    SELECT to_char(birth_date, 'YYYY-MM') AS mes, count(*)::int AS cantidad
    FROM herd.parentage_record
    WHERE ranch_id = ${ranchId}
      AND birth_date IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  `
}

function sqlDeNacimientosSinFecha(ranchId: RanchId) {
  return sql`
    SELECT count(*)::int AS cantidad
    FROM herd.parentage_record
    WHERE ranch_id = ${ranchId}
      AND birth_date IS NULL
  `
}

function sqlDeSalidas(ranchId: RanchId) {
  return sql`
    SELECT
      to_char(exit_known_on, 'YYYY-MM') AS mes,
      exit_reason AS motivo,
      count(*)::int AS cantidad
    FROM herd.animal
    WHERE ranch_id = ${ranchId}
      AND active = false
      AND exit_known_on IS NOT NULL
      AND exit_reason IS NOT NULL
    GROUP BY 1, 2
    ORDER BY 1, 2
  `
}

function sqlDeSalidasSinFecha(ranchId: RanchId) {
  return sql`
    SELECT count(*)::int AS cantidad
    FROM herd.animal
    WHERE ranch_id = ${ranchId}
      AND active = false
      AND exit_known_on IS NULL
  `
}

function seriesDesde(pesos: readonly FilaDePeso[], huecos: readonly FilaDeHueco[]): SerieDeTendencia[] {
  const porAnimal = new Map<string, {
    animalId: string
    nombre: string | null
    categoria: Categoria
    activo: boolean
    pesos: PuntoDeTendencia[]
    huecos: { fecha: string }[]
  }>()

  for (const fila of pesos) {
    let serie = porAnimal.get(fila.animal_id)
    if (serie === undefined) {
      serie = {
        animalId: fila.animal_id,
        nombre: fila.nombre,
        categoria: categoria(fila.categoria),
        activo: booleano(fila.activo),
        pesos: [],
        huecos: [],
      }
      porAnimal.set(fila.animal_id, serie)
    }
    serie.pesos.push({
      pesoId: fila.peso_id,
      fecha: fila.fecha,
      kilos: tresDecimales(fila.kilos),
      calidad: calidad(fila.calidad),
    })
  }

  for (const hueco of huecos) {
    const serie = porAnimal.get(hueco.animal_id)
    // Un animal que solo tiene huecos no tiene serie: no se inventa un punto.
    if (serie === undefined) {
      continue
    }
    serie.huecos.push({ fecha: hueco.fecha })
  }

  return [...porAnimal.values()]
}

function mesesDesde(nacimientos: readonly FilaDeMes[], salidas: readonly FilaDeSalida[]): MesDeTendencia[] {
  const mapa = new Map<string, { nacimientos: number; salidas: Map<Motivo, number> }>()

  const asegurar = (mes: string) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
      throw new Error(`La base devolvió un mes que no se puede leer: ${mes}`)
    }
    let fila = mapa.get(mes)
    if (fila === undefined) {
      fila = { nacimientos: 0, salidas: new Map() }
      mapa.set(mes, fila)
    }
    return fila
  }

  for (const fila of nacimientos) {
    asegurar(fila.mes).nacimientos = entero(fila.cantidad)
  }
  for (const fila of salidas) {
    const mes = asegurar(fila.mes)
    mes.salidas.set(motivo(fila.motivo), entero(fila.cantidad))
  }

  return [...mapa.keys()].sort().map((mes) => {
    const fila = mapa.get(mes)
    if (fila === undefined) {
      throw new Error(`Falta el mes ${mes} al armar la tendencia.`)
    }
    return {
      mes,
      nacimientos: fila.nacimientos,
      salidas: MOTIVOS.flatMap((candidata) => {
        const cantidad = fila.salidas.get(candidata)
        return cantidad === undefined ? [] : [{ motivo: candidata, cantidad }]
      }),
    }
  })
}

/**
 * La media llega como texto de `numeric`. Se normaliza a tres decimales sin
 * pasarla por un `number`. Es la misma regla que en la vista de crecimiento.
 */
function tresDecimales(valor: string): string {
  const partes = /^(-?)(\d+)(?:\.(\d+))?$/.exec(valor.trim())
  if (partes === null) {
    throw new Error(`La base devolvió un número que no se puede leer: ${valor}`)
  }
  const decimales = partes[3] ?? ''
  if (decimales.length > 3 && /[^0]/.test(decimales.slice(3))) {
    throw new Error(`La base devolvió un número con más de tres decimales: ${valor}`)
  }
  return `${partes[1]}${partes[2]}.${decimales.padEnd(3, '0').slice(0, 3)}`
}

function categoria(valor: string): Categoria {
  const encontrada = CATEGORIAS.find((candidata) => candidata === valor)
  if (encontrada === undefined) {
    throw new Error(`La base devolvió una categoría que no se puede leer: ${valor}`)
  }
  return encontrada
}

function calidad(valor: string): SourceQuality {
  const encontrada = CALIDADES.find((candidata) => candidata === valor)
  if (encontrada === undefined) {
    throw new Error(`La base devolvió una calidad que no se puede leer: ${valor}`)
  }
  return encontrada
}

function motivo(valor: string): Motivo {
  const encontrado = MOTIVOS.find((candidata) => candidata === valor)
  if (encontrado === undefined) {
    throw new Error(`La base devolvió una razón de salida que no se puede leer: ${valor}`)
  }
  return encontrado
}

function booleano(valor: unknown): boolean {
  if (typeof valor === 'boolean') {
    return valor
  }
  if (valor === 't' || valor === 'true') {
    return true
  }
  if (valor === 'f' || valor === 'false') {
    return false
  }
  throw new Error('La base devolvió un booleano que no se puede leer.')
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
