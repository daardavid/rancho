# Product Increments

A Product Increment is a coherent unit of product value, learning, or both. It should be large enough to frame, build, validate, and review as one product outcome.

It is not automatically one screen, one domain entity, one module, one database table, or exactly one PR.

The first increment is [INC-001](INC-001-ficha-y-pesaje.md), framed in [../mvp-framing.md](../mvp-framing.md). Copy [TEMPLATE.md](TEMPLATE.md) only when an increment is actually being framed. Do not turn a TO-BE capability into an increment from this folder.

Direction lives in the [Master Plan](../master-plan.md). This folder does not choose what comes first.

## Increment and PR

An Increment is the product, value, or learning unit. A PR is the reviewable repository change.

One increment may be one PR. It may also be several PRs when that makes review easier and the increment can still be validated as a whole.

Do not slice only by technical layer — a database PR, then an API PR, then a UI PR — if that leaves nothing usable to validate for too long. Prefer a vertical slice when that is practical. The relationship is not a fixed ratio.

## States

| State | Meaning |
| --- | --- |
| `DRAFT` | Still being framed. |
| `READY` | Enough is known to begin approved work. |
| `IN PROGRESS` | Implementation has started. |
| `VALIDATING` | The implementation exists, and product or real-use validation is happening where this increment needs it. |
| `DONE` | The accepted criteria and the [Definition of Done](../definition-of-done.md) are met at the level this increment requires. |
| `CANCELLED` | Stopped on purpose. The record stays. |

`DONE` for the repository change is not the same thing as confidence from repeated ranch use. The Definition of Done already says when real use is still required.

## Readiness

Do not mark an increment `READY` until:

- the problem is clear
- the user or actor is known
- the value hypothesis is plausible
- blocking unknowns are resolved
- scope and explicit non-scope are clear
- the relevant domain and architecture sources are identified
- acceptance criteria exist
- a validation approach exists

`READY` does not require every future question to be answered. A non-blocking unknown stays unknown. A blocking unknown stops readiness. Use the [Uncertainty Protocol](../uncertainty-protocol.md).

## Identifiers

Use `INC-001`, `INC-002`, and so on, in file names such as `INC-001-short-title.md`. Do not reserve numbers for imagined features. The next id is `INC-002`.

## Learning

After validation, write what belongs to this increment in its "Learning after validation" section. Move anything that changes shared project knowledge to the owning artifact, as the [Master Plan](../master-plan.md) describes. Do not paste the same finding into the plan, a PD, the domain notes, and the backlog.

```
Constitution
    → Master Plan
        → Product Increment
            → PR(s)
                → Validation
                    → Learning
```

An idea from the [Opportunity Backlog](../opportunity-backlog.md) becomes an increment only after it is promoted through evaluation or an accepted decision. The backlog itself is not a queue of ready work.
