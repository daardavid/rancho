# INC-001 — Ficha del hato y pesaje de becerros

Status:
DRAFT. Becomes READY when David merges it. It has no blocking unknowns: see "Unknowns".

## Problem

The ranch has no record of which animals it manages beyond SINIIGA tags, names, and memory, and calf weights live in notebooks. The owner cannot answer with a record which calves are gaining weight or which were not weighed (`PP-ID-001`, `PP-DATA-001`, `PP-GROW-001`).

## User / Actor

`ACT-OWNER` captures and reads. `ACT-WORKER` runs the chute and sends the numbers by the channels used today. Workers are not application users ([actors.md](../../domain/actors.md)).

## Why this matters

- Decision quality: which calves are behind, which to watch or sell.
- Reliable reusable data: a stable identity and a weight series are the foundation for profitability (`PP-FIN-001`), missing-animal risk (`PP-SEC-001`), and feed analysis (`PP-FEED-001`).
- Control: an expected calf that did not pass the scale becomes visible in the weekly review.

## Hypothesis

If the owner can turn the worker's message into a weighing session in a few minutes, the ranch will have a usable weight history after a few sessions, and the owner will use the growth view in the weekly review.

## What we want to learn

See [mvp-framing.md](../mvp-framing.md), section 5.

## User outcome

The owner can:

1. Register each animal the ranch manages, with whatever is known: internal identity, SINIIGA or other marks, name, sex and approximate category, tenure, economic participation, and a free note. Anything can be unknown.
2. Correct a ficha. The previous value stays in the history.
3. Record a calf weighing session: date, the calves expected in it when known, and for each calf that passed, its weight and how the number was obtained (measured, observed, declared).
4. Mark an expected calf as not weighed.
5. Correct a mistyped weight. The previous value stays in the history.
6. See, per animal and for the herd, the weight series, interval gain between two weights (kg and kg/day), the last weighing, and the gaps.

## UX flow

1. Log in on the phone.
2. **Hato**: list of active animals with display name, marks, category, last weight. Add an animal with a short form where only the internal identity is created automatically and everything else can be skipped or marked unknown.
3. **Pesaje**: start a session for a date. The app proposes the calves of the previous session as expected (editable). One row per calf: weight, quality (default "medido"), or "no se pesó". Save once. A retry after a lost connection does not duplicate the session.
4. **Crecimiento**: table and simple chart per calf; calves with lower interval gain and calves not weighed are shown first.

## Domain facts involved

- Herd `Animal` record: identity, marks, sex and category, tenure, economic-participation descriptor and verbal note, active flag ([domain-boundaries.md](../../architecture/domain-boundaries.md), Herd). `TGT-ANIMAL-001`. `BR-ID-001` to `BR-ID-003`. `CAP-ID-001`, `CAP-OWN-001`.
- Growth weighing session and weight records with source quality, gaps, and interval gain as a derivation ([domain-boundaries.md](../../architecture/domain-boundaries.md), Growth). `TGT-WEIGH-001`. `BR-WEIGH-001` to `BR-WEIGH-004`. `CAP-GROW-001`.
- «a la parte» stays a tenure value plus an optional verbal note. No percentage is computed (`OQ-OWN-001`).

## Data produced / improved

Roster with stable identities, marks history, weight series with source quality, gaps per session, interval gain, last weighing.

## Decision enabled

Which calves are behind expected gain and need attention; which calves were not weighed; the herd's real composition by tenure.

## Future evolution value

A scale adapter can later supply the same weight command (`OPP-001`). The roster is the anchor for exits, sales, births, and verification.

## Unknowns

### Blocking

None. The increment is designed so every open question can be recorded as unknown.

### Non-blocking

- `OQ-OWN-003`: which animals exist and which calves enter the routine. Learned through use, not assumed.
- `OQ-OWN-001`, `OQ-OWN-002`: «a la parte». Stored as tenure plus note.
- `OQ-SCALE-001`: scale model. Manual capture only.
- `OQ-ID-001`: recognizing a calf before the tag. Internal identity covers it.
- `OQ-WEIGH-001`: who is present at weighing and who writes the number. The owner chooses the quality per weight.
- `OQ-AGE-001`: birth date or age. Not stored in INC-001; revisit when the answer arrives or births are framed (INC-005).
- `OQ-DATA-001`: the old Excel. Loading any history is INC-002.
- Display-code format (design checkpoint open decision). Not needed: the UI uses name and marks.
- Final hosting (needed for INC-002, not for this increment).

## In scope

- `apps/api`: Fastify, shared kernel, Herd and Growth modules (domain, application, persistence), identity (owner session, `owner` and `support` roles), `AnimalGrowthView` and last-weighing queries, import-boundary test.
- `apps/web`: login, Hato, Pesaje, Crecimiento. Spanish, mobile first.
- `packages/api-contracts`: Zod contracts for these commands and queries.
- PostgreSQL schemas `herd`, `growth`, `identity`; one migration stream; one seeded ranch.
- A command to create the owner account.
- CI: lint, typecheck, unit, persistence, and API tests, plus the Playwright end-to-end flows.

## Explicitly out of scope

Everything listed in [mvp-framing.md](../mvp-framing.md), section 5 ("Explicit non-goals"). Also: location and paddocks, display codes, evidence photos, deployment.

## Relevant Product Decisions

None yet.

## Relevant domain sources

