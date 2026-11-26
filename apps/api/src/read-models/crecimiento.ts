import { sql } from 'drizzle-orm'

import type { EjecutorSql } from '../infrastructure/db/filas'
import { filasDe } from '../infrastructure/db/filas'
import type { RanchId } from '../shared-kernel/ids'
import type { SourceQuality } from '../shared-kernel/source-quality'

/**
 * Vistas de crecimiento ([`AnimalGrowthView`](../../../../docs/architecture/persistence-strategy.md)).
 *
 * Son consultas: leen `herd.animal` y las tablas de `growth` con SQL directo y
 * no escriben nada. No usan repositorios de escritura ni comandos de módulo, y
 * no hay tabla, columna ni proyección guardada de lo derivado.
 *
 * Todo lo que se calcula —días entre pesajes, kilos ganados, kilos por día y la
 * media de kilos por día del último intervalo— lo hace PostgreSQL sobre
 * `numeric`, no JavaScript: un peso nunca pasa por un `number` de coma
 * flotante. Los kilos por día y la media se redondean a 3 decimales y viajan
 * como texto. Un intervalo de 0 días devuelve `kilosPorDia: null`, porque no se
 * divide entre cero. La media solo entra a los animales que tienen kilos por
 * día; no hay meta de ganancia del rancho.
 *
 * La zona del rancho es `America/Mexico_City`. «Días desde el último pesaje» se
 * cuenta contra el día de hoy en esa zona, no contra el reloj del servidor.
 * Un peso suelto —el del destete— entra en la serie del animal y no mueve la
 * última vuelta ni la media que se muestra con ella.
 */

export type Categoria = 'calf' | 'cow' | 'bull' | 'other' | 'unknown'

/** Un peso tal como se guardó: el hecho, sin nada derivado. */
export type PesoEnLaVista = {
  readonly pesoId: string
  readonly sesionId: string
  readonly fecha: string
  readonly kilos: string
  readonly calidad: SourceQuality
  readonly version: number
}

/**
 * Lo que va entre dos pesos consecutivos del mismo animal. `calidades` y
 * `incluyeCalidadNoMedida` dicen si el intervalo descansa en un peso declarado u
 * observado; no se esconde.
 */
export type IntervaloDeCrecimiento = {
  readonly fechaPrevia: string
  readonly dias: number
  readonly kilosGanados: string
  /** `null` cuando el intervalo tiene 0 días. */
  readonly kilosPorDia: string | null
  readonly calidades: readonly [SourceQuality, SourceQuality]
  readonly incluyeCalidadNoMedida: boolean
}

export type PuntoDeCrecimiento = PesoEnLaVista & {
  /** `null` en el primer peso de la serie: no hay nada antes con qué comparar. */
  readonly intervalo: IntervaloDeCrecimiento | null
}

/** Sesión en la que el animal se esperaba y no se pesó. No es una baja. */
export type HuecoDePesaje = {
  readonly sesionId: string
  readonly fecha: string
}

export type VistaDeAnimal = {
  readonly animalId: string
  readonly nombre: string | null
  readonly categoria: Categoria
  readonly activo: boolean
  /** Pesos en orden de fecha, del más viejo al más nuevo. */
  readonly pesos: readonly PuntoDeCrecimiento[]
  /** `null` cuando el animal no tiene ningún peso. */
  readonly ultimoPesaje: PesoEnLaVista | null
  readonly huecos: readonly HuecoDePesaje[]
}

export type FilaDelResumen = {
  readonly animalId: string
  readonly nombre: string | null
  readonly categoria: Categoria
  readonly ultimoPeso: PesoEnLaVista | null
  /** Intervalo entre el penúltimo y el último peso. */
  readonly ultimoIntervalo: IntervaloDeCrecimiento | null
  /** Intervalo entre el antepenúltimo y el penúltimo peso. `null` sin tres pesos. */
  readonly intervaloAnterior: IntervaloDeCrecimiento | null
  /**
   * Días desde el último peso que fue parte de una vuelta. Un peso suelto no
   * adelanta este número. `null` si el animal no tiene un peso de vuelta.
   */
  readonly diasDesdeElUltimoPesaje: number | null
  /** Estaba en la sesión más reciente del rancho y no se pesó. */
  readonly fueHuecoEnLaUltimaSesion: boolean
}

