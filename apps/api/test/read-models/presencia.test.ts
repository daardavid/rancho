import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { inicioSchema, ultimaObservacionSchema } from '@rancho/api-contracts'

import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearGrowth } from '../../src/modules/growth'
import { crearHerd } from '../../src/modules/herd'
import { crearModelosDePresencia, type VistaDeInicio } from '../../src/read-models'
import { recordedBySchema } from '../../src/shared-kernel/actores'
import { nuevoId, ranchIdSchema, type RanchId } from '../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

/**
 * La última observación y el conteo de Inicio, con un rancho sintético.
 *
 * Hoy está fijo en 2026-11-24. El periodo por omisión empieza siete días
 * antes, el 2026-11-17. La última vuelta es la del 2026-11-24.
 */

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')
const HOY = '2026-11-24'
const DESDE = '2026-11-17'
const DESCONOCIDO = { certeza: 'unknown' as const, animalId: null, motivo: null }

let db: Base
let cerrar: () => Promise<void> = async () => {}
let ranchId: RanchId
let herd: ReturnType<typeof crearHerd>
let growth: ReturnType<typeof crearGrowth>
let modelos: ReturnType<typeof crearModelosDePresencia>

const ids = {
  pesado: nuevoId(),
  hueco: nuevoId(),
  notaVista: nuevoId(),
  notaNoVista: nuevoId(),
  lugarDesconocido: nuevoId(),
  sinNada: nuevoId(),
  vistoHaceMucho: nuevoId(),
  vistoHoy: nuevoId(),
  mismoDia: nuevoId(),
  criaPeriodo: nuevoId(),
  criaVieja: nuevoId(),
  criaSinFecha: nuevoId(),
  madreDelParto: nuevoId(),
  criaVista: nuevoId(),
  criaInferida: nuevoId(),
  criaSinCerteza: nuevoId(),
  filiacionVista: nuevoId(),
  salio: nuevoId(),
  potrero: nuevoId(),
  sesionUltima: nuevoId(),
  sesionMismoDia: nuevoId(),
  notaMismoDia: nuevoId(),
  pesoMismoDia: nuevoId(),
  pesoNotaVista: nuevoId(),
  notaVistaId: nuevoId(),
  notaVistaTardia: nuevoId(),
  notaNoVistaId: nuevoId(),
}

