import { tendenciasSchema } from '@rancho/api-contracts'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearGrowth } from '../../src/modules/growth'
import { crearHerd } from '../../src/modules/herd'
import { crearModelosDeTendencias } from '../../src/read-models'
import { recordedBySchema } from '../../src/shared-kernel/actores'
import { nuevoId, ranchIdSchema, type RanchId } from '../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')
const DESCONOCIDO = { certeza: 'unknown' as const, animalId: null, motivo: null }

let db: Base
let cerrar: () => Promise<void> = async () => {}
let ranchId: RanchId
let herd: ReturnType<typeof crearHerd>
let growth: ReturnType<typeof crearGrowth>
let modelos: ReturnType<typeof crearModelosDeTendencias>

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  db = base.db
  cerrar = base.cerrar
  const sembrado = await sembrarRancho(db, 'Rancho de prueba')
  ranchId = ranchIdSchema.parse(sembrado.id)
  herd = crearHerd(db)
  growth = crearGrowth(db, herd)
  modelos = crearModelosDeTendencias(db)
}, 60_000)

afterAll(async () => {
  await cerrar()
})

async function animal(nombre?: string): Promise<string> {
  const id = nuevoId()
  await herd.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id,
    ...(nombre === undefined ? {} : { nombre }),
  })
  return id
}

async function vuelta(
  fecha: string,
  filas: readonly {
    readonly animalId: string
    readonly resultado: 'pesado' | 'hueco'
    readonly kilos?: string
    readonly calidad?: 'measured' | 'observed' | 'declared'
  }[],
): Promise<void> {
  await growth.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id: nuevoId(),
    fecha,
    filas: filas.map((fila) => {
      if (fila.resultado === 'hueco') {
        return { id: nuevoId(), animalId: fila.animalId, resultado: 'hueco' as const }
      }
      if (fila.kilos === undefined) {
        throw new Error('Un pesado de prueba necesita kilos.')
      }
      return {
        id: nuevoId(),
        animalId: fila.animalId,
        resultado: 'pesado' as const,
        kilos: fila.kilos,
        calidad: fila.calidad ?? 'measured',
      }
    }),
  })
}

function vueltaDe(vista: Awaited<ReturnType<typeof modelos.vista>>, fecha: string) {
  const encontrada = vista.vueltas.find((candidata) => candidata.fecha === fecha)
  if (encontrada === undefined) {
    throw new Error(`No está la vuelta del ${fecha}.`)
  }
  return encontrada
}

