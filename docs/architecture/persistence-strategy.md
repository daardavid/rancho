# Persistence strategy

How facts are stored. This is not a schema and not a migration.

Decisions: [ADR-007](adr/ADR-007-postgresql.md), [ADR-008](adr/ADR-008-data-access.md), [ADR-013](adr/ADR-013-ranch-scope.md).

## One database

PostgreSQL holds every transactional fact for the monolith. Development and production use PostgreSQL, not a file database in one environment and PostgreSQL in the other.

Schemas in the first database:

| Schema | What it is |
| --- | --- |
| `herd` | Herd records, including parentage, health, location, verification, confirmed missing, paddock reference |
| `growth` | Weighing sessions and weights |
| `feeding` | Batches and deliveries |
| `inventory` | Stock items, movements, counts |
| `finance` | Expenses, purchases, sales, explicit allocations |
| `identity` | Accounts and sessions. Not a domain module |
| `evidence` | Storage-key metadata for the file port. Not a domain module |

There is no `shared` schema, no `read_model` schema, and no database per module. A stored projection would be a later decision, including whether it needs its own schema.

### Ranch scope

Authoritative business rows include `ranch_id` from the first migration. The first installation seeds one ranch. `RanchId` is application scope ([ADR-013](adr/ADR-013-ranch-scope.md)). A technical row with no ranch meaning, such as the migration journal, does not gain one for decoration.

Business uniqueness is generally per ranch. Conceptual examples, not a column catalog: `unique(ranch_id, animal_display_code)`, `unique(ranch_id, paddock_label)`.

### Foreign keys

Foreign keys inside a domain schema are ordinary.

Across domain schemas, the only foreign keys allowed initially are downstream references to `herd.animal(id)` and, where the fact depends on that reference, `herd.paddock_reference(id)`. They use `ON DELETE RESTRICT`. They do not cascade. They do not let the referencing module update Herd. Herd does not declare a foreign key into Finance, Growth, Feeding, or Inventory.

A sale id on an exit, or a stock-issue id on a feed batch, stays a plain UUID when the foreign key would not protect an integrity rule the command does not already check. If modules are later placed in separate databases, the cross-schema identity foreign keys are removed or replaced.

Ranch facts are not deleted as a way to edit them. A missing target that the command required is a failed command, not a cascade the database invents.

## Access

Drizzle defines tables per module, in that module's persistence folder. Repository implementations and repository factories may import Drizzle. Domain code does not. Module application services do not receive a raw Drizzle transaction object.

```text
orchestrator
  → open one database transaction
  → create Herd repositories bound to that transaction
  → create Finance repositories bound to that transaction
  → call Herd and Finance application services with those interfaces
  → commit, or roll back
```

That factory is a small function next to persistence. It is not a Unit of Work framework, not an `AsyncLocalStorage` ambient transaction, and not a generic repository base. One module's service does not receive the other module's repositories.

Cross-module Drizzle relations are not declared. A SQL foreign key allowed above is a database constraint, not a relation the ORM walks. A join across schemas belongs in a read model, written as SQL, and it only reads.

## Transactions

A sale of named animals and the matching exits share one transaction. A feed purchase shares one transaction between the Finance expense and the Inventory receipt. Feeding is not a writer on that purchase. A feed batch that also issues stock shares one transaction between Feeding and Inventory. A Herd-only birth is one Herd application service, still on one transaction, writing `Animal` and `ParentageRecord`.

A module service that participates in an orchestrator does not open a second transaction. Read-only queries may run on the pool. A read model that must show one consistent screen may use a read-only transaction. At the current size that is optional.

Confirmed-missing notification is not inside the transaction. The assertion commits. The banner query sees it afterward. There is no outbox table.

## Identifiers

Three identifiers stay distinct:

| Kind | Rule |
| --- | --- |
| Technical id | UUID v4 from platform `crypto.randomUUID()`, on the client or the server. Globally unique. Primary key. No ULID or UUID v7 dependency |
| Display code | Optional later. Human-readable, server-assigned, unique per ranch. Format not decided. `RAN-000123` is not a required format |
| External mark | SINIIGA or another physical identifier. A historical Herd attribute. Not a primary key |

## Idempotency

Every state-changing command carries a stable client command or capture id. A created record also uses a client-safe UUID. The command id is the idempotency key. A second HTTP header that repeats it is unnecessary.

| Request | Result |
| --- | --- |
| Same command id, same meaningful payload | Return the previously stored success |
| Same command id, incompatible payload | HTTP 409, code `idempotency_mismatch`. The previous row stays |

A capture that spans modules stores that same command id on each participating row so a retry finds the whole capture. The id correlates. It does not become an aggregate that owns the other facts. A retry after a lost response uses the same ids. A partial success is not a state the client repairs, because the transaction rolled back.

This supports a network retry, a double submit, and a future offline queue. The queue is not built ([offline-readiness.md](offline-readiness.md)).

## Optimistic concurrency

An integer `version` is used where a correction or an update can race. Likely records: the animal's current row, a weight being corrected, an expense, a sale, a feed batch, a feed delivery, a stock item, and mutable label or reference rows.

