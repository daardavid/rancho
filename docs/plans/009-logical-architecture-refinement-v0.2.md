# 009 — Logical architecture refinement v0.2

## Objective

Refine the logical architecture from v0.1 to v0.2, and stop there.

Architecture QA accepted the modular monolith in [ADR-002](../architecture/adr/ADR-002-modular-monolith.md) and rejected the seven-module cut. This plan applies that refinement. It does not approve a product scope, close an interview question, or choose an implementation stack.

`docs/domain` remains the factual source. AS-IS v0.2 remains the current operation. TO-BE v0.2, as of commit `13c4ef2ff067404af5fa76141986b863d5cd18c5`, remains the desired operating model. This plan does not change those semantics. v0.1 remains the historical proposal in [008-logical-architecture-v0.1.md](008-logical-architecture-v0.1.md). If a module list here ever diverges from the architecture documents, the architecture documents are the refined proposal.

## Baseline

| Input | Role in this refinement |
| --- | --- |
| Logical architecture v0.1 at `47420febdadf02de7ea9ffa7d6cc921275027c7d` | The proposal under refinement |
| Architecture QA | Accepted ADR-002. Replaced seven domain modules with five. The P0 decisions below are the default direction |
| `docs/domain` v0.1 | Facts that this refinement must not invent or close |
| `docs/maps/to-be` v0.2 at `13c4ef2` | Capabilities and target processes the cut must still house |
| [ADR-002](../architecture/adr/ADR-002-modular-monolith.md) | Deployment style stays Accepted. The module list is not a clause of that ADR |

Known scale is unchanged: about 21 head, about two workers, one owner who records from a distance, a two-person hobby team, and a weekly management cadence (`BR-CADENCE-001`, `CON-ENTRY-001`).

## What QA decided, and what this pass checked

QA's P0 direction, applied as the default:

1. Five domain modules: Herd, Growth, Feeding, Inventory, Finance. Reproduction and Health are not standalone modules. No new module is added to compensate.
2. Herd owns roster and lifecycle facts, and owns parentage, health notes, paddock references, expected-location history, herd verification, and confirmed-missing assertions as records beside a narrow Animal.
3. Feeding starts at preparation and delivery. The purchased quantity is the Inventory receipt of the feed-purchase workflow, not a third copy.
4. Inventory stays independent of Feeding. Finance owns explicit money and explicit attribution. Provisional profitability stays a read model.
5. Cross-module atomic workflows are application orchestrators in one local transaction. A cross-module event bus is not required.

Consistency checks applied while writing v0.2, without reopening those decisions:

- `CAP-FEED-001` still distinguishes purchased, prepared, declared delivery, measured delivery, and physical remnant. v0.2 gives purchased quantity one authority: the Inventory receipt, with source quality on that receipt. Prepared and delivered quantities stay in Feeding. The remnant stays a count. The weekly summary can still say which of the five exists. A Feeding aggregate that repeated the ticket kilograms would violate capture-once.
- Birth stays one capture (`TGT-BIRTH-001`). It is one Herd application operation, because both the animal and the parentage record now belong to Herd. It is not a cross-module orchestrator.
- A sale of identified managed animals stays one capture (`TGT-SALE-001`). A commercial lote with no identified heads may exist in Finance without invented exits. That case is already allowed for purchases (`TGT-PUR-001`) and for a future bulto sale (`BR-SALE-002`, `OQ-TRADE-001`). The refinement does not define what «bulto» means.
- Confirmed missing while the animal stays active is already in `TGT-HERD-VERIFY-001` and `TGT-ANIMAL-EXIT-001`. Naming that assertion `ConfirmedMissingAssertion` is a structuring choice. It adds no ranch rule.
- Parentage certainty is enforced by Herd's parentage operation on `ParentageRecord`. Withholding the "aggregate root" label does not fold the mother or the father into columns on Animal.
- No new P0 blocker appeared. The open domain questions stay open.

## Boundary changes from v0.1

