# Domain and application events

Events worth naming because a capture produces a fact another part of the system can use. The list is short on purpose. A possible past-tense name is not a reason to publish an event.

## How to read the kinds

| Kind | Meaning in this monolith |
| --- | --- |
| Domain event | The owning module recognizes a business fact. Read models, and occasionally another module, may react. The owner's persisted record is already the authority. |
| Application event | A finished command that coordinated more than one module. Used when listeners care about the capture as a whole. Not required when the domain events of the participants already say enough. |
| Internal fact | State the owner stores and others may query. It does not deserve a published event. |

Delivery is in-process. Nothing here selects a broker. A local transaction still commits the writes; events notify readers after the facts exist. They are not the consistency mechanism for a sale and its exit. That consistency is the transaction described in [context-map.md](context-map.md).

## Event sourcing boundary

RANCHO will not start with full event sourcing.

The authoritative model is:

- the current persisted state of each aggregate
- explicit historical records where the business looks backward (location assignments, parentage corrections, stock movements, weight series)
- an audit trail of creation and correction
- domain or application events where a reader needs to hear that something happened

Replaying a log is not required to reconstruct an animal, a balance, or a sale. A new developer should be able to read the current row and its correction history.

Why this fits:

- The team is two people. A projection rebuilt only from events is a second model to keep honest.
- The herd is about 21 head. The interesting history is a handful of weights, notes, and corrections per animal, which ordinary records hold directly.
- The domain is complex in its rules (unknown tenure, feed quality, inference versus confirmation) and small in its volume. Those rules belong on the write model, where a correction can enforce them, not only in a reducer over an append-only log.
- Auditability is a requirement (`PP-DATA-001`, `PP-DATA-002`, principle 7). History tables and correction reasons provide it without making the log the only truth.
- A future offline client needs idempotent commands and versions (see [offline-readiness.md](offline-readiness.md)). It does not need the server to be an event-sourced core. Event sourcing would also make conflict handling harder, not simpler, for a client that has not been designed.

Events in the table below are notifications and integration points. They are not the storage format. Principle 13 is this section in one sentence.

## Events to publish

| Event | Owner | Consumers | Business meaning | Kind |
| --- | --- | --- | --- | --- |
| `AnimalRegistered` | Herd | Weekly summary, other read models that list the roster | The ranch now manages this animal, whatever the tenure | Domain |
| `AnimalExited` | Herd | Weekly summary, missing-animal risk, the next session's expected set | The animal is inactive, with a reason. History remains. Includes exits caused by a sale | Domain |
| `AnimalLocationAssigned` | Herd | Weekly summary, verification prep | Expected place changed, or was set to unknown, from a given time. This is not a sighting | Domain |
| `HerdVerificationRecorded` | Herd | Missing-animal risk, alert policy | A confirmation attempt happened. Confirmed and not-confirmed are part of the event's meaning | Domain |
| `AnimalWeighed` | Growth | Last-observation projection, growth view, weekly summary | A weight was recorded for an animal, with its source quality. A gap is not this event | Domain |
| `FeedQuantityPurchased` | Feeding | Weekly summary | A purchased amount exists, with quality. Money and stock were written in the same command | Domain |
| `FeedBatchPrepared` | Feeding | Weekly summary | A prepared amount exists, with quality | Domain |
| `FeedDeliveryRecorded` | Feeding | Weekly summary | An amount was offered to a place or an approximate group. Quality says declared or measured. One event covers both; the quality is the distinction | Domain |
| `InventoryCounted` | Inventory | Variance view, weekly summary | A physical count was recorded. Variance is computed by the reader | Domain |
| `ExpenseRecorded` | Finance | Profitability view | A management expense exists, classified or not, attributed or not | Domain |
| `CattlePurchaseRecorded` | Finance | Profitability view | Entry cost, form, and freight exist. Linked animals may be empty | Domain |
| `SaleRecorded` | Finance | Profitability view | Known income exists. The matching exit is Herd's `AnimalExited`, committed in the same transaction | Domain |
| `ParentageRecorded` | Reproduction | Animal-facing read model | Certainty of dam and sire was recorded or corrected, with the inference reason when inferred | Domain |
| `HealthEventRecorded` | Health | Weekly summary, last-observation projection when the payload says the animal was seen | A sanitary note exists | Domain |

Payloads carry the owner's id, the referenced `AnimalId` or `PaddockId` when there is one, the source quality when the fact has one, and the time the ranch considers the fact to have happened. They do not carry a second copy of another module's authoritative amounts beyond what a reader needs to find the source record.

## Candidates considered and not published

| Candidate | Decision | Why |
| --- | --- | --- |
| `AnimalTenureRecorded` | Internal fact on `Animal` | No consumer is allowed to react by calculating a share. A tenure change is a correction of Herd state. Readers query the animal |
| `AnimalPurchased` | Covered by `CattlePurchaseRecorded` plus optional `AnimalRegistered` | A purchase is a money fact. The animal file may already exist or may not exist yet. A third event would blur them |
| `AnimalBorn` | Not a separate application event | The birth command commits `AnimalRegistered` and `ParentageRecorded`. Listeners do not need a third name |
| `AnimalObserved` | Not published by every module | Last observation is derived from events that were real sightings (`AnimalWeighed`, verification, some health events). A generic observation event would invite modules to emit "seen" without a source fact |
| `AnimalMoved` as a second event beside assignment | Use `AnimalLocationAssigned` | The first assignment and a later move are the same kind of fact: expected place from a time |
| `FeedDeliveryDeclared` and `FeedDeliveryMeasured` as two types | One `FeedDeliveryRecorded` | The business distinction is the quality on the delivery, not two life cycles |
| `FeedPurchased` as a cross-module application event | The participant domain events are enough | The transaction already binds quantity, expense, and receipt. An extra envelope has no consumer that cannot listen to those |
| `StockReceived` / `StockIssued` | Internal movements | The balance is derived by query. Publishing every issue duplicates Inventory's ledger. `InventoryCounted` is the event that changes a management reading |
| `ProfitabilityCalculated` | Not an event | The view has no authority. Recalculation is a read |
| `WeeklySummaryPublished` | Not a domain event | The summary is a reading. If the owner is notified that the week is ready, that is application mail, not a ranch fact |
| Intrusion or fence events | No event | No adopted producer (`TGT-SEC-002`) |
| Milk events | No event | Conditional process, no module |
| `ParentageCorrected` as a different type | Same `ParentageRecorded` | A correction is the same fact with history retained. The payload can say it replaces a prior certainty |

`AnimalWeighed` is also the chute's contribution to identity confirmation and to last observation. Those are not extra events. Identity confirmation in the session does not change Herd unless the owner actually corrects a mark through Herd. The sighting is the projection's reading of this event.

## Internal facts readers should query

- current marks and tenure
- session gaps (expected, not weighed)
- theoretical balance and variance
- unallocated expenses
- evidence links and source quality
- correction history
- commercial weight versus the latest routine weight

## Corrections and events

A correction of an important record updates the owner's state, appends the correction history, and emits the same event kind again (or a clearly marked successor on that event) so read models can refresh. It does not emit a delete of the animal's past. An exit is `AnimalExited`, not a retraction of `AnimalRegistered`.

Silent overwrite without an event and without history is the failure principle 7 is there to prevent.

## Status

- Version: 0.1
- Status: Proposed event set. Not a schema and not an event-sourced store
- Last updated: 2026-10-04
- Source: target processes that produce facts other parts must reuse
- Validation: Pending architecture QA
