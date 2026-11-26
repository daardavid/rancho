# Architecture

Logical architecture v0.2 is frozen as the **Logical Architecture v1 baseline**. Physical architecture is frozen as the **Physical Architecture v1 baseline** for implementation. Neither is an approved product scope. The physical baseline does not, by itself, scaffold an application.

The logical baseline is:

- domain modules: Herd, Growth, Feeding, Inventory, Finance
- application orchestrators for cross-module writes, in one local transaction
- read models that query authoritative modules
- transversal evidence, audit, source quality, and capture channel
- the minimal shared kernel, including `RanchId` as application scope

The module list may change later through an ADR. Physical architecture implements this list. It keeps a later extraction possible: public module indexes, one schema per module, and cross-schema foreign keys limited to downstream Herd identity. Those foreign keys would be removed or replaced if a module left the database. The logical text this baseline freezes is commit `762739b06d830146d61084497eff3f1a1edafd18`. The physical refinement is [../plans/011-physical-architecture-refinement-v0.2.md](../plans/011-physical-architecture-refinement-v0.2.md). Module ownership, orchestrators, and read-model rules are unchanged.

## Logical architecture

No physical choice required a change to the boundaries below.

v0.1 proposed seven domain modules. QA kept the modular monolith and replaced that cut with five. The method of the refinement is [../plans/009-logical-architecture-refinement-v0.2.md](../plans/009-logical-architecture-refinement-v0.2.md). The v0.1 method remains [../plans/008-logical-architecture-v0.1.md](../plans/008-logical-architecture-v0.1.md) as history. The physical evaluation is [../plans/010-physical-architecture-v0.1.md](../plans/010-physical-architecture-v0.1.md). The physical freeze is [../plans/011-physical-architecture-refinement-v0.2.md](../plans/011-physical-architecture-refinement-v0.2.md).

The facts remain in [../domain/README.md](../domain/README.md). The current operation remains in [../maps/as-is/README.md](../maps/as-is/README.md). The desired operation remains TO-BE v0.2 at commit `13c4ef2ff067404af5fa76141986b863d5cd18c5`.

[ADR-001](adr/ADR-001-domain-maps-as-code.md) still governs the discovery maps in `apps/domain-map`. Those maps are not modules of this system. The ARCHITECTURE tab of that application stays a placeholder; this folder does not implement it.

## Recommendation

A modular monolith with explicit domain modules ([ADR-002](adr/ADR-002-modular-monolith.md)).

Five domain modules:

| Module | Class | Role |
| --- | --- | --- |
| Herd | Core | Identity, tenure, lifecycle, paddock references, expected location, verification, confirmed missing, parentage records, health records |
| Feeding | Core | Prepared batches and deliveries, each with its own quality. Purchased kilograms are not copied here |
| Growth | Supporting | Weighing sessions and weights |
| Inventory | Supporting | Movements, receipts, issues, counts, derived balance. Ingredients first |
| Finance | Supporting | Expenses, purchase cost, sale income, explicit allocations |

Parentage, health notes, paddock references, and herd verification are supporting records inside Herd. They are not modules.

Management views, including provisional profitability and the weekly summary, are read models. Evidence, audit, source quality, and capture channel are transversal. Cross-module captures are application orchestrators in one local transaction ([ADR-003](adr/ADR-003-application-orchestration.md)). A cross-module event bus is not required ([ADR-004](adr/ADR-004-no-cross-module-event-bus-yet.md)). Scales, cameras, messaging, account import, authentication, and file bytes are ports.

Rejected as standalone contexts: Reproduction, Health, Presence, Security, Land, Reporting, Analytics, Evidence, Milk, and a shared business dump.

## Logical documents

