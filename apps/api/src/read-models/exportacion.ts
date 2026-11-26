import { sql } from 'drizzle-orm'

import type { EjecutorSql } from '../infrastructure/db/filas'
import { filasDe } from '../infrastructure/db/filas'
import type { RanchId } from '../shared-kernel/ids'
import { aCsv, nombreDeArchivo, type PiezaExportada } from './csv'
import { fuentesDeObservacion } from './presencia'

/**
 * Hato, pesos y eventos para abrir en Excel.
 *
 * Es una consulta: no escribe y no guarda lo que calcula. Los kilos salen con
 * `::text`, el mismo texto de la columna, y no pasan por un `number`.
 *
 * «No sé» es celda vacía y la nota dice «No sé». Lo que no aplica —no hay
 * salida, no hay potrero, nadie lo ha visto— también va vacío, sin esa nota.
 * Un potrero sin nombre no es «No sé»: la nota dice «Sin nombre».
 *
 * No viajan cuentas, hashes ni ids de sesión. El id del animal sí: sin él, dos
 * archivos no se pueden cruzar cuando el nombre falta o se repite. El id de la
 * sesión de pesaje no: el día y la nota alcanzan para reconocerla.
 *
 * Un hueco de pesaje no es un peso y no entra en el archivo de pesos.
 */

export type ArchivoCsv = {
  readonly nombre: string
  readonly cuerpo: string
}

export type ModelosDeExportacion = {
  hato(ranchId: RanchId): Promise<ArchivoCsv>
  pesos(ranchId: RanchId): Promise<ArchivoCsv>
  eventos(ranchId: RanchId): Promise<ArchivoCsv>
}

const COLUMNAS_HATO = [
  'Id del animal',
  'Nombre o seña',
  'Sexo',
  'Nota del sexo',
  'Categoría',
  'Detalle de la categoría',
  'Nota de la categoría',
  'Tenencia',
  'Nota de la tenencia',
  'Nota del arreglo',
  'Nota',
  'SINIIGA',
  'Otros aretes',
  'Aretes anteriores',
  'Potrero esperado',
  'Nota del potrero',
  'Última observación',
  'De dónde',
  'En el hato',
  'Motivo de la salida',
  'Nota del motivo',
  'Día en que se supo',
  'Nota de la salida',
] as const

const COLUMNAS_PESOS = [
  'Id del animal',
  'Nombre o seña',
  'SINIIGA',
  'Día',
  'Kilos',
  'Calidad',
  'Nota de la sesión',
  'Corregido',
] as const

const COLUMNAS_EVENTOS = [
  'Tipo',
  'Día',
  'Precisión del día',
  'Nota del día',
  'Id del animal',
  'Animal',
  'Madre',
  'Id de la madre',
  'Certeza de la madre',
  'Nota de la madre',
  'Por qué la madre',
  'Padre',
  'Id del padre',
  'Certeza del padre',
  'Nota del padre',
  'Por qué el padre',
  'Motivo de la salida',
  'Nota del motivo',
  'Qué fue',
  'Detalle',
  'Producto',
  'Se vio al animal',
  'Nota de si se vio',
  'Resultado',
  'Nota del resultado',
  'Potrero',
  'Nota del potrero',
  'Kilos',
  'Quién lo dijo',
  'Nota',
] as const

type ColumnaHato = (typeof COLUMNAS_HATO)[number]
type ColumnaPeso = (typeof COLUMNAS_PESOS)[number]
type ColumnaEvento = (typeof COLUMNAS_EVENTOS)[number]
type FilaHato = Record<ColumnaHato, string>
type FilaPeso = Record<ColumnaPeso, string>
type FilaEvento = Record<ColumnaEvento, string>

