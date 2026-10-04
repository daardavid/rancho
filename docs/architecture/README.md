# Logical architecture v0.1

Software structure for the future ranch management system. It is a proposal for architecture QA. It is not an approved scope, not a schema, and not a framework choice.

The method is [../plans/008-logical-architecture-v0.1.md](../plans/008-logical-architecture-v0.1.md). The facts remain in [../domain/README.md](../domain/README.md). The current operation remains in [../maps/as-is/README.md](../maps/as-is/README.md). The desired operation remains TO-BE v0.2 at commit `13c4ef2ff067404af5fa76141986b863d5cd18c5`.

[ADR-001](adr/ADR-001-domain-maps-as-code.md) still governs the discovery maps in `apps/domain-map`. Those maps are not modules of this system. The ARCHITECTURE tab of that application stays a placeholder; this folder does not implement it.

## Recommendation

A modular monolith with explicit domain modules ([ADR-002](adr/ADR-002-modular-monolith.md)).

Seven modules:

| Module | Class | Role |
| --- | --- | --- |
| Herd | Core | Identity, tenure, lifecycle, paddocks, expected location, herd verification |
| Feeding | Core | Purchased, prepared, declared, and measured diet quantities |
| Growth | Supporting | Weighing sessions and weights |
| Inventory | Supporting | Movements, counts, derived balance. Ingredients first |
| Finance | Supporting | Expenses, purchase cost, sale income, explicit allocations |
| Reproduction | Supporting | Parentage certainty and inference reason |
| Health | Supporting | Sanitary notes |

Management views, including provisional profitability and the weekly summary, are read models. Evidence, audit, and source quality are transversal. Scales, cameras, messaging, account import, authentication, and file bytes are ports.

Rejected as standalone contexts: Presence (last observation is a projection; verification stays in Herd), Security (no adopted implementation), Land (not enough rules; owned inside Herd for now), Reporting, Analytics, Evidence, Milk, and a shared business dump.

## Documents

| Document | Contents |
| --- | --- |
| [architecture-principles.md](architecture-principles.md) | The fifteen working principles |
| [system-context.md](system-context.md) | People, the current message path, future external boxes |
| [domain-boundaries.md](domain-boundaries.md) | Boundary tests, classification, aggregates, traceability |
| [context-map.md](context-map.md) | Upstream, downstream, and where a transaction or an event is used |
| [data-ownership.md](data-ownership.md) | One owner per business fact |
| [domain-events.md](domain-events.md) | Published events, and the refusal of event sourcing |
| [cross-cutting-concerns.md](cross-cutting-concerns.md) | Evidence, audit, quality, corrections, capture-once commands |
| [offline-readiness.md](offline-readiness.md) | Id and command constraints. Sync is not designed |
| [integrations.md](integrations.md) | Adapters inward. No vendor packages in the domain |
| [architecture-open-questions.md](architecture-open-questions.md) | P0, P1, and P2 |
| [adr/ADR-002-modular-monolith.md](adr/ADR-002-modular-monolith.md) | Deployment style |

## Status

- Version: 0.1
- Status: Logical architecture proposal. Ready for architecture QA
- Last updated: 2026-10-04
- Source: `docs/domain` v0.1, AS-IS v0.2, TO-BE v0.2 at `13c4ef2`
- Validation: Pending architecture QA. Ranch-owner validation of the domain remains pending. No production implementation is authorized by this folder
