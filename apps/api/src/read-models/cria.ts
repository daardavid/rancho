import { sql } from 'drizzle-orm'

import type { EjecutorSql } from '../infrastructure/db/filas'
import { filasDe } from '../infrastructure/db/filas'
import type { RanchId } from '../shared-kernel/ids'

import {
  desteteDelAnimal,
  destetesPorCria,
  kilosDe,
  listaDeKilos,
  type DesteteDeCria,
  type DesteteEnLaFicha,
  type FilaDeKilos,
  type KilosDeLaVaca,
} from './destete'

/**
 * Historial de cría, como consulta.
 *
 * Los partos se leen de la filiación vigente: la vaca es la madre, vista o
 * inferida. No hay otra lista de partos y los días no se guardan. Un parto
 * sin fecha se enseña y no entra al cálculo. Madre inferida no es madre vista.
 *
 * La lista son las hembras activas que ya son vacas, o hembras que no son
 * becerro, o cualquiera que ya figure como madre. Una becerra sin crías no es
 * una vaca. Un macho, un toro y quien ya salió del hato no entran.
 *
 * Los días se cuentan en calendario, contra el día del rancho
 * (`America/Mexico_City`) cuando no se fija uno. No hay umbral ni meta.
 */

const ZONA_DEL_RANCHO = 'America/Mexico_City'

export type Categoria = 'calf' | 'cow' | 'bull' | 'other' | 'unknown'
export type ResultadoDePrenez = 'prenada' | 'vacia' | 'no_se'
export type CertezaDeMadre = 'observed' | 'inferred'

export type Parto = {
  readonly criaId: string
  readonly nombre: string | null
  readonly fecha: string | null
  readonly precisionFecha: 'exact' | 'approximate' | null
  readonly certezaMadre: CertezaDeMadre
  readonly motivo: 'parto_visto' | 'dicho_de_trabajador' | 'otro' | null
  /** `null` cuando no hay destete anotado. No se inventa un peso. */
  readonly destete: DesteteDeCria | null
}

export type IntervaloEntrePartos = {
  readonly criaPreviaId: string
  readonly criaId: string
  readonly fechaPrevia: string
  readonly fecha: string
  readonly dias: number
}

export type CorreccionDeDiagnostico = {
  readonly campo: 'resultado' | 'fecha' | 'reportedBy' | 'nota' | 'vioAlAnimal'
  readonly valorAnterior: string | null
  readonly motivo: string
  readonly correctedBy: string
  readonly correctedAt: string
}

export type DiagnosticoEnLaVista = {
  readonly id: string
  readonly animalId: string
  readonly fecha: string
  readonly resultado: ResultadoDePrenez
  readonly reportedBy: string | null
  readonly nota: string | null
  readonly vioAlAnimal: boolean | null
  readonly version: number
  readonly recordedBy: string
  readonly recordedAt: string
  readonly correcciones: readonly CorreccionDeDiagnostico[]
}

export type HistorialDeCria = {
  readonly animalId: string
  /** Con fecha, del más reciente al más viejo; después los que no tienen fecha. */
  readonly partos: readonly Parto[]
  /** Solo entre partos consecutivos que sí tienen fecha, del más viejo al más nuevo. */
  readonly intervalos: readonly IntervaloEntrePartos[]
  readonly partosSinFecha: number
  /** `null` cuando no hay un parto con fecha. */
  readonly diasDesdeElUltimoParto: number | null
  /** Del más reciente al más viejo. */
  readonly diagnosticos: readonly DiagnosticoEnLaVista[]
  /** Vista e inferida por separado. Solo entran las crías destetadas con peso. */
  readonly kilosDestetados: KilosDeLaVaca
}

export type DiagnosticoEnLaLista = {
  readonly fecha: string
  readonly resultado: ResultadoDePrenez
  readonly vioAlAnimal: boolean | null
}

export type FilaDeVaca = {
  readonly animalId: string
  readonly nombre: string | null
  readonly categoria: Categoria
  readonly diasDesdeElUltimoParto: number | null
  readonly fechaDelUltimoParto: string | null
  readonly partosSinFecha: number
  readonly ultimoDiagnostico: DiagnosticoEnLaLista | null
}

