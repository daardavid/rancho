# Context map

How the modules of [domain-boundaries.md](domain-boundaries.md) relate. The words upstream and downstream are used in the ordinary sense: upstream owns a fact, downstream uses it. Formal pattern names are used only where they make a relationship easier to see.

No relationship in this map requires a separate service or a message broker. Inside the monolith, "event" means an explicit in-process fact. "Synchronous" means a call on the owner's port during the request that captured the ranch event.

## Dependency direction

```text
UI / owner-facing application
        │
        ▼
application commands (one capture, one local transaction)
        │
        ├── Herd
        ├── Growth
        ├── Feeding
        ├── Inventory
        ├── Finance
        ├── Reproduction
        └── Health
                │
                ▼
        read models and alert policy
        (may listen; nothing above depends on them)

adapters ── inward ──▶ application ports ──▶ domain modules
```

Domain modules do not depend on the UI, on read models, or on adapters.

Allowed domain-to-domain knowledge is a stable id plus, where needed, a query the owner publishes (for example, "is this animal active?"). The caller's domain model does not include the callee's entities.

| From | May depend on | Must not |
| --- | --- | --- |
| Herd | Shared ids and audit primitives only | Growth, Feeding, Inventory, Finance, Reproduction, Health, read models |
| Growth | `AnimalId`. May query whether an animal is still expected in the calf routine | Update Animal. Read profitability or the weekly summary to decide a weight |
| Feeding | `PaddockId` when a delivery names a place. Expense id and stock-movement id as references after the composition command | Write stock rows or expense rows. Treat a paddock query as an observation |
| Inventory | References back to the capture that caused a movement | Feed quality rules, prices |
| Finance | `AnimalId` and `PaddockId` as attribution targets | The active flag, parentage, weights as editable copies |
| Reproduction | `AnimalId` of the offspring, and of dam or sire when those animals exist | Insert the animal |
| Health | `AnimalId` or `PaddockId`. Optional movement id | Decrement stock itself while inventory's scope is still ingredients-only; the link waits |
| Read models | Queries or events from any module | Be imported by a domain module |
| Adapters | Inward ports | Be imported by a domain module |

There is no domain cycle. The couplings that feel bidirectional are application commands standing above two modules, not modules calling each other in a loop.

## Shared kernel

Upstream and downstream both conform to a very small shared kernel:

- `AnimalId`, `PaddockId`
- source quality: declared, observed, measured
- audit and correction primitives
- identifiers for evidence files

Business rules do not live there. This is the shared kernel principle 14 allows. It is not a Commons module for ranch nouns.

## Relationships

### Herd upstream of everyone who names an animal

- Downstream: Growth, Feeding (through place), Finance, Reproduction, Health, read models.
- Information: `AnimalId`, and queries such as active state, category if known, current expected paddock, label for display.
- Coupling: low. The id is stable. Display labels can be stale in a read model without corrupting the roster.
- Mechanism: synchronous query when a capture must show who the animal is. `AnimalRegistered`, `AnimalExited`, and `AnimalLocationAssigned` for read models. Growth can learn that an animal left by reading `AnimalExited` or by querying active state when building the next session. Either is valid in-process. A broker is not implied.

Herd does not consume those downstream modules. When a birth or a sale needs Herd to write, the application command calls Herd. Herd does not subscribe to Finance to discover that a sale happened.

### Growth with Herd

- Upstream: Herd for identity. Growth for weights.
- Downstream of Growth: `LastObservationView`, `AnimalGrowthView`, weekly summary.
- Information exchanged: `AnimalId` in, weight facts out.
- Coupling: low.
- Mechanism: Growth writes only its session. `AnimalWeighed` feeds projections. The command does not call Herd to stamp a last-seen field.

### Feeding, Inventory, and Finance on a purchase

This is the strongest coupling in the map, and it is supposed to be visible.

- A feed purchase is one application command, partnership among Feeding, Inventory, and Finance.
- Upstream of each fact stays with its owner: quantity with Feeding, movement with Inventory, money with Finance.
- Information exchanged: ids. `FeedPurchaseQuantity` points at the expense and the receipt. The movement points at the feed quantity. The expense points at the capture. None of the three copies the others' amounts as a second authority.
- Coupling: medium at the command, low between the domain models.
- Mechanism: synchronous ports in one local transaction (principle 15). Events after commit (`ExpenseRecorded`, `FeedQuantityPurchased`) notify read models. They are not the mechanism that keeps the three writes together. If one write fails, the transaction rolls the others back.

