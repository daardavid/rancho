import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sembrarRancho } from '../../../src/infrastructure/db/semilla'
import { crearGrowth } from '../../../src/modules/growth'
import { crearHerd } from '../../../src/modules/herd'
import { RechazoDeHerd } from '../../../src/modules/herd/domain/errores'
import { crearModelosDeCrecimiento } from '../../../src/read-models'
import { recordedBySchema } from '../../../src/shared-kernel/actores'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../../src/shared-kernel/conflictos'
import { nuevoId, ranchIdSchema, type RanchId } from '../../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../../db/base-de-pruebas'

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')

let db: Base
let cerrar: () => Promise<void> = async () => {}
let ranchId: RanchId
let herd: ReturnType<typeof crearHerd>
let growth: ReturnType<typeof crearGrowth>
let modelos: ReturnType<typeof crearModelosDeCrecimiento>

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  db = base.db
  cerrar = base.cerrar
  const sembrado = await sembrarRancho(db, 'Rancho de prueba')
  ranchId = ranchIdSchema.parse(sembrado.id)
  herd = crearHerd(db)
  growth = crearGrowth(db, herd)
  modelos = crearModelosDeCrecimiento(db)
}, 60_000)

afterAll(async () => {
  await cerrar()
})

describe('salida del activo', () => {
  it('conserva ficha, aretes, pesos y correcciones, y el motivo desconocido es válido', async () => {
    const animalId = nuevoId()
    const marcaId = nuevoId()
    await herd.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: animalId,
      nombre: 'Seña de la salida',
      tenencia: 'a_la_parte',
    })
    await herd.agregarMarca({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId,
      marcaId,
      tipo: 'siniiga',
      valor: 'SALIDA-01',
    })
    await herd.corregir({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId,
      version: 1,
      motivo: 'la seña estaba incompleta',
      cambios: { nombre: 'Seña completa' },
    })
    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-03-01',
      filas: [
        {
          id: nuevoId(),
          animalId,
          resultado: 'pesado',
          kilos: '180.500',
          calidad: 'measured',
        },
      ],
    })

    const baja = await herd.registrarSalida({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId,
      version: 2,
      motivo: 'unknown',
      fecha: '2026-04-02',
    })

    expect(baja.activo).toBe(false)
    expect(baja.salida).toEqual({
      motivo: 'unknown',
      fecha: '2026-04-02',
      nota: null,
      evidenciaId: null,
    })
    expect(baja.nombre).toBe('Seña completa')
    expect(baja.tenencia).toBe('a_la_parte')
    expect(baja.marcas.map((marca) => marca.valor)).toEqual(['SALIDA-01'])
    expect(baja.correcciones).toEqual([
      expect.objectContaining({ campo: 'nombre', valorAnterior: 'Seña de la salida' }),
    ])

    const vista = await modelos.vistaDeAnimal(ranchId, animalId)
    expect(vista?.pesos.map((peso) => peso.kilos)).toEqual(['180.500'])
    const resumen = await modelos.resumenDelHato(ranchId, '2026-04-03')
    expect(resumen.animales.map((fila) => fila.animalId)).not.toContain(animalId)

    const activos = await herd.listarActivos(ranchId)
    expect(activos.some((animal) => animal.id === animalId)).toBe(false)
    const salidas = await herd.listarSalidas(ranchId)
    expect(salidas.find((animal) => animal.id === animalId)?.salida?.motivo).toBe('unknown')
    const porArete = await herd.buscarPorMarca(ranchId, 'SALIDA-01')
    expect(porArete.map((animal) => animal.id)).toEqual([animalId])

    await expect(
      growth.registrar({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        id: nuevoId(),
        fecha: '2026-04-10',
        filas: [{ id: nuevoId(), animalId, resultado: 'hueco' }],
      }),
    ).rejects.toMatchObject({ codigo: 'animal_inactivo' })

    const vuelta = await herd.corregirSalida({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId,
      version: baja.version,
      motivo: 'seguía en el potrero',
      cambios: { activo: true },
    })
    expect(vuelta.activo).toBe(true)
    expect(vuelta.salida).toBeNull()
    expect(vuelta.correccionesDeSalida).toEqual([
      expect.objectContaining({
        motivoAnterior: 'unknown',
        fechaAnterior: '2026-04-02',
        motivo: 'seguía en el potrero',
      }),
    ])
    expect(vuelta.nombre).toBe('Seña completa')
    expect(vuelta.marcas).toHaveLength(1)

    const otraVez = await modelos.vistaDeAnimal(ranchId, animalId)
    expect(otraVez?.pesos).toHaveLength(1)
    const activosOtraVez = await herd.listarActivos(ranchId)
    expect(activosOtraVez.some((animal) => animal.id === animalId)).toBe(true)

    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-04-11',
      filas: [
        {
          id: nuevoId(),
          animalId,
          resultado: 'pesado',
          kilos: '190.000',
          calidad: 'measured',
        },
      ],
    })
  })

  it('una versión vieja no cambia la salida y el mismo comando con otro contenido no se repite', async () => {
    const animalId = nuevoId()
    await herd.registrar({ commandId: nuevoId(), ranchId, recordedBy, id: animalId })
    const commandId = nuevoId()
    const baja = await herd.registrarSalida({
      commandId,
      ranchId,
      recordedBy,
      animalId,
      version: 1,
      motivo: 'death',
      fecha: '2026-05-01',
    })
    const repetida = await herd.registrarSalida({
      commandId,
      ranchId,
      recordedBy,
      animalId,
      version: 1,
      motivo: 'death',
      fecha: '2026-05-01',
    })
    expect(repetida).toEqual(baja)

    await expect(
      herd.registrarSalida({
        commandId,
        ranchId,
        recordedBy,
        animalId,
        version: 1,
        motivo: 'sale',
        fecha: '2026-05-01',
      }),
    ).rejects.toBeInstanceOf(ConflictoDeIdempotencia)

    await expect(
      herd.corregirSalida({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        animalId,
        version: 1,
        motivo: 'no debe aplicarse',
        cambios: { activo: true },
      }),
    ).rejects.toBeInstanceOf(ConflictoDeVersion)

    const ficha = await herd.obtener(ranchId, animalId)
    expect(ficha?.activo).toBe(false)
    expect(ficha?.salida?.motivo).toBe('death')
    expect(ficha?.correccionesDeSalida).toEqual([])
  })

  it('una foto que no es del rancho no se guarda como evidencia', async () => {
    const animalId = nuevoId()
    await herd.registrar({ commandId: nuevoId(), ranchId, recordedBy, id: animalId })
    const foto = nuevoId()

    await expect(
      herd.registrarSalida({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        animalId,
        version: 1,
        motivo: 'other',
        fecha: '2026-05-02',
        evidenciaId: foto,
      }),
    ).rejects.toMatchObject({ codigo: 'evidencia_ajena' } satisfies Partial<RechazoDeHerd>)

    const conFoto = crearHerd(db, {
      perteneceAlRancho: async (ranch, id) => ranch === ranchId && id === foto,
    })
    const baja = await conFoto.registrarSalida({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId,
      version: 1,
      motivo: 'other',
      fecha: '2026-05-02',
      nota: 'lo dijo el vaquero',
      evidenciaId: foto,
    })
    expect(baja.salida).toEqual({
      motivo: 'other',
      fecha: '2026-05-02',
      nota: 'lo dijo el vaquero',
      evidenciaId: foto,
    })
  })
})
