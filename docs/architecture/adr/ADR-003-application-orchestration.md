# ADR-003: Application orchestrators for cross-module atomic workflows

## Status

Accepted

Accepted for the logical architecture v0.2. It does not authorize production code, and it does not choose a framework.

## Context

Several TO-BE processes are one ranch capture that produces facts in more than one language. A sale of identified animals produces income and an exit (`TGT-SALE-001`). A feed purchase produces an expense and a warehouse receipt (`TGT-FEED-001`, `TGT-INV-001`). Preparing a batch can produce a prepared quantity and a stock issue. A cattle purchase produces entry cost and, when individual heads are known, animal files (`TGT-PUR-001`).

v0.1 already said those captures run as application commands in a local transaction. It also described domain modules publishing events that other modules might hear. Those two mechanisms answer different problems. Using the second one for the first problem would let the sale commit and the exit fail, or the reverse, and would call the gap "eventual."

The business rule is that the named animals leave because of the sale, not in a second form the owner might forget. The same is true of the feed ticket: the money and the receipt are one capture. Eventual delivery is the wrong consistency for those invariants.

Birth is different in v0.2. Parentage now lives in Herd, so the calf and the parentage record are one Herd operation. That operation is not a cross-module orchestrator. The same local-transaction idea still applies inside Herd.

[ADR-002](ADR-002-modular-monolith.md) already chose one deployable and one local transaction over sagas. This ADR names who is allowed to call more than one module.

## Decision

Cross-module atomic workflows are coordinated by application-level orchestrators.

- An orchestrator calls the public application interfaces of the modules involved.
- Those calls run inside one local transaction.
- A domain module does not write another module's persistence.
- A domain module does not call another module to perform a write.
- Read models are not participants in the write.
- Orchestrator names in the architecture documents are conceptual. They are not production types.

The event decision is separate: a published cross-module event is not the mechanism that keeps these writes together. See [ADR-004](ADR-004-no-cross-module-event-bus-yet.md).

## Why modules do not write one another

Each module owns a language. Herd knows when an animal may become inactive. Finance knows what income was recorded and which costs were explicitly attributed. Inventory knows which movements exist. If Finance updated the animal row, the exit rules would live in the sale code and the next correction would not know which language to trust. If Feeding wrote stock rows, a declared delivery would be one edit away from looking like a verified issue.

The orchestrator is allowed to know the sequence because it is the capture, not a sixth domain. It contains no profitability formula, no parentage inference, and no stock-balance rule. It calls the operation that already enforces those rules.

Stable identifiers may cross the boundary. The sale id may be stored on the exit. The capture id may be stored on the expense and on the receipt. The identifier is a reference. It is not a license to update the other row.

## Why eventual events are not used for atomic business invariants

An event that another module consumes after commit is a notification. It is useful when a reader can tolerate delay and when the business accepts one fact existing without the other. A sale of named animals does not have that shape. Neither does a feed purchase that claims both an expense and a receipt, nor a birth that claims both a calf and a parentage statement.

If the second write fails, the transaction rolls the first write back. The owner sees a failed capture and can retry. The owner does not see income for animals that are still active, or a calf with no parentage statement at all. Unknown parentage is a stored value inside a successful birth. It is not the same thing as a birth that lost its parentage write.

Notification of a confirmed-missing assertion may happen later. The assertion itself still commits first. That split is deliberate: the alert channel is not part of the Herd invariant. See the transaction rules in [../context-map.md](../context-map.md).

## Consequences

- The application layer is part of the logical architecture, not an accident of a later framework choice.
- Module public interfaces must be explicit enough for an orchestrator to call without touching tables. How the repository enforces that remains [AQ-P1-007](../architecture-open-questions.md).
- Intra-module captures stay inside the owning module's application operations. Birth, parentage correction, health notes, weighing, a plain expense, a declared delivery, and a physical count do not gain a second module for company.
- A follow-up that later identifies animals on an existing sale or purchase is its own explicit command. It does not rewrite history by guessing which heads were meant.
- Orchestrators are not a bounded context called Operations, and they are not placed in the shared kernel.
- No framework, transaction API, or database product is selected by this ADR.

## When to revisit

Revisit this decision when at least one of these is true:

- A capture that must be atomic can no longer share one local transaction, because a real process boundary was introduced under [ADR-002](ADR-002-modular-monolith.md).
- A consumer must react after commit, asynchronously, and an orchestrator or a query is the wrong tool. That case is also the revisit condition in [ADR-004](ADR-004-no-cross-module-event-bus-yet.md).
- Review shows orchestrators have absorbed domain rules that belong in Herd, Feeding, Inventory, Growth, or Finance.

Do not revisit it only because a diagram would look cleaner with modules calling each other directly.

## Status of this document

- Version: 0.2
- Status: Accepted
- Last updated: 2026-10-04
- Source: TO-BE capture-once processes, architecture QA, ADR-002
- Validation: Logical decision only. No production orchestrator is implemented
