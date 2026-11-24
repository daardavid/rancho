# ADR-015: Single-user local mode runs on embedded PostgreSQL

## Status

Proposed

Proposed with INC-002. Accepted when David merges it into `main`. It does not change [ADR-007](ADR-007-postgresql.md): production stays one managed PostgreSQL database. It adds a local path beside the Docker Compose option in [technology-stack.md](../technology-stack.md).

## Context

INC-001 starts only when a PostgreSQL server is installed or Docker is running. On 2026-11-23 David decided to keep the app local and free for now, and to migrate later. He needs to run it on his laptop and open it from his phone on the same Wi-Fi, with Node installed and nothing else.

The persistence tests already run on PGlite, the PostgreSQL engine compiled to WebAssembly ([ADR-014](ADR-014-local-test-database.md)). That engine supports the schemas, `numeric`, `timestamptz`, checks, foreign keys, and transactions this application uses. Drizzle has a PGlite driver, and `@electric-sql/pglite-socket` speaks the PostgreSQL wire protocol.

[ADR-007](ADR-007-postgresql.md) says the application does not migrate on startup. [ADR-010](ADR-010-authentication.md) says the session cookie is `Secure` in production. On the home network the app is plain HTTP ([INC-002](../../product/increments/INC-002-todo-en-local.md), accepted UX debt). A `Secure` cookie is not stored by a phone that opened `http://192.168.x.x`.

## Decision

- `npm run local` is the single-user local mode. It runs the same built application on embedded PostgreSQL (PGlite) with the data files in `.datos/`, which git ignores.
- The embedded engine is exposed on `127.0.0.1` through `@electric-sql/pglite-socket`. The application keeps using `pg` and `DATABASE_URL`. There is no local-only SQL and no second migration stream. The same `aplicarMigraciones`, `sembrarRancho`, and `crearCuenta` functions run.
- The HTTP process still does not migrate, seed, or create accounts when it starts. `npm run local` does those steps explicitly, then listens. Running it again applies only pending migrations, does not create a second ranch, does not create a second account, does not rotate `SESSION_SECRET`, and does not delete data.
- The pool for this mode is one connection (`DB_POOL=1`). The embedded engine runs one query at a time and multiplexes connections onto that session; a larger pool interleaves parameters. The socket allows more than one connection so the single pool connection is not reset.
- The app listens on the local network and prints the addresses to open it from a phone. The database socket stays on `127.0.0.1`.
- `MODO=local` means HTTP on the home network. The session cookie does not carry `Secure`, and the process says so on startup. `NODE_ENV=production` always sets `Secure`. If both are set, the process refuses to start. There is no production exception.
- The first account this command creates, when none exists, has the role `support`. That is the account INC-002 gives David. An `owner` account is still created with `cuenta:crear` when the owner will use the app.
- Production and any deployment that sets `NODE_ENV=production` stay on managed PostgreSQL, as ADR-007 decided. This ADR does not choose a host.

## Why the socket, not an in-process driver in the application

An in-process PGlite driver would make the HTTP process import a second database driver and branch on the mode. The socket keeps that process on the driver it already ships. The tests and the local command are the only code that opens PGlite.

## Consequences

- A laptop with Node can run the app without PostgreSQL and without Docker.
- A behavior that differs between PGlite and server PostgreSQL can pass locally and fail in CI. CI remains the authority, as ADR-014 says.
- The data directory is one process at a time. A second `npm run local` while the first is running fails to open it.
- Plain HTTP on the home network is the accepted UX debt of INC-002. Hosting, when it exists, is HTTPS and `Secure`.
- `.datos/` is not a backup. `npm run respaldo` writes a pg_dump SQL file in `respaldos/` (also gitignored). That file replaces the local data and loads into server PostgreSQL with `psql`. `npm run restaurar` asks for a written confirmation and backs up the current data first. Neither command runs when `NODE_ENV=production`.

## Revisit when

- The app moves to a managed PostgreSQL and this local mode is no longer how David runs it.
- More than one local process must share the data directory.
- A phone on the home network needs HTTPS before hosting exists.

## Status of this document

- Version: 0.1
- Status: Proposed with INC-002
- Last updated: 2026-11-23
- Source: INC-002, ADR-007, ADR-010, ADR-014, R-13
- Validation: Decision plus the local-start tests. No production database is created
