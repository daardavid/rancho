# INC-004 — Vida y lugar del hato

Status:
DRAFT. Becomes READY when David merges it.

## Problem

After INC-001 to INC-003 the app knows who the animals are and how the calves grow, but not how the roster changes or where the animals are: births, exits, expected paddocks, health notes, and when each animal was last seen. These facts live in messages and memory (`PP-ID-001`, `PP-REPRO-001`, `PP-SEC-002`, `PP-HEALTH-001`, `PP-DATA-001`, `PP-GOV-001`).

## Why now

These processes are designed in the TO-BE and in `docs/architecture/domain-boundaries.md` (Herd: parentage, health, location; Presence: last observation), and none of them is blocked by a P0 open question: every unknown has a valid «No sé». Feed and profitability still wait for the questionnaire.

## User outcome

1. Record a birth in one capture: the calf's file and its parentage (dam and sire each observed, inferred with reason, or unknown). Correct parentage later without a new animal (`TGT-BIRTH-001`, `TGT-REPRO-001`).
2. Record an exit with its reason (sale, death, confirmed missing, other, unknown). The file and its history stay; the animal leaves the active list (`TGT-ANIMAL-EXIT-001`).
3. Keep a list of paddocks and assign the expected place of an animal or a group, or leave it unknown (`TGT-MOVE-001`).
4. Write a basic health note for an animal or a group (`TGT-HEALTH-001`).
5. See, per animal, when it was last seen and in which event; and an **Inicio** screen with the period's review: changes, gaps and what was not seen (`TGT-SEC-001`, `TGT-GOV-001`).

## Domain rules involved

All invariants of the Herd and Presence sections of `docs/architecture/domain-boundaries.md`, in particular:

- Parentage is a sibling record, not columns of `Animal`. Inferred is not confirmed. «Único toro presente» is an inference reason, not a confirmed sire.
- A calf born of an «a la parte» arrangement keeps tenure unknown while the share is undefined (`OQ-OWN-001`).
- Exit keeps the file. Not seen, or confirmed missing, does not exit the animal.
- Assigning a place is not a sighting. A health note counts as a sighting only if it says the animal was seen.
- No vaccine calendar, withdrawal period, dose rule or vet workflow (`OQ-HEALTH-001`).
- No threshold of "days without being seen" is invented: the app shows the days and orders by them.

## Explicitly out of scope

Herd verification (`TGT-HERD-VERIFY-001`: method and cadence still open, `OQ-COUNT-001`), confirmed-missing assertions as a separate record, sales with money, feed, finance, notifications.

## Acceptance criteria

- A birth creates the calf and its parentage in one transaction; a retry with the same command id does not duplicate it.
- Correcting parentage keeps the previous certainty and does not touch the calf's identity.
- An exited animal disappears from the active list, is still findable and keeps its history; growth views keep its past weights.
- The current expected place is the latest assignment; assigning a group writes one assignment per animal in one transaction.
- Last observation comes from weighings and from health notes marked as seen, never from a place assignment.
- New screens follow `docs/design/guia-visual.md`.
- Lint, types, unit, persistence, API and end-to-end tests and CI pass. The import-boundary test passes.

## PR mapping

Tasks `fabrica/tareas/R-22.md` to `R-26.md`.

## Learning after validation

(empty)