export type ResumenDelHato = {
  /** Huecos de la última sesión primero, luego la menor ganancia por día. */
  readonly animales: readonly FilaDelResumen[]
  /**
   * Media de kilos por día de quienes se pesaron en la última vuelta, cada uno
   * contra su peso anterior. No junta un intervalo que termina en otra vuelta
   * ni en un peso suelto. Texto de tres decimales calculado en SQL. `null` si
   * nadie lo tiene.
   */
  readonly gananciaMediaKilosPorDia: string | null
  /** Animales activos pesados en la sesión más reciente. */
  readonly pesadosEnLaUltimaVuelta: number
  /** Animales activos que estaban en esa sesión, pesados o en hueco. */
  readonly esperadosEnLaUltimaVuelta: number
  /** Día de la última vuelta. `null` si el rancho no tiene vueltas. */
  readonly fechaDeLaUltimaVuelta: string | null
}

/** Un peso guardado, sin la ganancia. Sirve para comparar una captura por fecha. */
export type PesoConocido = {
  readonly animalId: string
  readonly fecha: string
  readonly kilos: string
}

export type ModelosDeCrecimiento = {
  /** `null` cuando el animal no existe en este rancho. */
  vistaDeAnimal(ranchId: RanchId, animalId: string): Promise<VistaDeAnimal | null>
  /**
   * Los animales activos con al menos un peso o un hueco. `hoy` es el día del
   * rancho con el que se cuentan los días desde el último pesaje; se puede fijar
   * para que una prueba sea determinista.
   */
  resumenDelHato(ranchId: RanchId, hoy?: string): Promise<ResumenDelHato>
  /**
   * Todos los pesos del rancho, del más viejo al más nuevo por animal.
   * Un hueco no entra: no es un peso y no se compara contra él.
   */
  pesosConocidos(ranchId: RanchId): Promise<readonly PesoConocido[]>
}

const CATEGORIAS: readonly Categoria[] = ['calf', 'cow', 'bull', 'other', 'unknown']
const CALIDADES: readonly SourceQuality[] = ['measured', 'observed', 'declared']

/** La zona del rancho. El proceso puede correr en UTC; el rancho está en Tabasco. */
const ZONA_DEL_RANCHO = 'America/Mexico_City'

type FilaDeAnimal = {
  id: string
  name: string | null
  category: string
  active: unknown
}

/**
 * Una fila por peso. `fecha_previa`, `dias`, `kilos_ganados` y `kilos_por_dia`
 * van vacíos en el primer peso de la serie.
 */
type FilaCrudaDeLaSerie = {
  peso_id: string
  sesion_id: string
  fecha: string
  kilos: string
  calidad: string
  version: unknown
  fecha_previa: string | null
  dias: unknown
  kilos_ganados: string | null
  kilos_por_dia: string | null
  calidad_previa: string | null
}

/** Una fila del resumen. Los pesos son `null` cuando el animal solo tiene huecos. */
type FilaCrudaDelResumen = {
  animal_id: string | null
  nombre: string | null
  categoria: string | null
  peso_id: string | null
  sesion_id: string | null
  fecha: string | null
  kilos: string | null
  calidad: string | null
  version: unknown
  fecha_previa: string | null
  dias: unknown
  kilos_ganados: string | null
  kilos_por_dia: string | null
  calidad_previa: string | null
  fecha_del_tercero: string | null
  calidad_del_tercero: string | null
  dias_anteriores: unknown
  kilos_ganados_anteriores: string | null
  kilos_por_dia_anteriores: string | null
  dias_desde_ultimo: unknown
  hueco_ultima: unknown
  media: string | null
  pesados: unknown
  esperados: unknown
  fecha_ultima: string | null
}

type FilaCrudaDeHueco = {
  sesion_id: string
  fecha: string
}

