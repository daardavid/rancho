import { sql } from 'drizzle-orm'

import type { EjecutorSql } from '../infrastructure/db/filas'
import { filasDe } from '../infrastructure/db/filas'
import type { RanchId } from '../shared-kernel/ids'
import {
  formatearGramosATexto,
  interpretarKilos,
  type Gramos,
} from '../shared-kernel/kilos'

/**
 * Kilos destetados, leídos al consultar.
 *
 * Una cría sin peso se dice y no entra al total ni al promedio. La madre
 * inferida no se mezcla con la vista. No hay ajuste a 205 días: ese número
 * no está decidido (`OQ-WEAN-001`).
 */

export type CalidadDePeso = 'measured' | 'observed' | 'declared'
export type CertezaDeMadre = 'observed' | 'inferred'
export type Precision = 'exact' | 'approximate'

export type EdadAlDestete =
  | { readonly clase: 'dias'; readonly dias: number }
  | { readonly clase: 'nacimiento_aproximado' }
  | { readonly clase: 'sin_nacimiento' }
  | { readonly clase: 'sin_dia' }
  | { readonly clase: 'destete_aproximado' }
  | { readonly clase: 'antes_del_nacimiento' }

export type PesoAlDestete = {
  readonly kilos: string
  readonly calidad: CalidadDePeso
}

export type DesteteDeCria = {
  readonly fecha: string | null
  readonly precisionFecha: Precision | null
  readonly peso: PesoAlDestete | null
  readonly edad: EdadAlDestete
}

export type ResumenDeKilos = {
  readonly conPeso: number
  readonly sinPeso: number
  readonly total: string | null
  readonly promedio: string | null
}

export type CriaSinPeso = {
  readonly criaId: string
  readonly nombre: string | null
  readonly certezaMadre: CertezaDeMadre
}

export type KilosDeLaVaca = {
  readonly observadas: ResumenDeKilos
  readonly inferidas: ResumenDeKilos
  readonly sinPeso: readonly CriaSinPeso[]
}

export type DesteteEnLaFicha = {
  readonly id: string
  readonly fecha: string | null
  readonly precisionFecha: Precision | null
  readonly nota: string | null
  readonly reportedBy: string | null
  readonly version: number
  readonly peso: (PesoAlDestete & { readonly id: string; readonly evidenciaId: string | null }) | null
  readonly edad: EdadAlDestete
  readonly correcciones: readonly {
    readonly campo: 'fecha' | 'precision' | 'nota' | 'reportedBy'
    readonly valorAnterior: string | null
    readonly motivo: string
    readonly correctedBy: string
    readonly correctedAt: string
  }[]
}

export type FilaDeKilos = {
  readonly animalId: string
  readonly nombre: string | null
  readonly activo: boolean
  readonly observadas: ResumenDeKilos
  readonly inferidas: ResumenDeKilos
}

type CriaParaDestete = {
  readonly criaId: string
  readonly nombre: string | null
  readonly fecha: string | null
  readonly precisionFecha: Precision | null
  readonly certezaMadre: CertezaDeMadre
}

export async function destetesPorCria(
  db: EjecutorSql,
  ranchId: RanchId,
  crias: readonly CriaParaDestete[],
): Promise<Map<string, DesteteDeCria>> {
  const mapa = new Map<string, DesteteDeCria>()
  if (crias.length === 0) {
    return mapa
  }
  const ids = crias.map((cria) => cria.criaId)
  const filas = filasDe<FilaDestete>(
    await db.execute(sql`
      SELECT
        destete.animal_id,
        destete.occurred_on::text AS fecha,
        destete.date_precision,
        linea.kilos::text AS kilos,
        linea.quality
      FROM herd.weaning destete
      LEFT JOIN growth.weighing_line linea
        ON linea.id = destete.weight_id
        AND linea.ranch_id = destete.ranch_id
      WHERE destete.ranch_id = ${ranchId}
        AND destete.animal_id IN (${sql.join(
          ids.map((id) => sql`${id}`),
          sql`, `,
        )})
    `),
  )
  const porId = new Map(filas.map((fila) => [fila.animal_id, fila]))
  for (const cria of crias) {
    const fila = porId.get(cria.criaId)
    if (fila === undefined) {
      continue
    }
    mapa.set(cria.criaId, desteteDe(fila, cria))
  }
  return mapa
}

