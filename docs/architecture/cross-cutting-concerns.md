# Cross-cutting concerns

Rules that travel with every operational fact. They are not bounded contexts. The TO-BE model already treats source quality, channel, and connectivity as attributes of events (`CAP-DATA-002`, `CAP-COMM-001`, `CAP-CONN-001`), not as operations beside weighing or sale.

Connectivity's architectural consequence is in [offline-readiness.md](offline-readiness.md). This document covers evidence, audit, source quality, corrections, and the shared kernel.

## Evidence

`BR-EVID-001` and `PP-DATA-002` ask the ranch to keep a backing for a fact: a photo, a ticket, a file, who recorded it, when, and where the story came from. That is a need. It is not a domain with its own invariants beyond "this file supports that fact."

Logical association, owned by the business record:

- which fact it supports (module, record id)
- kind of backing (photo, ticket, audio, note, other file)
- source: who supplied it, and the human channel if there was one (phone, message, photo, audio, direct entry)
- when the underlying thing happened, if known
- when it was attached
- source quality of the fact, which remains on the fact, not on the file alone

The bytes themselves sit behind the file port in [integrations.md](integrations.md). No storage product is selected. The file port does not know what a kilogram or a peso means. Losing the ability to interpret a photo must not create a second numeric authority inside the file metadata. The weight, the amount, and the money stay on the owning aggregate. The file is the backing.

A fact can exist with no file. The birth photo is not a precondition of the animal (`TGT-BIRTH-001`). A cash payroll note can exist without a card ticket (`BR-PAY-001`).

Evidence is not core domain. Making it a bounded context would isolate a generic attachment from the rule it serves, and would tempt the design to store the business number in the attachment "so the evidence module is complete."

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
- A photo that does not show a quantity does not change the quality.
- Provisional profitability shows the quality mix it rests on.
- Cost per kilogram gained stays hidden unless feed quantity is observed or measured.

Source quality is a shared value. The rule that interprets it for feed, for weight, or for money stays in the module or the read model that has that language.

## Audit

Each important record can show:

- created by, and created at
- corrected by, and corrected at
- reason for the correction
- source quality, as above

"Created by" in the first stage is the owner who entered the record, even when a worker is the person who saw the animal. The worker can be named as the source without becoming a user. That split matters: the audit of data entry and the field informant are different roles (`CON-ENTRY-001`, `CON-SITE-001`).

Audit fields are primitives in the shared kernel. Each module applies them to its own records. There is no central audit bounded context that other modules call in order to be allowed to write. A later cross-ranch activity view, if anyone needs one, is a read model over those fields.

## Corrections

Important facts are corrected, not silently replaced. The previous value, the reason, and the person remain available. Current state is still stored directly, so a reader does not replay a log to see this week's weight. See [domain-events.md](domain-events.md).

Records where this is mandatory:

- weights
- parentage certainty
- tenure and the participation note
- expenses, sales, and purchase costs
- feed quantities
- stock counts and any adjustment that accepts a count
- exit reason
- expected location (history of assignments, not a single overwritten cell)

A typo found immediately can still be a correction with a reason. The architecture does not need a separate "grace period delete." Deletes of ranch facts that already meant something are out of the normal path.

Corrections of a multi-owner capture (feed purchase, birth, sale) go through the application command that created the capture, so correlated facts stay aligned. That command is application-layer behavior, not a new module.

## Capture once

Composition commands are the mechanical form of "one ranch event, several facts."

| Command | Writes |
| --- | --- |
| Register animal | Herd |
| Record birth | Herd, Reproduction |
| Record weighing | Growth, then readers update last observation |
| Record feed purchase | Feeding, Inventory, Finance |
| Record feed batch that draws stock | Feeding, Inventory |
| Record feed delivery | Feeding |
| Record expense | Finance |
| Record cattle purchase | Finance, and Herd when heads are identified |
| Record sale | Finance, Herd |
| Record exit | Herd |
| Assign place | Herd |
| Record verification | Herd |
| Record health event | Health |
| Correct parentage | Reproduction |
| Record physical count | Inventory |

These commands are not a bounded context called "Operations." They are use cases. They contain no business rules that belong in a module: the exit rules stay in Herd, the quality rules stay in Feeding, the "inferred is not confirmed" rule stays in Reproduction. The command's job is to call the ports in one transaction and to refuse a partial success.

## Shared kernel limits

Allowed in the shared kernel:

- `AnimalId`, `PaddockId`, and other module-owned identifiers as opaque types
- source quality
- correction and actor primitives
- evidence reference as an opaque id
- clock and date conventions the whole system shares

Not allowed:

- Animal, Expense, or FeedDelivery types
- profitability formulas
- "helpers" that update several modules
- a place to put a feature that has not found its module

The composition commands sit in the application layer, not in the shared kernel. Putting them in the kernel would recreate the dumping ground under another name.

## Alerts

What deserves an immediate notice is application policy: a confirmed missing animal, a severe animal problem, or another case the owner has marked as critical (`TGT-GOV-001`). The list beyond those examples is `DQ-GOV-001` and stays open.

The policy reads facts. It does not own them. Choosing email, a push, or a message API is an integration decision and is not made here. The absence of a chosen channel does not remove the policy from the logical design: the minimum package needs the notice even if the first implementation of "notice" is a banner the owner sees when opening the system.

## What this excludes

- a document-management product
- an evidence workflow with approval states the interview never described
- a tamper-proof ledger or a blockchain
- treating WhatsApp history as the archive (`TGT-COMM-001`)

## Status

- Version: 0.1
- Status: Transversal rules for the logical architecture
- Last updated: 2026-10-04
- Source: `CAP-DATA-001`, `CAP-DATA-002`, `CAP-COMM-001`, `BR-EVID-001`
- Validation: Pending architecture QA