const SEXO = { female: 'Hembra', male: 'Macho' }
const CATEGORIA = { calf: 'Becerro', cow: 'Vaca', bull: 'Toro', other: 'Otra' }
const TENENCIA = { ranch: 'Del rancho', a_la_parte: 'A la parte', third_party: 'De otra persona' }
const MOTIVO_SALIDA = {
  sale: 'Venta',
  death: 'Muerte',
  confirmed_missing: 'Faltante confirmado',
  other: 'Otra',
}
const CALIDAD = {
  measured: 'Medido en la báscula',
  observed: 'Visto, no medido',
  declared: 'Me lo dijeron',
}
const CERTEZA = { observed: 'La vi', inferred: 'Inferida' }
const MOTIVO_MADRE = {
  parto_visto: 'Parto visto',
  dicho_de_trabajador: 'Dicho de un trabajador',
  otro: 'Otro',
}
const MOTIVO_PADRE = { ...MOTIVO_MADRE, unico_toro: 'Único toro' }
const PRECISION = { exact: 'Exacta', approximate: 'Aproximada' }
const ORIGEN = {
  pesaje: 'Pesaje',
  sanidad: 'Sanidad',
  nacimiento: 'Nacimiento',
  diagnostico: 'Diagnóstico de preñez',
}
const SANIDAD = {
  vacuna: 'Vacuna',
  medicamento: 'Medicamento',
  bano: 'Baño',
  problema: 'Problema visto',
  otro: 'Otro',
}
const PRENEZ = { prenada: 'Preñada', vacia: 'Vacía' }
const BITACORA = { lluvia: 'Lluvia', quema: 'Quema', agua: 'Agua', cerca: 'Cerca', otro: 'Otro' }

type FilaDeAnimal = {
  id: string
  nombre: string | null
  sexo: string
  categoria: string
  detalle: string | null
  tenencia: string
  arreglo: string | null
  nota: string | null
  activo: string
  motivo: string | null
  fecha_salida: string | null
  nota_salida: string | null
  siniiga: string | null
  otros: string | null
  anteriores: string | null
  lugar_animal: string | null
  paddock_id: string | null
  potrero: string | null
  observacion: string | null
  origen: string | null
}

type FilaDePeso = {
  animal_id: string
  nombre: string | null
  siniiga: string | null
  dia: string
  kilos: string
  calidad: string
  nota_sesion: string | null
  corregido: string
}

type FilaDeNacimiento = {
  cria_id: string
  cria: string | null
  fecha: string | null
  precision: string | null
  certeza_madre: string
  madre_id: string | null
  motivo_madre: string | null
  madre: string | null
  certeza_padre: string
  padre_id: string | null
  motivo_padre: string | null
  padre: string | null
  nota: string | null
}

type FilaDeSalida = {
  id: string
  nombre: string | null
  motivo: string
  fecha: string
  nota: string | null
}

type FilaDeSanidad = {
  animal_id: string
  nombre: string | null
  tipo: string
  detalle: string
  fecha: string
  producto: string | null
  vio: string | null
}

type FilaDeDestete = {
  animal_id: string
  nombre: string | null
  fecha: string | null
  precision: string | null
  nota: string | null
  quien: string | null
  kilos: string | null
}

type FilaDePrenez = {
  animal_id: string
  nombre: string | null
  fecha: string
  resultado: string
  quien: string | null
  nota: string | null
  vio: string | null
}

type FilaDeMovimiento = {
  animal_id: string
  nombre: string | null
  fecha: string
  paddock_id: string | null
  potrero: string | null
  nota: string | null
  quien: string | null
}

type FilaDeBitacora = {
  tipo: string
  texto: string
  fecha: string
  precision: string
  paddock_id: string | null
  potrero: string | null
  quien: string | null
}

export function crearModelosDeExportacion(db: EjecutorSql): ModelosDeExportacion {
  return {
    async hato(ranchId) {
      const [marco, filas] = await Promise.all([contexto(db, ranchId), animalesDe(db, ranchId)])
      return empaquetar(marco, 'hato', COLUMNAS_HATO, filas.map(filaDeAnimal))
    },

    async pesos(ranchId) {
      const [marco, filas] = await Promise.all([contexto(db, ranchId), pesosDe(db, ranchId)])
      return empaquetar(marco, 'pesos', COLUMNAS_PESOS, filas.map(filaDePeso))
    },

    async eventos(ranchId) {
      const [marco, filas] = await Promise.all([contexto(db, ranchId), eventosDe(db, ranchId)])
      return empaquetar(marco, 'eventos', COLUMNAS_EVENTOS, filas)
    },
  }
}

