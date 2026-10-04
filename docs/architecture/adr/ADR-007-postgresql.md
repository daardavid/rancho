# ADR-007: One PostgreSQL database, one schema per domain module

## Status

Accepted

Accepted with the Physical Architecture v1 baseline. It does not create a database, a schema, or a migration.

## Context

[ADR-002](ADR-002-modular-monolith.md) allows one database and forbids treating that database as shared write ownership. [ADR-003](ADR-003-application-orchestration.md) requires one local transaction across modules for captures such as an identified sale or a feed purchase. The data model is relational: animals, weights, movements, expenses, and explicit foreign identifiers. History, corrections, and read models are queries over those records ([data-ownership.md](../data-ownership.md)).

The team is two people. Operational simplicity and transactional correctness outrank a design aimed at enormous traffic. Strong PostgreSQL support is an explicit project priority.

Physical architecture v0.1 forbade every cross-schema foreign key and postponed a ranch discriminator until a second ranch existed. The v0.2 refinement keeps one database and separate schemas, narrows the foreign-key rule, and adopts `RanchId` from the first persistence version ([ADR-013](ADR-013-ranch-scope.md)).

## Decision

Use PostgreSQL as the only transactional store.

- One database for the whole monolith. Not one database per module.
- One schema per current domain module: `herd`, `growth`, `feeding`, `inventory`, `finance`.
- Technical schemas, which are not domain modules: `identity` for accounts and sessions, `evidence` for the file port's metadata.
- No `read_model` schema in the first database. Read models are queries ([persistence-strategy.md](../persistence-strategy.md)). A stored projection would be a later decision.
- No `shared` schema. Kernel values are TypeScript types. A column that stores source quality repeats a check constraint in the owning table.
- Authoritative business rows include `ranch_id` from the first migration ([ADR-013](ADR-013-ranch-scope.md)).
- One ordered migration stream covers the whole monolith. Module ownership stays visible because tables live in the module schema. A rare cross-schema change is still one reviewed migration in that stream. The application does not migrate on startup. Detail is in [persistence-strategy.md](../persistence-strategy.md).
- Public technical identifiers are UUID version 4, generated with platform `crypto.randomUUID()` on the client or the server. They are not database sequences. Display codes and external marks are separate and are not primary keys ([persistence-strategy.md](../persistence-strategy.md)).
- Instants are `timestamptz`. A day-level ranch fact with no precise time is `date`. Display of ranch times uses `America/Mexico_City`.
- Money is `numeric(12,2)` with a `char(3)` currency code, initially `MXN`. Measured kilograms and liters are `numeric(12,3)`. Binary floating point is not the authoritative representation.
- `jsonb` is allowed for an irregular adapter payload. It is not the shape of an animal, a weight, an expense, or a source quality.

### Foreign keys

Foreign keys inside a module schema are used.

Across domain schemas, the only foreign keys allowed initially are downstream references to Herd identity:

- `herd.animal(id)`
- `herd.paddock_reference(id)`, where the referencing fact actually depends on that paddock reference

Rules for those foreign keys:

- `ON DELETE RESTRICT`
- no `ON DELETE CASCADE` and no cascading delete of ranch facts
- the foreign key does not confer write ownership
- the referencing module cannot modify Herd rows

Herd does not take a foreign key to Finance, Growth, Feeding, or Inventory. An arbitrary cross-schema foreign-key graph is not allowed.

A correlation identifier stays a plain UUID when a foreign key would not protect an important integrity rule. Examples: a sale id stored on an exit, a stock-issue id stored on a feed batch. The application still checks existence when the command requires the referenced fact to exist.

If a module is ever moved to its own database, these cross-schema identity foreign keys are removed or replaced. They are a monolith convenience, not a permanent distributed constraint.

## Why one database and separate schemas

A sale and its exits commit together only if both writes share a transaction. Separate databases would turn that invariant into a saga. Separate schemas keep ownership visible inside the one database: a herd table lives in `herd`, and a finance table does not. PostgreSQL transactions cross schemas without extra machinery.

A single schema with table-name prefixes is easier to start and weaker to read. Every join looks legal. Schemas are a small amount of ceremony for a boundary the team has already agreed to protect.

Per-module databases, and per-module database roles that cannot write each other's schemas, are rejected. The second one can be revisited if code review fails. It is not required to get a correct transaction on day one.

The narrow foreign key to `herd.animal` keeps a weight or an expense allocation from pointing at an animal id that was never inserted. It does not let Growth update the animal. v0.1's absolute ban avoided coupling and also blocked that existence check. The ban on arbitrary graphs remains.

## Why not the alternatives

- **SQLite.** Comfortable locally, and a poor match for a hosted multi-user backup story and for the PostgreSQL priority already set. Development and production use the same engine so transaction tests mean something.
- **MySQL or MariaDB.** Capable relational engines. They are not a better fit for this team than PostgreSQL, and they are not the engine the project asked to prefer.
- **A document database.** The ranch facts are relational, historical, and reported. A document store would weaken the integrity and the queries the read models need.

No vendor of PostgreSQL hosting is selected. The requirement is ordinary PostgreSQL ([deployment-strategy.md](../deployment-strategy.md)).

## Consequences

- Orchestrators run module work inside one database transaction through transaction-scoped repositories ([ADR-008](ADR-008-data-access.md)).
- Read models may `SELECT` across schemas from the read-model query location. They do not `INSERT`, `UPDATE`, or `DELETE` module tables. They do not become the place cross-schema foreign keys are invented.
- Module migrations share one ordered history for the database.
- Extracting a module later remains possible: its tables already sit in one schema. Cross-schema identity foreign keys would be dropped or replaced at extraction. Extraction is not a goal of this version.
- Evidence bytes do not go in PostgreSQL ([ADR-011](ADR-011-evidence-storage.md)).
- The application role used at runtime does not own DDL. A migration role applies reviewed SQL. Local development may use a privileged role for convenience.

## When to revisit

- A module must fail or scale independently, under the conditions in ADR-002.
- Cross-schema queries for read models become a proven operational problem, and a stored projection is the remedy. That decision would introduce a `read_model` schema. It is not taken now.
- Code review shows modules writing each other's tables, and schema-level privileges are the remaining control.
- A second ranch needs administration beyond the seeded `RanchId`. The response is an ADR on top of [ADR-013](ADR-013-ranch-scope.md), not a tenant framework built in advance.
- A downstream module needs a foreign key to something other than `herd.animal` or `herd.paddock_reference`. That needs an explicit extension of this decision. It is not a local exception in a migration.

Do not revisit it because a microservice diagram would give each module its own database.

## Status of this document

- Version: 0.2
- Status: Accepted with the Physical Architecture v1 baseline
- Last updated: 2026-10-04
- Source: ADR-002, ADR-003, ADR-013, data ownership v0.2, physical architecture QA
- Validation: Decision only. No database is created