let vista: VistaDeInicio

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  db = base.db
  cerrar = base.cerrar
  const sembrado = await sembrarRancho(db, 'Rancho de prueba')
  ranchId = ranchIdSchema.parse(sembrado.id)
  herd = crearHerd(db)
  growth = crearGrowth(db, herd)
  modelos = crearModelosDePresencia(db)

  await animal(ids.pesado, 'Pesado', 'cow')
  await animal(ids.hueco, 'Solo hueco', 'bull')
  await animal(ids.notaVista, 'Nota vista', 'calf')
  await animal(ids.notaNoVista, 'Nota no vista', 'cow')
  await animal(ids.lugarDesconocido, 'Lugar no sé', 'cow')
  await animal(ids.sinNada, 'Sin nada', 'unknown')
  await animal(ids.vistoHaceMucho, 'Visto hace mucho', 'other')
  await animal(ids.vistoHoy, 'Visto hoy', 'cow')
  await animal(ids.mismoDia, 'Mismo día', 'cow')
  await animal(ids.salio, 'Ya salió', 'bull')

  await herd.registrarPotrero({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id: ids.potrero,
    nombre: 'Potrero norte',
  })
  await herd.asignarLugar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    potreroId: ids.potrero,
    desde: '2026-11-02',
    animales: [{ animalId: ids.pesado, asignacionId: nuevoId() }],
  })
  await herd.asignarLugar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    potreroId: null,
    desde: '2026-11-02',
    animales: [{ animalId: ids.lugarDesconocido, asignacionId: nuevoId() }],
  })

  await pesar(ids.vistoHaceMucho, '2026-01-01', '310.000')
  await pesar(ids.notaVista, '2026-11-01', '40.000', ids.pesoNotaVista)
  await pesar(ids.pesado, '2026-11-10', '420.000')
  await pesar(ids.mismoDia, '2026-11-15', '180.000', ids.pesoMismoDia, ids.sesionMismoDia)
  await pesar(ids.salio, '2026-11-18', '500.000')

  await growth.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id: ids.sesionUltima,
    fecha: HOY,
    filas: [
      { id: nuevoId(), animalId: ids.hueco, resultado: 'hueco' },
      { id: nuevoId(), animalId: ids.pesado, resultado: 'hueco' },
      {
        id: nuevoId(),
        animalId: ids.vistoHoy,
        resultado: 'pesado',
        kilos: '210.000',
        calidad: 'measured',
      },
    ],
  })
  // Un hueco viejo no es la última vuelta ni una observación.
  await growth.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id: nuevoId(),
    fecha: '2026-11-01',
    filas: [{ id: nuevoId(), animalId: ids.pesado, resultado: 'hueco' }],
  })

  await herd.anotarSalud({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    tipo: 'problema',
    detalle: 'Se le vio cojo',
    fecha: '2026-11-23',
    vioAlAnimal: true,
    animales: [{ animalId: ids.notaVista, notaId: ids.notaVistaId }],
  })
  await herd.anotarSalud({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    tipo: 'medicamento',
    detalle: 'Me dijeron que ya comió',
    fecha: HOY,
    vioAlAnimal: false,
    animales: [{ animalId: ids.notaVista, notaId: ids.notaVistaTardia }],
  })
  await herd.anotarSalud({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    tipo: 'vacuna',
    detalle: 'La anotaron sin verlo',
    fecha: '2026-11-22',
    vioAlAnimal: false,
    animales: [{ animalId: ids.notaNoVista, notaId: ids.notaNoVistaId }],
  })
  await herd.anotarSalud({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    tipo: 'bano',
    detalle: 'Baño del mismo día',
    fecha: '2026-11-15',
    vioAlAnimal: true,
    animales: [{ animalId: ids.mismoDia, notaId: ids.notaMismoDia }],
  })
  // El pesaje del mismo día se registró después: esa es la observación.
  await db.execute(sql`
    UPDATE growth.weighing_session
    SET recorded_at = '2026-11-15T20:00:00.000Z'
    WHERE id = ${ids.sesionMismoDia}
  `)
  await db.execute(sql`
    UPDATE herd.health_event
    SET recorded_at = '2026-11-15T08:00:00.000Z'
    WHERE id = ${ids.notaMismoDia}
  `)

  await nacimiento(ids.criaPeriodo, 'Cría del periodo', '2026-11-20', 'exact')
  await nacimiento(ids.criaVieja, 'Cría vieja', '2026-10-01', 'exact')
  await nacimiento(ids.criaSinFecha, 'Cría sin fecha', null, null)
  await animal(ids.madreDelParto, 'Madre del parto', 'cow')
  await nacimientoConMadre(ids.criaVista, ids.filiacionVista, 'Cría vista', {
    certeza: 'observed',
    animalId: ids.madreDelParto,
    motivo: null,
  })
  await nacimientoConMadre(ids.criaInferida, nuevoId(), 'Cría inferida', {
    certeza: 'inferred',
    animalId: ids.madreDelParto,
    motivo: 'parto_visto',
  })
  await nacimientoConMadre(ids.criaSinCerteza, nuevoId(), 'Cría sin certeza', DESCONOCIDO)

  await herd.registrarSalida({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    animalId: ids.salio,
    version: 1,
    motivo: 'death',
    fecha: '2026-11-19',
  })

  vista = await modelos.inicio(ranchId, { hoy: HOY })
}, 60_000)

afterAll(async () => {
  await cerrar()
})

