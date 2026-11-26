# INC-007 — Cría, resumen semanal y bitácora

Status:
DRAFT. Becomes READY when David merges it.

## Problem

After INC-001 to INC-006 the app records the herd, its weights, births, exits, places and health notes, and it shows trends. David chose on 2026-11-26 the next functions, all buildable with what the app already records and without the open P0 questions:

1. Each cow's reproductive history, and a pregnancy check result when someone checks.
2. Weaning, and the kilograms each cow weaned.
3. A weekly summary to share with the family.
4. Reminders the owner writes himself.
5. A photo of each animal.
6. A ranch log for dated notes that are not about one animal (rain, fire, a broken fence, a dry well).
7. Export to a spreadsheet.

## Why now

In a cow-calf operation the most expensive decision is which cows to keep. Births are recorded since INC-004, so calving intervals and weaned kilograms can be read now. The summary and the reminders are what make the family open the app every week. None of this needs feed or money answers.

## User outcome

1. On a cow's record: her calvings, her calves, the days between calvings, and her latest pregnancy check. A list of cows ordered by days since their last calving, with no threshold.
2. Record a weaning for one calf or a group, with the weight when there is one. On each cow: the weaning weights of her calves.
3. A «Resumen de la semana» that can be shared from the phone or printed as PDF.
4. Owner reminders with a date that appear in Inicio when they are due.
5. A photo on each animal's record.
6. A ranch log with dated notes, shown in Inicio's period summary.
7. Download the herd, the weights and the events as spreadsheet files.

## Domain rules involved

- Never invent ranch truth. A pregnancy check result can be «No sé». Whether anyone checks pregnancy, and how weaning is done, are open questions (added by R-36 and R-37); the app records what is said and does not assume a practice.
- Derived values are not stored: calving interval, days since calving, weaned kilograms per cow are read at query time.
- A weaning weight is a weight with its source quality, like any other.
- A dam inferred is not a dam observed: per-cow figures show the certainty of each calf's dam.
- No vaccine calendar, no target calving interval, no target weaning weight.
- A reminder is something the owner wrote. It is not a recommendation of the app.
- A photo does not turn anything into measured.

## Explicitly out of scope

Feed, money, sale prices, profitability, herd verification, WhatsApp capture, importing old notebooks, notifications outside the app, worker accounts.

## Acceptance criteria

- Calving interval and weaned kilograms are computed from records and covered by tests with synthetic data, including inferred dams and missing dates.
- A weaning that writes a weight and a herd event does it in one transaction through an application orchestrator.
- New screens follow `docs/design/guia-visual.md` and load nothing heavy at startup.
- Exports contain no session data or secrets and require a signed-in owner.
- Lint, types, unit, persistence, API and end-to-end tests and CI pass. The import-boundary test passes.

## PR mapping

Tasks `fabrica/tareas/R-36.md` to `R-42.md`.

## Learning after validation

(empty)
