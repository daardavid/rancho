# Cross-cutting concerns

Rules that travel with every operational fact. They are not bounded contexts. The TO-BE model already treats source quality, channel, and connectivity as attributes of events (`CAP-DATA-002`, `CAP-COMM-001`, `CAP-CONN-001`), not as operations beside weighing or sale.

Connectivity's architectural consequence is in [offline-readiness.md](offline-readiness.md). Orchestrators are specified in [context-map.md](context-map.md) and [ADR-003](adr/ADR-003-application-orchestration.md). This document covers evidence, audit, source quality, corrections, and the shared kernel.

## Evidence

`BR-EVID-001` and `PP-DATA-002` ask the ranch to keep a backing for a fact: a photo, a ticket, a file, who recorded it, when, and where the story came from. That is a need. It is not a domain with its own invariants beyond "this file supports that fact."

The business fact owns the evidence reference. Logical association, stored with the owning record:

- which fact it supports (module, record id)
- kind of backing (photo, ticket, audio, note, other file)
- source: who supplied it, and the human channel if there was one (phone, message, photo, audio, direct entry)
- when the underlying thing happened, if known
- when it was attached
- source quality of the fact, which remains on the fact, not on the file alone

Technical file storage owns the bytes and the technical file metadata. That split is the file port in [integrations.md](integrations.md). The Physical Architecture v1 baseline uses a filesystem adapter in development and an S3-compatible store when deployed ([ADR-011](adr/ADR-011-evidence-storage.md)). The object key includes `RanchId`. No storage vendor is selected. Correcting or detaching a fact does not delete the historical bytes. The file port does not know what a kilogram or a peso means. Losing the ability to interpret a photo must not create a second numeric authority inside the file metadata. The weight, the amount, and the money stay on the owning record. The file is the backing.

A photo does not upgrade declared data to measured. A photo of a scale display can support an observed weight. It does not, by itself, promote a spoken number into a measured one. A picture that does not show the quantity does not change the quantity's quality. The same rule the TO-BE model states for feed applies to every fact.

A fact can exist with no file. The birth photo is not a precondition of the animal (`TGT-BIRTH-001`). A cash payroll note can exist without a card ticket (`BR-PAY-001`).

Evidence is not core domain and not a module. Making it a bounded context would isolate a generic attachment from the rule it serves, and would tempt the design to store the business number in the attachment.

## Source quality

Every quantity or assertive measurement the ranch may act on carries one of:

| Quality | Meaning in this system |
| --- | --- |
| Declared | Someone stated it. A worker's message with a number. A «bulto» description. An income with no voucher |
| Observed | Seen directly, including a photo that shows the thing, within the limits of what it shows |
| Measured | Taken from a measurement: a scale reading transcribed by the owner, a counted warehouse quantity, a delivery that was actually weighed |

The quality lives on the owning fact. Views may repeat it. They do not upgrade it.

Consequences already required by TO-BE and repeated here so a later API does not drop them:

- A declared weight is never presented as a scale weight.
- A declared feed delivery is never presented as a measured delivery.
- A purchased quantity on an Inventory receipt keeps the quality of that receipt. It is not reclassified because a later delivery was measured.
- A photo that does not show a quantity does not change the quality.
- Provisional profitability shows the quality mix it rests on.
- Cost per kilogram gained stays hidden unless the feed quantity in question is observed or measured.

Source quality is a shared value. The rule that interprets it for feed, for weight, or for money stays in the module or the read model that has that language.

## Audit

Each important record can show:

- created by, and created at
- corrected by, and corrected at
- reason for the correction
- source quality, as above

Two actors stay distinct:

| Primitive | Who it is |
| --- | --- |
| `RecordedBy` | The application account that entered the fact. In the first stage that is the owner |
| `ReportedBy` | Optional. The real-world source, such as a worker or the channel the story arrived on |

When the owner types what a worker reported, `RecordedBy` is the owner and `ReportedBy` is the worker. Collapsing them would make the field informant look like a user, which `CON-ENTRY-001` and `CON-SITE-001` refuse.

Audit primitives live in the shared kernel. Each module applies them to its own records. There is no Audit module and no central audit service that other modules must call in order to be allowed to write. A later activity view, if anyone needs one, is a read model over those fields.

## Corrections and new facts

Important facts stay explainable. They are not silently replaced. Current state is still stored directly, so a reader does not replay a log to see this week's weight. See [domain-events.md](domain-events.md). The physical form is two patterns in [persistence-strategy.md](persistence-strategy.md):

