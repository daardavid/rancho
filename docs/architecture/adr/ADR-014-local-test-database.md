# ADR-014: Persistence tests run on embedded PostgreSQL locally and on a PostgreSQL service in CI

## Status

Proposed

Proposed with INC-001. Accepted when David merges it into `main`. It refines [testing-strategy.md](../testing-strategy.md) and the "Local development" row of [technology-stack.md](../technology-stack.md). It does not change ADR-007: production and development data still live in PostgreSQL.

## Context

The testing strategy requires persistence tests against PostgreSQL, failing rather than skipping when the database is down, with Docker Compose providing the local database.

INC-001 is built by the repository factory (`fabrica/`), which runs the test suite on David's Windows laptop after every coding cycle, often unattended at night. Requiring Docker Desktop to be running for every cycle adds a failure mode that has nothing to do with the code: a stopped Docker daemon turns every cycle red and wastes the factory's cycle budget.

PGlite is the PostgreSQL engine compiled to WebAssembly. It runs in-process in Node, with no daemon, and it supports schemas, `numeric`, `timestamptz`, check constraints, foreign keys, and transactions. Drizzle has a PGlite driver.

## Decision

- Persistence and API tests use a single test-database factory. If `TEST_DATABASE_URL` is set, the factory connects to that PostgreSQL server. If not, it starts an in-process PGlite database.
- Migrations are applied to the test database through the same explicit migration code used for real databases, before the persistence tests.
- GitHub Actions sets `TEST_DATABASE_URL` to a PostgreSQL service container, so CI always runs against the server engine.
- A persistence test never skips. If neither database can be started, it fails.
- Docker Compose for a local PostgreSQL stays available for development data. It is not required to run the tests.
- Application code does not know which engine it is talking to beyond the Drizzle driver chosen by the factory. No test-only SQL branches.

## Consequences

- The factory can run the full pyramid without Docker.
- A feature that behaves differently in PGlite and in server PostgreSQL would pass locally and fail in CI. CI is the authority. If that happens more than occasionally, revisit this ADR.
- Connection pooling and multi-connection concurrency are not exercised locally. The version-conflict tests rely on `UPDATE ... WHERE version = ?`, which does not need two connections.

## Revisit when

- A test passes on PGlite and fails on the CI PostgreSQL service for an engine reason.
- A test needs real concurrent connections.
