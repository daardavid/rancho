# 011 — Physical architecture refinement v0.2

## Objective

Refine physical architecture v0.1 into the **Physical Architecture v1 baseline** and freeze that baseline for a later scaffold.

This plan records the refinement. The decisions live in `docs/architecture` and in the physical ADRs. It does not approve a product scope, close a ranch question, scaffold an application, install a dependency, or select a hosting vendor.

Physical architecture v0.1 at `0a0f8190e3c8c7402721163cceaa53783fe04686` is the input. Logical architecture v0.2 at `762739b06d830146d61084497eff3f1a1edafd18` stays the Logical Architecture v1 baseline. This pass does not change module ownership, orchestrators, or read-model meaning. `docs/domain`, AS-IS, and TO-BE semantics stay unchanged. `apps/domain-map` stays unchanged. The ARCHITECTURE tab stays a placeholder.

QA conclusion applied here: **READY FOR PHYSICAL ARCHITECTURE REFINEMENT.** The stack is not reconsidered.

## Stack that stays

| Layer | Choice |
| --- | --- |
| Frontend | React + TypeScript + Vite |
| Backend | TypeScript + Node.js + Fastify |
| API | Command-oriented REST + Zod |
| Persistence | PostgreSQL + Drizzle |
| Deployment | One long-lived Node process serving the API and the built SPA |
| Evidence | Storage port + S3-compatible deployed storage |

Still refused: microservices, event sourcing, a message broker, and a business-data offline queue in the MVP.

## QA corrections

v0.1 is the historical evaluation in [010-physical-architecture-v0.1.md](010-physical-architecture-v0.1.md). Where that plan and the v0.1 architecture text disagree with the table below, this refinement wins.

| v0.1 statement | v0.2 rule |
| --- | --- |
| No cross-schema foreign keys under any circumstance | A narrow exception: downstream references to `herd.animal(id)`, and to `herd.paddock_reference(id)` where justified. `ON DELETE RESTRICT`. No `CASCADE DELETE`. No arbitrary cross-schema graph. No upstream Herd dependency on Finance, Growth, Feeding, or Inventory |
| The orchestrator passes a raw Drizzle transaction into module application functions | Persistence opens the transaction and builds transaction-scoped repositories. Application services receive repository interfaces. Domain code and application services do not see a Drizzle transaction |
| Better Auth is the default library | Cookie sessions in PostgreSQL are frozen. Better Auth is the first library to try during scaffold. It is not an accepted dependency |
| Ranch discrimination waits for a second ranch | `RanchId` is on authoritative business records from the first persistence version. It is application scope, not SaaS, not a Herd aggregate, and not an auth organization |
| History described as current row plus history, without separating a bad value from a new ranch fact | Two patterns: correct an incorrect fact and append history in the same transaction, or insert a new historical record and leave the previous fact |
| Integer `version` on mutable rows, stated broadly | Integer versions only where correction or update concurrency matters. Append-only records do not gain a version check by default |
| Idempotent create by repeating the row id | Every state-changing command has a stable client command or capture id. The same id with the same meaningful payload returns the stored success. The same id with an incompatible payload is HTTP 409 `idempotency_mismatch`. That failure is distinct from HTTP 409 `version_conflict` |
| UUID v4 as the only identifier discussion | Technical id is UUID v4. A later display code is a separate server-assigned ranch code whose format is not decided. SINIIGA and other external marks are historical Herd attributes, not primary keys |
| Money and quantities are `numeric`, scale left to schema time | Money is `numeric(12,2)` with `char(3)` currency, initially `MXN`. Measured kilograms and liters are `numeric(12,3)`. API decimals are strings validated by Zod |
| Instants are `timestamptz` | Instants are `timestamptz`. Day-level ranch facts with no precise time are `date`. Display uses `America/Mexico_City`. `occurred_at` is the ranch event. `recorded_at` is when the system accepted it |
| Evidence port, with delete on the port | Storage key `{ranchId}/{evidenceId}`. Validate magic bytes. Server-proxied upload. No cascading byte deletion when a domain record is corrected or detached |
| `read_model` schema reserved and unused | No `read_model` schema in the first database. Read models stay application queries. Cross-schema `SELECT` is allowed only in that query layer |
| Import test described, lint possibly added | Public `index.ts` plus a mandatory Vitest import-boundary test. No second lint toolchain and no dependency-cruiser |
| Local migration story implied | One ordered migration stream, run by an explicit command, including locally. Never on process startup. Reset is local-only |

## Final implementation conventions

### Ranch scope

