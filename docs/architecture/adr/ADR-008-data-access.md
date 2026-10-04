# ADR-008: Drizzle, with transaction-scoped repositories

## Status

Accepted

Accepted with the Physical Architecture v1 baseline. It does not add the dependency, generate a client, or write a migration.

## Context

Module repositories must run inside a transaction the orchestrator opened, without importing each other's tables ([ADR-003](ADR-003-application-orchestration.md), [ADR-007](ADR-007-postgresql.md)). The team wants typed queries, ordinary SQL when a report needs it, and migrations reviewed in Git. A rich object graph across Herd and Finance would undo the ownership rules in [data-ownership.md](../data-ownership.md).

Physical architecture v0.1 passed the raw Drizzle transaction object into module application functions. That kept one transaction, and it also pulled a persistence type into the application service. The v0.2 refinement keeps Drizzle and moves the transaction object back behind repository factories.

## Decision

Use Drizzle as the data-access library.

- Each domain module declares its tables in its own persistence folder, bound to its PostgreSQL schema.
- One Drizzle migration stream covers the database. Generated SQL is committed and reviewed. No environment applies migrations by starting the server ([persistence-strategy.md](../persistence-strategy.md)).
- Domain code does not import Drizzle.
- Module application services do not receive a raw Drizzle transaction. They receive repository interfaces for their own module.
- Repository implementations and the factories that construct them may import Drizzle. A factory binds those repositories to the open transaction.
- Drizzle relations are allowed inside one module. Relations that cross domain modules are not defined, including the narrow SQL foreign keys allowed by [ADR-007](ADR-007-postgresql.md). Those foreign keys are database constraints. They are not a Drizzle relation graph. Read models that need more than one module use explicit SQL in the read-model layer.
- The read-model layer may import table definitions to run `SELECT`. It may not call another module's write repository.

The transaction shape is conceptual. This ADR does not implement it:

```text
orchestrator
  → open one database transaction
  → persistence factories create that module's repositories on the transaction
  → call the module application service with those repository interfaces
  → commit, or roll back if the service fails
```

A capture that writes Finance and Herd opens one transaction, builds each module's repositories on it, and calls each module's application service. Module A does not receive module B's repositories. There is no cross-module repository.

The following are not part of this decision:

- an enterprise Unit of Work framework
- an ambient transaction stored in `AsyncLocalStorage`
- a generic repository base class shared across modules

Inside one module, the application service calls its repository interfaces. It does not open a second transaction for work the orchestrator already wrapped.

## Why Drizzle

Drizzle keeps queries close to SQL, declares PostgreSQL schemas directly, and can share one transaction across repositories created for that transaction. Migrations are SQL files the team can read. Reporting SQL does not require a second query stack.

### Prisma

Prisma's client encourages included object graphs. That is the wrong default next to module ownership: a sale screen that `include`s the animal aggregate will eventually write as if the graph were one model. Multi-schema support is secondary to that client. Popularity is not a reason to take the graph. Prisma is not selected.

### Kysely, or SQL without a mapper

Kysely is the closest alternative. It has no relational graph, which protects the boundary well, and it is excellent when the query is the design. Its migration story is a second tool. Drizzle covers typed SQL-like queries and reviewed SQL migrations in one library the team can hold in their heads. If Drizzle's relational API starts crossing modules, the remedy is to stop defining those relations, not to adopt a richer ORM. Switching the query style to Kysely later would not require a new database.

## Why the transaction stays in persistence

An ambient transaction hides which connection a repository used. A module can look correct and still commit on a different connection. Passing the raw Drizzle transaction into the application service makes the scope visible and also makes every application function depend on Drizzle's type. Binding repositories inside the persistence factory keeps the scope explicit at the orchestrator and keeps Drizzle out of the service signature.

Optimistic versions and idempotent commands use those same repositories: the version check and the insert either commit with the rest of the capture or they do not.

## Consequences

- Cross-module atomic workflows in [context-map.md](../context-map.md) have a physical mechanism: one database transaction, one repository set per module, two or more module application services.
- A failed exit rolls back the sale. A failed receipt rolls back the feed expense.
- Read models stay queries. They are not updated inside the write transaction ([ADR-004](ADR-004-no-cross-module-event-bus-yet.md)).
- Authors need the discipline not to export a global `db` into another module's domain or application code. [ADR-012](ADR-012-repository-module-enforcement.md) checks the imports.
- Kysely remains an acceptable replacement for the query layer if Drizzle's API begins to define the domain. PostgreSQL and the schema layout would stay.

## When to revisit

- Transaction-scoped repositories cannot serve an orchestrated capture without a module application service importing another module's tables.
- Drizzle can no longer represent the schema-per-module layout or the migrations the team is willing to review.
- A query builder is getting in the way of SQL the read models need, and raw SQL or Kysely would be clearer.
- Someone reaches for `AsyncLocalStorage` because passing repositories is awkward. That is a reason to keep the explicit factory, not a reason to hide the transaction.

Do not revisit it because another ORM is more widely used.

## Status of this document

- Version: 0.2
- Status: Accepted with the Physical Architecture v1 baseline
- Last updated: 2026-10-04
- Source: ADR-003, ADR-007, module ownership rules, physical architecture QA
- Validation: Decision only. No schema and no dependency is added
