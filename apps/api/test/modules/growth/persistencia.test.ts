import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { filasDe } from '../../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../../src/infrastructure/db/semilla'
import { crearGrowth } from '../../../src/modules/growth'
import { registrarSesion } from '../../../src/modules/growth/domain/sesion'
import { RechazoDeGrowth } from '../../../src/modules/growth/domain/errores'
import { crearRepositorioDePesajes } from '../../../src/modules/growth/persistence/repositorio'
import { crearHerd } from '../../../src/modules/herd'
import { recordedBySchema } from '../../../src/shared-kernel/actores'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../../src/shared-kernel/conflictos'
import { animalIdSchema, nuevoId, ranchIdSchema, type RanchId } from '../../../src/shared-kernel/ids'
import { parsearKilosAGramos } from '../../../src/shared-kernel/kilos'
import { abrirBaseDePruebas } from '../../db/base-de-pruebas'

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')

let db: Base
let cerrar: () => Promise<void> = async () => {}
let ranchId: RanchId
let growth: ReturnType<typeof crearGrowth>
let herd: ReturnType<typeof crearHerd>

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  db = base.db
  cerrar = base.cerrar
  const sembrado = await sembrarRancho(db, 'Rancho de prueba')
  ranchId = ranchIdSchema.parse(sembrado.id)
  herd = crearHerd(db)
  growth = crearGrowth(db, herd)
}, 60_000)

afterAll(async () => {
  await cerrar()
})

async function animalActivo(): Promise<string> {
  const id = nuevoId()
  await herd.registrar({ commandId: nuevoId(), ranchId, recordedBy, id })
  return id
}

