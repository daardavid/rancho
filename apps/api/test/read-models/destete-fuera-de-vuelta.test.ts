import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { crearCapturaDeDestete } from '../../src/application/destete'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearGrowth } from '../../src/modules/growth'
import { crearHerd } from '../../src/modules/herd'
import {
  crearModelosDeCrecimiento,
  crearModelosDeExportacion,
  crearModelosDePresencia,
  crearModelosDeTendencias,
} from '../../src/read-models'
import { recordedBySchema } from '../../src/shared-kernel/actores'
import { nuevoId, ranchIdSchema, type RanchId } from '../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

/**
 * El caso de David (2026-11-26): la última vuelta es la del 25 nov y el
 * destete del 26, con 95.5 kg, no la reemplaza. El peso sí queda en la cría.
 */

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')
const HOY = '2026-11-26'

let db: Base
let cerrar: () => Promise<void> = async () => {}
let ranchId: RanchId
let herd: ReturnType<typeof crearHerd>
let growth: ReturnType<typeof crearGrowth>
let captura: ReturnType<typeof crearCapturaDeDestete>

const ids = {
  pesado: '',
  hueco: '',
  cria: '',
}

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  db = base.db
  cerrar = base.cerrar
  const sembrado = await sembrarRancho(db, 'Rancho de prueba')
  ranchId = ranchIdSchema.parse(sembrado.id)
  herd = crearHerd(db)
  growth = crearGrowth(db, herd)
  captura = crearCapturaDeDestete(db)

  ids.pesado = await animal('Pesado en la vuelta')
  ids.hueco = await animal('Hueco de la vuelta')
  ids.cria = await animal('Cría destetada')

  await growth.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id: nuevoId(),
    fecha: '2026-11-15',
    filas: [
      {
        id: nuevoId(),
        animalId: ids.pesado,
        resultado: 'pesado',
        kilos: '100.000',
        calidad: 'measured',
      },
      {
        id: nuevoId(),
        animalId: ids.cria,
        resultado: 'pesado',
        kilos: '80.000',
        calidad: 'measured',
      },
    ],
  })
  await growth.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id: nuevoId(),
    fecha: '2026-11-25',
    filas: [
      {
        id: nuevoId(),
        animalId: ids.pesado,
        resultado: 'pesado',
        kilos: '110.000',
        calidad: 'measured',
      },
      { id: nuevoId(), animalId: ids.hueco, resultado: 'hueco' },
    ],
  })
  await captura.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    precisionFecha: 'exact',
    fecha: '2026-11-26',
    animales: [
      {
        animalId: ids.cria,
        desteteId: nuevoId(),
        peso: { id: nuevoId(), kilos: '95.5', calidad: 'measured' },
      },
    ],
  })
}, 60_000)

afterAll(async () => {
  await cerrar()
})

describe('el destete no reemplaza a la última vuelta', () => {
  it('Crecimiento, Inicio, el Resumen y Tendencias siguen en la vuelta del 25 nov', async () => {
    const crecimiento = crearModelosDeCrecimiento(db)
    const presencia = crearModelosDePresencia(db)
    const tendencias = crearModelosDeTendencias(db)

    const resumen = await crecimiento.resumenDelHato(ranchId, HOY)
    // 10 kg en 10 días. El intervalo de la cría termina en el destete y no entra.
    expect(resumen.fechaDeLaUltimaVuelta).toBe('2026-11-25')
    expect(resumen.pesadosEnLaUltimaVuelta).toBe(1)
    expect(resumen.esperadosEnLaUltimaVuelta).toBe(2)
    expect(resumen.gananciaMediaKilosPorDia).toBe('1.000')

    const filaPesada = resumen.animales.find((fila) => fila.animalId === ids.pesado)
    const filaCria = resumen.animales.find((fila) => fila.animalId === ids.cria)
    expect(filaPesada?.diasDesdeElUltimoPesaje).toBe(1)
    expect(filaCria?.ultimoPeso).toMatchObject({ kilos: '95.500', fecha: '2026-11-26' })
    expect(filaCria?.diasDesdeElUltimoPesaje).toBe(11)
    expect(filaCria?.fueHuecoEnLaUltimaSesion).toBe(false)

    const inicio = await presencia.inicio(ranchId, { hoy: HOY })
    expect(inicio.paraRevisar.fechaDeLaUltimaVuelta).toBe('2026-11-25')
    expect(inicio.paraRevisar.huecosDeLaUltimaVuelta.map((animal) => animal.animalId)).toEqual([
      ids.hueco,
    ])

    const vista = await tendencias.vista(ranchId)
    expect(vista.vueltas.map((vuelta) => vuelta.fecha)).toEqual(['2026-11-15', '2026-11-25'])
    expect(vista.vueltas.find((vuelta) => vuelta.fecha === '2026-11-25')?.gananciaMediaKilosPorDia).toBe(
      '1.000',
    )
    const serie = vista.series.find((candidata) => candidata.animalId === ids.cria)
    expect(serie?.pesos.map((peso) => peso.kilos)).toEqual(['80.000', '95.500'])
  })

  it('el peso de 95.5 kg queda en la ficha, en la observación y en la exportación', async () => {
    const crecimiento = crearModelosDeCrecimiento(db)
    const presencia = crearModelosDePresencia(db)
    const exportacion = crearModelosDeExportacion(db)

    const ficha = await crecimiento.vistaDeAnimal(ranchId, ids.cria)
    expect(ficha?.ultimoPesaje).toMatchObject({ kilos: '95.500', fecha: '2026-11-26' })
    expect(ficha?.pesos.map((peso) => peso.kilos)).toEqual(['80.000', '95.500'])
    expect(ficha?.pesos[1]?.intervalo?.kilosPorDia).toBe('1.409')

    const observacion = await presencia.ultimaObservacion(ranchId, ids.cria, HOY)
    expect(observacion?.observacion).toMatchObject({ fecha: '2026-11-26', origen: 'pesaje', dias: 0 })

    const archivo = await exportacion.pesos(ranchId)
    expect(archivo.cuerpo).toContain('95.500')
  })

  it('la propuesta de Pesaje no incluye a quien solo trae el peso del destete', async () => {
    const soloDestete = await animal('Solo destete')
    await captura.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      precisionFecha: 'exact',
      fecha: '2026-11-26',
      animales: [
        {
          animalId: soloDestete,
          desteteId: nuevoId(),
          peso: { id: nuevoId(), kilos: '70.000', calidad: 'declared' },
        },
      ],
    })

    const propuesta = await growth.ultima(ranchId)
    expect(propuesta?.fecha).toBe('2026-11-25')
    const propuestos = propuesta?.filas.map((fila) => fila.animalId) ?? []
    expect(propuestos).not.toContain(soloDestete)
    expect(propuestos).not.toContain(ids.cria)
  })
})

async function animal(nombre: string): Promise<string> {
  const id = nuevoId()
  await herd.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id,
    nombre,
    categoria: 'calf',
    sexo: 'female',
  })
  return id
}
