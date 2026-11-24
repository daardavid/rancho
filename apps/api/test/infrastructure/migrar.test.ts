import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  aplicarMigraciones,
  carpetaDeMigraciones,
  motorDe,
  type BaseMigrable,
} from '../../src/infrastructure/db/migrar'
import { filasDe } from '../../src/infrastructure/db/filas'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

/**
 * Aquí lo que se prueba es la secuencia completa de migraciones desde cero.
 * La fábrica abre una base nueva por llamada (ADR-014), así que no compite con
 * otras suites que migran la suya al mismo tiempo.
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

describe('aplicarMigraciones', () => {
  it('lee el SQL de la misma carpeta que el comando db:migrate', () => {
    expect(carpetaDeMigraciones()).toMatch(/drizzle$/)
  })

  it('acepta el cliente de la fábrica y volver a migrar no falla', async () => {
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

  it('reconoce el driver de verdad, no lo adivina', async () => {
    // Con `TEST_DATABASE_URL` esta base es node-postgres; sin ella, PGlite.
    // Lo que importa es que lo diga el motor de Drizzle y no una bandera.
    const url = process.env['TEST_DATABASE_URL']
    const hayServidor = url !== undefined && url.trim() !== ''
    expect(motorDe(db)).toBe(hayServidor ? 'postgres' : 'pglite')

    // Un objeto con la forma de un cliente de Drizzle, pero sin serlo, se
    // rechaza con un mensaje que dice qué se esperaba.
    const impostor = { execute: async () => undefined } as unknown as BaseMigrable
    expect(() => motorDe(impostor)).toThrow(/node-postgres.*pglite/)
  })
})