`RanchId` is data and application scope. Every authoritative business record is ranch-scoped unless a specific technical row has no ranch meaning, such as a migration journal. Evidence keys include `RanchId`. Business uniqueness is generally per ranch, conceptually `unique(ranch_id, animal_display_code)` and `unique(ranch_id, paddock_label)`. The shared kernel may hold `RanchId` as an identifier primitive. It does not hold a Ranch aggregate. One ranch is seeded. The session carries `RanchId`. The client does not choose an arbitrary ranch. [ADR-013](../architecture/adr/ADR-013-ranch-scope.md).

### PostgreSQL

One database. Schemas: `herd`, `growth`, `feeding`, `inventory`, `finance`, plus technical `identity` and `evidence`. No `read_model` schema initially. One migration stream for the monolith. Module ownership stays visible in the schema name. [ADR-007](../architecture/adr/ADR-007-postgresql.md).

### Cross-module foreign keys

Allowed initially only as downstream references to `herd.animal(id)` and, where a delivery or assignment truly depends on a paddock reference, to `herd.paddock_reference(id)`. `ON DELETE RESTRICT`. The foreign key does not give the referencing module write ownership, and that module cannot modify Herd rows. A sale id stored on an exit, or a stock-issue id stored on a feed batch, may stay a plain UUID when the foreign key would not protect an important integrity rule. If a module is ever physically separated, these identity foreign keys are removed or replaced. [ADR-007](../architecture/adr/ADR-007-postgresql.md).

### Drizzle and transactions

Drizzle stays in repository implementations and repository factories. The composition path is: open a database transaction, create each module's repositories bound to that transaction, call module application services through repository interfaces, then commit or roll back. No Unit of Work framework, no ambient `AsyncLocalStorage` transaction, no cross-module repository, and no generic repository base. [ADR-008](../architecture/adr/ADR-008-data-access.md).

### Migrations

Versioned in Git. Applied by an explicit command in every environment, including local development. The process does not migrate on startup. Reset is a local-only command. A rare cross-schema change may be one reviewed migration in the same stream. Forward-fix and restore are preferred to elaborate down migrations. No migration files are created in this pass.

### History

An incorrect fact (wrong weight, wrong expense, wrong identifier, a typing error in a feed declaration) updates the current authoritative record and appends the previous value, corrected-by, corrected-at, and reason in the same transaction. `occurred_at` stays the original ranch-event time. A legitimate new fact (another weighing, a new paddock assignment, a stock movement, a health event, a verification, a new parentage certainty) is a new row. The previous fact stays. A second weighing is not a correction. Changing 315 kg to 351 kg on the same weighing is a correction. Paddock 3 followed by Paddock 4 is a new assignment. A measured delivery does not silently overwrite a declaration when both are meaningful. Full event sourcing and temporal-table architecture are rejected.

### Concurrency and idempotency

Optimistic concurrency uses an integer version on records where a correction or update can race, including the animal current record, a weight being corrected, an expense, a sale, a feed batch, a feed delivery, a stock item, and mutable label or reference records. The write is `UPDATE ... WHERE id AND version` with the expected version. Zero rows is HTTP 409 `version_conflict`. There is no silent merge. Append-only inserts do not take a version check merely because they are inserts.

Every state-changing command carries a stable client command or capture id. A created record also uses a client-safe UUID. The same command id and the same meaningful payload return the stored success. The same command id and an incompatible payload are HTTP 409 `idempotency_mismatch`. A separate `Idempotency-Key` header is not required when the command already carries that id. This covers network retries, an accidental resubmit, and a future offline queue. The queue is not built.

### Identifiers, money, measurement, and time

Technical ids are UUID v4 from platform crypto generation. No ULID or UUID v7 dependency. Display codes, if the ranch wants them later, are server-assigned and unique per ranch. Their format is not decided. External marks such as SINIIGA are historical Herd attributes.

Money is PostgreSQL `numeric(12,2)` plus `char(3)` currency, initially `MXN`. Measured quantities that are kilograms or liters are `numeric(12,3)`. Binary floating point is not the authoritative representation. Zod validates decimal strings at the API boundary. Derived price per kilogram belongs to a read model unless that price was itself a recorded commercial fact.

`timestamptz` stores instants. `date` stores a day-level ranch fact when no precise time is known or required. Ranch times display in `America/Mexico_City`. An ambiguous local timestamp without an offset is not stored as an instant. `received_at` and device time are not added on every row yet.

### Authentication, authorization, and evidence

