# RANCHO Master Plan

## Status

- Status: ACCEPTED PRODUCT DIRECTION GOVERNANCE BASELINE
- Version: v1
- Last updated: 2026-11-24

The Master Plan is the canonical repository view of RANCHO's direction and current phase.

It is not a feature backlog, a promise that later work is fixed, an implementation specification, or a replacement for a Product Increment. It is not a GitHub history, and it is not a private planning note.

A personal note may summarize this plan. The repository version is the accepted shared context for developers and AI agents.

The [Product Constitution](constitution.md) still governs tradeoffs. This plan does not weaken it.

## Progressive planning

The nearer the work, the more concrete it should be. The farther the work, the more it should say goals and direction, not invented implementation detail.

| Horizon | Certainty |
| --- | --- |
| NOW | Current accepted work and the current phase. Concrete. |
| NEXT | The likely next phase or objectives. Direction is reasonably clear. Implementation detail may not be. |
| LATER | Longer-term stages. Goals, not commitments. |
| OPPORTUNITIES | Possible future value. No commitment. Detail lives in the [Opportunity Backlog](opportunity-backlog.md). |

## Completed

### Design Phase v1

Closed at [../checkpoints/design-v1.md](../checkpoints/design-v1.md).

- Discovery and domain documentation
- AS-IS v1
- TO-BE v1
- Logical Architecture v1
- Physical Architecture v1
- Architecture Map v1
- Design Checkpoint v1

No production application was scaffolded.

### Governance v1

Closed at [../checkpoints/governance-v1.md](../checkpoints/governance-v1.md).

| Task | State | Record |
| --- | --- | --- |
| GOV-001 Product governance baseline | Complete | `ef67778` |
| GOV-002 UX, evaluation, and Definition of Done | Complete | `c3e04f2` |
| GOV-003 AI agent and Cursor governance | Complete | `eb6d1fe` |
| GOV-004 Product direction governance | Complete | `2c688c2` |
| GOV-005 GitHub delivery governance | Complete | Closure commit containing the Governance v1 checkpoint |

## NOW

MVP Framing, proposed in [mvp-framing.md](mvp-framing.md), and the first increment, [INC-001 — Ficha del hato y pesaje de becerros](increments/INC-001-ficha-y-pesaje.md).

Both become accepted when David merges them into `main`. Until then this section still reads: no MVP scope has been selected and no production application has been scaffolded.

Done means the whole TO-BE in the end, and the MVP is the first done (David, 2026-11-22). The MVP path and its non-goals are in [mvp-framing.md](mvp-framing.md).

INC-001 is executed by the repository factory (`fabrica/`). The interview answers that unblock the critical pains are collected with [../domain/cuestionario-002.md](../domain/cuestionario-002.md).

## NEXT

1. [INC-002 — Todo en local](increments/INC-002-todo-en-local.md): run the app on the laptop and on a phone on the same Wi-Fi, with a local backup and a photo of the scale.
2. A later migration increment publishes the app so it can run off the laptop. It follows INC-002. Its id is assigned when it is framed.
3. Feed, profitability, and herd-control increments, in the order the interview answers allow ([mvp-framing.md](mvp-framing.md), "Proposed MVP path").
4. Where loading the notebook or Excel history (`OQ-DATA-001`) lands is still open. INC-002 leaves it out.

## LATER

These are stages, not a roadmap and not a feature list. No dates are set.

- Pilot-ready core
- Real ranch pilot
- MVP v1
- Learning and reprioritization
- Later ranch and system evolution

None of these stages is committed scope. Learning can change their order or their meaning.

## Opportunities

Possible later value is listed in the [Opportunity Backlog](opportunity-backlog.md). An entry there is not NOW, not NEXT, and not permission to build.

## Learning loop

The plan is not: plan, implement everything, then validate at the end.

Prefer:

frame → build an increment → validate → learn → update direction → choose the next increment.

Completion is not the only progress signal. Learning from actual ranch use may change the next priority. This plan should change deliberately when accepted evidence changes.

After validation, record the learning in the artifact that owns it:

| Learning | Where it belongs |
| --- | --- |
| Domain fact or business rule | [../domain/README.md](../domain/README.md) |
| Product policy | A Product Decision, using [decisions/TEMPLATE.md](decisions/TEMPLATE.md) |
| Architecture decision | An ADR under [../architecture/adr/](../architecture/adr/) |
| Future possibility | [opportunity-backlog.md](opportunity-backlog.md) |
| Change of next priority or phase | This Master Plan |
| What this increment itself showed | The completed Increment |

Do not copy the same learning into every artifact.

## Relationship to other artifacts

| Artifact | What it owns |
| --- | --- |
| Master Plan | Direction and phase |
| Product Decision | An accepted product-level choice, and when to revisit it |
| Opportunity Backlog | A future idea with no commitment |
| Product Increment | A coherent unit of product value or learning |
| PR | A reviewable repository or code change |
| Prompt | An execution instruction, not project truth |
| GitHub | Execution and history. How work moves through it: [../development/github-workflow.md](../development/github-workflow.md) |
| Repository documents | Accepted durable project memory |

```
Constitution
    → Master Plan
        → Product Increment
            → PR(s)
                → Validation
                    → Learning
                        → Master Plan, Product Decision, domain, ADR, or Opportunity

Opportunity Backlog
    → when promoted, product evaluation or a decision
        → Master Plan or an Increment
```

An Increment may be one PR or several. The [increment rules](increments/README.md) say when. A prompt does not override the Increment, this plan, or the Constitution.

## Change rule

This plan can change more often than the Constitution. A change should still be deliberate.

A meaningful change to NOW, NEXT, the accepted phase order, or major product direction should be reviewable in Git. Do not rewrite history silently. Completed phases stay recorded. Do not maintain a fake schedule.

## Personal notes

A personal or private planning note may hold reminders, rough ideas, discussion points, and a personal order of attention.

That note is not authoritative project memory. When a direction is accepted and should guide developers or agents, update this Master Plan or the artifact that owns that decision.