describe('sesión', () => {
  it('guarda las N filas completas, y si una falla no queda nada', async () => {
    const primero = await animalActivo()
    const segundo = await animalActivo()
    const tercero = await animalActivo()
    const sesionId = nuevoId()
    const guardada = await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: sesionId,
      fecha: '2026-03-15',
      filas: [
        {
          id: nuevoId(),
          animalId: primero,
          resultado: 'pesado',
          kilos: '351.125',
          calidad: 'measured',
        },
        { id: nuevoId(), animalId: segundo, resultado: 'hueco' },
        {
          id: nuevoId(),
          animalId: tercero,
          resultado: 'pesado',
          kilos: '180.5',
          calidad: 'declared',
        },
      ],
    })

    expect(guardada.filas).toHaveLength(3)
    const filas = filasDe<{ id: string }>(
      await db.execute(sql`SELECT id FROM growth.weighing_line WHERE session_id = ${sesionId}`),
    )
    expect(filas).toHaveLength(3)

    const rota = nuevoId()
    const animalBueno = await animalActivo()
    const sesionRota = registrarSesion({
      id: rota,
      ranchId,
      fecha: '2026-03-16',
      recordedBy,
      recordedAt: new Date('2026-03-16T18:00:00.000Z'),
      commandId: nuevoId(),
      filas: [
        {
          id: nuevoId(),
          animalId: animalIdSchema.parse(animalBueno),
          resultado: 'pesado',
          kilos: parsearKilosAGramos('200.000'),
          calidad: 'observed',
        },
        {
          id: nuevoId(),
          animalId: animalIdSchema.parse(nuevoId()),
          resultado: 'hueco',
        },
      ],
    })

    await expect(
      db.transaction(async (tx) => {
        await crearRepositorioDePesajes(tx).insertar(sesionRota)
      }),
    ).rejects.toBeInstanceOf(RechazoDeGrowth)

    const quedan = filasDe(
      await db.execute(sql`SELECT id FROM growth.weighing_session WHERE id = ${rota}`),
    )
    const lineas = filasDe(
      await db.execute(sql`SELECT id FROM growth.weighing_line WHERE session_id = ${rota}`),
    )
    expect(quedan).toEqual([])
    expect(lineas).toEqual([])
  })

  it('reintenta el mismo comando y rechaza el mismo id con otro contenido', async () => {
    const animalId = await animalActivo()
    const commandId = nuevoId()
    const entrada = {
      commandId,
      ranchId,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-04-01',
      filas: [
        {
          id: nuevoId(),
          animalId,
          resultado: 'pesado' as const,
          kilos: '351.125',
          calidad: 'measured' as const,
        },
      ],
    }
    const fila = entrada.filas[0]
    if (fila === undefined) {
      throw new Error('Falta la fila del comando.')
    }
    const primera = await growth.registrar(entrada)
    const repetida = await growth.registrar(entrada)
    expect(repetida).toEqual(primera)
    expect(primera.filas[0]).toMatchObject({ kilos: '351.125', calidad: 'measured' })

    await expect(
      growth.registrar({
        ...entrada,
        filas: [
          {
            id: fila.id,
            animalId,
            resultado: 'pesado',
            kilos: '100.000',
            calidad: 'measured',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictoDeIdempotencia)

    const sesiones = filasDe(
      await db.execute(sql`SELECT id FROM growth.weighing_session WHERE id = ${entrada.id}`),
    )
    expect(sesiones).toHaveLength(1)
  })

  it('guarda «351.125» y lo lee idéntico', async () => {
    const animalId = await animalActivo()
    const filaId = nuevoId()
    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-04-02',
      filas: [{ id: filaId, animalId, resultado: 'pesado', kilos: '351.125', calidad: 'observed' }],
    })

    const filas = filasDe<{ kilos: string }>(
      await db.execute(sql`SELECT kilos::text as kilos FROM growth.weighing_line WHERE id = ${filaId}`),
    )
    expect(filas).toEqual([{ kilos: '351.125' }])

    const leida = await growth.pesosDe(ranchId, animalId)
    expect(leida.pesos.map((peso) => peso.kilos)).toContain('351.125')
  })

  it('la corrección guarda la historia, no mueve la fecha y una versión vieja no cambia nada', async () => {
    const animalId = await animalActivo()
    const sesionId = nuevoId()
    const pesoId = nuevoId()
    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: sesionId,
      fecha: '2026-04-03',
      nota: 'manga de la mañana',
      filas: [{ id: pesoId, animalId, resultado: 'pesado', kilos: '351.125', calidad: 'measured' }],
    })

    const corregido = await growth.corregir({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      pesoId,
      version: 1,
      motivo: 'leí de más',
      kilos: '350.000',
    })
    expect(corregido.version).toBe(2)
    expect(corregido.kilos).toBe('350.000')
    expect(corregido.fecha).toBe('2026-04-03')
    expect(corregido.correcciones).toEqual([
      expect.objectContaining({
        campo: 'kilos',
        valorAnterior: '351.125',
        motivo: 'leí de más',
        correctedBy: recordedBy,
      }),
    ])

    await expect(
      growth.corregir({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        pesoId,
        version: 1,
        motivo: 'no debe aplicarse',
        kilos: '10.000',
      }),
    ).rejects.toBeInstanceOf(ConflictoDeVersion)

    const pesos = filasDe<{ kilos: string }>(
      await db.execute(sql`SELECT kilos::text as kilos FROM growth.weighing_line WHERE id = ${pesoId}`),
    )
    const fechas = filasDe<{ fecha: string }>(
      await db.execute(
        sql`SELECT weighed_on::text as fecha FROM growth.weighing_session WHERE id = ${sesionId}`,
      ),
    )
    const historia = filasDe<{ field: string; previous_value: string }>(
      await db.execute(
        sql`SELECT field, previous_value FROM growth.weight_correction WHERE line_id = ${pesoId}`,
      ),
    )
    expect(pesos).toEqual([{ kilos: '350.000' }])
    expect(fechas).toEqual([{ fecha: '2026-04-03' }])
    expect(historia).toEqual([{ field: 'kilos', previous_value: '351.125' }])
  })

  it('un hueco no da de baja al animal y la última sesión es la de fecha más reciente', async () => {
    const animalId = await animalActivo()
    const antes = await herd.obtener(ranchId, animalId)
    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-01-01',
      filas: [{ id: nuevoId(), animalId, resultado: 'hueco' }],
    })
    const despues = await herd.obtener(ranchId, animalId)
    expect(despues?.activo).toBe(true)
    expect(despues?.version).toBe(antes?.version)

    const recienteId = nuevoId()
    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: recienteId,
      fecha: '2026-12-01',
      filas: [],
    })
    const ultima = await growth.ultima(ranchId)
    expect(ultima?.id).toBe(recienteId)
    expect(ultima?.fecha).toBe('2026-12-01')
  })
})

