# ADR-004: No cross-module event bus yet

## Status

Accepted

Accepted for the logical architecture v0.2. It does not forbid a later integration ADR. It forbids treating a bus as already required.

## Context

v0.1 named a published event catalog: animal registration, exit, location, verification, weighing, purchased feed quantity, batch, delivery, inventory count, expense, cattle purchase, sale, parentage, and health. The catalog existed so read models could listen. Delivery was described as in-process, and a broker was already "not required," but the catalog itself was required architecture. One of those events, `FeedQuantityPurchased`, belonged to a Feeding aggregate that v0.2 removes.

The readers that catalog served can query the module that owns the fact. The writes that must succeed together are covered by [ADR-003](ADR-003-application-orchestration.md), not by publication. Requiring every write to publish, before any asynchronous consumer exists, would freeze a second contract beside the records and would invite the team to rebuild state from the messages.

The herd is about 21 head. The interesting history is already held as records: weights, assignments, parentage corrections, stock movements, audit. A new reader can ask those records. It does not need a log of every past-tense name.

This ADR is not a repeal of principle 13. Principle 13 says that naming an event does not make the system event-sourced. This ADR says that, for now, cross-module publication is not part of the architecture at all.

## Decision

Do not introduce a cross-module event backbone or a message broker in the initial modular monolith.

- No required published catalog.
- No requirement that every write emit an event.
- Read models obtain authoritative data by query.
- Atomic cross-module workflows use orchestrators and a local transaction.
- `FeedQuantityPurchased` is withdrawn with the removed `FeedPurchaseQuantity` aggregate.
- A universal `AnimalObserved` event is not introduced. Last observation is normalized in the projection layer from source records. See [../domain-events.md](../domain-events.md).

Internal domain or application events inside a single module remain allowed when they make that module's implementation clearer. They are an implementation choice behind the module's public interface. They are not a bus, they are not a dependency between modules, and they are not the storage format.

This decision is not event sourcing. Authoritative state remains the current persisted record, explicit history where the business looks backward, and audit.

## Why a bus is the wrong default here

A bus pays for itself when a consumer must react without being called, when the producer must not know that consumer, and when delay is acceptable. None of the current TO-BE readers have that shape. The weekly summary, the growth view, the profitability view, the variance view, and the missing-animal risk view are readings. They can be wrong only by reading the wrong source or by computing the wrong derivation. A subscription does not fix either mistake, and a missed message can make them stale while the source record is already right.

Orchestration plus query keeps one direction of truth: the module that owns the fact. Adding a required event beside that fact creates a second artifact to keep honest, which is the cost v0.1 already refused for event sourcing and would have reintroduced through the catalog.

## Consequences

- Module authors do not design a public event payload for each write.
- A read model that needs a new fact asks the owning module. It does not wait for a new event type to be invented first.
- In-module events, if a module uses them, stay behind that module's boundary and do not become a shared package of ranch events.
- No messaging product is selected. [AQ-P2-004](../architecture-open-questions.md) remains the question of a future owner-facing messaging integration, which is a different port.
- Documents that listed the v0.1 catalog as required architecture are historical. The current statement is [../domain-events.md](../domain-events.md).

## When to revisit

Introduce a cross-module event only when all of the following are true:

- A real consumer must react to a committed fact.
- The reaction is asynchronous: the capture must not wait for it, and a short delay is acceptable.
- Calling the consumer from the orchestrator, or letting it query, would couple the capture to a concern that does not belong in the transaction.

A plausible future case is high-volume sensor ingestion, if a device is ever adopted and ADR-002's revisit conditions are also met. A weekly screen is not that case. A wish to "be event-driven" is not that case.

If the new event is also asked to protect an atomic business invariant, reject that use. Atomic invariants stay on the orchestrator path in [ADR-003](ADR-003-application-orchestration.md).

## Status of this document

- Version: 0.2
- Status: Accepted
- Last updated: 2026-10-04
- Source: architecture QA, v0.1 event catalog, ADR-002, ADR-003
- Validation: Logical decision only. No bus is implemented, and none is authorized
