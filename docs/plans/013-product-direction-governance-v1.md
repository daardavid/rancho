# Plan 013 — Product direction governance v1

## Purpose

GOV-004 creates the containers RANCHO will use for direction, accepted product choices, waiting ideas, and future increments.

It does not frame an MVP, choose features, or write an implementation backlog.

## Artifacts

| Artifact | Role |
| --- | --- |
| [../product/master-plan.md](../product/master-plan.md) | Direction and current phase |
| [../product/decisions/README.md](../product/decisions/README.md) and [TEMPLATE.md](../product/decisions/TEMPLATE.md) | How an accepted product choice is recorded |
| [../product/opportunity-backlog.md](../product/opportunity-backlog.md) | Non-committed future ideas |
| [../product/increments/README.md](../product/increments/README.md) and [TEMPLATE.md](../product/increments/TEMPLATE.md) | How a future increment is framed |

No Product Decision file and no Increment file are created in this task.

## State models

Product Decision: `PROPOSED`, `ACCEPTED`, `SUPERSEDED`, `REJECTED`.

Opportunity: `IDEA`, `INVESTIGATE`, `DEFERRED`, `PROMOTED`, `REJECTED`.

Increment: `DRAFT`, `READY`, `IN PROGRESS`, `VALIDATING`, `DONE`, `CANCELLED`.

Planning horizons: `NOW`, `NEXT`, `LATER`, `OPPORTUNITIES`.

## How the pieces relate

The Constitution governs tradeoffs. The Master Plan says where the project is and what phase comes next. An accepted Product Decision is durable product policy. An opportunity is not work. An Increment is a unit of value or learning. A PR is a reviewable repository change. A prompt tells an agent how to execute. It does not override the Increment or the governance documents.

GitHub, once configured, keeps execution history. The repository documents keep accepted project memory.

## Explicitly not decided

- Which ranch decisions the first MVP should improve
- Which problem to attack first
- What the first increments are
- Any feature order, date, or backlog
- Any new ranch fact, architecture change, or Product Decision

## Validation

- The Master Plan has direction and phase, not a feature list.
- `NOW` is finish Governance v1. It contains no MVP feature.
- Opportunities say they are not commitments.
- No `INC-` file and no `PD-` file exists besides the templates.
- Links resolve.
- Design v1 and prior governance stay in force.
- No production application is scaffolded.