describe('frontera con Herd', () => {
  it('solo la fila apunta a herd.animal, con ON DELETE RESTRICT', async () => {
    const cruces = filasDe<{ desde: string; hacia_esquema: string; hacia: string; borrado: string }>(
      await db.execute(sql`
        SELECT c.relname AS desde, fn.nspname AS hacia_esquema, fc.relname AS hacia, con.confdeltype AS borrado
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_class fc ON fc.oid = con.confrelid
        JOIN pg_namespace fn ON fn.oid = fc.relnamespace
        WHERE con.contype = 'f' AND n.nspname <> fn.nspname
      `),
    )
    expect(cruces).toEqual([{ desde: 'weighing_line', hacia_esquema: 'herd', hacia: 'animal', borrado: 'r' }])

    const animalId = await animalActivo()
    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-05-01',
      filas: [{ id: nuevoId(), animalId, resultado: 'hueco' }],
    })
    await expect(
      db.execute(sql`DELETE FROM herd.animal WHERE id = ${animalId}`),
    ).rejects.toThrow()
    const sigue = filasDe(await db.execute(sql`SELECT id FROM herd.animal WHERE id = ${animalId}`))
    expect(sigue).toHaveLength(1)
  })

  it('no pesa a un animal inactivo ni a uno de otro rancho', async () => {
    const inactivo = await animalActivo()
    await db.execute(sql`UPDATE herd.animal SET active = false WHERE id = ${inactivo}`)
    const sesionInactiva = nuevoId()
    await expect(
      growth.registrar({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        id: sesionInactiva,
        fecha: '2026-05-02',
        filas: [{ id: nuevoId(), animalId: inactivo, resultado: 'hueco' }],
      }),
    ).rejects.toMatchObject({ codigo: 'animal_inactivo' })

    const otro = nuevoId()
    await db.execute(sql`
      INSERT INTO herd.animal (
        id, ranch_id, sex, category, tenure, economic_participation, active, version,
        recorded_by, recorded_at
      ) VALUES (
        ${otro}, ${nuevoId()}, 'female', 'cow', 'unknown', 'unknown', true, 1,
        ${recordedBy}, ${new Date()}
      )
    `)
    await expect(
      growth.registrar({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        id: nuevoId(),
        fecha: '2026-05-03',
        filas: [{ id: nuevoId(), animalId: otro, resultado: 'hueco' }],
      }),
    ).rejects.toMatchObject({ codigo: 'animal_ausente' })

    const sesiones = filasDe(
      await db.execute(sql`SELECT id FROM growth.weighing_session WHERE id = ${sesionInactiva}`),
    )
    expect(sesiones).toEqual([])
  })

  it('el peso es numeric(12,3) y no hay columna de ganancia', async () => {
    const columnas = filasDe<{ column_name: string; data_type: string; numeric_precision: number | null; numeric_scale: number | null }>(
      await db.execute(sql`
        SELECT column_name, data_type, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'growth' AND table_name = 'weighing_line'
      `),
    )
    const kilos = columnas.find((columna) => columna.column_name === 'kilos')
    expect(kilos).toMatchObject({ data_type: 'numeric', numeric_precision: 12, numeric_scale: 3 })
    const nombres = columnas.map((columna) => columna.column_name)
    expect(nombres).not.toEqual(expect.arrayContaining(['gain', 'ganancia', 'interval', 'last_observation']))
  })
})