/** Lo mínimo para armar un intervalo: sirve para la serie y para el resumen. */
type IntervaloCrudo = {
  readonly fecha_previa: string | null
  readonly dias: unknown
  readonly kilos_ganados: string | null
  readonly kilos_por_dia: string | null
  readonly calidad_previa: string | null
}

export function crearModelosDeCrecimiento(db: EjecutorSql): ModelosDeCrecimiento {
  return {
    async vistaDeAnimal(ranchId, animalId) {
      const animales = filasDe<FilaDeAnimal>(
        await db.execute(sql`
          SELECT id, name, category, active
          FROM herd.animal
          WHERE ranch_id = ${ranchId} AND id = ${animalId}
        `),
      )
      const animal = animales[0]
      if (animal === undefined) {
        return null
      }

      const pesos = (await serieDelAnimal(db, ranchId, animalId)).map(puntoDesde)
      const ultimo = pesos.at(-1)

      return {
        animalId: animal.id,
        nombre: animal.name,
        categoria: categoria(animal.category),
        activo: booleano(animal.active),
        pesos,
        ultimoPesaje: ultimo === undefined ? null : sinIntervalo(ultimo),
        huecos: (await huecosDelAnimal(db, ranchId, animalId)).map((fila) => ({
          sesionId: fila.sesion_id,
          fecha: fila.fecha,
        })),
      }
    },

    async resumenDelHato(ranchId, hoy) {
      const diaDelRancho = hoy ?? diaDeHoyEnElRancho()
      const filas = filasDe<FilaCrudaDelResumen>(
        await db.execute(sql`
          WITH pesos AS (
            SELECT
              linea.animal_id,
              linea.id AS peso_id,
              sesion.id AS sesion_id,
              sesion.weighed_on AS fecha,
              sesion.recorded_at AS registrado_en,
              linea.position AS orden_en_sesion,
              linea.kilos AS kilos,
              linea.quality AS calidad,
              linea.version AS version,
              sesion.kind AS clase
            FROM growth.weighing_line linea
            JOIN growth.weighing_session sesion
              ON sesion.id = linea.session_id AND sesion.ranch_id = linea.ranch_id
            WHERE linea.ranch_id = ${ranchId}
              AND linea.result = 'weighed'
          ),
          ordenados AS (
            SELECT
              pesos.*,
              ROW_NUMBER() OVER (
                PARTITION BY animal_id
                ORDER BY fecha DESC, registrado_en DESC, orden_en_sesion DESC, peso_id DESC
              ) AS posicion
            FROM pesos
          ),
          ultimo AS (SELECT * FROM ordenados WHERE posicion = 1),
          anterior AS (SELECT * FROM ordenados WHERE posicion = 2),
          tercero AS (SELECT * FROM ordenados WHERE posicion = 3),
          ultima_sesion AS (
            SELECT sesion.id, sesion.weighed_on
            FROM growth.weighing_session sesion
            WHERE sesion.ranch_id = ${ranchId}
              AND sesion.kind = 'vuelta'
            ORDER BY sesion.weighed_on DESC, sesion.recorded_at DESC, sesion.id DESC
            LIMIT 1
          ),
          ultimo_en_vuelta AS (
            SELECT DISTINCT ON (animal_id)
              animal_id,
              fecha
            FROM pesos
            WHERE clase = 'vuelta'
            ORDER BY animal_id, fecha DESC, registrado_en DESC, orden_en_sesion DESC, peso_id DESC
          ),
          ganancia_de_la_vuelta AS (
            SELECT
              CASE
                WHEN previo.fecha IS NULL OR en_vuelta.fecha = previo.fecha THEN NULL
                ELSE round((en_vuelta.kilos - previo.kilos) / (en_vuelta.fecha - previo.fecha), 3)
              END AS kilos_por_dia
            FROM pesos en_vuelta
            LEFT JOIN LATERAL (
              SELECT candidato.fecha, candidato.kilos
              FROM pesos candidato
              WHERE candidato.animal_id = en_vuelta.animal_id
                AND (candidato.fecha, candidato.registrado_en, candidato.orden_en_sesion, candidato.peso_id)
                  < (en_vuelta.fecha, en_vuelta.registrado_en, en_vuelta.orden_en_sesion, en_vuelta.peso_id)
              ORDER BY candidato.fecha DESC, candidato.registrado_en DESC,
                candidato.orden_en_sesion DESC, candidato.peso_id DESC
              LIMIT 1
            ) previo ON true
            WHERE en_vuelta.sesion_id = (SELECT id FROM ultima_sesion)
          ),
          pesados AS (SELECT DISTINCT animal_id FROM pesos),
          huecos AS (
            SELECT DISTINCT linea.animal_id
            FROM growth.weighing_line linea
            WHERE linea.ranch_id = ${ranchId} AND linea.result = 'gap'
          ),
          huecos_ultima AS (
            SELECT DISTINCT linea.animal_id
            FROM growth.weighing_line linea
            WHERE linea.ranch_id = ${ranchId}
              AND linea.result = 'gap'
              AND linea.session_id = (SELECT id FROM ultima_sesion)
          ),
          calculado AS (
            SELECT
              animal.id AS animal_id,
              animal.name AS nombre,
              animal.category AS categoria,
              ultimo.peso_id,
              ultimo.sesion_id,
              ultimo.fecha::text AS fecha,
              ultimo.kilos::text AS kilos,
              ultimo.calidad,
              ultimo.version,
              anterior.fecha::text AS fecha_previa,
              CASE
                WHEN anterior.fecha IS NULL THEN NULL
                ELSE (ultimo.fecha - anterior.fecha)::int
              END AS dias,
              CASE
                WHEN anterior.fecha IS NULL THEN NULL
                ELSE (ultimo.kilos - anterior.kilos)::text
              END AS kilos_ganados,
              CASE
                WHEN anterior.fecha IS NULL OR ultimo.fecha = anterior.fecha THEN NULL
                ELSE round(
                  (ultimo.kilos - anterior.kilos) / (ultimo.fecha - anterior.fecha),
                  3
                )
              END AS ganancia_por_dia,
              anterior.calidad AS calidad_previa,
              tercero.fecha::text AS fecha_del_tercero,
              tercero.calidad AS calidad_del_tercero,
              CASE
                WHEN tercero.fecha IS NULL OR anterior.fecha IS NULL THEN NULL
                ELSE (anterior.fecha - tercero.fecha)::int
              END AS dias_anteriores,
              CASE
                WHEN tercero.kilos IS NULL OR anterior.kilos IS NULL THEN NULL
                ELSE (anterior.kilos - tercero.kilos)::text
              END AS kilos_ganados_anteriores,
              CASE
                WHEN tercero.fecha IS NULL
                  OR anterior.fecha IS NULL
                  OR anterior.fecha = tercero.fecha THEN NULL
                ELSE round(
                  (anterior.kilos - tercero.kilos) / (anterior.fecha - tercero.fecha),
                  3
                )
              END AS ganancia_anterior,
              CASE
                WHEN ultimo_en_vuelta.fecha IS NULL THEN NULL
                ELSE (${diaDelRancho}::date - ultimo_en_vuelta.fecha)::int
              END AS dias_desde_ultimo,
              huecos_ultima.animal_id IS NOT NULL AS hueco_ultima
            FROM herd.animal animal
            LEFT JOIN ultimo ON ultimo.animal_id = animal.id
            LEFT JOIN anterior ON anterior.animal_id = animal.id
            LEFT JOIN tercero ON tercero.animal_id = animal.id
            LEFT JOIN ultimo_en_vuelta ON ultimo_en_vuelta.animal_id = animal.id
            LEFT JOIN huecos_ultima ON huecos_ultima.animal_id = animal.id
            WHERE animal.ranch_id = ${ranchId}
              AND animal.active
              AND (
                animal.id IN (SELECT animal_id FROM pesados)
                OR                 animal.id IN (SELECT animal_id FROM huecos)
              )
          ),
          resumen_numeros AS (
            SELECT
              (
                SELECT round(avg(kilos_por_dia), 3)::text
                FROM ganancia_de_la_vuelta
                WHERE kilos_por_dia IS NOT NULL
              ) AS media,
              (
                SELECT count(*)::int
                FROM growth.weighing_line linea
                JOIN herd.animal animal
                  ON animal.id = linea.animal_id AND animal.ranch_id = linea.ranch_id
                WHERE linea.ranch_id = ${ranchId}
                  AND animal.active
                  AND linea.result = 'weighed'
                  AND linea.session_id = (SELECT id FROM ultima_sesion)
              ) AS pesados,
              (
                SELECT count(*)::int
                FROM growth.weighing_line linea
                JOIN herd.animal animal
                  ON animal.id = linea.animal_id AND animal.ranch_id = linea.ranch_id
                WHERE linea.ranch_id = ${ranchId}
                  AND animal.active
                  AND linea.session_id = (SELECT id FROM ultima_sesion)
              ) AS esperados,
              (SELECT weighed_on::text FROM ultima_sesion) AS fecha_ultima
          )
          SELECT
            animal_id,
            nombre,
            categoria,
            peso_id,
            sesion_id,
            fecha,
            kilos,
            calidad,
            version,
            fecha_previa,
            dias,
            kilos_ganados,
            ganancia_por_dia::text AS kilos_por_dia,
            calidad_previa,
            fecha_del_tercero,
            calidad_del_tercero,
            dias_anteriores,
            kilos_ganados_anteriores,
            ganancia_anterior::text AS kilos_por_dia_anteriores,
            dias_desde_ultimo,
            hueco_ultima,
            media,
            pesados,
            esperados,
            fecha_ultima
          FROM resumen_numeros
          LEFT JOIN calculado ON true
          ORDER BY
            hueco_ultima DESC NULLS LAST,
            ganancia_por_dia ASC NULLS LAST,
            animal_id
        `),
      )

      const primera = filas[0]
      return {
        animales: filas.filter((fila) => fila.animal_id !== null).map(filaDelResumen),
        gananciaMediaKilosPorDia:
          primera?.media == null || primera.media === '' ? null : tresDecimales(primera.media),
        pesadosEnLaUltimaVuelta: primera === undefined ? 0 : entero(primera.pesados),
        esperadosEnLaUltimaVuelta: primera === undefined ? 0 : entero(primera.esperados),
        fechaDeLaUltimaVuelta: primera?.fecha_ultima ?? null,
      }
    },

    async pesosConocidos(ranchId) {
      const filas = filasDe<{ animal_id: string; fecha: string; kilos: string }>(
        await db.execute(sql`
          SELECT
            linea.animal_id AS animal_id,
            sesion.weighed_on::text AS fecha,
            linea.kilos::text AS kilos
          FROM growth.weighing_line linea
          JOIN growth.weighing_session sesion
            ON sesion.id = linea.session_id AND sesion.ranch_id = linea.ranch_id
          WHERE linea.ranch_id = ${ranchId}
            AND linea.result = 'weighed'
            AND linea.kilos IS NOT NULL
          ORDER BY linea.animal_id, sesion.weighed_on, sesion.recorded_at, linea.position, linea.id
        `),
      )

      return filas.map((fila) => ({
        animalId: fila.animal_id,
        fecha: fila.fecha,
        kilos: tresDecimales(fila.kilos),
      }))
    },
  }
}

