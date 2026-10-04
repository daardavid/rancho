# 004 — TO-BE domain design v0.1

## Objective

Design the ranch's desired operating model before any TO-BE screen, architecture, or implementation.

The source of truth for current pain remains `docs/domain/pain-points.md`. The current operation remains `docs/maps/as-is`. This plan does not replace either document and does not approve a scope.

The chain to produce is:

current pain → target capability → target process → solution options → trade-offs → an initial recommendation

An initial recommendation is a reading of today's evidence for a herd of about 21 head. It is not a committed decision.

## Design principles

- Stay at business and domain level. A capability says what the ranch needs to be able to do. A process says how the ranch should operate. A solution says one possible way to enable that process.
- Do not close an open question from `docs/domain/open-questions.md` by picking a convenient assumption.
- Do not treat a future capability listed in discovery as an approved build.
- Prefer a low-friction option for the current herd when it leaves a path toward more automation later.
- Do not design as though the ranch already had hundreds or thousands of animals.
- Hardware, automation, and connectivity are options. They are not requirements unless this design says so, and this version does not say so.
- Keep declared data distinct from observed or measured data.
- Management visibility is weekly. Immediate notice is only for a genuinely important exception.
- Milk is future and conditional. It is not part of the initial target operating flow.
- Workers are not assumed to be application users in the first stage (`BR-ENTRY-001`, `CON-ENTRY-001`).
- Management accounting is not a fiscal-accounting replacement (`CON-ACC-001`).
- Qualitative judgments are labeled **Evaluación inicial del proyecto**. They are not measurements of the ranch.

## Pain → capability → process → solution

| Level | Question it answers | Stable ID |
| --- | --- | --- |
| Pain point | What is weak or risky today? | `PP-…` already assigned |
| Target capability | What must the ranch become able to accomplish? | `CAP-…` |
| Target process | How should the ranch operate, as a business process? | `TGT-…` |
| Solution option | What mechanism might enable that process? | `SOL-…` |

Example, not a decision:

- Pain: `PP-FEED-001`, the ranch cannot verify feed.
- Capability: `CAP-FEED-001`, know and check feed that was purchased, prepared, and delivered.
- Process: `TGT-FEED-001`, record purchase, preparation, delivery, and the gap against what remains.
- Options: a manual batch record, the same record with evidence, a non-connected measure, a connected scale, automated dosing.

These levels stay separate. A process is not a software module. A solution type is not a requirement.

`CAP-COMM-001` is an added identifier. Discovery already separates distance communication from the weekly management cadence and from the declared-versus-observed rule. Folding those three into one capability would hide which problem an option addresses. `CAP-FEED-002` is separate from `CAP-FEED-001` because comparing a feeding strategy with growth and cost is a different outcome from knowing what was fed. `CAP-MILK-001` exists only as future and conditional, as phase 8 of this plan requires.

No new pain-point ID is created. Design questions that are not yet interview questions use a `DQ-…` ID inside the TO-BE notes. They are not inserted into `docs/domain/open-questions.md`, so the discovery register stays the interview baseline.

## Solution classification

Every option has one or more types:

| Type | Meaning | Example |
| --- | --- | --- |
| PROCESS | A way of working | Checking presence when cattle are already handled |
| POLICY | A rule of conduct | While there is one bull, paternity is recorded as an assumption |
| SOFTWARE | A structured record or reading | An internal animal identity |
| HARDWARE | A physical device | A camera at a gate, if one were chosen |
| AUTOMATION | A capture or action that happens without retyping | A weight taken from a scale link |

An option may combine types. Software in this catalog means "a structured record the ranch can keep". It does not choose a language, a database, or a product.

## Evaluation framework

Each option is scored qualitatively:

| Dimension | Allowed values |
| --- | --- |
| Cost | `low`, `medium`, `high`, `very_high` |
| Implementation complexity | `low`, `medium`, `high` |
| Operational friction | `low`, `medium`, `high` |
| Data reliability | `low`, `medium`, `high` |
| Human dependency | `low`, `medium`, `high` |
| Connectivity dependency | `none`, `low`, `medium`, `high` |
| Hardware dependency | `none`, `low`, `medium`, `high` |
| Scalability | `low`, `medium`, `high` |
| Auditability | `low`, `medium`, `high` |
| Current feasibility | `low`, `medium`, `high` |

No numeric ROI, payback, or loss figure is invented.

Implementation complexity means how hard it is for this ranch to put the option to work: habit, coordination, devices, and unresolved facts. It is not an estimate of software construction.

Each option also has:

- `recommendedNow`: `yes`, `no`, or `investigate`
- `recommendedAtScale`: `yes`, `no`, or `investigate`

`investigate` is used when the documented evidence is not enough to recommend adoption. That is a complete answer, not a placeholder to be filled by assumption.

## NOW vs SCALE

NOW is this ranch as discovered: about 21 head, about two workers who live on the property, an owner who is not there full time, no Wi-Fi, cell coverage described only as limited and unreliable, and initial capture expected from the owner.

SCALE is a herd large enough that the same manual habit may stop being realistic. Discovery did not give that head count. This design does not invent one. An option can be fit now and only something to investigate at scale, or the reverse.

A low-friction record that can later accept a device reading is preferred to buying the device now.

## Expected documentation artifacts

- `docs/plans/004-to-be-domain-design-v0.1.md` — this plan
- `docs/maps/to-be/README.md` — how to read the model, the initial package, and pain-point coverage
- `docs/maps/to-be/target-capabilities.md` — capabilities
- `docs/maps/to-be/target-process-catalog.md` — business processes
- `docs/maps/to-be/solution-catalog.md` — options and evaluations
- `docs/maps/to-be/decision-framework.md` — how a later choice is made

Business content in `docs/maps/to-be` is Spanish. Identifiers and the evaluation tokens stay in English.

Pointer sentences in `README.md`, `docs/domain/README.md`, and `docs/maps/as-is/README.md` may say that this design exists and that the application TO-BE view does not. They do not change discovery facts.

## Non-goals

- Changing `apps/domain-map`, package manifests, or the lockfile
- Implementing the TO-BE tab
- Architecture, modules, APIs, data stores, or sync design
- Choosing programming technologies
- Hardware integration, including the IBN ARGON indicator
- Detailed technical requirements
- Turning a recommendation into a committed decision
- Closing open domain questions, including feed-number inconsistency, «a la parte», «bulto», cell coverage, and the scale's model
- Fiscal accounting
- Treating milk, GPS, RFID, site internet, a worker application, or a WhatsApp API as current scope
- New pain points

## Validation criteria

This version is consistent if:

- All 16 current pain points are `covered`, `intentionally deferred`, or `conditional`
- `PP-MILK-001` stays conditional
- No solution is written as a requirement
- No technology is required without an explicit, evidence-based decision, and none is made here
- Options that need unknown hardware or unknown ranch facts are `investigate` or `no` for now
- Expensive presence or perimeter hardware is not recommended for the current herd
- The feed figures in `OQ-FEED-002` are still unresolved
- `BR-PART-001` is still the interview's own wording, not rewritten into a legal or economic rule
- Tag technology is still unchosen
- The application tree is unchanged

## Out of scope for the next implementation step

The interactive TO-BE map is a later step. It is not authorized by this plan.

## Status

- Version: 0.1
- State: Domain design, not an approved scope
- Last updated: 2026-10-03
- Source: `docs/domain` v0.1 and AS-IS v0.2
- Validation: Pending iterative validation with the ranch owner