export type ListaDeVacas = {
  /** Al menos un parto con fecha, de más días a menos. */
  readonly porUltimoParto: readonly FilaDeVaca[]
  /** Tienen parto anotado y ninguno trae fecha. No se les inventan días. */
  readonly partoSinFecha: readonly FilaDeVaca[]
  readonly sinPartoRegistrado: readonly FilaDeVaca[]
}

export type DesteteDelAnimal = {
  readonly animalId: string
  readonly destete: DesteteEnLaFicha | null
}

export type ListaDeKilosDestetados = {
  readonly porPromedio: readonly FilaDeKilos[]
}

export type ModelosDeCria = {
  /** `null` cuando el animal no existe en este rancho. */
  historial(ranchId: RanchId, animalId: string, hoy?: string): Promise<HistorialDeCria | null>
  /** Hembras activas de la lista. `hoy` fija la prueba. */
  vacas(ranchId: RanchId, hoy?: string): Promise<ListaDeVacas>
  /** `null` cuando el animal no existe. El destete puede ser null. */
  destete(ranchId: RanchId, animalId: string): Promise<DesteteDelAnimal | null>
  /** Vacas con al menos una cría destetada con peso. Incluye a las que ya salieron. */
  kilosDestetados(ranchId: RanchId): Promise<ListaDeKilosDestetados>
}

const CATEGORIAS: readonly Categoria[] = ['calf', 'cow', 'bull', 'other', 'unknown']
const RESULTADOS: readonly ResultadoDePrenez[] = ['prenada', 'vacia', 'no_se']
const CERTEZAS: readonly CertezaDeMadre[] = ['observed', 'inferred']
const MOTIVOS = ['parto_visto', 'dicho_de_trabajador', 'otro'] as const
const CAMPOS = ['resultado', 'fecha', 'reportedBy', 'nota', 'vioAlAnimal'] as const

type FilaParto = {
  cria_id: string
  nombre: string | null
  fecha: string | null
  precision: string | null
  certeza: string
  motivo: string | null
}

type FilaDiagnostico = {
  id: string
  animal_id: string
  fecha: string
  result: string
  reported_by: string | null
  note: string | null
  saw_animal: unknown
  version: unknown
  recorded_by: string
  recorded_at: unknown
}

type FilaCorreccion = {
  pregnancy_check_id: string
  field: string
  previous_value: string | null
  reason: string
  corrected_by: string
  corrected_at: unknown
}

type FilaVaca = {
  animal_id: string
  nombre: string | null
  categoria: string
  total: unknown
  sin_fecha: unknown
  ultima_fecha: string | null
  diag_fecha: string | null
  diag_resultado: string | null
  diag_vio: unknown
}