export function kilosDe(
  crias: readonly (CriaParaDestete & { readonly destete: DesteteDeCria | null })[],
): KilosDeLaVaca {
  const observadas: Gramos[] = []
  const inferidas: Gramos[] = []
  let sinPesoVista = 0
  let sinPesoInferida = 0
  const sinPeso: CriaSinPeso[] = []

  for (const cria of crias) {
    if (cria.destete === null || cria.destete.peso === null) {
      if (cria.destete !== null) {
        sinPeso.push({
          criaId: cria.criaId,
          nombre: cria.nombre,
          certezaMadre: cria.certezaMadre,
        })
        if (cria.certezaMadre === 'observed') {
          sinPesoVista += 1
        } else {
          sinPesoInferida += 1
        }
      }
      continue
    }
    const gramos = gramosDe(cria.destete.peso.kilos)
    if (cria.certezaMadre === 'observed') {
      observadas.push(gramos)
    } else {
      inferidas.push(gramos)
    }
  }

  return {
    observadas: { ...resumir(observadas), sinPeso: sinPesoVista },
    inferidas: { ...resumir(inferidas), sinPeso: sinPesoInferida },
    sinPeso,
  }
}

/** `null` cuando el animal no está en el rancho. `destete` null si no se anotó. */
export async function desteteDelAnimal(
  db: EjecutorSql,
  ranchId: RanchId,
  animalId: string,
): Promise<{ animalId: string; destete: DesteteEnLaFicha | null } | null> {
  const filas = filasDe<FilaFicha>(
    await db.execute(sql`
      SELECT
        animal.id AS animal_id,
        destete.id AS destete_id,
        destete.occurred_on::text AS fecha,
        destete.date_precision,
        destete.note,
        destete.reported_by,
        destete.version,
        filiacion.birth_date::text AS nacimiento,
        filiacion.birth_date_precision AS precision_nacimiento,
        linea.id AS peso_id,
        linea.kilos::text AS kilos,
        linea.quality,
        linea.evidence_id
      FROM herd.animal animal
      LEFT JOIN herd.weaning destete
        ON destete.animal_id = animal.id
        AND destete.ranch_id = animal.ranch_id
      LEFT JOIN herd.parentage_record filiacion
        ON filiacion.offspring_id = animal.id
        AND filiacion.ranch_id = animal.ranch_id
      LEFT JOIN growth.weighing_line linea
        ON linea.id = destete.weight_id
        AND linea.ranch_id = destete.ranch_id
      WHERE animal.ranch_id = ${ranchId} AND animal.id = ${animalId}
    `),
  )
  const fila = filas[0]
  if (fila === undefined) {
    return null
  }
  if (fila.destete_id === null) {
    return { animalId, destete: null }
  }

  const correcciones = filasDe<FilaCorreccion>(
    await db.execute(sql`
      SELECT field, previous_value, reason, corrected_by, corrected_at
      FROM herd.weaning_correction
      WHERE ranch_id = ${ranchId} AND weaning_id = ${fila.destete_id}
      ORDER BY corrected_at, field, id
    `),
  )

  const nacimiento = {
    fecha: fila.nacimiento === null ? null : diaTexto(fila.nacimiento),
    precision: precisionDe(fila.precision_nacimiento),
  }
  const fecha = fila.fecha === null ? null : diaTexto(fila.fecha)
  const precision = precisionDe(fila.date_precision)

  return {
    animalId,
    destete: {
      id: fila.destete_id,
      fecha,
      precisionFecha: precision,
      nota: fila.note,
      reportedBy: fila.reported_by,
      version: entero(fila.version),
      peso:
        fila.peso_id === null || fila.kilos === null || fila.quality === null
          ? null
          : {
              id: fila.peso_id,
              kilos: kilosTexto(fila.kilos),
              calidad: calidadDe(fila.quality),
              evidenciaId: fila.evidence_id,
            },
      edad: edadDe(nacimiento, { fecha, precision }),
      correcciones: correcciones.map((correccion) => ({
        campo: campoDe(correccion.field),
        valorAnterior: correccion.previous_value,
        motivo: correccion.reason,
        correctedBy: correccion.corrected_by,
        correctedAt: instante(correccion.corrected_at),
      })),
    },
  }
}