/**
 * La serie de pesos del animal con su intervalo, calculado por PostgreSQL.
 *
 * `LAG` mira el peso anterior de la misma serie. El intervalo de 0 días queda
 * sin kilos por día en vez de dividir entre cero.
 */
async function serieDelAnimal(
  db: EjecutorSql,
  ranchId: RanchId,
  animalId: string,
): Promise<FilaCrudaDeLaSerie[]> {
  return filasDe<FilaCrudaDeLaSerie>(
    await db.execute(sql`
      WITH pesos AS (
        SELECT
          linea.id AS peso_id,
          sesion.id AS sesion_id,
          sesion.weighed_on AS fecha,
          sesion.recorded_at AS registrado_en,
          linea.position AS posicion,
          linea.kilos AS kilos,
          linea.quality AS calidad,
          linea.version AS version
        FROM growth.weighing_line linea
        JOIN growth.weighing_session sesion
          ON sesion.id = linea.session_id AND sesion.ranch_id = linea.ranch_id
        WHERE linea.ranch_id = ${ranchId}
          AND linea.animal_id = ${animalId}
          AND linea.result = 'weighed'
      ),
      con_anterior AS (
        SELECT
          pesos.*,
          LAG(fecha) OVER w AS fecha_previa,
          LAG(kilos) OVER w AS kilos_previos,
          LAG(calidad) OVER w AS calidad_previa
        FROM pesos
        WINDOW w AS (ORDER BY fecha, registrado_en, posicion, peso_id)
      )
      SELECT
        peso_id,
        sesion_id,
        fecha::text AS fecha,
        kilos::text AS kilos,
        calidad,
        version,
        fecha_previa::text AS fecha_previa,
        CASE
          WHEN fecha_previa IS NULL THEN NULL
          ELSE (fecha - fecha_previa)::int
        END AS dias,
        CASE
          WHEN fecha_previa IS NULL THEN NULL
          ELSE (kilos - kilos_previos)::text
        END AS kilos_ganados,
        CASE
          WHEN fecha_previa IS NULL OR fecha = fecha_previa THEN NULL
          ELSE round((kilos - kilos_previos) / (fecha - fecha_previa), 3)
        END AS kilos_por_dia,
        calidad_previa
      FROM con_anterior
      ORDER BY fecha, registrado_en, posicion, peso_id
    `),
  )
}