| v0.1 | v0.2 |
| --- | --- |
| Seven domain modules, including Reproduction and Health | Five domain modules |
| Reproduction owns `ParentageRecord` | Herd owns `ParentageRecord` as a historical record |
| Health owns `HealthEvent` | Herd owns `HealthEvent` as a historical record |
| `Paddock` described as a small aggregate-like reference, hectares optional | `PaddockReference` is Herd reference data. It is not an aggregate root. Hectares, carrying capacity, water, pasture, lease rules, and GPS are out of the record |
| Expected location as assignments on Animal | `LocationAssignment` is its own historical record. The current expected place is the latest assignment |
| Confirmed missing, still active, left as an open record shape (`AQ-P0-004`) | `ConfirmedMissingAssertion` is the Herd record. It does not inactivate the animal |
| `FeedPurchaseQuantity` in Feeding | Removed. Purchased quantity and its quality live on the Inventory receipt produced with the expense |
| Published cross-module event catalog required, including `FeedQuantityPurchased` | No required cross-module event backbone. `FeedQuantityPurchased` is withdrawn |
| Application commands mentioned as composition | Application orchestrators are a named part of the architecture ([ADR-003](../architecture/adr/ADR-003-application-orchestration.md)) |
| In-process events as the normal way readers hear facts | Readers query authoritative modules. Internal module events may still exist. No broker ([ADR-004](../architecture/adr/ADR-004-no-cross-module-event-bus-yet.md)) |

Unchanged on purpose: ADR-002 stays Accepted. Growth, Inventory, and Finance stay separate. Evidence and audit stay transversal. Intrusion, milk, land economics, and reporting stay out of the module list. Last observation stays a projection. Provisional profitability stays a read model.

## Aggregate changes

Likely aggregate roots in v0.2:

| Module | Roots |
| --- | --- |
| Herd | `Animal` |
| Growth | `WeighingSession` |
| Feeding | `FeedBatch`, `FeedDelivery` |
| Inventory | `StockItem` |
| Finance | `Expense`, `CattlePurchase`, `Sale` |

Withdrawn as aggregate roots: `Paddock` / `PaddockReference`, `HerdVerification`, `ParentageRecord`, `HealthEvent`, `PhysicalCount`, `LocationAssignment`, `ConfirmedMissingAssertion`, `FeedPurchaseQuantity`.

"Not an aggregate root" means the concept is not the consistency root through which the rest of its module is edited. It does not mean the record is embedded as columns on another root, and it does not mean the record lacks its own identity. Parentage, health, verification, location, confirmed missing, and physical counts are independently persisted historical records. Their invariants are enforced by the owning module's application operation.

`Animal` stays the roster file: identity, marks, sex and category when known, tenure, economic-participation descriptor, active flag, exit reason. It does not carry mother, father, treatments, last observation, or a single overwritten paddock cell.

## Orchestration model

A cross-module business capture is coordinated by the application layer. An orchestrator calls public application interfaces of more than one module inside one local transaction.

Domain modules do not write another module's persistence and do not call another module to perform a write.

Conceptual orchestrators, not production code:

| Orchestrator | Calls |
| --- | --- |
| `RecordCattleSale` | `Finance.recordSale()`, then `Herd.exitAnimals()` when the command names managed animals |
| `RecordFeedPurchase` | `Finance.recordExpense()`, `Inventory.receiveStock()` |
| `PrepareFeedBatch` | `Feeding.prepareBatch()`, and `Inventory.issueStock()` when the command claims a warehouse draw |
| `RecordCattlePurchase` | `Finance.recordPurchase()`, and `Herd.registerAnimals()` only when individual heads are known |

Intra-Herd captures are Herd application operations, not cross-module orchestrators: birth (animal and parentage), parentage correction, health note, location assignment, herd verification, confirmed-missing assertion, exit that is not part of a sale.

Growth weighing, a Finance-only expense, a Feeding-only delivery, and an Inventory count do not need a second module.

Detail: [ADR-003](../architecture/adr/ADR-003-application-orchestration.md) and [context-map.md](../architecture/context-map.md).

## Transaction-boundary changes

| Capture | v0.1 | v0.2 |
| --- | --- | --- |
| Sale of named managed animals | Finance and Herd, one local transaction | Same, and now an explicit rule: `Sale` and `AnimalExit` commit together or not at all |
| Sale or lote with no identified heads | Not separated from the named-animal case | Finance may commit the commercial transaction alone. Exits are not invented. A later link is an explicit follow-up |
| Birth | Herd plus Reproduction | One Herd transaction: `Animal` and `ParentageRecord`. Unknown parentage is a valid stored value |
| Feed purchase | Feeding, Inventory, and Finance | Finance and Inventory only. Feeding is not called to store the purchased kilograms again |
| Feed batch that also draws stock | Feeding and Inventory, one transaction | Same participants. When one command claims both the batch and the stock issue, those two writes should commit together. A batch with no warehouse draw stays Feeding alone |
| Declared delivery | Feeding alone | Unchanged. A declaration does not create a stock issue |
| Weighing | Growth writes; projection follows | Growth persistence does not depend on the last-observation projection |
| Confirmed missing | Record shape was open | The assertion commits in Herd. Notification delivery may happen later and may fail without rolling the assertion back |

