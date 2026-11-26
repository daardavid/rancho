# INC-006 — Ligera en el celular, sin mensajes falsos y con tendencias

Status:
DRAFT. Becomes READY when David merges it.

## Problem

David tested INC-005 end to end and measured the app on 2026-11-25.

- Speed on the laptop is not a problem: every screen is ready in under 100 ms and every API call takes 7–75 ms with about 21 head.
- The server sends the web uncompressed. The JavaScript is 511 KB; compressed it would be about 144 KB. On a phone with a weak rural signal the first open (and the first open after each update) takes an estimated 3–4 s instead of 1.5–2 s. Five font files add about 100 KB.
- When published on a free host, the first open after 15 quiet minutes waits about a minute (ADR-016). That is the slowest thing the family would feel.
- The test found one false message and four small usability problems (task R-34).

## Why now

It is small, it does not depend on the questionnaire, and it removes the two things the family would notice first: a slow first open and a message that states something that did not happen.

## User outcome

1. The phone downloads about a third of what it downloads today on a first open.
2. No screen shows a ranch event that did not happen.
3. Floating buttons never cover a form control; validation messages are visible.
4. David knows how to keep the published app awake within the free plan, if he chooses to.
5. A **Tendencias** screen, opened with a button, shows weight over time, herd gain per round, and births and exits per month. Its chart code (Apache ECharts, modular) downloads only when the screen is opened, so the rest of the app stays light (David's decision, 2026-11-25).

## Domain rules involved

- Never invent ranch truth, including in transient messages.
- A dam marked «La vi» at a birth was seen that day.
- Unknown stays a valid answer.

## Explicitly out of scope

General code splitting, merging API calls, database tuning (measured: not needed at this size). Feed, money and profitability charts. Targets or thresholds. Publishing.

## Acceptance criteria

- Built assets are served compressed when the browser accepts it, with the same cache rules as today.
- The «volvió al hato activo» message only appears after an actual return to the herd, for that animal.
- The initial load does not include the chart library; opening Tendencias does. With too few rounds, each chart says how many there are and how many it needs.
- Lint, types, unit, persistence, API and end-to-end tests and CI pass.

## PR mapping

Tasks `fabrica/tareas/R-33.md` to `R-35.md`.

## Learning after validation

(empty)
