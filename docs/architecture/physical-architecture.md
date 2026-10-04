# Physical architecture v1 baseline

How the frozen logical architecture runs as one application. This document is the map. The decisions sit in the ADRs and the linked strategy documents. Nothing here creates a process, a database, or a screen.

Logical architecture v0.2, commit `762739b06d830146d61084497eff3f1a1edafd18`, is frozen as the **Logical Architecture v1 baseline**. This document is frozen as the **Physical Architecture v1 baseline** for implementation. Physical technology did not force a boundary change. The baseline the implementation must follow is:

- domain modules: Herd, Growth, Feeding, Inventory, Finance
- application orchestrators for cross-module writes
- read models that query
- transversal evidence, audit, source quality, and capture channel
- the minimal shared kernel, including `RanchId` as scope and not as an aggregate

The module list can still change later through an ADR. This physical design implements the list above. Later extraction stays possible: callers use a public module index, tables sit in one schema per module, and the only cross-schema foreign keys are the narrow Herd identity references in [ADR-007](adr/ADR-007-postgresql.md). Those foreign keys would be removed or replaced if a module left the database.

v0.1 at `0a0f8190e3c8c7402721163cceaa53783fe04686` is the evaluation that selected the stack. The refinement is [../plans/011-physical-architecture-refinement-v0.2.md](../plans/011-physical-architecture-refinement-v0.2.md). Where v0.1 forbade every cross-schema foreign key, passed a raw Drizzle transaction into application services, or treated Better Auth as the chosen library, this baseline replaces that sentence.

## Runtime picture

```text
Browser (responsive; PWA shell only if added later)
    │  HTTPS, one origin, session cookie
    ▼
Node process
    ├── static SPA (production build of apps/web)
    └── Fastify HTTP
            │  Zod contracts
            ▼
        application orchestrators and module commands
            │  one PostgreSQL transaction
            │  repositories scoped to that transaction
            ├── herd schema
            ├── growth schema
            ├── feeding schema
            ├── inventory schema
            └── finance schema
        read models (SELECT on demand, including cross-schema reads)
        identity schema (sessions, carrying RanchId)
        evidence port
            ├── filesystem adapter (development)
            └── S3-compatible adapter (deployed)
```

`apps/domain-map` is not in this picture. It remains the discovery tool ([ADR-001](adr/ADR-001-domain-maps-as-code.md), [ADR-006](adr/ADR-006-frontend-approach.md)).

## Documents

| Document | Contents |
| --- | --- |
| [technology-stack.md](technology-stack.md) | Selected stack and the decision matrix |
| [repository-structure.md](repository-structure.md) | Future repo shape and import rules |
| [persistence-strategy.md](persistence-strategy.md) | PostgreSQL, schemas, transactions, ids, history, read models |
| [api-strategy.md](api-strategy.md) | Commands, contracts, and the three models |
| [security-baseline.md](security-baseline.md) | Auth, uploads, secrets, backups, least privilege |
| [testing-strategy.md](testing-strategy.md) | The test pyramid and the tools |
| [deployment-strategy.md](deployment-strategy.md) | Local dev, hosting requirements, CI, observability, cost |
| [adr/ADR-005-backend-runtime.md](adr/ADR-005-backend-runtime.md) | TypeScript, Node, Fastify |
| [adr/ADR-006-frontend-approach.md](adr/ADR-006-frontend-approach.md) | React + Vite SPA |
| [adr/ADR-007-postgresql.md](adr/ADR-007-postgresql.md) | One database, schemas, narrow foreign keys |
| [adr/ADR-008-data-access.md](adr/ADR-008-data-access.md) | Drizzle and transaction-scoped repositories |
| [adr/ADR-009-api-style.md](adr/ADR-009-api-style.md) | REST commands and Zod |
| [adr/ADR-010-authentication.md](adr/ADR-010-authentication.md) | Cookie sessions. Library chosen at scaffold |
| [adr/ADR-011-evidence-storage.md](adr/ADR-011-evidence-storage.md) | Filesystem and S3-compatible port |
| [adr/ADR-012-repository-module-enforcement.md](adr/ADR-012-repository-module-enforcement.md) | Directories, public index, import test |
| [adr/ADR-013-ranch-scope.md](adr/ADR-013-ranch-scope.md) | `RanchId` from the first persistence version |

The evaluation that selected the stack is [../plans/010-physical-architecture-v0.1.md](../plans/010-physical-architecture-v0.1.md). The refinement that freezes this baseline is [../plans/011-physical-architecture-refinement-v0.2.md](../plans/011-physical-architecture-refinement-v0.2.md).

## Traceability

