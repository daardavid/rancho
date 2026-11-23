/**
 * Construye la API a un solo archivo ESM en `dist/main.js`.
 *
 * Por qué empaquetar y no solo `tsc`: en producción se arranca con
 * `node dist/main.js`, sin `tsx`, sin cargador de TypeScript y sin resolver
 * `@rancho/api-contracts` desde el código fuente. Un `tsc` a solas deja imports
 * a `.ts` que Node no sabe abrir y obliga a copiar el árbol de `packages/`. El
 * empaquetado deja un archivo que corre con el Node del `engines` del repo.
 *
 * Solo se empaqueta el proceso HTTP. Los comandos de base (`db:migrate`,
 * `db:seed`, `cuenta:crear`) se quedan con `tsx`, que es como los documenta
 * [correr-local.md](../../../docs/development/correr-local.md): son pasos
 * explícitos de una laptop o de un despliegue, no el proceso que atiende al
 * rancho. Además `db:migrate` busca la carpeta `drizzle/` junto a su propio
 * archivo, y empaquetarlo movería esa ruta.
 *
 * Lo nativo se queda afuera: `@node-rs/argon2` es un binario por plataforma y
 * empaquetarlo rompería el `.node` al cargarlo. Los opcionales de `pg` también
 * quedan fuera para no arrastrar módulos que no se usan.
 */
import { build } from 'esbuild'

/**
 * `require` de verdad dentro de un archivo ESM.
 *
 * Fastify y sus dependencias llaman `require()` de `node:events`, de
 * `node:util` y de otros módulos internos. Empaquetados a ESM eso se convierte
 * en un `require` que no existe, y el proceso muere al cargar el archivo con
 * «Dynamic require of "node:events" is not supported». El banner devuelve el
 * `require` que los módulos de Node esperan.
 */
const BANNER = [
  "import { createRequire as __crearRequire } from 'node:module'",
  'const require = __crearRequire(import.meta.url)',
].join('\n')

await build({
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  logLevel: 'warning',
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.js',
  banner: { js: BANNER },
  external: ['@node-rs/argon2', 'pg-native', 'bufferutil', 'utf-8-validate'],
})