Sessions are cookie-based server sessions, rows in PostgreSQL, behind a maintained authentication and password library, isolated at the HTTP and identity edge. Better Auth is the first candidate during scaffold. It is rejected for this baseline if it makes an organization into the ranch, leaks auth objects into domain modules, or takes ownership of roles that belong to application authorization. Passwords are not hashed by hand. Email reset is not required to boot. Roles now are `owner` and `support`. `worker`, `veterinarian`, and `partner-readonly` stay reserved names. Checks are route and command role checks. The session's `RanchId` is the scope. [ADR-010](../architecture/adr/ADR-010-authentication.md).

Evidence stays behind the vendor-neutral port. Development uses the filesystem. Deployment uses S3-compatible storage. Uploads are server-proxied, capped around 25 MB, and checked by magic bytes. The initial allow-list may include JPEG, PNG, WebP, PDF, and common phone audio. The key is `{ranchId}/{evidenceId}`. The original filename is metadata. A SHA-256 checksum is stored. The caller does not supply a storage path. Correcting or detaching a fact does not delete historical bytes. Orphan objects are acceptable. Cleanup is outside the MVP. No vendor is selected. [ADR-011](../architecture/adr/ADR-011-evidence-storage.md).

### Read models, contracts, and module boundaries

The five read models and last observation stay application queries. Materialized views, persisted projections, and a second read database wait for a measured performance or UX need.

When `apps/api` and `apps/web` exist, `packages/api-contracts` holds request schemas, response schemas, and stable API enums that are genuinely part of the HTTP contract. It does not hold domain entities, repositories, Drizzle rows, or module internals. A handler parses the HTTP schema into a plain command, calls the application service, and returns a response DTO. OpenAPI waits for a non-TypeScript integration, an external adapter, or a documentation need.

Enforcement is the public module `index.ts` plus a mandatory Vitest architecture import test. A module may import its own internals, the shared kernel, and an explicitly allowed public interface of another module. It may not import another module's `domain/`, `persistence/`, or internal application implementation. Domain code does not import Fastify, Drizzle, the auth library, or frontend code. [ADR-012](../architecture/adr/ADR-012-repository-module-enforcement.md).

### Topology, local development, delivery, and security

Conceptual tree, not created here: `apps/domain-map`, `apps/api` (with `shared-kernel`, `modules/herd|growth|feeding|inventory|finance`, `application`, `read-models`, `infrastructure`, `http`), `apps/web`, and `packages/api-contracts`. The shared kernel is not a workspace package. Domain modules are not workspace packages.

Local infrastructure is Docker Compose for PostgreSQL only. The API and the web app are ordinary Node and Vite processes. Evidence is the filesystem. There is no MinIO emulator in the initial setup. When code exists, explicit commands start PostgreSQL, migrate, reset the local database, run the API, and run the web app. Tests use a separate PostgreSQL database, with migrations applied before persistence tests. Most persistence tests roll their transaction back. Tests that must commit clean their data explicitly. Testcontainers are not introduced initially.

A release builds, confirms a backup is available, runs the migration as its own command, starts the new process, and checks `GET /api/health/ready`. Backward-compatible migrations are preferred. A destructive migration uses a maintenance window and an explicit procedure. Before real ranch data: automated daily PostgreSQL backups, at least seven days of retention, point-in-time recovery when it is economically available, one restore test, object-storage versioning when it is inexpensive, and backup credentials protected like database credentials.

The session cookie is `HttpOnly`, `Secure` in production, and `SameSite=Lax`. Production is one origin. CORS is not a wildcard. Vite proxies `/api` in development. Mutations use a non-GET method. Login is rate-limited. Secrets come from the deployment environment. The runtime database role can read and write the application schemas and cannot apply schema migrations. Audit and history are visible to authorized application roles. Same-origin plus `SameSite=Lax` is the CSRF baseline for this first topology, and it is reviewed if the topology changes.

Observability v1 is Pino structured logs, a request id, `GET /api/health`, `GET /api/health/ready`, host logs, and the provider's backup monitoring. Distributed tracing is out. An external error product waits until log-only diagnosis is not enough. The future pull-request pipeline installs, lints, typechecks, runs the architecture import test, unit tests, and PostgreSQL persistence tests, then builds. Migration validation joins that pipeline when migrations exist. High or critical production advisories from `npm audit` block the pipeline or require an explicit review. Playwright starts once a few stable critical flows exist.

## ADR changes