async function animalesDe(db: EjecutorSql, ranchId: RanchId): Promise<FilaDeAnimal[]> {
  return filasDe<FilaDeAnimal>(
    await db.execute(sql`
      WITH vigente AS (
        SELECT DISTINCT ON (animal_id)
          animal_id,
          paddock_id
        FROM herd.location_assignment
        WHERE ranch_id = ${ranchId}
        ORDER BY animal_id, valid_from DESC, recorded_at DESC, id DESC
      ),
      vistos AS (
        ${fuentesDeObservacion(ranchId)}
      )
      SELECT
        animal.id,
        animal.name AS nombre,
        animal.sex AS sexo,
        animal.category AS categoria,
        animal.category_detail AS detalle,
        animal.tenure AS tenencia,
        animal.arrangement_note AS arreglo,
        animal.note AS nota,
        animal.active::text AS activo,
        animal.exit_reason AS motivo,
        animal.exit_known_on::text AS fecha_salida,
        animal.exit_note AS nota_salida,
        (
          SELECT string_agg(marca.value, '; ' ORDER BY marca.value)
          FROM herd.animal_mark marca
          WHERE marca.animal_id = animal.id
            AND marca.ranch_id = animal.ranch_id
            AND marca.type = 'siniiga'
            AND marca.status = 'active'
        ) AS siniiga,
        (
          SELECT string_agg(marca.value, '; ' ORDER BY marca.value)
          FROM herd.animal_mark marca
          WHERE marca.animal_id = animal.id
            AND marca.ranch_id = animal.ranch_id
            AND marca.type = 'other'
            AND marca.status = 'active'
        ) AS otros,
        (
          SELECT string_agg(
            CASE marca.type WHEN 'siniiga' THEN 'SINIIGA ' ELSE 'Otro ' END
              || marca.value
              || CASE marca.status
                   WHEN 'replaced' THEN ' (cambiado)'
                   WHEN 'lost' THEN ' (se cayó)'
                   ELSE ''
                 END,
            '; ' ORDER BY marca.value
          )
          FROM herd.animal_mark marca
          WHERE marca.animal_id = animal.id
            AND marca.ranch_id = animal.ranch_id
            AND marca.status <> 'active'
        ) AS anteriores,
        vigente.animal_id AS lugar_animal,
        vigente.paddock_id,
        potrero.name AS potrero,
        vistos.fecha::text AS observacion,
        vistos.origen
      FROM herd.animal animal
      LEFT JOIN vigente ON vigente.animal_id = animal.id
      LEFT JOIN herd.paddock potrero
        ON potrero.id = vigente.paddock_id AND potrero.ranch_id = animal.ranch_id
      LEFT JOIN vistos ON vistos.animal_id = animal.id
      WHERE animal.ranch_id = ${ranchId}
      ORDER BY animal.active DESC, animal.name NULLS LAST, animal.id
    `),
  )
}

