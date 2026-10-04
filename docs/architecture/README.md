# Logical architecture v0.2

Software structure for the future ranch management system, refined after architecture QA. It is not an approved scope, not a schema, and not a framework choice.

v0.1 proposed seven domain modules. QA kept the modular monolith and replaced that cut with five. The method of the refinement is [../plans/009-logical-architecture-refinement-v0.2.md](../plans/009-logical-architecture-refinement-v0.2.md). The v0.1 method remains [../plans/008-logical-architecture-v0.1.md](../plans/008-logical-architecture-v0.1.md) as history.

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

## Documents

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
| [architecture-open-questions.md](architecture-open-questions.md) | Closed P0, open P1 and P2 |
| [adr/ADR-002-modular-monolith.md](adr/ADR-002-modular-monolith.md) | Deployment style. The module list is not part of the decision |
| [adr/ADR-003-application-orchestration.md](adr/ADR-003-application-orchestration.md) | Who coordinates a capture that writes more than one module |
| [adr/ADR-004-no-cross-module-event-bus-yet.md](adr/ADR-004-no-cross-module-event-bus-yet.md) | No broker and no required published catalog |

## Status

- Version: 0.2
- Status: Refined logical architecture. Not an approved scope and not an implementation authorization
- Last updated: 2026-10-04
- Source: architecture v0.1 at `47420fe`, architecture QA, `docs/domain` v0.1, TO-BE v0.2 at `13c4ef2`
- Validation: Architecture QA findings applied. Ranch-owner validation of the domain remains pending. No production implementation is authorized by this folder