export async function listaDeKilos(
  db: EjecutorSql,
  ranchId: RanchId,
): Promise<{ porPromedio: FilaDeKilos[] }> {
  const filas = filasDe<FilaMadre>(
    await db.execute(sql`
      SELECT
        madre.id AS madre_id,
        madre.name AS nombre,
        madre.active AS activo,
        filiacion.dam_certainty AS certeza,
        cria.id AS cria_id,
        linea.kilos::text AS kilos
      FROM herd.weaning destete
      JOIN herd.parentage_record filiacion
        ON filiacion.offspring_id = destete.animal_id
        AND filiacion.ranch_id = destete.ranch_id
      JOIN herd.animal madre
        ON madre.id = filiacion.dam_id
        AND madre.ranch_id = destete.ranch_id
      JOIN herd.animal cria
        ON cria.id = destete.animal_id
        AND cria.ranch_id = destete.ranch_id
      LEFT JOIN growth.weighing_line linea
        ON linea.id = destete.weight_id
        AND linea.ranch_id = destete.ranch_id
      WHERE destete.ranch_id = ${ranchId}
        AND filiacion.dam_certainty IN ('observed', 'inferred')
    `),
  )

  const porMadre = new Map<
    string,
    {
      nombre: string | null
      activo: boolean
      observadas: Gramos[]
      inferidas: Gramos[]
      sinPesoVista: number
      sinPesoInferida: number
    }
  >()

  for (const fila of filas) {
    const certeza = fila.certeza === 'inferred' ? 'inferred' : 'observed'
    let grupo = porMadre.get(fila.madre_id)
    if (grupo === undefined) {
      grupo = {
        nombre: fila.nombre,
        activo: bandera(fila.activo),
        observadas: [],
        inferidas: [],
        sinPesoVista: 0,
        sinPesoInferida: 0,
      }
      porMadre.set(fila.madre_id, grupo)
    }
    if (fila.kilos === null) {
      if (certeza === 'observed') {
        grupo.sinPesoVista += 1
      } else {
        grupo.sinPesoInferida += 1
      }
      continue
    }
    const gramos = gramosDe(kilosTexto(fila.kilos))
    if (certeza === 'observed') {
      grupo.observadas.push(gramos)
    } else {
      grupo.inferidas.push(gramos)
    }
  }

  const porPromedio: FilaDeKilos[] = []
  for (const [animalId, grupo] of porMadre) {
    if (grupo.observadas.length === 0 && grupo.inferidas.length === 0) {
      continue
    }
    porPromedio.push({
      animalId,
      nombre: grupo.nombre,
      activo: grupo.activo,
      observadas: { ...resumir(grupo.observadas), sinPeso: grupo.sinPesoVista },
      inferidas: { ...resumir(grupo.inferidas), sinPeso: grupo.sinPesoInferida },
    })
  }

  porPromedio.sort((uno, otro) => {
    const grupo = ordenDe(uno) - ordenDe(otro)
    if (grupo !== 0) {
      return grupo
    }
    const promedio = Number(promedioDe(otro) - promedioDe(uno))
    if (promedio !== 0) {
      return promedio
    }
    const nombre = (uno.nombre ?? '').localeCompare(otro.nombre ?? '', 'es')
    return nombre !== 0 ? nombre : uno.animalId.localeCompare(otro.animalId)
  })

  return { porPromedio }
}

function desteteDe(fila: FilaDestete, cria: CriaParaDestete): DesteteDeCria {
  const fecha = fila.fecha === null ? null : diaTexto(fila.fecha)
  const precision = precisionDe(fila.date_precision)
  return {
    fecha,
    precisionFecha: precision,
    peso:
      fila.kilos === null || fila.quality === null
        ? null
        : { kilos: kilosTexto(fila.kilos), calidad: calidadDe(fila.quality) },
    edad: edadDe(
      { fecha: cria.fecha, precision: cria.precisionFecha },
      { fecha, precision },
    ),
  }
}

/**
 * La edad solo se calcula con nacimiento exacto y destete exacto. Si el
 * nacimiento es aproximado, se dice. Si no hay, no se calcula. Un destete
 * aproximado tampoco se vuelve un número de días.
 */
export function edadDe(
  nacimiento: { fecha: string | null; precision: Precision | null },
  destete: { fecha: string | null; precision: Precision | null },
): EdadAlDestete {
  if (nacimiento.fecha === null || nacimiento.precision === null) {
    return { clase: 'sin_nacimiento' }
  }
  if (nacimiento.precision === 'approximate') {
    return { clase: 'nacimiento_aproximado' }
  }
  if (destete.fecha === null || destete.precision === null) {
    return { clase: 'sin_dia' }
  }
  if (destete.precision === 'approximate') {
    return { clase: 'destete_aproximado' }
  }
  const dias = diasEntre(nacimiento.fecha, destete.fecha)
  if (dias < 0) {
    return { clase: 'antes_del_nacimiento' }
  }
  return { clase: 'dias', dias }
}

