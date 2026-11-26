import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { crearCapturaDeDestete, escribirDestete } from '../../src/application/destete'
import { filasDe } from '../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearHerd, repositoriosDeHerd, type ClienteDeHerd } from '../../src/modules/herd'
import { repositoriosDeGrowth } from '../../src/modules/growth'
import { recordedBySchema } from '../../src/shared-kernel/actores'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../src/shared-kernel/conflictos'
import { nuevoId, ranchIdSchema, type RanchId } from '../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')

let db: Base
let cerrar: () => Promise<void> = async () => {}
let ranchId: RanchId
let herd: ReturnType<typeof crearHerd>
let captura: ReturnType<typeof crearCapturaDeDestete>

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  db = base.db
  cerrar = base.cerrar
  const sembrado = await sembrarRancho(db, 'Rancho de prueba')
  ranchId = ranchIdSchema.parse(sembrado.id)
  herd = crearHerd(db)
  captura = crearCapturaDeDestete(db)
}, 60_000)

afterAll(async () => {
  await cerrar()
})

describe('destete con peso', () => {
  it('escribe los dos hechos o ninguno, y el mismo comando no duplica', async () => {
    const cria = await animal('Cría con peso')
    const commandId = nuevoId()
    const entrada = {
      commandId,
      ranchId,
      recordedBy,
      precisionFecha: 'exact' as const,
      fecha: '2024-08-01',
      nota: 'se destetó',
      reportedBy: 'el trabajador',
      animales: [
        {
          animalId: cria,
          desteteId: nuevoId(),
          peso: { id: nuevoId(), kilos: '200', calidad: 'measured' },
        },
      ],
    }

    const anotado = await captura.registrar(entrada)
    expect(anotado.destetes).toHaveLength(1)
    expect(anotado.pesos).toHaveLength(1)
    expect(anotado.pesos[0]?.kilos).toBe('200.000')
    expect(await contar('herd.weaning', cria)).toBe(1)
    expect(await contarLineas(cria)).toBe(1)

    const repetido = await captura.registrar(entrada)
    expect(repetido.destetes[0]?.id).toBe(anotado.destetes[0]?.id)
    expect(await contar('herd.weaning', cria)).toBe(1)
    expect(await contarLineas(cria)).toBe(1)
    expect(await contarRecibos(commandId)).toBe(1)

    await expect(
      captura.registrar({ ...entrada, fecha: '2024-09-01' }),
    ).rejects.toBeInstanceOf(ConflictoDeIdempotencia)
    expect(await contar('herd.weaning', cria)).toBe(1)

    const activos = (await herd.listarActivos(ranchId)).map((ficha) => ficha.id)
    const salidas = (await herd.listarSalidas(ranchId)).map((ficha) => ficha.id)
    expect(activos).toContain(cria)
    expect(salidas).not.toContain(cria)
  })

  it('reusar el comando sin fecha del peso es conflicto de idempotencia, no peso sin fecha', async () => {
    const cria = await animal('Cría del reintento')
    const commandId = nuevoId()
    const entrada = {
      commandId,
      ranchId,
      recordedBy,
      precisionFecha: 'exact' as const,
      fecha: '2024-08-01',
      animales: [
        {
          animalId: cria,
          desteteId: nuevoId(),
          peso: { id: nuevoId(), kilos: '200.000', calidad: 'measured' },
        },
      ],
    }

    await captura.registrar(entrada)

    await expect(
      captura.registrar({
        ...entrada,
        precisionFecha: 'no_se',
        fecha: null,
      }),
    ).rejects.toBeInstanceOf(ConflictoDeIdempotencia)
    expect(await contar('herd.weaning', cria)).toBe(1)
  })

  it('si el peso falla después del destete, no queda ninguno de los dos ni el recibo', async () => {
    const cria = await animal('Cría del fallo')
    const commandId = nuevoId()
    const entrada = {
      commandId,
      ranchId,
      recordedBy,
      precisionFecha: 'exact' as const,
      fecha: '2024-08-01',
      animales: [
        {
          animalId: cria,
          desteteId: nuevoId(),
          peso: { id: nuevoId(), kilos: '180.000', calidad: 'declared' },
        },
      ],
    }

    const cliente = db as ClienteDeHerd
    await expect(
      cliente.transaction(async (tx) => {
        const reposHerd = repositoriosDeHerd(tx, null)
        const growth = repositoriosDeGrowth(tx)
        return escribirDestete(
          {
            animales: reposHerd.animales,
            destete: reposHerd.destete,
            sesiones: {
              ...growth.sesiones,
              insertar: async () => {
                throw new Error('el peso no se pudo guardar')
              },
            },
            idempotencia: reposHerd.idempotencia,
          },
          entrada,
        )
      }),
    ).rejects.toThrow('el peso no se pudo guardar')

    expect(await contar('herd.weaning', cria)).toBe(0)
    expect(await contarLineas(cria)).toBe(0)
    expect(await contarRecibos(commandId)).toBe(0)
    expect((await herd.listarActivos(ranchId)).map((ficha) => ficha.id)).toContain(cria)
  })

  it('un segundo destete de la misma cría no se escribe encima', async () => {
    const cria = await animal('Cría ya destetada')
    await captura.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      precisionFecha: 'no_se',
      fecha: null,
      animales: [{ animalId: cria, desteteId: nuevoId() }],
    })

    await expect(
      captura.registrar({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        precisionFecha: 'exact',
        fecha: '2024-08-01',
        animales: [{ animalId: cria, desteteId: nuevoId() }],
      }),
    ).rejects.toMatchObject({ codigo: 'destete_ya_existe' })
    expect(await contar('herd.weaning', cria)).toBe(1)
  })

  it('corregir el día deja el valor anterior y no borra el peso', async () => {
    const cria = await animal('Cría a corregir')
    const pesoId = nuevoId()
    const anotado = await captura.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      precisionFecha: 'exact',
      fecha: '2024-08-01',
      animales: [
        {
          animalId: cria,
          desteteId: nuevoId(),
          peso: { id: pesoId, kilos: '150.5', calidad: 'observed' },
        },
      ],
    })
    const desteteId = anotado.destetes[0]?.id
    expect(desteteId).toBeDefined()

    const corregido = await herd.corregirDestete({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      desteteId: desteteId ?? '',
      version: 1,
      motivo: 'el día era otro',
      cambios: { cuando: { precision: 'exact', fecha: '2024-08-20' } },
    })

    expect(corregido.fecha).toBe('2024-08-20')
    expect(corregido.version).toBe(2)
    expect(corregido.correcciones.map((fila) => fila.campo)).toContain('fecha')
    expect(await contarLineas(cria)).toBe(1)
    expect(await contar('herd.weaning', cria)).toBe(1)

    await expect(
      herd.corregirDestete({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        desteteId: desteteId ?? '',
        version: 1,
        motivo: 'tarde',
        cambios: { cuando: { precision: 'exact', fecha: '2024-08-21' } },
      }),
    ).rejects.toBeInstanceOf(ConflictoDeVersion)
    expect(await contar('herd.weaning', cria)).toBe(1)
  })
})

