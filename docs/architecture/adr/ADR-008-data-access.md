# ADR-008: Drizzle with an explicit transaction handle

## Status

Proposed

Proposed with physical architecture v0.1. It does not add the dependency, generate a client, or write a migration.

## Context

Module repositories must run inside a transaction the orchestrator opened, without importing each other's tables ([ADR-003](ADR-003-application-orchestration.md), [ADR-007](ADR-007-postgresql.md)). The team wants typed queries, ordinary SQL when a report needs it, and migrations reviewed in Git. A rich object graph across Herd and Finance would undo the ownership rules in [data-ownership.md](../data-ownership.md).

## Decision

Use Drizzle as the data-access library.

- Each domain module declares its tables in its own persistence folder, bound to its PostgreSQL schema.
- One Drizzle migration stream covers the database. Generated SQL is committed. Production does not apply migrations by starting the server ([persistence-strategy.md](../persistence-strategy.md)).
- An orchestrator opens the transaction and passes the transaction handle into each module application function it calls. Repositories use that handle. They do not open a second connection to "finish" the capture.
- Domain types do not import Drizzle. Persistence implements the writes the application function asks for.
- Drizzle relations are allowed inside one module. Relations that cross domain modules are not defined. Read models that need more than one module use explicit SQL in the read-model layer.
- The read-model layer may import table definitions to run `SELECT`. It may not call another module's write repository.

The transaction shape is:

```text
orchestrator
  → begin transaction
  → module application function A (transaction, command)
       → repository A uses the same transaction
  → module application function B (transaction, command)
       → repository B uses the same transaction
  → commit, or roll back if either function fails
```

Module A does not receive module B's repository. The handle is a database transaction, not a license to query the other schema from inside the domain.

## Why Drizzle

Drizzle keeps queries close to SQL, declares PostgreSQL schemas directly, and types the transaction callback so both repositories can share it. Migrations are SQL files the team can read. Reporting SQL does not require a second query stack.

### Prisma

Prisma's client encourages included object graphs. That is the wrong default next to module ownership: a sale screen that `include`s the animal aggregate will eventually write as if the graph were one model. Multi-schema support is secondary to that client. Popularity is not a reason to take the graph. Prisma is not selected.

### Kysely, or SQL without a mapper

Kysely is the closest alternative. It has no relational graph, which protects the boundary well, and it is excellent when the query is the design. Its migration story is a second tool. Drizzle covers typed SQL-like queries and reviewed SQL migrations in one library the team can hold in their heads. If Drizzle's relational API starts crossing modules, the remedy is to stop defining those relations, not to adopt a richer ORM. Switching the query style to Kysely later would not require a new database.

## Why the transaction is an argument

An ambient transaction (for example async-local storage alone) hides which connection a repository used. A module can look correct and still commit on a different connection. An explicit handle at the application-function boundary makes the orchestrator's scope visible in the call. Inside one module, the application function may pass that same handle down to its repositories. It may not start a second transaction for work that the orchestrator already wrapped.

Optimistic versions and idempotent creates use the same handle: the version check and the insert either commit with the rest of the capture or they do not.

## Consequences

- Cross-module atomic workflows in [context-map.md](../context-map.md) have a physical mechanism: one Drizzle transaction, two or more module functions.
- A failed exit rolls back the sale. A failed receipt rolls back the feed expense.
- Read models stay queries. They are not updated inside the write transaction ([ADR-004](ADR-004-no-cross-module-event-bus-yet.md)).
- Authors need the discipline not to export a global `db` into another module's domain code. [ADR-012](ADR-012-repository-module-enforcement.md) checks the imports.
- Kysely remains an acceptable replacement for the query layer if Drizzle's API begins to define the domain. PostgreSQL and the schema layout would stay.

## When to revisit

- The transaction handle cannot be passed through the module application functions without those functions importing another module's tables.
- Drizzle can no longer represent the schema-per-module layout or the migrations the team is willing to review.
- A query builder is getting in the way of SQL the read models need, and raw SQL or Kysely would be clearer.

Do not revisit it because another ORM is more widely used.

## Status of this document

- Version: 0.1
- Status: Proposed with physical architecture v0.1
- Last updated: 2026-10-04
- Source: ADR-003, ADR-007, module ownership rules
- Validation: Decision only. No schema and no dependency is added