export function crearModelosDeCria(db: EjecutorSql): ModelosDeCria {
  return {
    async historial(ranchId, animalId, hoy) {
      const existe = filasDe<{ id: string }>(
        await db.execute(sql`
          SELECT id FROM herd.animal
          WHERE ranch_id = ${ranchId} AND id = ${animalId}
        `),
      )
      if (existe.length === 0) {
        return null
      }

      const dia = await diaDelRancho(db, hoy)
      const filas = filasDe<FilaParto>(
        await db.execute(sql`
          SELECT
            cria.id AS cria_id,
            cria.name AS nombre,
            filiacion.birth_date::text AS fecha,
            filiacion.birth_date_precision AS precision,
            filiacion.dam_certainty AS certeza,
            filiacion.dam_reason AS motivo
          FROM herd.parentage_record filiacion
          JOIN herd.animal cria
            ON cria.id = filiacion.offspring_id
            AND cria.ranch_id = filiacion.ranch_id
          WHERE filiacion.ranch_id = ${ranchId}
            AND filiacion.dam_id = ${animalId}
            AND filiacion.dam_certainty IN ('observed', 'inferred')
        `),
      )
      const base = ordenarPartos(filas.map(partoDe))
      const pesos = await destetesPorCria(db, ranchId, base)
      const partos = base.map((parto) => ({
        ...parto,
        destete: pesos.get(parto.criaId) ?? null,
      }))
      const conFecha = partos.filter((parto) => parto.fecha !== null)
      const ultima = conFecha[0]?.fecha ?? null

      return {
        animalId,
        partos,
        intervalos: intervalosDe(partos),
        partosSinFecha: partos.length - conFecha.length,
        diasDesdeElUltimoParto: ultima === null ? null : diasEntre(ultima, dia),
        diagnosticos: await diagnosticosDe(db, ranchId, animalId),
        kilosDestetados: kilosDe(partos),
      }
    },
    destete(ranchId, animalId) {
      return desteteDelAnimal(db, ranchId, animalId)
    },
    kilosDestetados(ranchId) {
      return listaDeKilos(db, ranchId)
    },

    async vacas(ranchId, hoy) {
      const dia = await diaDelRancho(db, hoy)
      const filas = filasDe<FilaVaca>(
        await db.execute(sql`
          WITH hembras AS (
            SELECT a.id, a.name AS nombre, a.category AS categoria
            FROM herd.animal a
            WHERE a.ranch_id = ${ranchId}
              AND a.active IS TRUE
              AND a.sex <> 'male'
              AND a.category <> 'bull'
              AND (
                a.category = 'cow'
                OR (a.sex = 'female' AND a.category <> 'calf')
                OR EXISTS (
                  SELECT 1
                  FROM herd.parentage_record p
                  WHERE p.ranch_id = a.ranch_id
                    AND p.dam_id = a.id
                    AND p.dam_certainty IN ('observed', 'inferred')
                )
              )
          ),
          partos AS (
            SELECT
              p.dam_id AS animal_id,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE p.birth_date IS NULL)::int AS sin_fecha,
              MAX(p.birth_date)::text AS ultima_fecha
            FROM herd.parentage_record p
            WHERE p.ranch_id = ${ranchId}
              AND p.dam_id IS NOT NULL
              AND p.dam_certainty IN ('observed', 'inferred')
            GROUP BY p.dam_id
          ),
          diagnosticos AS (
            SELECT DISTINCT ON (d.animal_id)
              d.animal_id,
              d.occurred_on::text AS fecha,
              d.result AS resultado,
              d.saw_animal AS vio
            FROM herd.pregnancy_check d
            WHERE d.ranch_id = ${ranchId}
            ORDER BY d.animal_id, d.occurred_on DESC, d.recorded_at DESC, d.id DESC
          )
          SELECT
            h.id AS animal_id,
            h.nombre,
            h.categoria,
            partos.total,
            partos.sin_fecha,
            partos.ultima_fecha,
            diagnosticos.fecha AS diag_fecha,
            diagnosticos.resultado AS diag_resultado,
            diagnosticos.vio AS diag_vio
          FROM hembras h
          LEFT JOIN partos ON partos.animal_id = h.id
          LEFT JOIN diagnosticos ON diagnosticos.animal_id = h.id
        `),
      )

      const porUltimoParto: FilaDeVaca[] = []
      const partoSinFecha: FilaDeVaca[] = []
      const sinPartoRegistrado: FilaDeVaca[] = []
      for (const fila of filas) {
        const vaca = vacaDe(fila, dia)
        const total = fila.total === null || fila.total === undefined ? 0 : entero(fila.total)
        if (total === 0) {
          sinPartoRegistrado.push(vaca)
        } else if (vaca.fechaDelUltimoParto === null) {
          partoSinFecha.push(vaca)
        } else {
          porUltimoParto.push(vaca)
        }
      }

      porUltimoParto.sort(porDias)
      partoSinFecha.sort(porNombre)
      sinPartoRegistrado.sort(porNombre)
      return { porUltimoParto, partoSinFecha, sinPartoRegistrado }
    },
  }
}

/** Días de calendario entre dos fechas `YYYY-MM-DD`. Puede ser negativo. */
function diasEntre(desde: string, hasta: string): number {
  const a = partes(desde)
  const b = partes(hasta)
  const ms = Date.UTC(b.anio, b.mes - 1, b.dia) - Date.UTC(a.anio, a.mes - 1, a.dia)
  return Math.round(ms / 86_400_000)
}

function partes(fecha: string): { anio: number; mes: number; dia: number } {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha)
  if (coincidencia === null) {
    throw new Error('La base devolvió una fecha de parto que no se puede leer.')
  }
  return {
    anio: Number(coincidencia[1]),
    mes: Number(coincidencia[2]),
    dia: Number(coincidencia[3]),
  }
}

