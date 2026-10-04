# RANCHO Master Plan

## Status

- Status: ACCEPTED PRODUCT DIRECTION GOVERNANCE BASELINE
- Version: v1
- Last updated: 2026-10-04

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

| Task | State | Record |
| --- | --- | --- |
| GOV-001 Product governance baseline | Complete | `ef67778` |
| GOV-002 UX, evaluation, and Definition of Done | Complete | `c3e04f2` |
| GOV-003 AI agent and Cursor governance | Complete | `eb6d1fe` |
| GOV-004 Product direction governance | Current | This plan |
| GOV-005 | Remaining | Not started. Its contents are not defined here. |

## NOW

Finish Governance v1.

The current task is GOV-004. The next governance task is GOV-005.

NOW does not include MVP features, an implementation backlog, or a production application.

## NEXT

After Governance v1, the expected sequence is:

1. MVP Framing
2. Pilot Design
3. Define the first product increments and the implementation plan

MVP Framing still has to answer, and this plan does not answer:

- Which ranch decisions should the first MVP improve?
- Which economic or control problems offer the highest current value?
- What do we want to learn from real use?
- Which UX assumptions need validation?
- Which data foundation is actually needed?
- Which explicit non-goals keep the MVP focused?

Those questions stay open. Answering them is later work.

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
| GitHub | Execution and history, once it is configured |
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
