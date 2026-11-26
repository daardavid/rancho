import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { historialDeCriaSchema, listaDeVacasSchema, ultimaObservacionSchema } from '@rancho/api-contracts'

import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearHerd } from '../../src/modules/herd'
import { crearModelosDeCria, crearModelosDePresencia } from '../../src/read-models'
import { recordedBySchema } from '../../src/shared-kernel/actores'
import { nuevoId, ranchIdSchema, type RanchId } from '../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

/**
 * Historial de cría con un rancho sintético.
 *
 * Hoy está fijo en 2026-11-26. Los días son de calendario, no un reloj.
 */

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')
const HOY = '2026-11-26'
const DESCONOCIDO = { certeza: 'unknown' as const, animalId: null, motivo: null }

let db: Base
let cerrar: () => Promise<void> = async () => {}
let ranchId: RanchId
let herd: ReturnType<typeof crearHerd>
let modelos: ReturnType<typeof crearModelosDeCria>

const ids = {
  vieja: nuevoId(),
  reciente: nuevoId(),
  sinParto: nuevoId(),
  sinFecha: nuevoId(),
  baja: nuevoId(),
  becerra: nuevoId(),
  toro: nuevoId(),
  criaVieja: nuevoId(),
  criaMedia: nuevoId(),
  criaSinFecha: nuevoId(),
  criaReciente: nuevoId(),
  criaDeLaBaja: nuevoId(),
  criaSoloSinFecha: nuevoId(),
}

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  db = base.db
  cerrar = base.cerrar
  const sembrado = await sembrarRancho(db, 'Rancho de prueba')
  ranchId = ranchIdSchema.parse(sembrado.id)
  herd = crearHerd(db)
  modelos = crearModelosDeCria(db)

  await vaca(ids.vieja, 'Vieja', 'cow', 'female')
  await vaca(ids.reciente, 'Reciente', 'cow', 'female')
  await vaca(ids.sinParto, 'Sin parto', 'cow', 'female')
  await vaca(ids.sinFecha, 'Solo sin fecha', 'cow', 'female')
  await vaca(ids.baja, 'Ya salió', 'cow', 'female')
  await vaca(ids.becerra, 'Becerra', 'calf', 'female')
  await vaca(ids.toro, 'Toro', 'bull', 'male')

  await parto(ids.criaVieja, 'Cría vieja', ids.vieja, 'observed', null, '2024-01-01')
  await parto(ids.criaMedia, 'Cría media', ids.vieja, 'inferred', 'dicho_de_trabajador', '2025-01-01')
  await parto(ids.criaSinFecha, 'Cría sin fecha', ids.vieja, 'observed', null, null)
  await parto(ids.criaReciente, 'Cría reciente', ids.reciente, 'observed', null, '2026-10-01')
  await parto(ids.criaDeLaBaja, 'Cría de la baja', ids.baja, 'observed', null, '2024-06-01')
  await parto(ids.criaSoloSinFecha, 'Cría sin día', ids.sinFecha, 'inferred', 'parto_visto', null)

  await herd.registrarSalida({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    animalId: ids.baja,
    version: 1,
    motivo: 'sale',
    fecha: '2026-11-01',
  })

  await herd.anotarDiagnostico({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    fecha: '2026-01-01',
    resultado: 'vacia',
    reportedBy: 'el trabajador',
    vioAlAnimal: false,
    animales: [{ animalId: ids.reciente, diagnosticoId: nuevoId() }],
  })
  await herd.anotarDiagnostico({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    fecha: '2026-11-20',
    resultado: 'prenada',
    vioAlAnimal: true,
    animales: [{ animalId: ids.reciente, diagnosticoId: nuevoId() }],
  })
  await herd.anotarDiagnostico({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    fecha: '2026-11-02',
    resultado: 'no_se',
    vioAlAnimal: null,
    animales: [{ animalId: ids.sinParto, diagnosticoId: nuevoId() }],
  })
}, 60_000)

afterAll(async () => {
  await cerrar()
})

