import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { filasDe } from '../../src/infrastructure/db/filas'
import { restablecerEsquemas } from '../../src/infrastructure/db/reset'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

/**
 * `db:reset` tira esquemas con `DROP SCHEMA ... CASCADE`.
 *
 * Por eso esta suite comprueba que el `DROP` se queda en su propia base: la
 * fábrica abre una base nueva por llamada (ADR-014), así que el `DROP` de una
 * suite no puede borrarle las tablas a otra que corre a la vez.
 */
type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

let db: Base
let cerrar: () => Promise<void> = async () => {}

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  db = base.db
  cerrar = base.cerrar
}, 60_000)

afterAll(async () => {
  await cerrar()
})

describe('db:reset', () => {
  it('tira los esquemas de su propia base y no toca la base de otra suite', async () => {
    // Cada llamada abre una base nueva. Si `db:reset` corriera contra la base
    // de otra suite, este `DROP SCHEMA ... CASCADE` le borraría las tablas que
    // esa suite está usando.
    const ajena = await abrirBaseDePruebas()
    try {
      await restablecerEsquemas(ajena.db)

      const propias = filasDe<{ schema_name: string }>(
        await ajena.db.execute(sql`
          SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'herd'
        `),
      )
      expect(propias).toEqual([{ schema_name: 'herd' }])

      const deEsta = filasDe<{ table_name: string }>(
        await db.execute(sql`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'herd' AND table_name = 'animal'
        `),
      )
      expect(deEsta).toEqual([{ table_name: 'animal' }])
    } finally {
      await ajena.cerrar()
    }
  })

  it('borra lo sembrado y deja los esquemas otra vez, listos para migrar', async () => {
    await sembrarRancho(db, 'Potrero de prueba')
    await restablecerEsquemas(db)

    const ranchos = filasDe(await db.execute(sql`SELECT id FROM identity.ranch`))
    expect(ranchos).toEqual([])

    const esquemas = filasDe<{ schema_name: string }>(
      await db.execute(sql`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name IN ('herd', 'growth', 'identity')
      `),
    )
    expect(esquemas.map((fila) => fila.schema_name).sort()).toEqual(['growth', 'herd', 'identity'])
  })

  it('también borra el recibo de comandos, que vive en `public`', async () => {
    await db.execute(sql`
      INSERT INTO command_idempotency (command_id, fingerprint, result, created_at)
      VALUES (
        '11111111-1111-4111-8111-111111111111',
        'huella-de-prueba',
        '{"guardado":true}',
        ${new Date()}
      )
    `)
    await restablecerEsquemas(db)

    const recibos = filasDe(await db.execute(sql`SELECT command_id FROM command_idempotency`))
    expect(recibos).toEqual([])
  })
})