[ranch-context.md](../../domain/ranch-context.md), [business-rules.md](../../domain/business-rules.md), [open-questions.md](../../domain/open-questions.md), [target-process-catalog.md](../../maps/to-be/target-process-catalog.md) (`TGT-ANIMAL-001`, `TGT-WEIGH-001`).

## Relevant ADRs

ADR-002, ADR-003, ADR-005 to ADR-010, ADR-012, ADR-013, and the proposed [ADR-014](../../architecture/adr/ADR-014-local-test-database.md).

## Relevant UX Principles

UX-03, UX-04, UX-05, UX-06, UX-07, UX-09, UX-12, UX-13, UX-17, UX-18.

## Product Scorecard

Economic Value:
MEDIUM

UX Benefit:
HIGH

Decision Value:
MEDIUM

Data Value:
HIGH

Evolution Value:
HIGH

Frequency / Reach:
MEDIUM

Complexity / Burden:
MEDIUM

Recommendation:
PURSUE NOW

Reasoning: it is the foundation every critical pain needs, it is not blocked by any P0 open question, and the capture happens at a cadence the ranch already has (about every 15 days for calves). The economic value is indirect until feed and profitability exist.

## Acceptance criteria

- An animal can be registered with only an internal identity, and every other field accepts "unknown."
- Tenure and economic participation are separate fields; «a la parte» is a tenure value with an optional verbal note, and no share is computed.
- A replaced or lost SINIIGA tag leaves the animal findable by its previous mark.
- A weighing session with N calves is one save; repeating the same command id returns the same session; the same id with a different payload returns `idempotency_mismatch`.
- Each weight stores measured, observed, or declared. Correcting a weight keeps the previous value, who corrected it, when, and why.
- Correcting with a stale version returns `version_conflict` and changes nothing.
- An expected calf not weighed appears as a gap of that session. It does not exit the animal and is not a herd verification.
- Interval gain is shown, never stored as an editable number, and is computed from two weights of the same animal.
- Weights and money never pass through JavaScript floating-point as the authoritative value.
- Only a logged-in `owner` or `support` session can write; every write records who recorded it.
- The import-boundary test passes.
- The owner completes the Pesaje flow for a session of ~10 calves on a phone without help, in one sitting.

## Validation plan

- Automated tests per [testing-strategy.md](../../architecture/testing-strategy.md).
- Factory review (Gemini 4 Neon High as orchestrator, Claude only on clear doubts) of every PR against the Constitution and this increment.
- David's product review of `integracion → main`.
- Real use starts in INC-002 (pilot), with the owner's first sessions.

## Accepted UX debt

- No photo of the scale indicator yet; the quality is chosen by hand. Revisit in INC-002.
- No offline queue; a lost connection means retrying the save, which is safe because the command is idempotent. Revisit with `OQ-CONN-001`.

## Risks / failure modes

- The owner never types the sessions: validate in the pilot with the questionnaire answers about who captures and how numbers arrive.
- Roster stays mostly unknown: acceptable at first; the ficha must still be useful with name and tag alone.

## Follow-up / revisit triggers

- Answers to the [questionnaire](../../domain/cuestionario-002.md).
- The owner asks for something not in scope during the pilot.

## PR mapping

Executed by the factory, one PR per task, against `integracion`. Tasks: `fabrica/tareas/R-01.md` to `R-09.md`, in the order of `fabrica/tareas/orden.txt`.

| Task | Pull Request | What it delivered |
| --- | --- | --- |
| R-01 | [#3](https://github.com/daardavid/rancho/pull/3) Esqueleto de la app | npm workspaces, Fastify edge, the shared kernel, the import-boundary test, the web shell with TanStack Query, and the Zod contracts package |
| R-02 | [#4](https://github.com/daardavid/rancho/pull/4) Persistencia base | Drizzle, the one reviewed migration stream, `ranch_id` scope, the command-id idempotency store, and the explicit migrate/reset/seed commands |
| R-03 | [#5](https://github.com/daardavid/rancho/pull/5) Identidad: cuenta del propietario y sesión | `identity` schema, owner and support accounts, Argon2id passwords, cookie sessions in PostgreSQL, and the login rate limit |
| R-04 | [#6](https://github.com/daardavid/rancho/pull/6) Herd: ficha del animal y marcas | `herd` module: `Animal`, unknown-valued ficha, reasoned corrections with history, marks with replace/lost, and search by a previous tag |
| R-05 | [#7](https://github.com/daardavid/rancho/pull/7) Growth: sesiones de pesaje y pesos | `growth` module: weighing sessions with measured/observed/declared weights, gaps, weight corrections, and idempotent saves |
| R-06 | [#8](https://github.com/daardavid/rancho/pull/8) Vistas de crecimiento | `AnimalGrowthView` and the herd growth summary, with interval gain computed in PostgreSQL over `numeric` |
| R-07 | [#9](https://github.com/daardavid/rancho/pull/9) Web: inicio de sesión y hato | Login, Hato, and animal registration in Spanish, mobile first, with "No sé" as an ordinary choice |
| R-08 | [#10](https://github.com/daardavid/rancho/pull/10) Web: pesaje y crecimiento | Pesaje, Sesion, Crecimiento, and weight correction screens, plus the offline-safe weighing draft |
| R-09 | [#11](https://github.com/daardavid/rancho/pull/11) Listo para probar en vivo | One production process serving API and web, `npm run build` / `npm start`, Playwright flows, and `docs/development/correr-local.md` |

## Learning after validation

(empty)