async function pesosDe(db: EjecutorSql, ranchId: RanchId): Promise<FilaDePeso[]> {
  return filasDe<FilaDePeso>(
    await db.execute(sql`
      SELECT
        animal.id AS animal_id,
        animal.name AS nombre,
        (
          SELECT string_agg(marca.value, '; ' ORDER BY marca.value)
          FROM herd.animal_mark marca
          WHERE marca.animal_id = animal.id
            AND marca.ranch_id = animal.ranch_id
            AND marca.type = 'siniiga'
            AND marca.status = 'active'
        ) AS siniiga,
        sesion.weighed_on::text AS dia,
        linea.kilos::text AS kilos,
        linea.quality AS calidad,
        sesion.note AS nota_sesion,
        (EXISTS (
          SELECT 1
          FROM growth.weight_correction correccion
          WHERE correccion.line_id = linea.id
        ))::text AS corregido
      FROM growth.weighing_line linea
      JOIN growth.weighing_session sesion
        ON sesion.id = linea.session_id AND sesion.ranch_id = linea.ranch_id
      JOIN herd.animal animal
        ON animal.id = linea.animal_id AND animal.ranch_id = linea.ranch_id
      WHERE linea.ranch_id = ${ranchId}
        AND linea.result = 'weighed'
      ORDER BY sesion.weighed_on, animal.name NULLS LAST, animal.id, linea.id
    `),
  )
}

async function eventosDe(db: EjecutorSql, ranchId: RanchId): Promise<FilaEvento[]> {
  const [nacimientos, salidas, sanidad, destetes, prenez, movimientos, bitacora] = await Promise.all([
    filasDe<FilaDeNacimiento>(
      await db.execute(sql`
        SELECT
          cria.id AS cria_id,
          cria.name AS cria,
          filiacion.birth_date::text AS fecha,
          filiacion.birth_date_precision AS precision,
          filiacion.dam_certainty AS certeza_madre,
          filiacion.dam_id AS madre_id,
          filiacion.dam_reason AS motivo_madre,
          madre.name AS madre,
          filiacion.sire_certainty AS certeza_padre,
          filiacion.sire_id AS padre_id,
          filiacion.sire_reason AS motivo_padre,
          padre.name AS padre,
          filiacion.note AS nota
        FROM herd.parentage_record filiacion
        JOIN herd.animal cria
          ON cria.id = filiacion.offspring_id AND cria.ranch_id = filiacion.ranch_id
        LEFT JOIN herd.animal madre
          ON madre.id = filiacion.dam_id AND madre.ranch_id = filiacion.ranch_id
        LEFT JOIN herd.animal padre
          ON padre.id = filiacion.sire_id AND padre.ranch_id = filiacion.ranch_id
        WHERE filiacion.ranch_id = ${ranchId}
      `),
    ),
    filasDe<FilaDeSalida>(
      await db.execute(sql`
        SELECT
          id,
          name AS nombre,
          exit_reason AS motivo,
          exit_known_on::text AS fecha,
          exit_note AS nota
        FROM herd.animal
        WHERE ranch_id = ${ranchId} AND active = false
      `),
    ),
    filasDe<FilaDeSanidad>(
      await db.execute(sql`
        SELECT
          nota.animal_id,
          animal.name AS nombre,
          nota.type AS tipo,
          nota.detail AS detalle,
          nota.occurred_on::text AS fecha,
          nota.product AS producto,
          nota.saw_animal::text AS vio
        FROM herd.health_event nota
        JOIN herd.animal animal
          ON animal.id = nota.animal_id AND animal.ranch_id = nota.ranch_id
        WHERE nota.ranch_id = ${ranchId}
      `),
    ),
    filasDe<FilaDeDestete>(
      await db.execute(sql`
        SELECT
          destete.animal_id,
          animal.name AS nombre,
          destete.occurred_on::text AS fecha,
          destete.date_precision AS precision,
          destete.note AS nota,
          destete.reported_by AS quien,
          linea.kilos::text AS kilos
        FROM herd.weaning destete
        JOIN herd.animal animal
          ON animal.id = destete.animal_id AND animal.ranch_id = destete.ranch_id
        LEFT JOIN growth.weighing_line linea
          ON linea.id = destete.weight_id AND linea.ranch_id = destete.ranch_id
        WHERE destete.ranch_id = ${ranchId}
      `),
    ),
    filasDe<FilaDePrenez>(
      await db.execute(sql`
        SELECT
          diagnostico.animal_id,
          animal.name AS nombre,
          diagnostico.occurred_on::text AS fecha,
          diagnostico.result AS resultado,
          diagnostico.reported_by AS quien,
          diagnostico.note AS nota,
          diagnostico.saw_animal::text AS vio
        FROM herd.pregnancy_check diagnostico
        JOIN herd.animal animal
          ON animal.id = diagnostico.animal_id AND animal.ranch_id = diagnostico.ranch_id
        WHERE diagnostico.ranch_id = ${ranchId}
      `),
    ),
    filasDe<FilaDeMovimiento>(
      await db.execute(sql`
        SELECT
          asignacion.animal_id,
          animal.name AS nombre,
          asignacion.valid_from::text AS fecha,
          asignacion.paddock_id,
          potrero.name AS potrero,
          asignacion.note AS nota,
          asignacion.reported_by AS quien
        FROM herd.location_assignment asignacion
        JOIN herd.animal animal
          ON animal.id = asignacion.animal_id AND animal.ranch_id = asignacion.ranch_id
        LEFT JOIN herd.paddock potrero
          ON potrero.id = asignacion.paddock_id AND potrero.ranch_id = asignacion.ranch_id
        WHERE asignacion.ranch_id = ${ranchId}
      `),
    ),
    filasDe<FilaDeBitacora>(
      await db.execute(sql`
        SELECT
          nota.type AS tipo,
          nota.body AS texto,
          nota.occurred_on::text AS fecha,
          nota.date_precision AS precision,
          nota.paddock_id,
          potrero.name AS potrero,
          nota.reported_by AS quien
        FROM journal.note nota
        LEFT JOIN herd.paddock potrero
          ON potrero.id = nota.paddock_id AND potrero.ranch_id = nota.ranch_id
        WHERE nota.ranch_id = ${ranchId}
      `),
    ),
  ])

  const filas = [
    ...nacimientos.map(filaDeNacimiento),
    ...salidas.map(filaDeSalida),
    ...sanidad.map(filaDeSanidad),
    ...destetes.map(filaDeDestete),
    ...prenez.map(filaDePrenez),
    ...movimientos.map(filaDeMovimiento),
    ...bitacora.map(filaDeBitacora),
  ]
  filas.sort(compararEventos)
  return filas
}

