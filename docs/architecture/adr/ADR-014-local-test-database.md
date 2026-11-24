# ADR-014: Persistence tests run on embedded PostgreSQL locally and on a PostgreSQL service in CI

## Status

Proposed

Proposed with INC-001. Accepted when David merges it into `main`. It refines [testing-strategy.md](../testing-strategy.md) and the "Local development" row of [technology-stack.md](../technology-stack.md). It does not change ADR-007: production and development data still live in PostgreSQL.

## Context

The testing strategy requires persistence tests against PostgreSQL, failing rather than skipping when the database is down, with Docker Compose providing the local database.

INC-001 is built by the repository factory (`fabrica/`), which runs the test suite on David's Windows laptop after every coding cycle, often unattended at night. Requiring Docker Desktop to be running for every cycle adds a failure mode that has nothing to do with the code: a stopped Docker daemon turns every cycle red and wastes the factory's cycle budget.

PGlite is the PostgreSQL engine compiled to WebAssembly. It runs in-process in Node, with no daemon, and it supports schemas, `numeric`, `timestamptz`, check constraints, foreign keys, and transactions. Drizzle has a PGlite driver.

When CI first ran the whole API suite against the service container, every file shared one database and Vitest ran the files in parallel. Two files created the `growth` schema at the same time, an ear-tag search found animals from another file, the `propietario` account already existed, and the ranch could not be deleted because another file had attached an account to it. Six tests failed for reasons that had nothing to do with the code under test. A single shared database makes the suite order-dependent by construction.

## Decision

- Persistence and API tests use a single test-database factory. If `TEST_DATABASE_URL` is set, the factory treats that URL as an administrative connection and gives every call its own fresh database on that server (`rancho_test_` plus a random id), applies the migrations to it, and drops it with `DROP DATABASE ... WITH (FORCE)` when the test closes it. If the variable is not set, the factory starts an in-process PGlite database.
- Each test file therefore runs against its own database, even when Vitest runs the files in parallel. In CI every test file uses its own database; no two files share one.
- Migrations are applied to the test database through the same explicit migration code used for real databases, before the persistence tests.
- GitHub Actions sets `TEST_DATABASE_URL` to a PostgreSQL service container, so CI always runs against the server engine. The `rancho_test` database in that service is only the administrative connection: no test writes to it, and no `rancho_test_…` database survives a run.
- The administrative connection needs the right to `CREATE DATABASE`. If it does not have it, or the server is unreachable, the test fails with a message that names the database it could not create. It never skips.
- A persistence test never skips. If neither database can be started, it fails.
- Docker Compose for a local PostgreSQL stays available for development data. It is not required to run the tests.
- Application code does not know which engine it is talking to beyond the Drizzle driver chosen by the factory. No test-only SQL branches.

## Consequences

- The factory can run the full pyramid without Docker.
- The suite no longer depends on the order the files run in, and a test that leaves rows behind cannot make another file fail. Each file starts from a migrated, empty database.
- Every test file that opens a database costs one `CREATE DATABASE` and one full migration pass. That is slower than sharing one database; it is the price of the isolation, and the migrations are small.
- Creating many databases on one server is limited by `max_connections` while they exist and by disk while they hold data. Each open database holds its own pool, and the administrative connection is opened only for the `CREATE DATABASE` and the `DROP DATABASE` and closed right after. In a full local run against a server, the peak stayed well under 30 connections.
- A feature that behaves differently in PGlite and in server PostgreSQL would pass locally and fail in CI. CI is the authority. If that happens more than occasionally, revisit this ADR.
- Connection pooling and multi-connection concurrency are not exercised locally. The version-conflict tests rely on `UPDATE ... WHERE version = ?`, which does not need two connections.

## Revisit when

- A test passes on PGlite and fails on the CI PostgreSQL service for an engine reason.
- A test needs real concurrent connections.