describe('destete sin peso', () => {
  it('no inventa un peso cuando el grupo solo trae el día', async () => {
    const una = await animal('Cría uno')
    const otra = await animal('Cría dos')
    const anotado = await captura.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      precisionFecha: 'approximate',
      fecha: '2024-09-01',
      animales: [
        { animalId: una, desteteId: nuevoId() },
        { animalId: otra, desteteId: nuevoId() },
      ],
    })

    expect(anotado.pesos).toEqual([])
    expect(await contar('herd.weaning', una)).toBe(1)
    expect(await contar('herd.weaning', otra)).toBe(1)
    expect(await contarLineas(una)).toBe(0)
    expect(await contarLineas(otra)).toBe(0)
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

async function contar(tabla: 'herd.weaning', animalId: string): Promise<number> {
  const filas = filasDe<{ n: unknown }>(
    await db.execute(sql`
      SELECT count(*)::int AS n
      FROM ${sql.raw(tabla)}
      WHERE animal_id = ${animalId}
    `),
  )
  return numero(filas[0]?.n)
}

async function contarLineas(animalId: string): Promise<number> {
  const filas = filasDe<{ n: unknown }>(
    await db.execute(sql`
      SELECT count(*)::int AS n
      FROM growth.weighing_line
      WHERE animal_id = ${animalId}
    `),
  )
  return numero(filas[0]?.n)
}

async function contarRecibos(commandId: string): Promise<number> {
  const filas = filasDe<{ n: unknown }>(
    await db.execute(sql`
      SELECT count(*)::int AS n
      FROM command_idempotency
      WHERE command_id = ${commandId}
    `),
  )
  return numero(filas[0]?.n)
}

function numero(valor: unknown): number {
  return typeof valor === 'number' ? valor : Number(valor)
}