## Presence and missing semantics

Seven ideas that v0.1 left too close together are separate in v0.2:

| Concept | Kind | Effect on the animal |
| --- | --- | --- |
| Last observation | Projection, normalized in the read layer | None. It does not write Herd |
| Expected location | Authoritative `LocationAssignment` | None. A desk assignment is not a sighting |
| Herd verification | Authoritative Herd historical record | None by itself. The method stays open (`OQ-COUNT-001`) |
| Not confirmed during verification | Result inside that verification | Does not exit the animal and does not count as an observation |
| Suspected missing | `MissingAnimalRiskView` only | None. The view never writes Herd |
| Confirmed missing | `ConfirmedMissingAssertion` by an authorized person, with who, when, and context | Does not automatically inactivate |
| Animal exit | Lifecycle transition on `Animal` | Inactive, with a reason. Confirmed missing may later be that reason. History remains |

Inputs that may feed the observation projection: a weight whose animal identity was confirmed, a herd verification that confirmed presence, a health record that states the animal was seen. Location assignment, a weighing gap, a "not confirmed" result, and an administrative edit do not count. There is no universal `AnimalObserved` event.

## Event simplification

v0.1 required a published catalog so read models could listen. v0.2 withdraws that requirement. Atomic cross-module work uses orchestrators. Read models query authoritative data. Modules may use internal events for clarity. Nothing requires a broker, an event bus, publication of every write, or event sourcing. `FeedQuantityPurchased` is removed with `FeedPurchaseQuantity`. A cross-module event can be introduced later when a real consumer must react asynchronously and a query or an orchestrator is the wrong mechanism. That later step is a new decision, not a hidden default. See [ADR-004](../architecture/adr/ADR-004-no-cross-module-event-bus-yet.md).

## Read-model rules

Kept: `WeeklyRanchSummary`, `AnimalGrowthView`, `ProvisionalProfitabilityView`, `InventoryVarianceView`, `MissingAnimalRiskView`.

`ProvisionalProfitabilityView` may sum known, explicitly allocated Finance facts, expose unallocated costs, show completeness, repeat source quality, read Herd tenure labels, and use feed-quantity quality as a gate. It may not invent an allocation, prorate, assume 50/50, calculate the rancher's share while `OQ-OWN-001` is open, write a margin back to Finance, Sale, or Animal, or manufacture cost per kilogram when feed quantity quality is inadequate.

A future allocation rule belongs in authoritative Finance logic first. The view then reads the result.

`MissingAnimalRiskView` may show suspected risk. It does not create a confirmed-missing assertion and does not exit an animal.

Last observation is projection infrastructure used by the weekly summary and the risk view. It is not a sixth domain module.

Materialized tables versus calculation on read stays [AQ-P1-008](../architecture/architecture-open-questions.md). The preference at the current scale is to avoid materializing until a need is shown. That preference is not a database decision.

## Shared-kernel boundary

Allowed stable concepts: `AnimalId`, `PaddockId`, evidence reference, source quality (`declared`, `observed`, `measured`), recorded-time primitives, optimistic version, `RecordedBy`, `ReportedBy`.

`RecordedBy` is the application actor who entered the fact. `ReportedBy` is the optional real-world source, such as a worker or a channel. They stay distinct when the owner types what a worker reported.

Excluded: `Animal`, `Expense`, `FeedBatch`, profitability helpers, generic business services, feature DTOs, and any `common` pile of ranch nouns. Orchestrators live in the application layer, not in the kernel.

## Files to change