| Document | Contents |
| --- | --- |
| [architecture-principles.md](architecture-principles.md) | The fifteen working principles |
| [system-context.md](system-context.md) | People, the current message path, future external boxes |
| [domain-boundaries.md](domain-boundaries.md) | Five modules, records inside Herd, aggregates, traceability, change scenarios |
| [context-map.md](context-map.md) | Dependencies, orchestrators, transaction rules |
| [data-ownership.md](data-ownership.md) | One owner per business fact |
| [domain-events.md](domain-events.md) | Why no cross-module event backbone is required |
| [cross-cutting-concerns.md](cross-cutting-concerns.md) | Evidence, audit, quality, corrections, shared kernel |
| [offline-readiness.md](offline-readiness.md) | Id and command constraints. Sync is not designed |
| [integrations.md](integrations.md) | Adapters inward. No vendor packages in the domain |
| [architecture-open-questions.md](architecture-open-questions.md) | P0 closed. Technology P1 closed. Vendor, feeding-group id, and scaffold-time library still open |
| [adr/ADR-002-modular-monolith.md](adr/ADR-002-modular-monolith.md) | Deployment style. The module list is not part of the decision |
| [adr/ADR-003-application-orchestration.md](adr/ADR-003-application-orchestration.md) | Who coordinates a capture that writes more than one module |
| [adr/ADR-004-no-cross-module-event-bus-yet.md](adr/ADR-004-no-cross-module-event-bus-yet.md) | No broker and no required published catalog |

## Physical documents

| Document | Contents |
| --- | --- |
| [physical-architecture.md](physical-architecture.md) | Runtime picture and logical-to-physical map |
| [technology-stack.md](technology-stack.md) | Selected stack and decision matrix |
| [repository-structure.md](repository-structure.md) | Future tree and import rules |
| [persistence-strategy.md](persistence-strategy.md) | PostgreSQL, transactions, history, read models |
| [api-strategy.md](api-strategy.md) | Command-oriented REST and contracts |
| [security-baseline.md](security-baseline.md) | Controls for a few users |
| [testing-strategy.md](testing-strategy.md) | Test pyramid |
| [deployment-strategy.md](deployment-strategy.md) | Local development, hosting requirements, CI, cost |
| [adr/ADR-005-backend-runtime.md](adr/ADR-005-backend-runtime.md) | TypeScript, Node.js, Fastify |
| [adr/ADR-006-frontend-approach.md](adr/ADR-006-frontend-approach.md) | React + Vite SPA, separate from the domain map |
| [adr/ADR-007-postgresql.md](adr/ADR-007-postgresql.md) | One database, one schema per domain module, narrow cross-schema foreign keys |
| [adr/ADR-008-data-access.md](adr/ADR-008-data-access.md) | Drizzle and transaction-scoped repositories |
| [adr/ADR-009-api-style.md](adr/ADR-009-api-style.md) | Command-oriented REST and Zod |
| [adr/ADR-010-authentication.md](adr/ADR-010-authentication.md) | Cookie sessions. Library chosen at scaffold |
| [adr/ADR-011-evidence-storage.md](adr/ADR-011-evidence-storage.md) | Filesystem in development, S3-compatible when deployed |
| [adr/ADR-012-repository-module-enforcement.md](adr/ADR-012-repository-module-enforcement.md) | Directories, public index, import test |
| [adr/ADR-013-ranch-scope.md](adr/ADR-013-ranch-scope.md) | `RanchId` from the first persistence version. Not SaaS |
| [adr/ADR-014-local-test-database.md](adr/ADR-014-local-test-database.md) | Proposed. Persistence tests on embedded PostgreSQL locally, one fresh database per test file on the PostgreSQL service in CI |
| [adr/ADR-015-local-embedded-postgresql.md](adr/ADR-015-local-embedded-postgresql.md) | Proposed. Single-user local mode runs on embedded PostgreSQL with a data folder. Production stays managed PostgreSQL (ADR-007) |
| [adr/ADR-016-publicacion.md](adr/ADR-016-publicacion.md) | Proposed. Free publication: Render web service plus Neon Postgres. Does not publish, and does not close AQ-P1-006 until accepted |

Physical ADRs are accepted as the Physical Architecture v1 baseline. They do not scaffold the application.

## Status

- Logical version: 0.2, frozen as the Logical Architecture v1 baseline
- Physical version: 1 baseline, refined from physical architecture v0.1
- Status: Accepted for implementation. Not an approved product scope and not a scaffold performed by this folder
- Last updated: 2026-10-04
- Source: logical architecture v0.2 at `762739b`, physical architecture v0.1 at `0a0f819`, physical architecture QA, `docs/domain` v0.1, TO-BE v0.2 at `13c4ef2`
- Validation: Ranch-owner validation of the domain remains pending. No production app is created by this folder