function resumir(gramos: readonly Gramos[]): Omit<ResumenDeKilos, 'sinPeso'> {
  if (gramos.length === 0) {
    return { conPeso: 0, total: null, promedio: null }
  }
  let suma = 0n
  for (const gramo of gramos) {
    suma += BigInt(gramo)
  }
  const cantidad = BigInt(gramos.length)
  const promedio = (suma + cantidad / 2n) / cantidad
  return {
    conPeso: gramos.length,
    total: formatearGramosATexto(comoGramos(suma)),
    promedio: formatearGramosATexto(comoGramos(promedio)),
  }
}

function ordenDe(fila: FilaDeKilos): number {
  return fila.observadas.conPeso > 0 ? 0 : 1
}

function promedioDe(fila: FilaDeKilos): bigint {
  const texto = fila.observadas.conPeso > 0 ? fila.observadas.promedio : fila.inferidas.promedio
  if (texto === null) {
    return 0n
  }
  return BigInt(gramosDe(texto))
}

function gramosDe(texto: string): Gramos {
  const lectura = interpretarKilos(texto)
  if (!lectura.ok) {
    throw new Error('La base devolvió un peso al destete que no se puede leer.')
  }
  return lectura.gramos
}

function kilosTexto(valor: string): string {
  return formatearGramosATexto(gramosDe(valor))
}

function comoGramos(valor: bigint): Gramos {
  if (valor <= 0n) {
    throw new Error('Un promedio de kilos destetados no puede ser cero.')
  }
  return Number(valor) as Gramos
}

type FilaDestete = {
  animal_id: string
  fecha: string | null
  date_precision: string | null
  kilos: string | null
  quality: string | null
}

type FilaFicha = {
  animal_id: string
  destete_id: string | null
  fecha: string | null
  date_precision: string | null
  note: string | null
  reported_by: string | null
  version: unknown
  nacimiento: string | null
  precision_nacimiento: string | null
  peso_id: string | null
  kilos: string | null
  quality: string | null
  evidence_id: string | null
}

type FilaCorreccion = {
  field: string
  previous_value: string | null
  reason: string
  corrected_by: string
  corrected_at: unknown
}

type FilaMadre = {
  madre_id: string
  nombre: string | null
  activo: unknown
  certeza: string
  cria_id: string
  kilos: string | null
}

function precisionDe(valor: string | null): Precision | null {
  if (valor === null) {
    return null
  }
  if (valor === 'exact' || valor === 'approximate') {
    return valor
  }
  throw new Error('La base devolvió una precisión de destete que no se puede leer.')
}

function calidadDe(valor: string): CalidadDePeso {
  if (valor === 'measured' || valor === 'observed' || valor === 'declared') {
    return valor
  }
  throw new Error('La base devolvió una calidad de peso que no se puede leer.')
}

function campoDe(valor: string): 'fecha' | 'precision' | 'nota' | 'reportedBy' {
  if (valor === 'fecha' || valor === 'precision' || valor === 'nota' || valor === 'reportedBy') {
    return valor
  }
  throw new Error('La historia del destete tiene un campo que no se puede leer.')
}

function bandera(valor: unknown): boolean {
  if (valor === true || valor === 't' || valor === 'true') {
    return true
  }
  if (valor === false || valor === 'f' || valor === 'false') {
    return false
  }
  throw new Error('La base devolvió un activo que no se puede leer.')
}

function diaTexto(valor: string): string {
  const texto = valor.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    throw new Error('La base devolvió un día que no se puede leer.')
  }
  return texto
}

function diasEntre(desde: string, hasta: string): number {
  const a = partes(desde)
  const b = partes(hasta)
  const ms = Date.UTC(b.anio, b.mes - 1, b.dia) - Date.UTC(a.anio, a.mes - 1, a.dia)
  return Math.round(ms / 86_400_000)
}

function partes(fecha: string): { anio: number; mes: number; dia: number } {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha)
  if (coincidencia === null || coincidencia[1] === undefined || coincidencia[2] === undefined) {
    throw new Error('La base devolvió un día que no se puede leer.')
  }
  return {
    anio: Number(coincidencia[1]),
    mes: Number(coincidencia[2]),
    dia: Number(coincidencia[3]),
  }
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
