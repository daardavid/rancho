# Context map

How the modules of [domain-boundaries.md](domain-boundaries.md) relate. Upstream owns a fact. Downstream uses it.

No relationship in this map requires a separate service, a message broker, or a published event. Inside the monolith, a cross-module write is an application orchestrator calling public module interfaces in one local transaction ([ADR-003](adr/ADR-003-application-orchestration.md)). A read is a query. See [ADR-004](adr/ADR-004-no-cross-module-event-bus-yet.md).

## Dependency direction

```text
UI / owner-facing application
        │
        ▼
application orchestrators and module operations
(one capture, one local transaction)
        │
        ├── Herd
        ├── Growth
        ├── Feeding
        ├── Inventory
        └── Finance
                │
                ▼
        read models and alert policy
        (query only; nothing above depends on them)

adapters ── inward ──▶ application ports ──▶ domain modules
```

Domain modules do not depend on the UI, on read models, or on adapters.

A domain module does not write another module's persistence and does not call another module to perform a write. Allowed knowledge across modules is a stable id plus, rarely, a public query. The caller's domain model does not include the callee's entities.

Prefer an id the orchestrator has already validated. A query is for the case where the module itself must see a current fact, such as which animals are still active when a weighing session is opened.

| From | May depend on | Must not |
| --- | --- | --- |
| Herd | Shared kernel only | Write Finance, Inventory, Feeding, or Growth. Read a profitability view or a risk view to decide an exit |
| Growth | `AnimalId`. A public Herd query for active-animal information where the session needs it | Update `Animal`. Read profitability or the weekly summary to decide a weight. Depend on the last-observation projection in order to persist |
| Feeding | `PaddockId` when a delivery names a place. A public Herd query to resolve a paddock label if the orchestrator did not pass one. A stock-movement id as a reference after the orchestrator | Write stock rows or expense rows. Treat a paddock query as an observation. Store purchased kilograms |
| Inventory | Capture id, and a `FeedBatch` id or health-event id when the orchestrator supplies it as a reference | Feed quality rules, prices, Feeding tables |
| Finance | `AnimalId` and `PaddockId` as attribution or sale targets supplied to the command | The active flag, parentage, herd tables, weights as editable copies |
| Read models | Queries against any module | Be imported by a domain module. Write a source module |
| Adapters | Inward ports | Be imported by a domain module |

There is no accepted domain-module dependency cycle. Couplings that span two modules are orchestrators above them, not modules calling each other in a loop.

Herd does not write Finance. Finance does not write Herd tables. Inventory does not write Feeding. Feeding does not write Inventory tables. No domain module depends on reporting. Domain logic does not call a vendor API.

## Shared kernel

Upstream and downstream both conform to the kernel in [cross-cutting-concerns.md](cross-cutting-concerns.md):

- `AnimalId`, `PaddockId`
- evidence reference
- source quality: declared, observed, measured
- recorded-time primitives
- optimistic version
- `RecordedBy`, `ReportedBy`

Business rules do not live there. The kernel is not a Commons module and not a home for orchestrators.

## Orchestrators

These names are conceptual. They are not production code.

| Orchestrator | When | Calls |
| --- | --- | --- |
| `RecordCattleSale` | The capture claims a sale | `Finance.recordSale()`. `Herd.exitAnimals()` only for managed animals the command identifies |
| `RecordFeedPurchase` | The capture claims an expense and a warehouse receipt | `Finance.recordExpense()`, `Inventory.receiveStock()` |
| `PrepareFeedBatch` | The capture claims a prepared batch and, when applicable, a stock issue | `Feeding.prepareBatch()`, `Inventory.issueStock()` when the command claims the draw |
| `RecordCattlePurchase` | The capture claims a cattle purchase | `Finance.recordPurchase()`. `Herd.registerAnimals()` only when individual heads are known |

Herd-only operations, not orchestrators: register an animal that is already identified outside a purchase, record a birth, correct parentage, record a health event, assign an expected location, record a verification, assert confirmed missing, exit an animal for a reason other than an identified sale.

Growth-only: record a weighing session. Finance-only: record an expense that is not a feed receipt. Feeding-only: record a delivery, or a batch that does not draw stock. Inventory-only: record a receipt or issue that is not part of those captures, and record a physical count.

A future medicine issue beside a health note would be a new orchestrator over Herd and Inventory. It is not part of v0.2.

## Transaction rules

The local transaction is the consistency mechanism. A published event is not.

### Sale

If the sale command identifies managed animals, `Sale` and the `AnimalExit` for those animals commit atomically. One failure rolls both back. Finance stores the income. Herd stores the inactive state, the reason sale, and a reference to the sale. There is no second exit form.

If a commercial sale or lote exists without identified individual animals, Finance may record that commercial transaction and stop. The orchestrator does not invent exits and does not invent animal files. «Bulto» stays an untranslated form (`OQ-TRADE-001`).

Linking heads later, or exiting them later, is an explicit follow-up. When that follow-up identifies managed animals and exits them, the link and those exits commit together. The follow-up does not rewrite the original income.

