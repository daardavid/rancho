import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { filasDe } from '../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

/**
 * Las suites de la API corren en paralelo, así que cada llamada tiene que dejar
 * una base propia ([ADR-014](../../../../docs/architecture/adr/ADR-014-local-test-database.md)).
 *
 * En CI la fábrica crea una base `rancho_test_…` por llamada y la borra al
 * cerrar; sin `TEST_DATABASE_URL` arranca una PGlite nueva. En los dos casos la
 * propiedad es la misma y es la que estas pruebas vigilan: lo que siembra una
 * suite no lo ve otra.
 */
describe('cada llamada abre su propia base', () => {
  it(
    'lo que se siembra en una base no aparece en otra',
    async () => {
      const una = await abrirBaseDePruebas()
      const otra = await abrirBaseDePruebas()
      try {
        await sembrarRancho(una.db, 'Rancho de la primera')

        // La segunda no ve el rancho: no comparten datos.
        expect(await ranchos(otra.db)).toEqual([])

        // Y su propia semilla es independiente.
        await sembrarRancho(otra.db, 'Rancho de la segunda')
        expect(await ranchos(una.db)).toEqual(['Rancho de la primera'])
        expect(await ranchos(otra.db)).toEqual(['Rancho de la segunda'])
      } finally {
        await una.cerrar()
        await otra.cerrar()
      }
    },
    120_000,
  )

  it(
    'con TEST_DATABASE_URL la base es `rancho_test_` + id y no la de administración',
    async () => {
      const url = process.env['TEST_DATABASE_URL']
      const hayServidor = url !== undefined && url.trim() !== ''
      const base = await abrirBaseDePruebas()
      try {
        const actual = filasDe<{ base: string }>(await base.db.execute(sql`SELECT current_database() AS base`))
          .at(0)?.base
        if (!hayServidor) {
          // Sin servidor la base es PGlite, que se llama `template1` por dentro.
          expect(actual).toBeDefined()
          return
        }

        expect(actual).toMatch(/^rancho_test_[0-9a-f]{16}$/)
        // La base de administración queda intacta: no se siembra ahí.
        expect(actual).not.toBe(new URL(url.trim()).pathname.replace(/^\//, ''))
      } finally {
        await base.cerrar()
      }
    },
    120_000,
  )
})

async function ranchos(db: Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']): Promise<string[]> {
  return filasDe<{ nombre: string }>(
    await db.execute(sql`SELECT nombre FROM identity.ranch ORDER BY nombre`),
  ).map((fila) => fila.nombre)
}
