# INC-005 — Listo para uso real

Status:
DRAFT. Becomes READY when David merges it.

## Problem

David tested INC-001 to INC-004 end to end on 2026-11-25 with synthetic animals (five registrations, one sale, one paddock, a group health note, two weighing sessions, one birth). The core works and growth numbers are right, but several things stop the app from being handed to the family:

- The weighing screen shows a wrong difference when a session is captured with a date earlier than the last session (it compared 25 oct against 25 nov and showed −24.5 kg). This is exactly what happens when the notebooks are loaded (`OQ-DATA-001`).
- Some forms arrive with an answer already chosen that nobody gave: «La vi» for the dam's certainty, «Vacuna» for the health note type, «No se vio» for a vaccination in the chute. If the owner does not touch them, the app stores a fact nobody stated (Constitution: never invent ranch truth).
- Inicio is not yet the weekly review: the app opens on Hato, the screen starts with a technical date control, it states "todos tienen…" when there are no animals, and it does not show the calves that are behind.
- Capture is slow where it repeats: weighing adds one animal at a time, a paddock cannot be created from «Mover a…», the dam is picked from a plain dropdown.
- A forgotten user or password can only be solved by starting a new local database.
- The MVP documents still number the increments the old way and are still PROPOSED.

## Why now

Nothing here depends on an open P0 question. It is what stands between "built" and "the family uses it". Feed and money still wait for the questionnaire.

## User outcome

1. Weighing differences are always against the latest weight **before** the captured date, so loading old notebooks shows correct numbers.
2. No form stores an answer the user did not give.
3. The app opens on Inicio, and Inicio starts with what to review (including the calves that are behind), then the period summary.
4. Capturing a weighing session, a paddock move and a birth takes fewer taps.
5. The owner can recover access on the laptop without losing data.
6. The MVP documents match what was built.
7. (Optional, task R-32) Publication is prepared so the app can run off the laptop when David decides, without publishing anything yet.

## Domain rules involved

- Never invent ranch truth: unknown stays a valid answer, and an option is chosen by the user, not by the form.
- A suggestion (the dam's tenure or paddock for her calf, the sex implied by Vaca or Toro) is shown as a proposal the user confirms; it is never written silently.
- Derived values (difference, gain) are not stored.
- Measured, observed and declared weights stay separate.

## Explicitly out of scope

Feed, money, herd verification, notifications, worker accounts, actually publishing the app (R-32 only prepares it).

## Acceptance criteria

- A weighing captured with an earlier date compares against the latest weight before that date, or shows no comparison if there is none.
- Birth, health and exit forms have no preselected answer other than «No sé»; tests prove what is stored when the user only fills the minimum.
- `#/` opens Inicio; Hato keeps working at its own route.
- Lint, types, unit, persistence, API and end-to-end tests and CI pass.

## PR mapping

Tasks `fabrica/tareas/R-27.md` to `R-32.md`.

## Learning after validation

(empty)
