import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { crearAlmacenDeIdempotencia } from '../../src/infrastructure/db/almacen-idempotencia'
import { filasDe, type EjecutorSql } from '../../src/infrastructure/db/filas'
import { aplicarMigraciones } from '../../src/infrastructure/db/migrar'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { enTransaccion } from '../../src/infrastructure/db/transaccion'
import { actualizarConVersion } from '../../src/infrastructure/db/version'
import { ConflictoDeIdempotencia } from '../../src/shared-kernel/conflictos'
import { ejecutarComandoIdempotente } from '../../src/shared-kernel/idempotencia'
import { nuevoId } from '../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

let db: Base
let cerrar: () => Promise<void> = async () => {}

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  db = base.db
  cerrar = base.cerrar
  // Tablas que las pruebas crean y tiran. La base es nueva en cada llamada
  // (ADR-014), así que no hace falta limpiar nada de otra corrida; el `IF EXISTS`
  // queda por si un `afterAll` no llegó a correr dentro de esta misma suite.
  await db.execute(sql`DROP TABLE IF EXISTS herd.fila_version`)
  await db.execute(sql`DROP TABLE IF EXISTS herd.marca`)
  await db.execute(sql`DROP TABLE IF EXISTS growth.marca`)
})

afterAll(async () => {
  await cerrar()
})

describe('migración inicial', () => {
  it('crea la ficha en herd, el pesaje en growth, identity.ranch y el recibo de comando', async () => {
    const esquemas = filasDe<{ schema_name: string }>(
      await db.execute(sql`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name IN ('herd', 'growth', 'identity')
      `),
    )
    expect(esquemas.map((fila) => fila.schema_name).sort()).toEqual(['growth', 'herd', 'identity'])

    const tablasHerd = filasDe<{ table_name: string }>(
      await db.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'herd' AND table_type = 'BASE TABLE'
      `),
    )
    const tablasGrowth = filasDe<{ table_name: string }>(
      await db.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'growth' AND table_type = 'BASE TABLE'
      `),
    )
    expect(tablasHerd.map((fila) => fila.table_name).sort()).toEqual([
      'animal',
      'animal_correction',
      'animal_exit_correction',
      'animal_mark',
      'health_event',
      'health_event_correction',
      'location_assignment',
      'paddock',
      'paddock_correction',
      'parentage_correction',
      'parentage_record',
      'pregnancy_check',
      'pregnancy_check_correction',
    ])
    expect(tablasGrowth.map((fila) => fila.table_name).sort()).toEqual([
      'weighing_line',
      'weighing_session',
      'weight_correction',
    ])

    const columnas = filasDe<{ column_name: string; data_type: string }>(
      await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'identity' AND table_name = 'ranch'
      `),
    )
    expect(columnas).toEqual(
      expect.arrayContaining([
        { column_name: 'id', data_type: 'uuid' },
        { column_name: 'nombre', data_type: 'text' },
        { column_name: 'created_at', data_type: 'timestamp with time zone' },
      ]),
    )

    const recibo = filasDe<{ column_name: string }>(
      await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'command_idempotency'
      `),
    )
    expect(recibo.map((fila) => fila.column_name).sort()).toEqual([
      'command_id',
      'created_at',
      'fingerprint',
      'result',
    ])
  })

  it('volver a migrar no falla', async () => {
    await expect(aplicarMigraciones(db)).resolves.toBeUndefined()
  })

  it('siembra un solo rancho con el nombre que le pasan y no inventa otro', async () => {
    // La base es nueva en cada llamada, así que todavía no hay rancho; el
    // `DELETE` deja la prueba a prueba de un cambio en la fábrica.
    await db.execute(sql`DELETE FROM identity.ranch`)

    await expect(sembrarRancho(db, '   ')).rejects.toThrow(/RANCH_NAME/)

    const primero = await sembrarRancho(db, 'Potrero de prueba')
    const segundo = await sembrarRancho(db, 'Otro nombre de prueba')

    expect(primero.creado).toBe(true)
    expect(segundo).toEqual({ creado: false, id: primero.id })

    const filas = filasDe<{ id: string; nombre: string }>(
      await db.execute(sql`SELECT id, nombre FROM identity.ranch`),
    )
    expect(filas).toEqual([{ id: primero.id, nombre: 'Potrero de prueba' }])
  })
})

describe('idempotencia de comandos', () => {
  it('guarda el resultado la primera vez', async () => {
    const almacen = crearAlmacenDeIdempotencia(db)
    const id = nuevoId()
    let llamadas = 0

    const resultado = await ejecutarComandoIdempotente(almacen, id, { kilos: '10.5' }, async () => {
      llamadas += 1
      return { guardado: true, kilos: '10.5' }
    })

    expect(llamadas).toBe(1)
    expect(resultado).toEqual({ guardado: true, kilos: '10.5' })
  })

  it('el mismo id y la misma huella devuelve lo guardado sin volver a ejecutar', async () => {
    const almacen = crearAlmacenDeIdempotencia(db)
    const id = nuevoId()
    let llamadas = 0
    const ejecutar = async () => {
      llamadas += 1
      return { guardado: true }
    }

    await ejecutarComandoIdempotente(almacen, id, { a: 1, b: 'x' }, ejecutar)
    const repetido = await ejecutarComandoIdempotente(almacen, id, { b: 'x', a: 1 }, ejecutar)

    expect(llamadas).toBe(1)
    expect(repetido).toEqual({ guardado: true })
  })

  it('el mismo id con otra huella es idempotency_mismatch y no cambia el resultado', async () => {
    const almacen = crearAlmacenDeIdempotencia(db)
    const id = nuevoId()
    let llamadas = 0

    await ejecutarComandoIdempotente(almacen, id, { kilos: '10.5' }, async () => {
      llamadas += 1
      return { guardado: true, kilos: '10.5' }
    })

    await expect(
      ejecutarComandoIdempotente(almacen, id, { kilos: '99.0' }, async () => {
        llamadas += 1
        return { guardado: true, kilos: '99.0' }
      }),
    ).rejects.toBeInstanceOf(ConflictoDeIdempotencia)

    await expect(
      ejecutarComandoIdempotente(almacen, id, { kilos: '99.0' }, async () => {
        return { guardado: true, kilos: '99.0' }
      }),
    ).rejects.toMatchObject({ codigo: 'idempotency_mismatch' })

    expect(llamadas).toBe(1)

    const otraVez = await ejecutarComandoIdempotente(
      almacen,
      id,
      { kilos: '10.5' },
      async () => {
        llamadas += 1
        return { guardado: false }
      },
    )
    expect(otraVez).toEqual({ guardado: true, kilos: '10.5' })
    expect(llamadas).toBe(1)
  })
})