describe('última observación', () => {
  it('usa el pesaje y la nota vista, y no el hueco, la asignación ni la nota que no vio al animal', async () => {
    const pesado = await modelos.ultimaObservacion(ranchId, ids.pesado, HOY)
    expect(pesado?.observacion).toMatchObject({ origen: 'pesaje', fecha: '2026-11-10', dias: 14 })

    const nota = await modelos.ultimaObservacion(ranchId, ids.notaVista, HOY)
    expect(nota?.observacion).toMatchObject({
      origen: 'sanidad',
      origenId: ids.notaVistaId,
      fecha: '2026-11-23',
      dias: 1,
    })

    const noVista = await modelos.ultimaObservacion(ranchId, ids.notaNoVista, HOY)
    expect(noVista?.observacion).toBeNull()

    const soloHueco = await modelos.ultimaObservacion(ranchId, ids.hueco, HOY)
    expect(soloHueco?.observacion).toBeNull()

    const asignado = await modelos.ultimaObservacion(ranchId, ids.lugarDesconocido, HOY)
    expect(asignado?.observacion).toBeNull()

    const mismoDia = await modelos.ultimaObservacion(ranchId, ids.mismoDia, HOY)
    expect(mismoDia?.observacion).toMatchObject({
      origen: 'pesaje',
      origenId: ids.pesoMismoDia,
      fecha: '2026-11-15',
      dias: 9,
    })

    expect(await modelos.ultimaObservacion(ranchId, nuevoId(), HOY)).toBeNull()
  })

  it('un nacimiento con fecha y madre «La vi» observa a la cría; inferida o «No sé» no', async () => {
    const leida = await modelos.ultimaObservacion(ranchId, ids.criaVista, HOY)
    expect(leida?.observacion).toMatchObject({
      origen: 'nacimiento',
      origenId: ids.filiacionVista,
      fecha: '2026-11-21',
      dias: 3,
    })
    expect((await modelos.ultimaObservacion(ranchId, ids.criaInferida, HOY))?.observacion).toBeNull()
    expect((await modelos.ultimaObservacion(ranchId, ids.criaSinCerteza, HOY))?.observacion).toBeNull()
    expect(idsDe(vista.paraRevisar.sinObservacion)).not.toContain(ids.criaVista)
    expect(idsDe(vista.paraRevisar.sinObservacion)).toContain(ids.criaInferida)
    expect(idsDe(vista.paraRevisar.sinObservacion)).toContain(ids.criaSinCerteza)
  })

  it('sigue leyéndose en un animal que ya salió, sin devolverlo a los activos', () => {
    return modelos.ultimaObservacion(ranchId, ids.salio, HOY).then((lectura) => {
      expect(lectura?.observacion).toMatchObject({ origen: 'pesaje', fecha: '2026-11-18', dias: 6 })
      expect(vista.paraRevisar.porDiasSinVerse.map((fila) => fila.animalId)).not.toContain(ids.salio)
      expect(vista.paraRevisar.sinObservacion.map((fila) => fila.animalId)).not.toContain(ids.salio)
    })
  })
})