describe('tendencias', () => {
  it('la ganancia de una vuelta usa la misma cuenta que Crecimiento y no inventa la primera', async () => {
    const id = await animal('Becerro de la cuenta')
    // 219.875 − 180.500 = 39.375 kg en 20 días. 39.375 / 20 = 1.96875 → 1.969.
    await vuelta('2026-06-01', [{ animalId: id, resultado: 'pesado', kilos: '180.500' }])
    await vuelta('2026-06-21', [{ animalId: id, resultado: 'pesado', kilos: '219.875' }])

    const vista = tendenciasSchema.parse(await modelos.vista(ranchId))

    expect(vueltaDe(vista, '2026-06-01')).toMatchObject({
      gananciaMediaKilosPorDia: null,
      animalesConPar: 0,
    })
    expect(vueltaDe(vista, '2026-06-21')).toMatchObject({
      gananciaMediaKilosPorDia: '1.969',
      animalesConPar: 1,
    })
  })

  it('promedia en la base a quienes tienen par y deja fuera al que no lo tiene', async () => {
    const primero = await animal('Primero del promedio')
    const segundo = await animal('Segundo del promedio')
    const sinPar = await animal('Sin par')
    // 15 kg / 10 días = 1.500. 30 kg / 10 días = 3.000. Media = 2.250.
    await vuelta('2026-07-01', [
      { animalId: primero, resultado: 'pesado', kilos: '100.000' },
      { animalId: segundo, resultado: 'pesado', kilos: '200.000' },
    ])
    await vuelta('2026-07-11', [
      { animalId: primero, resultado: 'pesado', kilos: '115.000' },
      { animalId: segundo, resultado: 'pesado', kilos: '230.000' },
      { animalId: sinPar, resultado: 'pesado', kilos: '50.000' },
    ])

    const vista = await modelos.vista(ranchId)

    expect(vueltaDe(vista, '2026-07-01').gananciaMediaKilosPorDia).toBeNull()
    expect(vueltaDe(vista, '2026-07-11')).toMatchObject({
      gananciaMediaKilosPorDia: '2.250',
      animalesConPar: 2,
    })
  })

  it('un intervalo de cero días no se divide y no se guarda como cero', async () => {
    const id = await animal('Mismo día')
    await vuelta('2026-08-01', [{ animalId: id, resultado: 'pesado', kilos: '100.000' }])
    await vuelta('2026-08-01', [{ animalId: id, resultado: 'pesado', kilos: '110.000' }])

    const vista = await modelos.vista(ranchId)
    const delDia = vista.vueltas.filter((candidata) => candidata.fecha === '2026-08-01')

    expect(delDia).toHaveLength(2)
    expect(delDia.every((candidata) => candidata.gananciaMediaKilosPorDia === null)).toBe(true)
  })

  it('la serie trae los pesos reales y el hueco aparte, sin un punto inventado', async () => {
    const id = await animal('Con hueco')
    const visto = await animal('Visto')
    await vuelta('2026-09-01', [
      { animalId: id, resultado: 'pesado', kilos: '100.000', calidad: 'measured' },
    ])
    await vuelta('2026-09-15', [{ animalId: id, resultado: 'hueco' }])
    await vuelta('2026-10-01', [
      { animalId: id, resultado: 'pesado', kilos: '130.000', calidad: 'declared' },
      { animalId: visto, resultado: 'pesado', kilos: '80.000', calidad: 'observed' },
    ])

    const vista = await modelos.vista(ranchId)
    const serie = vista.series.find((candidata) => candidata.animalId === id)
    const serieVista = vista.series.find((candidata) => candidata.animalId === visto)

    expect(serie?.pesos).toEqual([
      expect.objectContaining({ fecha: '2026-09-01', kilos: '100.000', calidad: 'measured' }),
      expect.objectContaining({ fecha: '2026-10-01', kilos: '130.000', calidad: 'declared' }),
    ])
    expect(serie?.pesos).toHaveLength(2)
    expect(serie?.huecos).toEqual([{ fecha: '2026-09-15' }])
    expect(serie?.pesos.some((punto) => punto.fecha === '2026-09-15')).toBe(false)
    expect(serieVista?.pesos).toEqual([
      expect.objectContaining({ fecha: '2026-10-01', kilos: '80.000', calidad: 'observed' }),
    ])
    // El par salta el hueco, igual que Crecimiento: 30 kg en 30 días.
    expect(vueltaDe(vista, '2026-10-01').gananciaMediaKilosPorDia).toBe('1.000')
  })

  it('agrupa nacimientos y salidas por mes y no les inventa fecha', async () => {
    await nacimiento('Cría de marzo', '2026-03-10')
    await nacimiento('Otra cría de marzo', '2026-03-20')
    await nacimiento('Cría de abril', '2026-04-02')
    await nacimiento('Cría sin día', null)

    const vendido = await animal('Se vendió')
    const muerto = await animal('Murió')
    const vendidoEnAbril = await animal('Se vendió en abril')
    await herd.registrarSalida({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId: vendido,
      version: 1,
      motivo: 'sale',
      fecha: '2026-03-18',
    })
    await herd.registrarSalida({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId: muerto,
      version: 1,
      motivo: 'death',
      fecha: '2026-03-20',
    })
    await herd.registrarSalida({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId: vendidoEnAbril,
      version: 1,
      motivo: 'sale',
      fecha: '2026-04-05',
    })

    const vista = tendenciasSchema.parse(await modelos.vista(ranchId))

    expect(vista.meses).toEqual([
      {
        mes: '2026-03',
        nacimientos: 2,
        salidas: [
          { motivo: 'sale', cantidad: 1 },
          { motivo: 'death', cantidad: 1 },
        ],
      },
      {
        mes: '2026-04',
        nacimientos: 1,
        salidas: [{ motivo: 'sale', cantidad: 1 }],
      },
    ])
    expect(vista.nacimientosSinFecha).toBe(1)
    expect(vista.salidasSinFecha).toBe(0)
    expect(vista.meses.some((mes) => mes.mes === '')).toBe(false)
  })
})

async function nacimiento(nombre: string, fechaNacimiento: string | null): Promise<void> {
  await herd.registrarNacimiento({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id: nuevoId(),
    filiacionId: nuevoId(),
    nombre,
    fechaNacimiento,
    precisionFecha: fechaNacimiento === null ? null : 'exact',
    madre: DESCONOCIDO,
    padre: DESCONOCIDO,
  })
}