/**
 * Con fecha, del más reciente al más viejo. Sin fecha, al final: no se les
 * inventa un lugar entre los fechados, y por eso no entran a los intervalos.
 */
function ordenarPartos(partos: readonly Parto[]): Parto[] {
  const conFecha = partos
    .filter((parto) => parto.fecha !== null)
    .sort((uno, otro) => {
      const fecha = (otro.fecha ?? '').localeCompare(uno.fecha ?? '')
      return fecha !== 0 ? fecha : uno.criaId.localeCompare(otro.criaId)
    })
  const sinFecha = partos
    .filter((parto) => parto.fecha === null)
    .sort((uno, otro) => uno.criaId.localeCompare(otro.criaId))
  return [...conFecha, ...sinFecha]
}

/** Pares consecutivos de la serie fechada, leída del más viejo al más nuevo. */
function intervalosDe(partos: readonly Parto[]): IntervaloEntrePartos[] {
  const fechados = [...partos.filter((parto) => parto.fecha !== null)].reverse()
  const intervalos: IntervaloEntrePartos[] = []
  for (let indice = 1; indice < fechados.length; indice += 1) {
    const previo = fechados[indice - 1]
    const actual = fechados[indice]
    if (previo === undefined || actual === undefined || previo.fecha === null || actual.fecha === null) {
      continue
    }
    intervalos.push({
      criaPreviaId: previo.criaId,
      criaId: actual.criaId,
      fechaPrevia: previo.fecha,
      fecha: actual.fecha,
      dias: diasEntre(previo.fecha, actual.fecha),
    })
  }
  return intervalos
}

async function diagnosticosDe(
  db: EjecutorSql,
  ranchId: RanchId,
  animalId: string,
): Promise<DiagnosticoEnLaVista[]> {
  const filas = filasDe<FilaDiagnostico>(
    await db.execute(sql`
      SELECT
        id, animal_id, occurred_on::text AS fecha, result, reported_by, note,
        saw_animal, version, recorded_by, recorded_at
      FROM herd.pregnancy_check
      WHERE ranch_id = ${ranchId} AND animal_id = ${animalId}
      ORDER BY occurred_on DESC, recorded_at DESC, id DESC
    `),
  )
  if (filas.length === 0) {
    return []
  }

  const correcciones = filasDe<FilaCorreccion>(
    await db.execute(sql`
      SELECT pregnancy_check_id, field, previous_value, reason, corrected_by, corrected_at
      FROM herd.pregnancy_check_correction
      WHERE ranch_id = ${ranchId}
        AND pregnancy_check_id IN (${sql.join(
          filas.map((fila) => sql`${fila.id}::uuid`),
          sql`, `,
        )})
      ORDER BY corrected_at, field, id
    `),
  )
  const porDiagnostico = new Map<string, CorreccionDeDiagnostico[]>()
  for (const fila of correcciones) {
    const grupo = porDiagnostico.get(fila.pregnancy_check_id) ?? []
    grupo.push({
      campo: campoDe(fila.field),
      valorAnterior: fila.previous_value,
      motivo: fila.reason,
      correctedBy: fila.corrected_by,
      correctedAt: instante(fila.corrected_at),
    })
    porDiagnostico.set(fila.pregnancy_check_id, grupo)
  }

  return filas.map((fila) => ({
    id: fila.id,
    animalId: fila.animal_id,
    fecha: diaTexto(fila.fecha),
    resultado: resultadoDe(fila.result),
    reportedBy: fila.reported_by,
    nota: fila.note,
    vioAlAnimal: vistoDe(fila.saw_animal),
    version: entero(fila.version),
    recordedBy: fila.recorded_by,
    recordedAt: instante(fila.recorded_at),
    correcciones: porDiagnostico.get(fila.id) ?? [],
  }))
}

