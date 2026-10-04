# Persistence strategy

How facts are stored. This is not a schema and not a migration.

Decisions: [ADR-007](adr/ADR-007-postgresql.md), [ADR-008](adr/ADR-008-data-access.md).

## One database

PostgreSQL holds every transactional fact for the monolith. Development and production use PostgreSQL, not a file database in one environment and PostgreSQL in the other.

Schemas:

| Schema | What it is |
| --- | --- |
| `herd` | Herd records, including parentage, health, location, verification, confirmed missing, paddock reference |
| `growth` | Weighing sessions and weights |
| `feeding` | Batches and deliveries |
| `inventory` | Stock items, movements, counts |
| `finance` | Expenses, purchases, sales, explicit allocations |
| `identity` | Accounts and sessions. Not a domain module |
| `evidence` | Storage-key metadata for the file port. Not a domain module |
| `read_model` | Reserved. Unused while projections are queries |

There is no `shared` schema and no database per module.

Foreign keys stay inside a domain schema. Across domain schemas, the reference is a `uuid` with no foreign key. The command checks that the target exists when the rule requires it. Ranch facts are not deleted as a way to edit them, so a missing target is a bug in a command, not a cascade the database is asked to invent.

## Access

Drizzle defines tables per module, in that module's persistence folder. One migration history orders SQL for the whole database. Authors review the SQL in Git. The production process does not generate or apply migrations on boot.

The runtime role can read and write data. A migration role applies DDL. Local development may use one privileged role so that a single Compose database is enough.

Domain code does not import Drizzle. An application function receives the transaction and calls its repositories. The type of that handle lives next to persistence, not in the shared kernel.

Cross-module Drizzle relations are not declared. A join across schemas belongs in a read model, written as SQL, and it only reads.

## Transactions

```text
db.transaction(tx =>
  finance.recordSale(tx, command)
  herd.exitAnimals(tx, command)
)
```

If the exit throws, the sale is not committed. The same wrapping applies to a feed purchase (expense and receipt) and to a feed batch that also issues stock. A Herd-only birth is one Herd application function, still on one transaction, writing `Animal` and `ParentageRecord`.

A module function that participates in an orchestrator does not call `transaction()` again. Read-only queries may run on the pool. A read model that must show one consistent screen may use a read-only transaction. At the current size that is optional.

Confirmed-missing notification is not inside the transaction. The assertion commits. The banner query sees it afterward. There is no outbox table.

## Identifiers, idempotency, versions

- Primary keys are UUID v4 from `crypto.randomUUID()`, minted by the client or the server before the row exists.
- A repeated create with the same id and the same business payload returns the stored record.
- A repeated create with the same id and a different business payload fails. The previous row stays.
- Mutable current rows carry an integer `version`. An update includes the version it read. The write is `UPDATE ... WHERE id = ? AND version = ?`. Zero rows means a visible conflict, not a silent overwrite.
- Append-only history rows are immutable. They are not versioned in place.
- A capture that spans modules stores the same client-generated capture id on each participating row. That id correlates. It does not become an aggregate that owns the other facts.

These are the physical form of [offline-readiness.md](offline-readiness.md). They do not add a sync queue.

## History

Current state is the current row. A correction updates that row, writes the previous values to a history table in the same schema, and stores who, when, and why. Both writes share the transaction. Readers do not replay a log to see this week's weight.

Important corrections include weights, parentage certainty, tenure notes, money, feed quantities, counts, exits, and expected location. The list matches [cross-cutting-concerns.md](cross-cutting-concerns.md).

## Values

- Instants are `timestamptz`.
- Money and quantities are `numeric`.
- Source quality is the three-way value from the shared kernel, enforced by a check constraint on the owning column.
- `jsonb` is for an irregular adapter payload only.

Currency precision and the exact numeric scale are schema-time choices. They are not decided by inventing a fiscal currency model. Management money stays outside statutory accounting (`CON-ACC-001`).

## Read models

Initial strategy: calculate on demand.

`WeeklyRanchSummary`, `AnimalGrowthView`, `ProvisionalProfitabilityView`, `InventoryVarianceView`, and `MissingAnimalRiskView` are query functions. Last observation is a query function in the same layer. It is not a column on `Animal`.

The profitability query may sum explicit Finance allocations and show gaps. It does not invent an allocation or write a margin back. The risk query does not insert a confirmed-missing assertion.

A database view is the first escalation if a query is repeated and stable. A materialized view or a table in `read_model` waits until a query is measurably too slow, or a screen must freeze a snapshot across requests. Hundreds of animals are not, by themselves, that evidence.

Critical notices are the same kind of query: confirmed missing, a severe health note, and any case the owner has marked. The first "delivery" is the owner seeing that query when they open the app. No push vendor is selected.

## Evidence metadata

`evidence.object` maps an evidence id to a storage key, content type, size, and checksum. The owning module stores the evidence id and the association (kind, source, times) beside the fact. Bytes stay in the adapter ([ADR-011](adr/ADR-011-evidence-storage.md)).

## Migrations

- SQL files in Git, produced by the Drizzle migration tooling when the API exists.
- Reviewed like any other change.
- Applied by an explicit command in deployment, after a backup is known to exist for production.
- Forward fixes are the normal repair. Restoring a backup is the recovery path. Down migrations are not required theater.
- The server does not migrate itself on startup in production.

No migration is created in this version.

## Status

- Version: 0.1
- Status: Proposed strategy. No database
- Last updated: 2026-10-04
- Source: ADR-007, ADR-008, data ownership and offline-readiness v0.2
- Validation: Read-on-demand closes AQ-P1-008. No table is designed here