An update sends the version it read. The write is `UPDATE ... WHERE id = ? AND version = ?`. Zero rows is HTTP 409, code `version_conflict`. The stored row is unchanged. There is no silent merge. The caller reloads and, if the change is still wanted, sends a new command.

Append-only inserts do not take a version check merely because they append. Idempotent retries are the command-id rule above, not the version check.

## History

Two patterns. They are not event sourcing, and they are not temporal tables. A reader still sees the current record without replaying a log. `occurred_at` is when the ranch event happened. `recorded_at` is when the system accepted the row. A correction does not move `occurred_at`.

### Incorrect fact

Examples: a weight typed as 315 kg that was 351 kg on that same weighing, a wrong expense amount, a wrong identifier, a typing error in a feed declaration.

In one transaction:

- the current authoritative record is corrected
- a history row in the same schema stores the previous value or previous state
- the history row stores who corrected it, when, and why

### Legitimate new fact

Examples: another weighing, a new paddock assignment, a stock movement, a health event, a verification, a new parentage certainty.

Insert a new historical record. The previous fact stays as it was.

| Situation | Pattern |
| --- | --- |
| Second weighing | New weight record |
| 315 kg changed to 351 kg on the same weighing | Correction of that weight |
| Expected place moves from paddock 3 to paddock 4 | New location assignment |
| Declared delivery, later measured | Both remain when both are meaningful. The measured fact does not overwrite the declaration |
| New stock movement, health event, verification, or parentage certainty | New historical record |
| Mistyped certainty or a mistyped movement amount | Correction of that record, with the previous value kept |

Important facts that must remain explainable, by one of those two patterns: weights, parentage, tenure notes, marks, expenses, sales, purchase costs, feed batches and deliveries, stock movements and counts, exits, expected location, health notes, and confirmed-missing assertions. The list matches [cross-cutting-concerns.md](cross-cutting-concerns.md).

## Values

- Instants are `timestamptz`. A local timestamp without an offset is not stored as an instant.
- A ranch fact that is only a day, with no precise time known or required, is PostgreSQL `date`.
- Ranch times are displayed in `America/Mexico_City`.
- `received_at` and device time are not columns on every row. A later offline or device capture can add them when that client exists.
- Money is `numeric(12,2)`. Currency is `char(3)`, initially `MXN`.
- Measured kilograms and liters are `numeric(12,3)`.
- API decimal values cross the boundary as strings validated by Zod. JavaScript floating-point arithmetic is not the authoritative money or measurement logic.
- A derived price per kilogram belongs to a read model unless that price was itself recorded as a commercial fact.
- Source quality is the three-way value from the shared kernel, enforced by a check constraint on the owning column.
- `jsonb` is for an irregular adapter payload only.

Management money stays outside statutory accounting (`CON-ACC-001`). These scales are physical column conventions. They are not a fiscal currency model, and they are not the column catalog.

## Read models

Initial strategy: calculate on demand, in the read-model query location.

`WeeklyRanchSummary`, `AnimalGrowthView`, `ProvisionalProfitabilityView`, `InventoryVarianceView`, and `MissingAnimalRiskView` are query functions. Last observation is a query function in the same layer. It is not a column on `Animal`.

Those queries may `SELECT` across schemas. Write repositories may not. There is no materialized view, no persisted projection, and no dedicated read database. Revisit that only when a query is measurably too slow or a screen must freeze a snapshot across requests. Hundreds of animals are not, by themselves, that evidence.

The profitability query may sum explicit Finance allocations and show gaps. It does not invent an allocation or write a margin back. The risk query does not insert a confirmed-missing assertion.

Critical notices are the same kind of query: confirmed missing, a severe health note, and any case the owner has marked. The first delivery is the owner seeing that query when they open the app. No push vendor is selected.

## Evidence metadata

`evidence` maps an evidence id to `ranch_id`, a storage key `{ranchId}/{evidenceId}`, content type, size, and a SHA-256 checksum. The original filename is metadata, not a path. The owning module stores the evidence id and the association beside the fact. Bytes stay in the adapter ([ADR-011](adr/ADR-011-evidence-storage.md)). Correcting or detaching the fact does not delete those bytes.

## Migrations

One ordered stream for the monolith. Schema names keep module ownership visible inside that stream.

- SQL files in Git, produced by the Drizzle migration tooling when the API exists.
- Reviewed like any other change.
- Applied by an explicit command. Local development uses that same explicit command. Reset of the local database is a separate local-only command.
- Applied in deployment after a backup is known to exist, as its own step, before the new process is the one serving traffic ([deployment-strategy.md](deployment-strategy.md)).
- The server does not generate or apply migrations on startup in any environment.
- A change that touches more than one schema may be one reviewed migration. It is still the same stream.
- Forward-fix is the normal repair. Restoring a backup is the recovery path. Elaborate down migrations are not required.
- Prefer a backward-compatible migration when that is practical. A destructive migration waits for a maintenance window and an explicit procedure.

No migration is created in this version.

## Status

- Version: 0.2
- Status: Accepted with the Physical Architecture v1 baseline. No database
- Last updated: 2026-10-04
- Source: ADR-007, ADR-008, ADR-013, data ownership and offline-readiness v0.2, physical architecture QA
- Validation: Conventions only. No table is designed here
