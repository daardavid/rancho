# INC-008 — El peso al destete no es una vuelta

Status:
DRAFT. Becomes READY when David merges it.

## Problem

David tested INC-007 end to end on 2026-11-26. Every function worked, but recording a weaning with a weight created a regular weighing session. That session became «the last round», so Crecimiento, Inicio, the weekly summary and Tendencias reported the wrong round. The summary combined a one-animal round with the gain of a different round.

## Why now

It shows wrong figures as soon as anyone weans a calf with a weight, which is exactly what INC-007 invites. It is small and needs no questionnaire answer.

## User outcome

1. Weaning a calf with a weight never replaces the herd's last round.
2. The weaning weight still counts as a weight of that calf.
3. The photo control and the weaning form follow the visual guide.

## Domain rules involved

- A weighing round is a pass through the scale for the herd. A single weight taken at another moment is still a weight with its quality, but it is not a round.
- Derived figures always name the round they come from.

## Explicitly out of scope

New kinds of single weights, such as a sale weight.

## Acceptance criteria

- David's case passes as a test across Crecimiento, Inicio, the summary and Tendencias.
- Existing weaning sessions are reclassified by the migration.
- Lint, types, unit, persistence, API and end-to-end tests and CI pass.

## PR mapping

Task `fabrica/tareas/R-43.md`.

## Learning after validation

(empty)