function filaDeAnimal(fila: FilaDeAnimal): FilaHato {
  const sexo = conocido(fila.sexo, SEXO, 'el sexo')
  const categoria = conocido(fila.categoria, CATEGORIA, 'la categoría')
  const tenencia = conocido(fila.tenencia, TENENCIA, 'la tenencia')
  const activo = esVerdad(texto(fila.activo, 'si está en el hato'), 'si está en el hato')
  const salida = salidaDe(activo, fila.motivo, fila.fecha_salida, fila.nota_salida)
  const potrero = potreroEsperado(fila.lugar_animal !== null, fila.paddock_id, fila.potrero)
  const observacion = fila.observacion
  return {
    'Id del animal': texto(fila.id, 'el animal'),
    'Nombre o seña': fila.nombre ?? '',
    Sexo: sexo.valor,
    'Nota del sexo': sexo.nota,
    Categoría: categoria.valor,
    'Detalle de la categoría': fila.detalle ?? '',
    'Nota de la categoría': categoria.nota,
    Tenencia: tenencia.valor,
    'Nota de la tenencia': tenencia.nota,
    'Nota del arreglo': fila.arreglo ?? '',
    Nota: fila.nota ?? '',
    SINIIGA: fila.siniiga ?? '',
    'Otros aretes': fila.otros ?? '',
    'Aretes anteriores': fila.anteriores ?? '',
    'Potrero esperado': potrero.valor,
    'Nota del potrero': potrero.nota,
    'Última observación': observacion === null ? '' : diaDe(observacion),
    'De dónde': observacion === null ? '' : etiqueta(ORIGEN, texto(fila.origen, 'la observación'), 'la observación'),
    'En el hato': activo ? 'Activo' : 'Dado de baja',
    'Motivo de la salida': salida.motivo,
    'Nota del motivo': salida.notaMotivo,
    'Día en que se supo': salida.dia,
    'Nota de la salida': salida.nota,
  }
}

