# INC-003 — Rediseño de la experiencia

Status:
DRAFT. Becomes READY when David merges it.

## Problem

Using INC-002 on 2026-11-24, David found the app plain and slow to fill: actions repeated on the same screen, the weighing screen in the wrong order (date, empty list, then the search at the bottom), the bottom navigation floating mid-page on a computer, and no visual hierarchy between what needs attention and what does not.

## User / Actor

David now; `ACT-OWNER` in the pilot.

## Hypothesis

If capture follows the approved design (one animal at a time, big numbers, one-tap choices, one main action per screen), a weighing session of about ten calves takes a few minutes and the growth screen shows at a glance which animals to check.

## User outcome

The four main screens look and behave like the approved mockups in [docs/design/maqueta/](../../design/maqueta/), following [docs/design/guia-visual.md](../../design/guia-visual.md). Ficha, corrections and login adopt the same style.

## Domain facts involved

- Nothing in the domain changes. No API contract or table changes unless a screen needs a value the server already knows how to compute (see R-21).
- **There is no target daily gain for the ranch.** «Revisar primero» must not invent one. It is defined only from each animal's own data: it was a gap in the last session, its kg/day dropped compared with its own previous interval, or its last interval relies on a weight that was not measured. Everything else is «Van bien». A ranch target, if the owner gives one, is a later parameter.
- A photo of the scale still does not change the quality of a weight.

## In scope

Design tokens and components, Hato, Pesaje, Alta and Ficha, Crecimiento, and keeping every existing test and end-to-end flow green.

## Explicitly out of scope

New domain features, feed, finance, offline queue, dark mode.

## Acceptance criteria

- Each screen matches its mockup in layout, hierarchy and the guide's tokens; no action appears twice on the same screen.
- Bottom navigation and action bars stay fixed to the bottom of the window on phone and computer.
- Capturing a session of 3 animals with one «No se pesó» and one photo works with the thumb only, without scrolling back up.
- Weights and gains are never computed with JavaScript floating point.
- Lint, types, unit tests, end-to-end tests and CI pass.

## PR mapping

Tasks `fabrica/tareas/R-17.md` to `R-21.md`.

## Learning after validation

(empty)
