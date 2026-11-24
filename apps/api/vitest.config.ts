import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    /**
     * Arrancar PGlite y aplicar las migraciones dentro de un `beforeAll` tarda
     * más que los 10 s por omisión cuando `npm test` corre los tres workspaces a
     * la vez en una máquina cargada. El presupuesto no es la prueba: las
     * pruebas de persistencia siguen corriendo contra una base real y no se
     * saltan ([ADR-014](../../../docs/architecture/adr/ADR-014-local-test-database.md)).
     * Con `TEST_DATABASE_URL` el arranque es más rápido y este margen no estorba.
     */
    hookTimeout: 60_000,
  },
})