| ADR | Change |
| --- | --- |
| [ADR-005](../architecture/adr/ADR-005-backend-runtime.md) | Unchanged decision. Accepted with the v1 baseline |
| [ADR-006](../architecture/adr/ADR-006-frontend-approach.md) | Unchanged decision. Accepted with the v1 baseline |
| [ADR-007](../architecture/adr/ADR-007-postgresql.md) | Schema list, narrow foreign-key rule, `RanchId`, single migration stream, decimal and time conventions |
| [ADR-008](../architecture/adr/ADR-008-data-access.md) | Transaction-scoped repositories. Application services do not receive a raw Drizzle transaction |
| [ADR-009](../architecture/adr/ADR-009-api-style.md) | Conflict codes, command ids, decimal strings, contract-package limits. Accepted with the v1 baseline |
| [ADR-010](../architecture/adr/ADR-010-authentication.md) | Session architecture frozen. Better Auth deferred to a scaffold candidate |
| [ADR-011](../architecture/adr/ADR-011-evidence-storage.md) | Key layout, validation, and no cascading byte deletion |
| [ADR-012](../architecture/adr/ADR-012-repository-module-enforcement.md) | Public index plus a mandatory Vitest boundary test. Conceptual tree aligned |
| [ADR-013](../architecture/adr/ADR-013-ranch-scope.md) | New. `RanchId` from the first persistence version, across rows, sessions, and evidence keys, without a SaaS model |

ADR-002 and ADR-003 stay Accepted. Their pointers to the physical transaction mechanism now follow ADR-008.

## What becomes frozen

Frozen for the later scaffold:

- technology categories and the selected stack
- the conceptual repository topology
- one PostgreSQL database, the module schemas, and the single migration stream
- the transaction-scoped repository approach
- the correction versus new-fact history strategy
- UUID v4 technical ids, separate from display codes and external marks
- decimal and time conventions
- cookie sessions in PostgreSQL, with authorization roles and a session `RanchId`
- the evidence storage port and its deletion rule
- module-boundary enforcement
- `RanchId` as application scope

## What remains implementation-time

- the final authentication library, with Better Auth as the first candidate to try
- the actual route catalog
- the hosting vendor and region (AQ-P1-006)
- the exact column catalog and the first migration files
- the display-code format
- exact UI component libraries beyond React, TypeScript, and Vite
- the scale protocol (`OQ-SCALE-001`, AQ-P2-001)
- offline synchronization (`OQ-CONN-001`, AQ-P2-003)
- alert transport beyond the application UI (AQ-P2-004)
- whether a feeding group needs an id that is not a paddock (AQ-P1-009)

## Non-goals

- Backend code, `apps/api`, `apps/web`, `packages/api-contracts`, schemas, migrations, dependencies, Compose files, workflows, authentication implementation, or the ARCHITECTURE tab.
- Billing, a ranch switcher, organization administration, invitations, a cross-ranch support console, tenant branding, tenant provisioning, or row-level security.
- A hosting vendor.
- Offline sync, CRDTs, or a worker field client.
- Event sourcing, temporal tables, a broker, or microservices.
- Closing `OQ-*`, `DQ-*`, or AQ-P1-009.
- Changing AS-IS or TO-BE semantics.

## Multi-ranch non-goals

`RanchId` on the first migration is a column and a session fact. The first installation contains one ranch. This refinement does not build an organization switcher, SaaS administration, billing, ranch invitations, a cross-ranch support console, tenant-configurable branding, a tenant provisioning system, or a row-level security requirement.

## Validation checklist

1. The stack matches the QA recommendation: React + TypeScript + Vite, TypeScript + Node.js + Fastify, command-oriented REST + Zod, PostgreSQL + Drizzle, one Node process, S3-compatible evidence behind a port.
2. `RanchId` exists as scope. It is not SaaS, not a Herd aggregate, and not an auth organization.
3. Cross-module foreign keys are only the narrow Herd identity exception.
4. Drizzle stays in persistence. Domain code and application services do not receive it.
5. There is one migration stream, run explicitly, never on startup.
6. An incorrect fact and a legitimate new fact are different writes.
7. `version_conflict` and `idempotency_mismatch` are different HTTP 409 results.
8. The technical id, the display code, and SINIIGA are three different things.
9. Money and measurements are exact decimals. The API uses strings.
10. A ranch day is `date`. An instant is `timestamptz`.
11. Better Auth is a scaffold candidate, not a frozen dependency.
12. The client cannot supply an arbitrary `RanchId`. The session carries it.
13. Evidence bytes are not cascade-deleted.
14. Read models stay read-only queries.
15. Module boundaries have a public index and a mandatory import test.
16. No hosting vendor is selected.
17. No offline sync implementation is designed.
18. No application code, schema, or dependency is added.

## Status

- Version: 0.2 refinement
- Status: Freezes the Physical Architecture v1 baseline for implementation. This plan does not authorize scaffolding inside the same change
- Last updated: 2026-10-04
- Source: physical architecture v0.1 at `0a0f819`, logical architecture v0.2 at `762739b`, physical architecture QA
- Validation: Decisions applied in `docs/architecture`. No production code