- An incorrect fact (the recorded value was wrong) may update the current authoritative record and, in the same transaction, append the previous value, who corrected it, when, and why. `occurred_at` stays the original ranch-event time.
- A legitimate new fact is a new historical record. The previous fact stays. A second weighing is not a correction of the first. Changing 315 kg to 351 kg on the same weighing is a correction. A move from one paddock to another is a new assignment. A measured delivery does not overwrite a declaration when both are meaningful facts.

Records that must remain explainable by one of those patterns:

- weights
- parentage certainty
- tenure and the participation note
- marks, when a tag is replaced or an identifier was wrong
- expenses, sales, and purchase costs
- feed batches and deliveries
- stock movements, stock counts, and any adjustment that accepts a count
- exit reason
- expected location, as a history of assignments
- health notes
- confirmed-missing assertions

A typo found immediately can still be a correction with a reason. The architecture does not need a separate "grace period delete." Deletes of ranch facts that already meant something are out of the normal path. Full event sourcing and temporal tables are not the history mechanism.

Corrections of a multi-owner capture (feed purchase, identified sale, batch-and-issue) go through the application orchestrator that created the capture, so correlated facts stay aligned. A parentage correction is a Herd operation: it appends history on `ParentageRecord` and does not rewrite `Animal`. A feed purchase still writes Finance and Inventory. It does not write Feeding.

## Capture once

Orchestrators and module operations are the mechanical form of "one ranch event, several facts." The names are conceptual.

| Capture | Writes |
| --- | --- |
| Register animal | Herd, `Animal` |
| Record birth | Herd: `Animal` and `ParentageRecord`, one transaction |
| Correct parentage | Herd, `ParentageRecord` |
| Record weighing | Growth. The last-observation projection is not part of the write |
| Record feed purchase | Finance expense and Inventory receipt. Feeding is absent |
| Record feed batch that draws stock | Feeding and Inventory, together when the command claims both |
| Record feed batch without a draw | Feeding |
| Record feed delivery | Feeding. No inventory issue |
| Record expense | Finance |
| Record cattle purchase | Finance, and Herd only when individual heads are known |
| Record sale of identified animals | Finance and Herd, one transaction |
| Record sale without identified animals | Finance. No invented exits |
| Record exit | Herd, unless the exit is the identified-sale orchestrator |
| Assign expected place | Herd, `LocationAssignment` |
| Record verification | Herd, `HerdVerification` |
| Assert confirmed missing | Herd. Notification may follow later |
| Record health event | Herd, `HealthEvent` |
| Record physical count | Inventory, `PhysicalCount` |

These captures are not a bounded context called Operations. They contain no business rules that belong in a module: the exit rules stay in Herd, the delivery-quality rules stay in Feeding, the "inferred is not confirmed" rule stays on Herd's parentage operation, and the balance rule stays in Inventory. The orchestrator's job is to call the public interfaces in one transaction and to refuse a partial success where the transaction rules require that.

## Shared kernel limits

Allowed:

- `RanchId`, as application scope. Not a Herd aggregate and not an organization
- `AnimalId`
- `PaddockId`
- an evidence id or reference
- source quality: declared, observed, measured
- recorded-time primitives
- optimistic version
- `RecordedBy`
- `ReportedBy`

Not allowed:

- `Animal`, `Expense`, `FeedBatch`, or any other ranch aggregate
- profitability formulas or allocation helpers
- generic business services
- feature DTOs
- orchestrators
- a place to put a feature that has not found its module

Module-owned record ids stay in their modules. The kernel does not become a catalog of every noun. It does not become `common`.

The composition of a multi-module capture sits in the application layer. Putting it in the kernel would recreate the dumping ground under another name.

## Alerts

What deserves an immediate notice is application policy: a confirmed-missing assertion, a severe animal problem, or another case the owner has marked as critical (`TGT-GOV-001`). The list beyond those examples is `DQ-GOV-001` and stays open.

The policy reads facts. It does not own them. The assertion is already persisted before the notice is attempted. Choosing email, a push, or a message API is an integration decision and is not made here. The absence of a chosen channel does not remove the policy from the logical design: the minimum package needs the notice even if the first implementation of "notice" is a banner the owner sees when opening the system.

Suspected missing on the risk view is not this notice.

## What this excludes

- an Audit module
- a document-management product
- an evidence workflow with approval states the interview never described
- a tamper-proof ledger or a blockchain
- treating WhatsApp history as the archive (`TGT-COMM-001`)
- treating a photo as a measurement

## Status

- Version: 0.2
- Status: Transversal rules for the refined logical architecture. `RanchId` and the two history patterns are the physical-baseline additions
- Last updated: 2026-10-04
- Source: `CAP-DATA-001`, `CAP-DATA-002`, `CAP-COMM-001`, `BR-EVID-001`, architecture QA
- Validation: Shared kernel limited to the allowed list. Evidence stays transversal