| File | Change |
| --- | --- |
| [../architecture/README.md](../architecture/README.md) | Five-module recommendation, v0.2 status, ADR index |
| [../architecture/architecture-principles.md](../architecture/architecture-principles.md) | Ownership, communication, capture-once, shared kernel, transactions |
| [../architecture/system-context.md](../architecture/system-context.md) | Module list inside the boundary |
| [../architecture/domain-boundaries.md](../architecture/domain-boundaries.md) | The cut, records, aggregates, classification, traceability, scenarios |
| [../architecture/context-map.md](../architecture/context-map.md) | Dependencies, orchestrators, transaction rules |
| [../architecture/data-ownership.md](../architecture/data-ownership.md) | One owner per fact after the merges and the feed-purchase move |
| [../architecture/domain-events.md](../architecture/domain-events.md) | Withdraw the required catalog |
| [../architecture/cross-cutting-concerns.md](../architecture/cross-cutting-concerns.md) | Evidence, audit actors, kernel, command list |
| [../architecture/offline-readiness.md](../architecture/offline-readiness.md) | Status only. Constraints stand |
| [../architecture/integrations.md](../architecture/integrations.md) | Five modules on the dependency arrow |
| [../architecture/architecture-open-questions.md](../architecture/architecture-open-questions.md) | P0 closed. P1 and P2 retained |
| [../architecture/adr/ADR-002-modular-monolith.md](../architecture/adr/ADR-002-modular-monolith.md) | Consequences mention the five-module cut without freezing the list into the ADR |
| [../architecture/adr/ADR-003-application-orchestration.md](../architecture/adr/ADR-003-application-orchestration.md) | New |
| [../architecture/adr/ADR-004-no-cross-module-event-bus-yet.md](../architecture/adr/ADR-004-no-cross-module-event-bus-yet.md) | New |
| [008-logical-architecture-v0.1.md](008-logical-architecture-v0.1.md) | Output marked historical |

Not changed: `docs/domain`, `docs/maps/as-is`, `docs/maps/to-be`, `apps/domain-map`, package manifests, lockfiles.

## Non-goals

- Backend code, production module folders, schemas, migrations, or the ARCHITECTURE tab.
- Choosing a database, an ORM, a language, a framework, a cloud, or an object store.
- A message broker, event sourcing, or a required cross-module event catalog.
- Offline synchronization, CRDTs, or a worker field client.
- Mating history, breeding windows, reproductive protocols, vaccination calendars, withdrawal periods, dosing rules, or a veterinarian workflow.
- Hectares, carrying capacity, water, pasture, lease economics, or GIS.
- Automatic proration, «a la parte» settlement, or a translation of «bulto» into a head price.
- Medicine, tools, or other warehouse categories beyond documenting that Inventory can hold them later.
- Milk, intrusion implementation, and feed-strategy comparison (`CAP-FEED-002`).
- Closing `OQ-*` or `DQ-*` questions, or rewriting AS-IS or TO-BE meanings.

## Final validation criteria

v0.2 is consistent when all of the following hold:

1. Exactly five current domain modules are proposed.
2. Herd's Animal stays a narrow roster aggregate. Parentage, health, location, verification, confirmed missing, and paddock reference are sibling records.
3. Reproduction and Health are not modules. Their history is appendable and correctable inside Herd.
4. Inventory is not a submodule of Feeding.
5. A feed purchase does not store purchased kilograms in Feeding as well as on the receipt.
6. Finance owns explicit attribution. Nothing prorates while the rule is unknown.
7. The profitability view cannot invent an allocation or write a margin back.
8. Application orchestrators own cross-module writes. Modules do not write each other's persistence.
9. Identified sales and births have atomicity rules. Unidentified commercial sales and unidentified purchase lots do not invent animals or exits.
10. The presence projection cannot change Herd lifecycle.
11. Expected location does not count as an observation.
12. No cross-module event bus is required. `FeedQuantityPurchased` is gone.
13. The shared kernel stays the allowed list above.
14. Evidence stays transversal. A photo does not upgrade declared data to measured.
15. No technology stack is selected.
16. No ranch unknown is resolved. `OQ-OWN-001`, `OQ-FEED-002`, `OQ-TRADE-001`, `OQ-COUNT-001`, `OQ-SEC-001`, and the other open domain questions stay open.
17. `apps/domain-map` and the package manifests are unchanged. The ARCHITECTURE tab remains a placeholder.

## Status

- Version: 0.2
- Status: Refinement plan of record. Not an approved scope
- Last updated: 2026-10-04
- Source: logical architecture v0.1 at `47420fe`, architecture QA, `docs/domain` v0.1, TO-BE v0.2 at `13c4ef2`
- Validation: Applied in `docs/architecture` v0.2. Ranch-owner validation of the domain remains pending
