# Physical architecture v0.1

How the frozen logical architecture runs as one application. This document is the map. The decisions sit in the ADRs and the linked strategy documents. Nothing here creates a process, a database, or a screen.

Logical architecture v0.2, commit `762739b06d830146d61084497eff3f1a1edafd18`, is frozen as the **Logical Architecture v1 baseline**. Physical technology did not force a boundary change. The baseline the implementation must follow is:

- domain modules: Herd, Growth, Feeding, Inventory, Finance
- application orchestrators for cross-module writes
- read models that query
- transversal evidence, audit, source quality, and capture channel
- the minimal shared kernel

The module list can still change later through an ADR. This physical design implements the list above. It does not make a later extraction impossible: modules have a public index, their tables sit in separate schemas, and cross-schema foreign keys are not used.

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
            ├── herd schema
            ├── growth schema
            ├── feeding schema
            ├── inventory schema
            └── finance schema
        read models (SELECT on demand)
        identity schema (sessions)
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
| [adr/ADR-007-postgresql.md](adr/ADR-007-postgresql.md) | One database, schemas |
| [adr/ADR-008-data-access.md](adr/ADR-008-data-access.md) | Drizzle and the transaction handle |
| [adr/ADR-009-api-style.md](adr/ADR-009-api-style.md) | REST commands and Zod |
| [adr/ADR-010-authentication.md](adr/ADR-010-authentication.md) | Library-based sessions |
| [adr/ADR-011-evidence-storage.md](adr/ADR-011-evidence-storage.md) | Filesystem and S3-compatible port |
| [adr/ADR-012-repository-module-enforcement.md](adr/ADR-012-repository-module-enforcement.md) | Directories, public index, import test |

The evaluation that produced these choices is [../plans/010-physical-architecture-v0.1.md](../plans/010-physical-architecture-v0.1.md).

## Traceability

| Logical concept | Physical mechanism |
| --- | --- |
| Modular monolith, one deployable | One long-lived Node process ([ADR-005](adr/ADR-005-backend-runtime.md)) |
| Five domain modules | Directories under the future `apps/api`, schemas `herd`, `growth`, `feeding`, `inventory`, `finance` ([ADR-007](adr/ADR-007-postgresql.md), [ADR-012](adr/ADR-012-repository-module-enforcement.md)) |
| Application orchestrator | A plain function under `application/` that calls module public functions |
| One local transaction | Drizzle `transaction` handle passed into those functions ([ADR-008](adr/ADR-008-data-access.md)) |
| Module does not write another's persistence | Public `index.ts` plus an import test that blocks `domain/` and `persistence/` imports |
| Shared kernel | `shared-kernel/` inside the API, limited to the allowed primitives |
| Read model | SQL query on demand in `read-models/`. No listener, no materialized view yet |
| Evidence reference | Evidence id on the owning row. Bytes behind the storage port ([ADR-011](adr/ADR-011-evidence-storage.md)) |
| Audit, `RecordedBy`, `ReportedBy` | Columns on the owning module's rows. `RecordedBy` is the session account. `ReportedBy` is not a user |
| History and corrections | Current row plus append-only history in the same schema, same transaction |
| Client-safe id, idempotent create, version | UUID v4 primary key, repeat-safe insert, integer `version` on mutable rows |
| Offline-ready command | HTTP command with those ids and versions. No sync queue in the MVP |
| Hardware adapter | A port inside the process. The domain sees a normalized command, not a vendor SDK |
| Authentication port | Session cookie, `identity` schema, role check at HTTP ([ADR-010](adr/ADR-010-authentication.md)) |
| Critical notice | A query the owner sees on open (a banner). Delivery after commit. No outbox and no broker |

Domain entities are not mapped to UI components. The UI renders API contracts and its own screen state.

## What this design refuses to add

These have no TO-BE justification at the current ranch:

- a service per module, Kubernetes, or a message broker
- event sourcing, a cross-module bus, or a transactional outbox
- one database per module
- GraphQL or a public tRPC API
- NestJS as the module system
- a global client store
- an offline sync engine or CRDTs
- a managed identity provider
- binaries of photos inside PostgreSQL
- materialized read models before a query is shown to be slow
- a package per domain module

## Preservation of later change

A module can still be lifted out later because callers use its public index, its tables are already in one schema, and other modules do not hold foreign keys into that schema. A field client can still appear later because commands carry their own ids and versions. A hardware box on the ranch network would be a new process and would have to satisfy [ADR-002](adr/ADR-002-modular-monolith.md) before it exists. Until then, an adapter is code inside this process.

## Status

- Version: 0.1
- Status: Proposed physical architecture. Pending physical architecture QA. Not an authorization to scaffold
- Last updated: 2026-10-04
- Source: Logical Architecture v1 baseline at `762739b`
- Validation: No production app, schema, or dependency is added by this document
