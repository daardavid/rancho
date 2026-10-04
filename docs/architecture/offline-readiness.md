# Offline readiness

Constraints on identifiers and commands so a later field client is not blocked. This document does not design that client.

## Two different efforts

| Effort | What v0.1 does with it |
| --- | --- |
| Offline-ready data and command design | Adopt the constraints below. They also make owner-side retries and corrections safer, which the first system needs even without a field client |
| Full offline application | Not designed. No local database, no sync protocol, no conflict-resolution UX, no queue worker. `OQ-CONN-001` blocks a synchronization architecture and a signal map. It does not block the owner recording a fact after returning to a place with signal |

The current target path already tolerates a pasture with no usable signal: the worker communicates as today, and the owner records later (`CAP-CONN-001`, `SOL-CONN-001`, `TGT-COMM-001`). That path is "record after the fact." It is not "the phone in the chute has a full offline replica."

`CON-NET-003` says that if a field application must work offline, synchronization would have to deal with duplicates, conflicting edits, and writes that must not overwrite each other in silence. The constraints below are the part of that sentence the logical model can accept now. The sync design itself waits.

## Constraints

### Globally unique, client-safe identifiers

`AnimalId`, weight ids, expense ids, and the other record ids are globally unique and can be minted by a client before the server has seen them. The first client is likely the owner's session. The same rule leaves room for a future field device to create an id in the pasture.

Identity of an animal is this id, not the SINIIGA and not a server row number that only exists after a round trip.

### Idempotent creation

Creating a record with an id that already exists returns the existing record and does not append a duplicate weight, expense, or animal. A retry after a dropped connection is safe. The capture commands in [cross-cutting-concerns.md](cross-cutting-concerns.md) are the units of idempotency: a retried feed purchase does not create a second expense beside the first.

### Explicit versions on update

An update names the version it read. If the stored version has moved, the command fails visibly. The caller reloads and, if the change is still wanted, sends a correction. Two editors cannot quietly pass through each other.

At the start there may be only one editor, the owner. The rule is cheap now and is the difference between a later field client and a pile of last-write-wins bugs.

### No silent last-write-wins on important facts

Weights, parentage, tenure, money, feed quantities, counts, exits, and expected location do not resolve a conflict by keeping whichever write arrived last. The conflict stays visible. The owner's correction, with a reason, is the resolution. See principle 7.

### Corrections and history

The history model in [domain-events.md](domain-events.md) is the conflict policy for important facts. A field client that recorded a declared weight, and an owner who later enters the scale figure, produce a correction or a second weight with its own quality — whichever the business command says — and both remain explainable. They do not collapse into one cell.

### Room for a local queue

Commands are self-contained: the id, the payload, the expected version, the source, and the device or session when one exists. A future queue can store that command and send it later. v0.1 does not build the queue. It avoids designs that only work if the server assigns the id inside the same request that shows the user a confirmation.

### Source metadata

Where it is relevant, a record can say which person supplied the story and which session or device recorded it. For the first system the device is often irrelevant, because the owner types from a message. The field is available so a later client does not have to overload "created by."

## What is not adopted

- CRDTs. No ranch fact in the current model needs automatic merge of concurrent numeric edits. A weight conflict is a human correction. Introducing CRDTs would hide the source-quality problem instead of solving a measured conflict.
- Operational transformation, vector clocks as a domain concept, or a sync engine.
- An offline map of cellular coverage (`OQ-CONN-001`).
- A requirement that the minimum package include a worker application. `BR-ENTRY-001` says the opposite for the first stage.
- Treating "the owner records later" as a temporary hack. It is the designed capture path until a field client is an explicit decision ([AQ-P2-003](architecture-open-questions.md)).

## Relationship to modules

Offline readiness does not add a module. Every module's commands follow the same id, idempotency, and version rules. A Sync context would be the same mistake as a Connectivity process on the TO-BE map: it would draw a technical concern as if it were a ranch operation.

## Status

- Version: 0.1
- Status: Constraints only. Synchronization is not designed
- Last updated: 2026-10-04
- Source: `CAP-CONN-001`, `CON-NET-001`, `CON-NET-002`, `CON-NET-003`, `OQ-CONN-001`
- Validation: Pending architecture QA