describe('historial de cría', () => {
  it('calcula intervalos con y sin fecha, y distingue madre vista de inferida', async () => {
    const vista = await modelos.historial(ranchId, ids.vieja, HOY)
    expect(vista).not.toBeNull()
    historialDeCriaSchema.parse(vista)

    expect(vista?.partos.map((parto) => parto.criaId)).toEqual([
      ids.criaMedia,
      ids.criaVieja,
      ids.criaSinFecha,
    ])
    expect(vista?.partos.find((parto) => parto.criaId === ids.criaVieja)?.certezaMadre).toBe('observed')
    expect(vista?.partos.find((parto) => parto.criaId === ids.criaMedia)).toMatchObject({
      certezaMadre: 'inferred',
      motivo: 'dicho_de_trabajador',
      fecha: '2025-01-01',
    })
    expect(vista?.partos.find((parto) => parto.criaId === ids.criaSinFecha)?.fecha).toBeNull()
    expect(vista?.partosSinFecha).toBe(1)
    expect(vista?.intervalos).toEqual([
      {
        criaPreviaId: ids.criaVieja,
        criaId: ids.criaMedia,
        fechaPrevia: '2024-01-01',
        fecha: '2025-01-01',
        dias: 366,
      },
    ])
    expect(vista?.diasDesdeElUltimoParto).toBe(694)
  })

  it('una vaca sin partos no tiene días, y la dada de baja queda fuera de la lista', async () => {
    const sin = await modelos.historial(ranchId, ids.sinParto, HOY)
    expect(sin?.partos).toEqual([])
    expect(sin?.diasDesdeElUltimoParto).toBeNull()
    expect(sin?.diagnosticos[0]?.resultado).toBe('no_se')

    const deLaBaja = await modelos.historial(ranchId, ids.baja, HOY)
    expect(deLaBaja?.partos).toHaveLength(1)

    const lista = await modelos.vacas(ranchId, HOY)
    listaDeVacasSchema.parse(lista)

    const enLista = [
      ...lista.porUltimoParto,
      ...lista.partoSinFecha,
      ...lista.sinPartoRegistrado,
    ].map((fila) => fila.animalId)
    expect(enLista).not.toContain(ids.baja)
    expect(enLista).not.toContain(ids.becerra)
    expect(enLista).not.toContain(ids.toro)

    expect(lista.porUltimoParto.map((fila) => fila.animalId)).toEqual([ids.vieja, ids.reciente])
    expect(lista.porUltimoParto.map((fila) => fila.diasDesdeElUltimoParto)).toEqual([694, 56])
    expect(lista.porUltimoParto[1]?.ultimoDiagnostico).toMatchObject({
      resultado: 'prenada',
      fecha: '2026-11-20',
      vioAlAnimal: true,
    })

    expect(lista.partoSinFecha.map((fila) => fila.animalId)).toEqual([ids.sinFecha])
    expect(lista.partoSinFecha[0]?.diasDesdeElUltimoParto).toBeNull()
    expect(lista.sinPartoRegistrado.map((fila) => fila.animalId)).toEqual([ids.sinParto])
  })

  it('un diagnóstico solo es observación cuando dice que se vio al animal', async () => {
    const presencia = crearModelosDePresencia(db)
    const vista = await presencia.ultimaObservacion(ranchId, ids.reciente, HOY)
    ultimaObservacionSchema.parse(vista)
    expect(vista?.observacion?.origen).toBe('diagnostico')
    expect(vista?.observacion?.fecha).toBe('2026-11-20')

    const sinVer = await presencia.ultimaObservacion(ranchId, ids.sinParto, HOY)
    expect(sinVer?.observacion).toBeNull()
  })
})

async function vaca(
  id: string,
  nombre: string,
  categoria: 'cow' | 'calf' | 'bull',
  sexo: 'female' | 'male',
): Promise<void> {
  await herd.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id,
    nombre,
    categoria,
    sexo,
  })
}

async function parto(
  id: string,
  nombre: string,
  madreId: string,
  certeza: 'observed' | 'inferred',
  motivo: 'parto_visto' | 'dicho_de_trabajador' | null,
  fecha: string | null,
): Promise<void> {
  await herd.registrarNacimiento({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id,
    filiacionId: nuevoId(),
    nombre,
    fechaNacimiento: fecha,
    precisionFecha: fecha === null ? null : 'exact',
    madre: { certeza, animalId: madreId, motivo },
    padre: DESCONOCIDO,
  })
}