describe('conflicto de versión', () => {
  beforeAll(async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS herd.fila_version (
        id uuid PRIMARY KEY,
        version integer NOT NULL,
        etiqueta text NOT NULL
      )
    `)
  })

  afterAll(async () => {
    await db.execute(sql`DROP TABLE IF EXISTS herd.fila_version`)
  })

  it('actualiza si la versión coincide y rechaza la vieja sin cambiar la fila', async () => {
    const id = nuevoId()
    await db.execute(sql`
      INSERT INTO herd.fila_version (id, version, etiqueta)
      VALUES (${id}, ${1}, ${'original'})
    `)

    await actualizarConVersion(db, {
      esquema: 'herd',
      tabla: 'fila_version',
      id,
      version: 1,
      cambios: { etiqueta: 'nueva' },
    })

    expect(await leerVersion(id)).toEqual({ version: 2, etiqueta: 'nueva' })

    await expect(
      actualizarConVersion(db, {
        esquema: 'herd',
        tabla: 'fila_version',
        id,
        version: 1,
        cambios: { etiqueta: 'no debe quedar' },
      }),
    ).rejects.toMatchObject({ codigo: 'version_conflict' })

    expect(await leerVersion(id)).toEqual({ version: 2, etiqueta: 'nueva' })
  })
})

describe('transacción entre esquemas', () => {
  beforeAll(async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS herd.marca (
        id uuid PRIMARY KEY,
        nota text NOT NULL
      )
    `)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS growth.marca (
        id uuid PRIMARY KEY,
        nota text NOT NULL
      )
    `)
  })

  afterAll(async () => {
    await db.execute(sql`DROP TABLE IF EXISTS herd.marca`)
    await db.execute(sql`DROP TABLE IF EXISTS growth.marca`)
  })

  it('si el trabajo falla, no queda ninguna fila en herd ni en growth', async () => {
    await db.execute(sql`DELETE FROM herd.marca`)
    await db.execute(sql`DELETE FROM growth.marca`)

    await expect(
      enTransaccion(db, marcas, async (repos) => {
        await repos.herd.insertar(nuevoId(), 'hato')
        await repos.growth.insertar(nuevoId(), 'crecimiento')
        throw new Error('fallo forzado')
      }),
    ).rejects.toThrow('fallo forzado')

    expect(await leerMarcas('herd')).toEqual([])
    expect(await leerMarcas('growth')).toEqual([])
  })

  it('si el trabajo termina, quedan las dos filas', async () => {
    await db.execute(sql`DELETE FROM herd.marca`)
    await db.execute(sql`DELETE FROM growth.marca`)

    const idHerd = nuevoId()
    const idGrowth = nuevoId()
    await enTransaccion(db, marcas, async (repos) => {
      await repos.herd.insertar(idHerd, 'hato')
      await repos.growth.insertar(idGrowth, 'crecimiento')
    })

    expect(await leerMarcas('herd')).toEqual([{ id: idHerd, nota: 'hato' }])
    expect(await leerMarcas('growth')).toEqual([{ id: idGrowth, nota: 'crecimiento' }])
  })
})

type Marca = {
  insertar: (id: string, nota: string) => Promise<void>
}

function marcas(tx: EjecutorSql): { herd: Marca; growth: Marca } {
  const repo = (esquema: 'herd' | 'growth'): Marca => ({
    async insertar(id, nota) {
      await tx.execute(sql`
        INSERT INTO ${sql.identifier(esquema)}.${sql.identifier('marca')} (id, nota)
        VALUES (${id}, ${nota})
      `)
    },
  })
  return { herd: repo('herd'), growth: repo('growth') }
}

async function leerVersion(id: string): Promise<{ version: number; etiqueta: string }> {
  const filas = filasDe<{ version: number | string; etiqueta: string }>(
    await db.execute(sql`
      SELECT version, etiqueta FROM herd.fila_version WHERE id = ${id}
    `),
  )
  const fila = filas[0]
  if (fila === undefined) {
    throw new Error('La fila de versión no está.')
  }
  return { version: Number(fila.version), etiqueta: fila.etiqueta }
}

async function leerMarcas(esquema: 'herd' | 'growth'): Promise<{ id: string; nota: string }[]> {
    return filasDe<{ id: string; nota: string }>(
    await db.execute(sql`
      SELECT id, nota FROM ${sql.identifier(esquema)}.${sql.identifier('marca')} ORDER BY nota
    `),
  )
}