function filaDePeso(fila: FilaDePeso): FilaPeso {
  const kilos = texto(fila.kilos, 'los kilos')
  if (kilos === '') {
    throw new Error('Un peso no trae los kilos guardados.')
  }
  return {
    'Id del animal': texto(fila.animal_id, 'el animal'),
    'Nombre o seña': fila.nombre ?? '',
    SINIIGA: fila.siniiga ?? '',
    Día: diaDe(texto(fila.dia, 'el día del peso')),
    Kilos: kilos,
    Calidad: etiqueta(CALIDAD, texto(fila.calidad, 'la calidad'), 'la calidad'),
    'Nota de la sesión': fila.nota_sesion ?? '',
    Corregido: esVerdad(texto(fila.corregido, 'si se corrigió'), 'si se corrigió') ? 'Sí' : 'No',
  }
}

function filaDeNacimiento(fila: FilaDeNacimiento): FilaEvento {
  const cuando = fechaConPrecision(fila.fecha, fila.precision)
  const madre = lado(fila.certeza_madre, fila.motivo_madre, MOTIVO_MADRE, 'la madre')
  const padre = lado(fila.certeza_padre, fila.motivo_padre, MOTIVO_PADRE, 'el padre')
  return evento({
    Tipo: 'Nacimiento',
    Día: cuando.dia,
    'Precisión del día': cuando.precision,
    'Nota del día': cuando.nota,
    'Id del animal': texto(fila.cria_id, 'la cría'),
    Animal: fila.cria ?? '',
    Madre: fila.madre ?? '',
    'Id de la madre': fila.madre_id ?? '',
    'Certeza de la madre': madre.valor,
    'Nota de la madre': madre.nota,
    'Por qué la madre': madre.motivo,
    Padre: fila.padre ?? '',
    'Id del padre': fila.padre_id ?? '',
    'Certeza del padre': padre.valor,
    'Nota del padre': padre.nota,
    'Por qué el padre': padre.motivo,
    Nota: fila.nota ?? '',
  })
}

function filaDeSalida(fila: FilaDeSalida): FilaEvento {
  const motivo = conocido(texto(fila.motivo, 'el motivo de la salida'), MOTIVO_SALIDA, 'el motivo de la salida')
  return evento({
    Tipo: 'Salida',
    Día: diaDe(texto(fila.fecha, 'el día de la salida')),
    'Id del animal': texto(fila.id, 'el animal'),
    Animal: fila.nombre ?? '',
    'Motivo de la salida': motivo.valor,
    'Nota del motivo': motivo.nota,
    Nota: fila.nota ?? '',
  })
}

function filaDeSanidad(fila: FilaDeSanidad): FilaEvento {
  const vio = seVio(fila.vio)
  return evento({
    Tipo: 'Sanidad',
    Día: diaDe(texto(fila.fecha, 'el día de la nota')),
    'Id del animal': texto(fila.animal_id, 'el animal'),
    Animal: fila.nombre ?? '',
    'Qué fue': etiqueta(SANIDAD, texto(fila.tipo, 'el tipo de nota'), 'el tipo de nota'),
    Detalle: texto(fila.detalle, 'el detalle'),
    Producto: fila.producto ?? '',
    'Se vio al animal': vio.valor,
    'Nota de si se vio': vio.nota,
  })
}

function filaDeDestete(fila: FilaDeDestete): FilaEvento {
  const cuando = fechaConPrecision(fila.fecha, fila.precision)
  return evento({
    Tipo: 'Destete',
    Día: cuando.dia,
    'Precisión del día': cuando.precision,
    'Nota del día': cuando.nota,
    'Id del animal': texto(fila.animal_id, 'el animal'),
    Animal: fila.nombre ?? '',
    Kilos: fila.kilos ?? '',
    'Quién lo dijo': fila.quien ?? '',
    Nota: fila.nota ?? '',
  })
}