| Logical concept | Physical mechanism |
| --- | --- |
| Modular monolith, one deployable | One long-lived Node process ([ADR-005](adr/ADR-005-backend-runtime.md)) |
| Five domain modules | Directories under the future `apps/api`, schemas `herd`, `growth`, `feeding`, `inventory`, `finance` ([ADR-007](adr/ADR-007-postgresql.md), [ADR-012](adr/ADR-012-repository-module-enforcement.md)) |
| One ranch's data | `RanchId` on business rows, on the session, and in the evidence key ([ADR-013](adr/ADR-013-ranch-scope.md)) |
| Application orchestrator | A plain function under `application/` that calls module public functions |
| One local transaction | Persistence opens one transaction and supplies transaction-scoped repositories. Application services see repository interfaces ([ADR-008](adr/ADR-008-data-access.md)) |
| Module does not write another's persistence | Public `index.ts` plus a mandatory import test that blocks another module's `domain/`, `persistence/`, and internal application |
| Shared kernel | `shared-kernel/` inside the API, limited to the allowed primitives, including `RanchId` |
| Read model | SQL query on demand in `read-models/`. Cross-schema `SELECT` only there. No listener, no materialized view |
| Evidence reference | Evidence id on the owning row. Bytes behind the storage port. Key `{ranchId}/{evidenceId}`. Bytes survive correction ([ADR-011](adr/ADR-011-evidence-storage.md)) |
| Audit, `RecordedBy`, `ReportedBy` | Columns on the owning module's rows. `RecordedBy` is the session account. `ReportedBy` is not a user |
| Incorrect fact | Correct the current row and append previous value, actor, time, and reason in the same transaction |
| Legitimate new fact | Insert a new historical record. Leave the previous fact |
| Client-safe id, idempotent command, version | UUID v4 primary key. Command id returns the stored success or HTTP 409 `idempotency_mismatch`. Integer `version` yields HTTP 409 `version_conflict` where updates race |
| Offline-ready command | HTTP command with those ids and versions. No sync queue in the MVP |
| Hardware adapter | A port inside the process. The domain sees a normalized command, not a vendor SDK |
| Authentication port | Session cookie, `identity` schema, role check at HTTP. Library chosen at scaffold ([ADR-010](adr/ADR-010-authentication.md)) |
| Critical notice | A query the owner sees on open (a banner). Delivery after commit. No outbox and no broker |

Domain entities are not mapped to UI components. The UI renders API contracts and its own screen state.

## Frozen for scaffold

- Technology categories and the selected stack
- Conceptual topology in [repository-structure.md](repository-structure.md)
- Database strategy, module schemas, and the single migration stream
- Transaction-scoped repositories
- Correction versus new historical record
- Identifier, decimal, and time conventions
- Session architecture, roles, and session `RanchId`
- Evidence storage port and the rule that bytes are not cascade-deleted
- Public index plus the mandatory Vitest import test
- `RanchId` as application scope, with one seeded ranch

## Still implementation-time

- The final authentication library. Better Auth is the first candidate to try during scaffold
- The route catalog
- The hosting vendor and region
- The exact column catalog and migration files
- The display-code format
- UI component libraries beyond React, TypeScript, and Vite
- The scale protocol
- Offline synchronization
- Alert transport beyond the application UI

## What this design refuses to add

These have no TO-BE justification at the current ranch:

- a service per module, Kubernetes, or a message broker
- event sourcing, temporal tables, a cross-module bus, or a transactional outbox
- one database per module, or a `read_model` schema before a query is shown to be slow
- an arbitrary cross-schema foreign-key graph
- GraphQL or a public tRPC API
- NestJS as the module system
- a global client store
- an offline sync engine or CRDTs
- a managed identity provider, or a frozen Better Auth dependency
- a SaaS tenant model, ranch switcher, or billing
- binaries of photos inside PostgreSQL
- a package per domain module
- migration-on-startup

## Preservation of later change

A module can still be lifted out later because callers use its public index and its tables are already in one schema. Cross-schema foreign keys to Herd identity would be removed or replaced at that extraction. A field client can still appear later because commands carry their own ids and versions. A hardware box on the ranch network would be a new process and would have to satisfy [ADR-002](adr/ADR-002-modular-monolith.md) before it exists. Until then, an adapter is code inside this process.

## Status

- Version: 1 baseline, refined from physical architecture v0.1
- Status: Accepted for implementation. Not an approved product scope. This document does not scaffold
- Last updated: 2026-10-04
- Source: Logical Architecture v1 baseline at `762739b`, physical architecture v0.1 at `0a0f819`, physical architecture QA
- Validation: No production app, schema, or dependency is added by this document
