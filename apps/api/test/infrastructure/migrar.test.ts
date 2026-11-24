import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { aplicarMigraciones, carpetaDeMigraciones, type BaseMigrable } from '../../src/infrastructure/db/migrar'
import { filasDe } from '../../src/infrastructure/db/filas'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

/**
 * Corre en su propia PGlite: aquí lo que se prueba es la secuencia completa de
 * migraciones desde cero, y no conviene que compita con otras suites que
 * migran la base compartida de CI al mismo tiempo. El camino de node-postgres
 * lo ejercitan las demás suites de persistencia cuando hay `TEST_DATABASE_URL`.
 */
type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

let db: Base
let cerrar: () => Promise<void> = async () => {}

beforeAll(async () => {
  const base = await abrirBaseDePruebas({ aislada: true })
  db = base.db
  cerrar = base.cerrar
}, 60_000)

afterAll(async () => {
  await cerrar()
})

describe('aplicarMigraciones', () => {
  it('lee el SQL de la misma carpeta que el comando db:migrate', () => {
    expect(carpetaDeMigraciones()).toMatch(/drizzle$/)
  })

  it('acepta el cliente de PGlite de las pruebas y volver a migrar no falla', async () => {
    await expect(aplicarMigraciones(db)).resolves.toBeUndefined()
  })

  it('deja aplicada la secuencia completa, no solo la primera migración', async () => {
    const diario = filasDe<{ hash: string }>(
      await db.execute(sql`SELECT hash FROM drizzle.__drizzle_migrations`),
    )

    // Una fila por migración del diario. Si `migrar.ts` aplicara solo la
    // primera, `herd.animal` no existiría.
    expect(diario.length).toBeGreaterThanOrEqual(4)
  })

  it('no se puede llamar con un objeto cualquiera: el tipo es estrecho', () => {
    // El compilador es la prueba: si `aplicarMigraciones` volviera a aceptar
    // `db: object`, este `@ts-expect-error` quedaría sin uso y `tsc` fallaría.
    // La función no se ejecuta; la llamada solo tiene que no compilar.
    const llamar = (valor: object): Promise<void> => {
      // @ts-expect-error un objeto cualquiera no es un cliente de Drizzle
      return aplicarMigraciones(valor)
    }

    expect(typeof llamar).toBe('function')
    const acepta: BaseMigrable = db
    expect(acepta).toBe(db)
  })
})
