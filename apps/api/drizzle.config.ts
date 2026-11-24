import { defineConfig } from 'drizzle-kit'

/**
 * Una sola secuencia de migraciones para el monolito.
 * `npm run db:generate -w @rancho/api` escribe SQL en `drizzle/` para revisarlo.
 * No aplica nada: eso es `db:migrate`.
 */
export default defineConfig({
  // Las tablas de un módulo viven en su persistencia. Drizzle las junta en una
  // sola secuencia con las de infraestructura.
  schema: [
    './src/infrastructure/db/esquema.ts',
    './src/infrastructure/evidence/tablas.ts',
    './src/modules/herd/persistence/tablas.ts',
    './src/modules/growth/persistence/tablas.ts',
  ],
  out: './drizzle',
  dialect: 'postgresql',
})
