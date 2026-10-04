# Domain and application events

v0.2 does not require a cross-module event backbone. Atomic captures use application orchestrators ([ADR-003](adr/ADR-003-application-orchestration.md)). Read models query the module that owns the fact ([ADR-004](adr/ADR-004-no-cross-module-event-bus-yet.md)). This document is the event strategy. It is not a catalog the implementation must publish.

## What is required

Nothing in the list below is required:

- a message broker
- an event bus shared by modules
- publication of every write
- a universal `AnimalObserved` event
- `FeedQuantityPurchased`, or any successor that repeats the purchased kilograms
- event sourcing

Internal domain or application events may still exist inside one module when they make that module clearer. They stay behind the module's public interface. Another module does not subscribe to them in order to complete a write. They are not the storage format.

## Event sourcing boundary

RANCHO will not start with full event sourcing.

The authoritative model is:

- the current persisted state of each aggregate root
- explicit historical records where the business looks backward (location assignments, parentage corrections, stock movements, weight series, verifications, health notes, confirmed-missing assertions, physical counts)
- an audit trail of creation and correction
- queries from read models onto those records

Replaying a log is not required to reconstruct an animal, a balance, or a sale. A reader should be able to read the current record and its correction history. A new weighing, location assignment, stock movement, health event, verification, or parentage certainty is a new historical record. It does not rewrite the previous fact. Changing a wrong value on an existing record is a correction and keeps the previous value. The physical split is in [persistence-strategy.md](persistence-strategy.md). Temporal tables are not this model.

Why this fits:

- The team is two people. A projection rebuilt only from events is a second model to keep honest.
- The herd is about 21 head. The interesting history is a handful of weights, notes, and corrections per animal, which ordinary records hold directly.
- The domain is complex in its rules (unknown tenure, feed quality, inference versus confirmation) and small in its volume. Those rules belong on the write model, where a correction can enforce them.
- Auditability is a requirement (`PP-DATA-001`, `PP-DATA-002`, principle 7). History records and correction reasons provide it without making a log the only truth.
- A future offline client needs idempotent commands and versions (see [offline-readiness.md](offline-readiness.md)). It does not need the server to be an event-sourced core.

Principle 13 is this section in one sentence: an event, even an internal one, does not imply event sourcing.

## Last observation without a shared event

The projection normalizes sightings from source records. Conceptually, a normalized observation has an `AnimalId`, a time, a reference to the source record, a location only when that source observed one, and a quality.

It may be built from:

- a recorded weight whose animal identity was confirmed
- a herd verification that confirmed presence
- a health record that states the animal was seen

It is not built from a location assignment, a weighing gap, a "not confirmed" result, or an administrative edit.

That normalization is projection infrastructure. It is not a domain module and not a published event other modules must emit. Growth persists the weight without waiting for the projection.

## What v0.1 required, withdrawn here

v0.1 listed a published catalog and treated it as part of the architecture. Those names are historical. They are not a backlog.

| v0.1 event | v0.2 |
| --- | --- |
| `AnimalRegistered` | Herd state. Readers query the animal |
| `AnimalExited` | Herd state. The sale orchestrator already performed the exit in the same transaction when animals were identified |
| `AnimalLocationAssigned` | `LocationAssignment`. Not a sighting, and not a required publication |
| `HerdVerificationRecorded` | `HerdVerification`. Readers query it |
| `AnimalWeighed` | The weight record. The projection reads it. A gap is still not a sighting |
| `FeedQuantityPurchased` | Removed. The Inventory receipt is the purchased quantity. There is no Feeding event to publish |
| `FeedBatchPrepared` | `FeedBatch`. Readers query it |
| `FeedDeliveryRecorded` | `FeedDelivery`. Quality on the record is the distinction. No stock issue is implied |
| `InventoryCounted` | `PhysicalCount`. Variance is computed by the reader |
| `ExpenseRecorded` | `Expense`. Readers query it |
| `CattlePurchaseRecorded` | `CattlePurchase`. Linked animals may be empty |
| `SaleRecorded` | `Sale`. The matching exit, when animals were named, is already committed with it |
| `ParentageRecorded` | Herd `ParentageRecord`, including corrections |
| `HealthEventRecorded` | Herd `HealthEvent` |
| `AnimalObserved` | Still not introduced. The projection replaces it |
| `ProfitabilityCalculated` | Still not an event. Recalculation is a read |
| `WeeklySummaryPublished` | Still not a ranch fact. A notice that the week is ready would be application delivery, not a domain event |
| Intrusion or milk events | Still no producer and no module |

`AnimalBorn` is still not a separate name. The birth operation commits the animal and the parentage record. Listeners are not required.

`StockReceived` and `StockIssued` are movements. Publishing each one would duplicate the ledger. The balance is a query.

A correction updates the owner's state, appends the correction history, and is visible to the next query. A new ranch fact inserts another historical record and leaves the earlier one. Neither path emits a delete of the animal's past. An exit does not retract the registration.

## When a cross-module event would be justified

Add one only when a real consumer must react after commit, the reaction is allowed to wait, and putting that consumer inside the orchestrator or letting it query would couple the capture to the wrong concern. The decision procedure is [ADR-004](adr/ADR-004-no-cross-module-event-bus-yet.md).

Until that consumer exists, naming a past-tense fact is not a reason to publish it.

## Status

- Version: 0.2
- Status: Event strategy. No required catalog, no broker, and not an event-sourced store
- Last updated: 2026-10-04
- Source: architecture QA and the withdrawn v0.1 catalog
- Validation: `FeedQuantityPurchased` and the required cross-module catalog are withdrawn