### Birth

Inside Herd, `Animal` and `ParentageRecord` commit atomically. Unknown parentage is an explicit valid value on the parentage record. A failed parentage write does not leave a calf with no parentage statement. Unknown is a successful statement. A missing write is not.

A later correction (`TGT-REPRO-001`) is Herd alone. It appends certainty history. It does not open another animal.

### Feed purchase

When one capture claims both an expense and a warehouse receipt, those two writes commit atomically. The receipt holds the purchased quantity and its source quality. The expense holds the money. Neither copies the other's figure as a second authority.

Feeding is not called. The purchased kilograms are not written again as a diet fact.

### Feed batch

When one command claims both a feed-batch preparation and an inventory issue, those two writes should commit together. A batch recorded without a warehouse draw is Feeding alone and does not create an issue. A declared `FeedDelivery` does not create an issue either. The physical count is a different Inventory command (`TGT-INV-001`).

### Weighing

The weighing session commits in Growth. That commit does not depend on a last-observation projection existing, being up to date, or being updated in the same transaction. The projection reads the weight afterward, on query or whenever it is built.

### Confirmed missing

`ConfirmedMissingAssertion` commits in Herd. Notification delivery may happen later and may fail. The failed notice does not remove the assertion. The risk view is not part of this transaction and cannot write the assertion.

### Cattle purchase

Finance can record `CattlePurchase` with no animals. When the same command already knows individual heads, the purchase and the Herd registration commit together. When identification happens later, that later command is explicit. Tenure may be unknown. The purchase does not set a share.

An arrival weight, if any, is a Growth session. It references `AnimalId` and may note the purchase id as context. It does not overwrite price or freight, and the commercial quantity does not overwrite the chute weight.

## Relationships

### Herd upstream of anyone who names an animal

Downstream readers: Growth, Feeding (through a paddock reference), Finance (through ids the orchestrator passes), and the read models.

Information: `AnimalId`, and queries such as active state, category if known, current expected paddock, and a label for display. Current expected paddock is the latest `LocationAssignment`, not a sighting.

Herd does not consume those downstream modules. When a birth needs an animal, Herd writes it. When a sale needs an exit, the orchestrator calls Herd. Herd does not discover sales by reading Finance.

### Growth with Herd

Growth writes only its session. It may ask Herd which animals are active, and which of them are in the calf routine when Herd knows that. `OQ-OWN-003` may leave the expected set unknown. Growth stores "expected participants unknown" rather than inventing the list.

The last-observation projection reads confirmed-identity weights. Growth does not stamp a last-seen field.

### Feeding with Herd and Inventory

A delivery may store a `PaddockId`, an approximate description, or unknown. Resolving a label is a read. It is not an observation and it is not a location assignment.

A batch may store the id of an inventory issue the orchestrator created. Feeding does not post the issue. Inventory does not interpret the batch's diet quality.

### Feed purchase: Finance and Inventory

Upstream of money: Finance. Upstream of the received quantity: Inventory. Coupling sits in `RecordFeedPurchase`, not between the domain models.

A correction of that purchase goes through the same orchestrator's correction path, so the expense and the receipt stay aligned. Correcting only the money and leaving the received kilograms untouched is a visible inconsistency the normal edit does not offer.

### Read models

Upstream: whichever modules hold the facts in [data-ownership.md](data-ownership.md). Downstream: the owner reading a screen. No domain module.

Information: queries of facts, plus calculations (interval, balance, variance, unallocated pool, provisional margin, last seen, suspected missing).

A change in a source module can break a view. The repair is the source record or the projection rule. The view is not edited.

Read models query on demand ([persistence-strategy.md](persistence-strategy.md)). A stored projection waits until a need is shown. If a projection is stored, its data belongs to the read-model layer.

The alert policy reads Herd assertions and severe health notes. It emits a notice. It does not write back. Suspected missing on `MissingAnimalRiskView` is not the notice.

### Adapters

The domain module defines the fact it will accept, such as a weight measurement. The adapter translates a vendor conversation into that fact. IBN-specific bytes stop at the adapter. Growth does not call the scale. Feeding does not call a feed meter.

Ports with no adapter in the foreseeable first build (cameras, bank import, messaging API) have no upstream domain dependency on a vendor. See [integrations.md](integrations.md).

## What is intentionally not on the map

- Reproduction or Health as modules. Their records sit inside Herd.
- A security context beside Herd. Intrusion has no adopted upstream.
- A reporting context upstream of Finance or Feeding.
- A Feeding record on the feed-purchase path.
- Milk, GIS, a worker application, and an event bus.
- Event-sourcing arrows from every aggregate to a central log.

## Status

- Version: 0.2
- Status: Refined map for the modular monolith
- Last updated: 2026-10-04
- Source: domain boundaries v0.2, ADR-003, ADR-004, TO-BE capture-once rules
- Validation: Architecture QA applied. No production orchestrator is implemented
