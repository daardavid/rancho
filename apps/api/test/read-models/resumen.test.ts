import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { resumenSemanalSchema } from '@rancho/api-contracts'

import { crearCapturaDeDestete } from '../../src/application/destete'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearGrowth } from '../../src/modules/growth'
import { crearHerd } from '../../src/modules/herd'
import {
  crearModelosDePresencia,
  crearModelosDeResumen,
  type VistaDeResumenSemanal,
} from '../../src/read-models'
import { recordedBySchema } from '../../src/shared-kernel/actores'
import { nuevoId, ranchIdSchema, type RanchId } from '../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

/**
 * El resumen de la semana con un rancho sintético.
 *
 * Hoy está fijo en 2026-11-26. El periodo por omisión empieza siete días antes,
 * el 2026-11-19. La última vuelta es la del 2026-11-24.
 */

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')
const HOY = '2026-11-26'
const DESDE = '2026-11-19'
const NOMBRE_DEL_RANCHO = 'Rancho de prueba'
const DESCONOCIDO = { certeza: 'unknown' as const, animalId: null, motivo: null }

let db: Base
let cerrar: () => Promise<void> = async () => {}
let ranchId: RanchId
let herd: ReturnType<typeof crearHerd>
let growth: ReturnType<typeof crearGrowth>
let captura: ReturnType<typeof crearCapturaDeDestete>
let modelos: ReturnType<typeof crearModelosDeResumen>

const ids = {
  vaca: nuevoId(),
  becerro: nuevoId(),
  sinVer: nuevoId(),
  vendido: nuevoId(),
  muerto: nuevoId(),
  viejo: nuevoId(),
  sinLugar: nuevoId(),
  criaDestetada: nuevoId(),
  criaDestetadaSinPeso: nuevoId(),
  criaDesteteSinFecha: nuevoId(),
}

let resumen: VistaDeResumenSemanal

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  db = base.db
  cerrar = base.cerrar
  const sembrado = await sembrarRancho(db, NOMBRE_DEL_RANCHO)
  ranchId = ranchIdSchema.parse(sembrado.id)
  herd = crearHerd(db)
  growth = crearGrowth(db, herd)
  captura = crearCapturaDeDestete(db)
  modelos = crearModelosDeResumen(db, crearModelosDePresencia(db))

  await animal(ids.vaca, 'La vaca', 'cow')
  await animal(ids.becerro, 'El becerro', 'calf')
  await animal(ids.sinVer, 'Sin ver', 'calf')
  await animal(ids.vendido, 'El vendido', 'bull')
  await animal(ids.muerto, 'El muerto', 'cow')
  await animal(ids.viejo, 'Visto hace mucho', 'cow')
  await animal(ids.sinLugar, 'Sin lugar', 'unknown')
  await animal(ids.criaDestetada, 'Cría destetada', 'calf')
  await animal(ids.criaDestetadaSinPeso, 'Cría sin peso', 'calf')
  await animal(ids.criaDesteteSinFecha, 'Cría sin día', 'calf')

  // Visto hace mucho: fuera del periodo, pero observable.
  await pesar(ids.viejo, '2026-01-01', '310.000')
  await pesar(ids.vaca, '2026-11-10', '420.000')

  // La última vuelta: el becerro se pesó, el viejo quedó en hueco.
  await growth.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id: nuevoId(),
    fecha: '2026-11-24',
    filas: [
      { id: nuevoId(), animalId: ids.becerro, resultado: 'pesado', kilos: '160.000', calidad: 'measured' },
      { id: nuevoId(), animalId: ids.viejo, resultado: 'hueco' },
    ],
  })

  // Nacimientos: uno en el periodo y uno sin fecha.
  await nacimiento(nuevoId(), 'Cría del periodo', '2026-11-21', 'exact')
  await nacimiento(nuevoId(), 'Cría sin fecha', null, null)

  // Salidas del periodo, una por venta y una por muerte.
  await herd.registrarSalida({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    animalId: ids.vendido,
    version: 1,
    motivo: 'sale',
    fecha: '2026-11-22',
  })
  await herd.registrarSalida({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    animalId: ids.muerto,
    version: 1,
    motivo: 'death',
    fecha: '2026-11-23',
  })

  // Destetes: uno con peso, uno sin peso y uno sin fecha.
  await captura.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    precisionFecha: 'exact',
    fecha: '2026-11-20',
    animales: [
      {
        animalId: ids.criaDestetada,
        desteteId: nuevoId(),
        peso: { id: nuevoId(), kilos: '180.000', calidad: 'measured' },
      },
    ],
  })
  await captura.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    precisionFecha: 'exact',
    fecha: '2026-11-21',
    animales: [{ animalId: ids.criaDestetadaSinPeso, desteteId: nuevoId() }],
  })
  await captura.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    precisionFecha: 'no_se',
    fecha: null,
    animales: [{ animalId: ids.criaDesteteSinFecha, desteteId: nuevoId() }],
  })

  // Diagnósticos de preñez del periodo.
  await herd.anotarDiagnostico({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    fecha: '2026-11-23',
    resultado: 'prenada',
    vioAlAnimal: true,
    animales: [{ animalId: ids.vaca, diagnosticoId: nuevoId() }],
  })
  await herd.anotarDiagnostico({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    fecha: '2026-11-25',
    resultado: 'no_se',
    vioAlAnimal: null,
    animales: [{ animalId: ids.sinVer, diagnosticoId: nuevoId() }],
  })

  resumen = await modelos.semanal(ranchId, { hoy: HOY })
}, 120_000)