/** Las sesiones en las que el animal se esperaba y no se pesó, del más viejo al más nuevo. */
async function huecosDelAnimal(
  db: EjecutorSql,
  ranchId: RanchId,
  animalId: string,
): Promise<FilaCrudaDeHueco[]> {
  return filasDe<FilaCrudaDeHueco>(
    await db.execute(sql`
      SELECT sesion.id AS sesion_id, sesion.weighed_on::text AS fecha
      FROM growth.weighing_line linea
      JOIN growth.weighing_session sesion
        ON sesion.id = linea.session_id AND sesion.ranch_id = linea.ranch_id
      WHERE linea.ranch_id = ${ranchId}
        AND linea.animal_id = ${animalId}
        AND linea.result = 'gap'
      ORDER BY sesion.weighed_on, sesion.recorded_at, sesion.id
    `),
  )
}

/**
 * El día de hoy en el rancho, como `YYYY-MM-DD`.
 *
 * Se calcula con la zona del rancho y no con la del proceso: el servidor puede
 * estar en UTC y en Tabasco todavía ser ayer.
 */
function diaDeHoyEnElRancho(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_DEL_RANCHO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ahora)

  const valor = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((parte) => parte.type === tipo)?.value ?? ''

  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

function puntoDesde(fila: FilaCrudaDeLaSerie): PuntoDeCrecimiento {
  const peso: PesoEnLaVista = {
    pesoId: fila.peso_id,
    sesionId: fila.sesion_id,
    fecha: fila.fecha,
    kilos: fila.kilos,
    calidad: calidad(fila.calidad),
    version: entero(fila.version),
  }

  return { ...peso, intervalo: intervaloDesde(fila, peso.calidad) }
}

