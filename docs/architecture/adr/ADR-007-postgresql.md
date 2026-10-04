# ADR-007: One PostgreSQL database, one schema per domain module

## Status

Proposed

Proposed with physical architecture v0.1. It does not create a database, a schema, or a migration.

## Context

[ADR-002](ADR-002-modular-monolith.md) allows one database and forbids treating that database as shared write ownership. [ADR-003](ADR-003-application-orchestration.md) requires one local transaction across modules for captures such as an identified sale or a feed purchase. The data model is relational: animals, weights, movements, expenses, and explicit foreign identifiers. History, corrections, and read models are queries over those records ([data-ownership.md](../data-ownership.md)).

The team is two people. Operational simplicity and transactional correctness outrank a design aimed at enormous traffic. Strong PostgreSQL support is an explicit project priority.

## Decision

Use PostgreSQL as the only transactional store.

- One database for the whole monolith. Not one database per module.
- One schema per current domain module: `herd`, `growth`, `feeding`, `inventory`, `finance`.
- Technical schemas, which are not domain modules: `identity` for accounts and sessions, `evidence` for the file port's metadata.
- A `read_model` schema may exist later if a stored projection is justified. It is unused while read models are queries ([persistence-strategy.md](../persistence-strategy.md)).
- No `shared` schema. Kernel values are TypeScript types. A column that stores source quality repeats a check constraint in the owning table.
- Foreign keys inside a module schema are used. Foreign keys across domain schemas are not. A cross-module reference is a `uuid` column. The application checks existence when the command requires the referenced fact to exist.
- Public identifiers are UUID version 4, generated with `crypto.randomUUID()` on the client or the server. They are not database sequences.
- Instants are `timestamptz`. Money and quantities are `numeric`, not binary floating point.
- `jsonb` is allowed for an irregular adapter payload. It is not the shape of an animal, a weight, an expense, or a source quality.

## Why one database and separate schemas

A sale and its exits commit together only if both writes share a transaction. Separate databases would turn that invariant into a saga. Separate schemas keep ownership visible inside the one database: a herd table lives in `herd`, and a finance table does not. PostgreSQL transactions cross schemas without extra machinery.

A single schema with table-name prefixes is easier to start and weaker to read. Every join looks legal. Schemas are a small amount of ceremony for a boundary the team has already agreed to protect.

Per-module databases, and per-module database roles that cannot write each other's schemas, are rejected. The second one can be revisited if code review fails. It is not required to get a correct transaction on day one.

## Why not the alternatives

- **SQLite.** Comfortable locally, and a poor match for a hosted multi-user backup story and for the PostgreSQL priority already set. Development and production use the same engine so transaction tests mean something.
- **MySQL or MariaDB.** Capable relational engines. They are not a better fit for this team than PostgreSQL, and they are not the engine the project asked to prefer.
- **A document database.** The ranch facts are relational, historical, and reported. A document store would weaken the integrity and the queries the read models need.

No vendor of PostgreSQL hosting is selected. The requirement is ordinary PostgreSQL ([deployment-strategy.md](../deployment-strategy.md)).

## Consequences

- Orchestrators begin one transaction and pass it to module repositories ([ADR-008](ADR-008-data-access.md)).
- Read models may `SELECT` across schemas. They do not `INSERT`, `UPDATE`, or `DELETE` module tables.
- Module migrations share one ordered history for the database, so a change that must follow another change has a single sequence.
- Extracting a module later remains possible: its tables already sit in one schema, and cross-schema foreign keys were not allowed to tangle the catalogs. Extraction is not a goal of this version.
- Evidence bytes do not go in PostgreSQL ([ADR-011](ADR-011-evidence-storage.md)).
- The application role used at runtime does not own DDL. A migration role applies reviewed SQL. Local development may use a privileged role for convenience.

## When to revisit

- A module must fail or scale independently, under the conditions in ADR-002.
- Cross-schema queries for read models become a proven operational problem, and a stored projection in `read_model` is the remedy.
- Code review shows modules writing each other's tables, and schema-level privileges are the remaining control.
- A second ranch is real. The response is a discriminator or a later ADR, not a tenant framework built now.

Do not revisit it because a microservice diagram would give each module its own database.

## Status of this document

- Version: 0.1
- Status: Proposed with physical architecture v0.1
- Last updated: 2026-10-04
- Source: ADR-002, ADR-003, data ownership v0.2
- Validation: Decision only. No database is created