function filaDePrenez(fila: FilaDePrenez): FilaEvento {
  const resultado = conocido(texto(fila.resultado, 'el resultado'), PRENEZ, 'el resultado')
  const vio = seVio(fila.vio)
  return evento({
    Tipo: 'Diagnóstico de preñez',
    Día: diaDe(texto(fila.fecha, 'el día del diagnóstico')),
    'Id del animal': texto(fila.animal_id, 'el animal'),
    Animal: fila.nombre ?? '',
    'Se vio al animal': vio.valor,
    'Nota de si se vio': vio.nota,
    Resultado: resultado.valor,
    'Nota del resultado': resultado.nota,
    'Quién lo dijo': fila.quien ?? '',
    Nota: fila.nota ?? '',
  })
}

function filaDeMovimiento(fila: FilaDeMovimiento): FilaEvento {
  const potrero = potreroEsperado(true, fila.paddock_id, fila.potrero)
  return evento({
    Tipo: 'Movimiento de potrero',
    Día: diaDe(texto(fila.fecha, 'el día del movimiento')),
    'Id del animal': texto(fila.animal_id, 'el animal'),
    Animal: fila.nombre ?? '',
    Potrero: potrero.valor,
    'Nota del potrero': potrero.nota,
    'Quién lo dijo': fila.quien ?? '',
    Nota: fila.nota ?? '',
  })
}

function filaDeBitacora(fila: FilaDeBitacora): FilaEvento {
  const potrero = potreroEsperado(fila.paddock_id !== null, fila.paddock_id, fila.potrero)
  return evento({
    Tipo: 'Bitácora',
    Día: diaDe(texto(fila.fecha, 'el día de la nota')),
    'Precisión del día': etiqueta(PRECISION, texto(fila.precision, 'la precisión'), 'la precisión'),
    'Qué fue': etiqueta(BITACORA, texto(fila.tipo, 'el tipo de nota'), 'el tipo de nota'),
    Potrero: potrero.valor,
    'Nota del potrero': potrero.nota,
    'Quién lo dijo': fila.quien ?? '',
    Nota: texto(fila.texto, 'la nota'),
  })
}

function evento(parcial: Partial<FilaEvento>): FilaEvento {
  const fila = {} as FilaEvento
  for (const columna of COLUMNAS_EVENTOS) {
    fila[columna] = parcial[columna] ?? ''
  }
  return fila
}

function compararEventos(a: FilaEvento, b: FilaEvento): number {
  const diaA = a['Día'] === '' ? '9999-99-99' : a['Día']
  const diaB = b['Día'] === '' ? '9999-99-99' : b['Día']
  if (diaA !== diaB) {
    return diaA < diaB ? -1 : 1
  }
  if (a.Tipo !== b.Tipo) {
    return a.Tipo < b.Tipo ? -1 : 1
  }
  if (a.Animal !== b.Animal) {
    return a.Animal < b.Animal ? -1 : 1
  }
  if (a['Id del animal'] !== b['Id del animal']) {
    return a['Id del animal'] < b['Id del animal'] ? -1 : 1
  }
  return 0
}

type Marco = { readonly rancho: string; readonly dia: string }

function empaquetar<T extends string>(
  marco: Marco,
  pieza: PiezaExportada,
  columnas: readonly T[],
  filas: readonly Record<T, string>[],
): ArchivoCsv {
  return {
    nombre: nombreDeArchivo(marco.rancho, pieza, marco.dia),
    cuerpo: aCsv(
      columnas,
      filas.map((fila) => columnas.map((columna) => fila[columna])),
    ),
  }
}

async function contexto(db: EjecutorSql, ranchId: RanchId): Promise<Marco> {
  const [rancho, dia] = await Promise.all([nombreDelRancho(db, ranchId), diaDelRancho(db)])
  return { rancho, dia }
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
    throw new Error('El rancho no tiene nombre registrado: la exportación no lo inventa.')
  }
  return nombre
}