A later correction of that purchase is the same command's correction path, so the three facts move together. Correcting only the expense and leaving the purchased kilograms untouched is a visible inconsistency the command should not offer as the normal edit.

Preparation that draws stock is the same shape, smaller: Feeding's `FeedBatch` and Inventory's issue, one transaction when the issue is tracked. A declared delivery that does not touch the warehouse is Feeding alone. The physical remnant is Inventory's count, a different command (`TGT-INV-001`).

### Finance with Herd on sale and on purchase

- Sale command: Finance records `Sale`, then Herd exits the named animals with reason sale and a reference to the sale. One transaction. `SaleRecorded` and `AnimalExited` follow for readers.
- Coupling: medium in that command, because the business insists the exit is not a second form. The domain models stay apart.
- Cattle purchase: Finance can record `CattlePurchase` with no animals yet («bulto»). When a head is identified, the command calls Herd to register or to link, and stores `AnimalId` on the purchase. Tenure may be unknown. The purchase does not set a share.
- Arrival weight, if any, is a later or accompanying Growth command. It references `AnimalId` and may note the purchase id as context. It does not overwrite price or freight.

### Reproduction with Herd on birth

- Birth command: Herd registers the calf (active, tag optional, tenure unknown when the share is unknown), Reproduction writes `ParentageRecord`.
- Upstream of identity: Herd. Upstream of certainty: Reproduction.
- Coupling: medium in the birth command, low after that. A later parentage correction (`TGT-REPRO-001`) is Reproduction alone.
- Mechanism: synchronous in one transaction for the birth. `ParentageRecorded` for readers. No second event is required to say "a birth happened" if those two facts exist.

### Health with Herd and, optionally, Inventory

- Health stores `HealthEvent` referencing `AnimalId` or `PaddockId`.
- Coupling: low.
- An inventory issue for a medicine is a later partnership, only if that item is in Inventory's scope. Until then the note stands without a movement id.
- `HealthEventRecorded` can feed `LastObservationView` when the event means the animal was seen. A note about a group, or a problem reported without a sighting, does not invent a sighting. The event carries enough context for the projection to tell those apart.

### Read models downstream of all modules

- Upstream: whichever modules hold the facts listed in [data-ownership.md](data-ownership.md).
- Downstream: the owner reading a screen. No domain module.
- Information: copies or queries of facts, plus calculations (interval, balance, variance, unallocated pool, provisional margin, last seen).
- Coupling: read-only. A change in a source module can break a view; it must not be repairable by editing the view.
- Mechanism: a read model may query the owners or keep a projection. That choice is [AQ-P1-008](architecture-open-questions.md). If a projection is stored, its tables belong to the read-model layer. No external bus is required either way.

The alert policy is downstream in the same sense. It reads Herd (and Health, when a problem is severe) and emits a notice. It does not write back.

### Adapters downstream of ports

- The domain module is upstream. It defines the fact it is willing to accept, such as a weight measurement.
- The adapter is downstream. It translates a vendor conversation into that fact. This is an anti-corruption layer in the practical sense: IBN-specific bytes stop at the adapter.
- Coupling: the port is stable; the adapter may be replaced or never built.
- Mechanism: the adapter calls an application service. Growth does not call the scale.

Ports with no adapter in the foreseeable first build (cameras, bank import, messaging API) are still downstream placeholders. They have no upstream domain dependency on a vendor. See [integrations.md](integrations.md).

## What is intentionally not on the map

- A security context beside Herd. Intrusion has no adopted upstream.
- A reporting context upstream of Finance or Feeding. That arrow would make the summary a source.
- Milk, GIS, and a worker application.
- Event-sourcing arrows from every aggregate to a central log that rebuilds the modules.

## Status

- Version: 0.1
- Status: Proposed map for the modular monolith
- Last updated: 2026-10-04
- Source: domain boundaries v0.1 and TO-BE capture-once rules
- Validation: Pending architecture QA