/**
 * El intervalo que terminó en el penúltimo peso. Hace falta el antepenúltimo;
 * con menos de tres pesos no existe y no se inventa.
 */
function intervaloAnteriorDesde(fila: FilaCrudaDelResumen): IntervaloDeCrecimiento | null {
  if (fila.calidad_previa === null) {
    return null
  }
  return intervaloDesde(
    {
      fecha_previa: fila.fecha_del_tercero,
      dias: fila.dias_anteriores,
      kilos_ganados: fila.kilos_ganados_anteriores,
      kilos_por_dia: fila.kilos_por_dia_anteriores,
      calidad_previa: fila.calidad_del_tercero,
    },
    calidad(fila.calidad_previa),
  )
}

/**
 * La media llega como texto de `numeric`. Se normaliza a tres decimales sin
 * pasarla por un `number`: un dígito de más que no sea cero es un error, no se
 * recorta a ojo.
 */
function tresDecimales(valor: string): string {
  const partes = /^(-?)(\d+)(?:\.(\d+))?$/.exec(valor.trim())
  if (partes === null) {
    throw new Error(`La base devolvió una media que no se puede leer: ${valor}`)
  }
  const decimales = partes[3] ?? ''
  if (decimales.length > 3 && /[^0]/.test(decimales.slice(3))) {
    throw new Error(`La base devolvió una media con más de tres decimales: ${valor}`)
  }
  return `${partes[1]}${partes[2]}.${decimales.padEnd(3, '0').slice(0, 3)}`
}