async function diaDelRancho(db: EjecutorSql): Promise<string> {
  const filas = filasDe<{ dia: string }>(
    await db.execute(sql`
      SELECT (timezone('America/Mexico_City', now()))::date::text AS dia
    `),
  )
  const dia = filas[0]?.dia
  if (dia === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    throw new Error('La base no devolvió el día del rancho.')
  }
  return dia
}

function conocido(
  codigo: string,
  mapa: Record<string, string>,
  que: string,
): { readonly valor: string; readonly nota: string } {
  if (codigo === 'unknown' || codigo === 'no_se') {
    return { valor: '', nota: 'No sé' }
  }
  return { valor: etiqueta(mapa, codigo, que), nota: '' }
}

function lado(
  certeza: string,
  motivo: string | null,
  motivos: Record<string, string>,
  que: string,
): { readonly valor: string; readonly nota: string; readonly motivo: string } {
  if (certeza === 'unknown') {
    return { valor: '', nota: 'No sé', motivo: '' }
  }
  return {
    valor: etiqueta(CERTEZA, certeza, que),
    nota: '',
    motivo: certeza === 'inferred' ? etiqueta(motivos, motivo ?? '', `el motivo de ${que}`) : '',
  }
}

function fechaConPrecision(
  fecha: string | null,
  precision: string | null,
): { readonly dia: string; readonly precision: string; readonly nota: string } {
  if (fecha === null && precision === null) {
    return { dia: '', precision: '', nota: 'No sé' }
  }
  if (fecha === null || precision === null) {
    throw new Error('La exportación recibió un día y una precisión que no van juntos.')
  }
  return {
    dia: diaDe(fecha),
    precision: etiqueta(PRECISION, precision, 'la precisión'),
    nota: '',
  }
}

function seVio(valor: string | null): { readonly valor: string; readonly nota: string } {
  if (valor === null) {
    return { valor: '', nota: 'No sé' }
  }
  return { valor: esVerdad(valor, 'si se vio al animal') ? 'Sí' : 'No', nota: '' }
}

function salidaDe(
  activo: boolean,
  motivo: string | null,
  fecha: string | null,
  nota: string | null,
): { readonly motivo: string; readonly notaMotivo: string; readonly dia: string; readonly nota: string } {
  if (activo) {
    return { motivo: '', notaMotivo: '', dia: '', nota: '' }
  }
  if (motivo === null || fecha === null) {
    throw new Error('Una salida no trae motivo o día.')
  }
  const traducido = conocido(motivo, MOTIVO_SALIDA, 'el motivo de la salida')
  return { motivo: traducido.valor, notaMotivo: traducido.nota, dia: diaDe(fecha), nota: nota ?? '' }
}

function potreroEsperado(
  asignado: boolean,
  paddockId: string | null,
  nombre: string | null,
): { readonly valor: string; readonly nota: string } {
  if (!asignado) {
    return { valor: '', nota: '' }
  }
  if (paddockId === null) {
    return { valor: '', nota: 'No sé' }
  }
  if (nombre === null || nombre.trim() === '') {
    return { valor: '', nota: 'Sin nombre' }
  }
  return { valor: nombre, nota: '' }
}

function etiqueta(mapa: Record<string, string>, codigo: string, que: string): string {
  const textoDeCodigo = mapa[codigo]
  if (textoDeCodigo === undefined) {
    throw new Error(`La exportación no reconoce ${que}.`)
  }
  return textoDeCodigo
}

function diaDe(valor: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new Error('La exportación recibió un día que no es AAAA-MM-DD.')
  }
  return valor
}

function esVerdad(valor: string, que: string): boolean {
  if (valor === 'true' || valor === 't') {
    return true
  }
  if (valor === 'false' || valor === 'f') {
    return false
  }
  throw new Error(`La exportación no pudo leer ${que}.`)
}

function texto(valor: unknown, que: string): string {
  if (typeof valor === 'string') {
    return valor
  }
  throw new Error(`La exportación esperaba texto en ${que}.`)
}
