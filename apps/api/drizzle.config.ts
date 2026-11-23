import { defineConfig } from 'drizzle-kit'

/**
 * Una sola secuencia de migraciones para el monolito.
 * `npm run db:generate -w @rancho/api` escribe SQL en `drizzle/` para revisarlo.
 * No aplica nada: eso es `db:migrate`.
 */
export default defineConfig({
  schema: './src/infrastructure/db/esquema.ts',
  out: './drizzle',
  dialect: 'postgresql',
})