describe('Inicio', () => {
  it('el periodo por omisión son los siete días anteriores al día del rancho', () => {
    expect(vista.hoy).toBe(HOY)
    expect(vista.desde).toBe(DESDE)
    expect(inicioSchema.parse(vista)).toEqual(vista)
  })

  it('cuenta activos, nacimientos, salidas, pesajes y notas con los datos sembrados', () => {
    expect(vista.activosPorCategoria).toEqual([
      { categoria: 'calf', cantidad: 7 },
      { categoria: 'cow', cantidad: 6 },
      { categoria: 'bull', cantidad: 1 },
      { categoria: 'other', cantidad: 1 },
      { categoria: 'unknown', cantidad: 1 },
    ])

    expect(vista.cambios.nacimientos.map((fila) => fila.animalId)).toEqual([
      ids.criaInferida,
      ids.criaSinCerteza,
      ids.criaVista,
      ids.criaPeriodo,
    ])
    expect(vista.cambios.nacimientosSinFecha).toBe(1)
    expect(vista.cambios.salidas.map((fila) => fila.animalId)).toEqual([ids.salio])
    expect(vista.cambios.pesajes).toBe(2)
    expect(vista.cambios.notasDeSanidad).toBe(3)
  })

  it('al acortar el periodo deja fuera lo anterior y no toca la lista de activos', async () => {
    const corto = await modelos.inicio(ranchId, { hoy: HOY, desde: HOY })
    expect(corto.cambios.nacimientos).toEqual([])
    expect(corto.cambios.salidas).toEqual([])
    expect(corto.cambios.pesajes).toBe(1)
    expect(corto.cambios.notasDeSanidad).toBe(1)
    expect(corto.cambios.nacimientosSinFecha).toBe(1)
    expect(corto.activosPorCategoria).toEqual(vista.activosPorCategoria)
  })

  it('lista huecos de la última vuelta, sin lugar, lugar desconocido y sin observación', () => {
    expect(vista.paraRevisar.fechaDeLaUltimaVuelta).toBe(HOY)
    expect(idsDe(vista.paraRevisar.huecosDeLaUltimaVuelta)).toEqual([ids.hueco, ids.pesado].sort())
    expect(idsDe(vista.paraRevisar.sinLugar)).not.toContain(ids.pesado)
    expect(idsDe(vista.paraRevisar.sinLugar)).not.toContain(ids.lugarDesconocido)
    expect(idsDe(vista.paraRevisar.sinLugar)).toContain(ids.sinNada)
    expect(idsDe(vista.paraRevisar.lugarDesconocido)).toEqual([ids.lugarDesconocido])
    expect(idsDe(vista.paraRevisar.sinObservacion)).toEqual(
      [
        ids.hueco,
        ids.notaNoVista,
        ids.lugarDesconocido,
        ids.sinNada,
        ids.criaPeriodo,
        ids.criaVieja,
        ids.criaSinFecha,
        ids.madreDelParto,
        ids.criaInferida,
        ids.criaSinCerteza,
      ].sort(),
    )
  })

  it('ordena por días a todos los que tienen observación, sin dejar fuera al de hoy ni al de hace meses', () => {
    const lista = vista.paraRevisar.porDiasSinVerse
    expect(lista.map((fila) => fila.dias)).toEqual([327, 14, 9, 3, 1, 0])
    expect(lista.map((fila) => fila.animalId)).toEqual([
      ids.vistoHaceMucho,
      ids.pesado,
      ids.mismoDia,
      ids.criaVista,
      ids.notaVista,
      ids.vistoHoy,
    ])
    expect(lista.map((fila) => fila.origen)).toEqual([
      'pesaje',
      'pesaje',
      'pesaje',
      'nacimiento',
      'sanidad',
      'pesaje',
    ])
    expect(ultimaObservacionSchema.parse({ animalId: ids.vistoHoy, observacion: null }).observacion).toBeNull()
  })
})

function idsDe(filas: readonly { animalId: string }[]): string[] {
  return filas.map((fila) => fila.animalId).sort()
}

async function animal(
  id: string,
  nombre: string,
  categoria: 'calf' | 'cow' | 'bull' | 'other' | 'unknown',
): Promise<void> {
  await herd.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id,
    nombre,
    categoria,
  })
}

async function pesar(
  animalId: string,
  fecha: string,
  kilos: string,
  pesoId: string = nuevoId(),
  sesionId: string = nuevoId(),
): Promise<void> {
  await growth.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id: sesionId,
    fecha,
    filas: [{ id: pesoId, animalId, resultado: 'pesado', kilos, calidad: 'measured' }],
  })
}

async function nacimientoConMadre(
  id: string,
  filiacionId: string,
  nombre: string,
  madre: {
    readonly certeza: 'observed' | 'inferred' | 'unknown'
    readonly animalId: string | null
    readonly motivo: 'parto_visto' | null
  },
): Promise<void> {
  await herd.registrarNacimiento({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id,
    filiacionId,
    nombre,
    fechaNacimiento: '2026-11-21',
    precisionFecha: 'exact',
    madre,
    padre: DESCONOCIDO,
  })
}

async function nacimiento(
  id: string,
  nombre: string,
  fechaNacimiento: string | null,
  precisionFecha: 'exact' | null,
): Promise<void> {
  await herd.registrarNacimiento({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id,
    filiacionId: nuevoId(),
    nombre,
    fechaNacimiento,
    precisionFecha,
    madre: DESCONOCIDO,
    padre: DESCONOCIDO,
  })
}