function partoDe(fila: FilaParto): Parto {
  const certeza = CERTEZAS.find((candidata) => candidata === fila.certeza)
  if (certeza === undefined) {
    throw new Error('La base devolvió una certeza de madre que no se puede leer.')
  }
  const motivo =
    fila.motivo === null ? null : MOTIVOS.find((candidato) => candidato === fila.motivo)
  if (fila.motivo !== null && motivo === undefined) {
    throw new Error('La base devolvió un motivo de madre que no se puede leer.')
  }
  const precision =
    fila.precision === null
      ? null
      : fila.precision === 'exact' || fila.precision === 'approximate'
        ? fila.precision
        : null
  if (fila.precision !== null && precision === null) {
    throw new Error('La base devolvió una precisión de fecha que no se puede leer.')
  }
  return {
    criaId: fila.cria_id,
    nombre: fila.nombre,
    fecha: fila.fecha === null ? null : diaTexto(fila.fecha),
    precisionFecha: precision,
    certezaMadre: certeza,
    motivo: motivo ?? null,
    destete: null,
  }
}

function vacaDe(fila: FilaVaca, hoy: string): FilaDeVaca {
  const fecha = fila.ultima_fecha === null ? null : diaTexto(fila.ultima_fecha)
  const diagnostico =
    fila.diag_fecha === null || fila.diag_resultado === null
      ? null
      : {
          fecha: diaTexto(fila.diag_fecha),
          resultado: resultadoDe(fila.diag_resultado),
          vioAlAnimal: vistoDe(fila.diag_vio),
        }
  return {
    animalId: fila.animal_id,
    nombre: fila.nombre,
    categoria: categoriaDe(fila.categoria),
    diasDesdeElUltimoParto: fecha === null ? null : diasEntre(fecha, hoy),
    fechaDelUltimoParto: fecha,
    partosSinFecha: fila.sin_fecha === null || fila.sin_fecha === undefined ? 0 : entero(fila.sin_fecha),
    ultimoDiagnostico: diagnostico,
  }
}

function porDias(uno: FilaDeVaca, otro: FilaDeVaca): number {
  const dias = (otro.diasDesdeElUltimoParto ?? 0) - (uno.diasDesdeElUltimoParto ?? 0)
  if (dias !== 0) {
    return dias
  }
  return porNombre(uno, otro)
}

function porNombre(uno: FilaDeVaca, otro: FilaDeVaca): number {
  const nombre = (uno.nombre ?? '').localeCompare(otro.nombre ?? '', 'es')
  return nombre !== 0 ? nombre : uno.animalId.localeCompare(otro.animalId)
}

async function diaDelRancho(db: EjecutorSql, hoy: string | undefined): Promise<string> {
  if (hoy !== undefined) {
    return diaTexto(hoy)
  }
  const filas = filasDe<{ dia: string }>(
    await db.execute(sql`
      SELECT (timezone(${ZONA_DEL_RANCHO}, now()))::date::text AS dia
    `),
  )
  const fila = filas[0]
  if (fila === undefined) {
    throw new Error('La base no devolvió el día del rancho.')
  }
  return diaTexto(fila.dia)
}

function categoriaDe(valor: string): Categoria {
  const encontrada = CATEGORIAS.find((candidata) => candidata === valor)
  if (encontrada === undefined) {
    throw new Error(`La base devolvió una categoría que no se puede leer: ${valor}`)
  }
  return encontrada
}

function resultadoDe(valor: string): ResultadoDePrenez {
  const encontrado = RESULTADOS.find((candidato) => candidato === valor)
  if (encontrado === undefined) {
    throw new Error('La base devolvió un resultado de preñez que no se puede leer.')
  }
  return encontrado
}

function campoDe(valor: string): CorreccionDeDiagnostico['campo'] {
  const encontrado = CAMPOS.find((candidato) => candidato === valor)
  if (encontrado === undefined) {
    throw new Error('La historia del diagnóstico tiene un campo que no se puede leer.')
  }
  return encontrado
}

function diaTexto(valor: string): string {
  const texto = valor.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    throw new Error('La base devolvió un día que no se puede leer.')
  }
  return texto
}

function vistoDe(valor: unknown): boolean | null {
  if (valor === null || valor === undefined) {
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
  throw new Error('La base devolvió un entero que no se puede leer.')
}

function instante(valor: unknown): string {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString()
  }
  if (typeof valor === 'string' || typeof valor === 'number') {
    const fecha = new Date(valor)
    if (!Number.isNaN(fecha.getTime())) {
      return fecha.toISOString()
    }
  }
  throw new Error('La base devolvió un instante que no se puede leer.')
}
