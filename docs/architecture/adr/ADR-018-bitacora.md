# ADR-018: Bitácora y pendientes en un módulo `journal`

## Status

Proposed

Proposed with R-39, inside INC-007. Accepted when David merges it into `main`. Until then the module list of the logical baseline stays the five modules in [domain-boundaries.md](../domain-boundaries.md). This ADR does not move Feeding, Inventory, or Finance into the app, and it does not close `OQ-FIRE-001` or `OQ-ENV-001`.

## Context

INC-007 asks for two records that are not facts about one animal:

- A dated ranch note: rain, a fire, a dry well, a broken fence. The owner writes what was said, with an exact or approximate day.
- A reminder the owner writes for himself («vacunar el 5 de diciembre»). It is not a recommendation the app invents, and marking it done does not by itself record a vaccine, a weight, or any other herd fact.

Herd owns the animal, its health notes, and its paddocks. Growth owns weights. A rain note or a reminder has no animal it must belong to. Putting either in `herd` would make Herd the owner of ranch-level events. A read model cannot own them: they are facts the owner corrects, with history.

`OQ-FIRE-001` still asks what causes the fires, how often, and what damage they do. `OQ-ENV-001` still asks whether water, pasture, drought, and flood deserve tracking. A note of type Quema or Lluvia records the words of that day. It does not answer those questions, and it is not a rain-gauge measurement.

The logical baseline rejected Land, Reporting, and a shared dump as standalone contexts. This cut is smaller than those: one schema, two records, the same module shape as Herd and Growth.

## Decision

Add a domain module `journal` with PostgreSQL schema `journal`, laid out like the others: `domain/`, `application/`, `persistence/`, and `index.ts` as the only import path. The import-boundary test covers it.

The module owns:

- The ranch note: day (exact or approximate; the writer chooses, with no preselected type or precision), type (Lluvia, Quema o fuego, Agua, Cerca o instalación, Otro), text, optional paddock, who said it (`ReportedBy`, not a user id), optional photo. A correction keeps the previous value, who, when, and why.
- The owner's reminder: text, the day it is due, an optional subject (one animal, a group of animals, or one paddock), and a status (pendiente, hecho, ya no aplica) with who changed it and when. A content correction keeps history. Changing the status is its own command. It does not write Herd or Growth.

A paddock id or an animal id stored here is a reference, not a foreign key into `herd`. Journal does not import Herd's tables. Before writing, it asks Herd's public index whether that paddock or those animals exist, the same way Growth asks which animals are in the ranch. There is no group entity in Herd: a group on a reminder is the list of animals the owner attached to that reminder.

Evidence stays the transversal file port. The note stores an evidence id, not a path.

No reminder is created unless the owner wrote it. The app does not notify outside itself.

## Why not the other approaches

- **Inside Herd.** Health notes are about one animal. A rain note and a reminder are not. Herd would start owning facts that have no animal.
- **Inside Growth.** Growth owns weights. A fence note is not a weight.
- **A read model only.** Read models do not own corrections. These records are corrected in place and the previous value stays.
- **Cross-schema foreign keys to `herd.animal` and `herd.paddock`.** ADR-007 allows a narrow key to Herd identity. Journal's persistence would then import Herd's table definitions, which the import rules forbid. A uuid checked through Herd's public index keeps the boundary and still rejects an unknown paddock or animal.
- **Closing the open questions.** Recording that someone said «hubo quema» is not a cause, a frequency, or a measured rainfall.

## Consequences

- `repository-structure.md` lists `journal/`. Feeding, inventory, and finance stay unbuilt.
- Inicio reads the module: overdue and today's open reminders in «Para revisar», and the notes whose day falls in the period in the period summary. Those reads do not write.
- A later accepted ADR can fold this module back into another boundary. Until David accepts this one, the five-module logical text is unchanged and this module is the proposed place for these two records.