/** El intervalo necesita el peso anterior; el primero de la serie no lo tiene. */
function intervaloDesde(
  fila: IntervaloCrudo,
  calidadDelPeso: SourceQuality,
): IntervaloDeCrecimiento | null {
  if (fila.fecha_previa === null || fila.calidad_previa === null) {
    return null
  }

  const calidadPrevia = calidad(fila.calidad_previa)
  return {
    fechaPrevia: fila.fecha_previa,
    dias: entero(fila.dias),
    kilosGanados: textoObligatorio(fila.kilos_ganados, 'los kilos ganados'),
    kilosPorDia: fila.kilos_por_dia,
    calidades: [calidadPrevia, calidadDelPeso],
    incluyeCalidadNoMedida: calidadPrevia !== 'measured' || calidadDelPeso !== 'measured',
  }
}

function sinIntervalo(punto: PuntoDeCrecimiento): PesoEnLaVista {
  return {
    pesoId: punto.pesoId,
    sesionId: punto.sesionId,
    fecha: punto.fecha,
    kilos: punto.kilos,
    calidad: punto.calidad,
    version: punto.version,
  }
}

function filaDelResumen(fila: FilaCrudaDelResumen): FilaDelResumen {
  if (fila.animal_id === null || fila.categoria === null) {
    throw new Error('La fila del resumen no trae animal.')
  }

  const huecoEnLaUltima = booleano(fila.hueco_ultima)
  const categoriaDelAnimal = categoria(fila.categoria)
  const intervaloAnterior = intervaloAnteriorDesde(fila)

  if (fila.peso_id === null || fila.kilos === null || fila.calidad === null) {
    // El animal solo tiene huecos: hay fila en el resumen, pero no hay último peso.
    return {
      animalId: fila.animal_id,
      nombre: fila.nombre,
      categoria: categoriaDelAnimal,
      ultimoPeso: null,
      ultimoIntervalo: null,
      intervaloAnterior,
      diasDesdeElUltimoPesaje: null,
      fueHuecoEnLaUltimaSesion: huecoEnLaUltima,
    }
  }

  const ultimoPeso: PesoEnLaVista = {
    pesoId: fila.peso_id,
    sesionId: textoObligatorio(fila.sesion_id, 'la sesión del último peso'),
    fecha: textoObligatorio(fila.fecha, 'la fecha del último peso'),
    kilos: fila.kilos,
    calidad: calidad(fila.calidad),
    version: entero(fila.version),
  }

  return {
    animalId: fila.animal_id,
    nombre: fila.nombre,
    categoria: categoriaDelAnimal,
    ultimoPeso,
    ultimoIntervalo: intervaloDesde(fila, ultimoPeso.calidad),
    intervaloAnterior,
    diasDesdeElUltimoPesaje:
      fila.dias_desde_ultimo === null || fila.dias_desde_ultimo === undefined
        ? null
        : entero(fila.dias_desde_ultimo),
    fueHuecoEnLaUltimaSesion: huecoEnLaUltima,
  }
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

function textoObligatorio(valor: string | null, que: string): string {
  if (valor === null) {
    throw new Error(`La base no devolvió ${que}.`)
  }
  return valor
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