afterAll(async () => {
  await cerrar()
})

describe('resumen de la semana', () => {
  it('cumple el contrato y trae el nombre del rancho y el periodo por omisión', () => {
    expect(resumenSemanalSchema.parse(resumen)).toEqual(resumen)
    expect(resumen.rancho).toBe(NOMBRE_DEL_RANCHO)
    expect(resumen.hoy).toBe(HOY)
    expect(resumen.desde).toBe(DESDE)
  })

  it('cuenta los activos por categoría y su total', () => {
    expect(resumen.activos.total).toBe(
      resumen.activos.porCategoria.reduce((suma, fila) => suma + fila.cantidad, 0),
    )
    expect(resumen.activos.porCategoria).toContainEqual({ categoria: 'cow', cantidad: 2 })
    expect(resumen.activos.porCategoria).toContainEqual({ categoria: 'calf', cantidad: 7 })
  })

  it('dice los nacimientos del periodo y los que no tienen fecha, sin esconderlos', () => {
    expect(resumen.nacimientos.total).toBe(1)
    expect(resumen.nacimientos.sinFecha).toBe(1)
  })

  it('cuenta las salidas del periodo por motivo', () => {
    expect(resumen.salidas.total).toBe(2)
    expect(resumen.salidas.porMotivo).toEqual([
      { motivo: 'death', cantidad: 1 },
      { motivo: 'sale', cantidad: 1 },
    ])
  })

  it('cuenta los destetes con su peso aparte y los que no tienen fecha', () => {
    expect(resumen.destetes.total).toBe(2)
    expect(resumen.destetes.conPeso).toBe(1)
    expect(resumen.destetes.sinPeso).toBe(1)
    expect(resumen.destetes.sinFecha).toBe(1)
  })

  it('cuenta los diagnósticos de preñez del periodo por resultado', () => {
    expect(resumen.prenez.total).toBe(2)
    expect(resumen.prenez.porResultado).toEqual([
      { resultado: 'no_se', cantidad: 1 },
      { resultado: 'prenada', cantidad: 1 },
    ])
  })

  it('dice lo que no se sabe y lo que hay que revisar, sin umbral ni cero disfrazado', () => {
    // Sin ningún pesaje ni nota vista: el resumen lo dice en lugar de callarlo.
    expect(resumen.revisar.sinObservacion).toBeGreaterThan(0)
    expect(resumen.revisar.huecosDeLaUltimaVuelta).toBe(1)
    expect(resumen.revisar.porDiasSinVerse[0]).toMatchObject({ nombre: 'Visto hace mucho' })
  })

  it('al acortar el periodo deja fuera lo anterior y no toca los activos', async () => {
    const corto = await modelos.semanal(ranchId, { hoy: HOY, desde: HOY })
    expect(corto.desde).toBe(HOY)
    expect(corto.salidas.total).toBe(0)
    expect(corto.destetes.total).toBe(0)
    expect(corto.activos).toEqual(resumen.activos)
  })

  it('no expone identificadores internos en lo que se comparte', () => {
    const texto = JSON.stringify(resumen)
    for (const id of Object.values(ids)) {
      expect(texto).not.toContain(id)
    }
  })
})

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

async function pesar(animalId: string, fecha: string, kilos: string): Promise<void> {
  await growth.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id: nuevoId(),
    fecha,
    filas: [{ id: nuevoId(), animalId, resultado: 'pesado', kilos, calidad: 'measured' }],
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
