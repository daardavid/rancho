# Product Decisions

A Product Decision (PD) records an accepted product choice that is important, durable enough to matter later, and not primarily something else.

Use a PD for a choice such as who the primary user of a phase is, a product-level capture strategy, a major UX or value tradeoff, or a deliberate deferral of a capability.

Do not open a PD for a ranch fact, an architecture decision, a single implementation detail, or an idea that is only being remembered. No Product Decision is created by the governance mechanism itself. Copy [TEMPLATE.md](TEMPLATE.md) only when a real decision is being proposed.

## Where a choice belongs

| Kind of choice | Record |
| --- | --- |
| Domain fact or business rule | [../../domain/README.md](../../domain/README.md) |
| Architecture decision | An ADR under [../../architecture/adr/](../../architecture/adr/) |
| Product decision | A PD in this folder |
| Choice that matters only to the current increment | That Increment or its PR brief |
| Idea not yet accepted | [../opportunity-backlog.md](../opportunity-backlog.md) |

Do not copy one decision into every record type. Point to the record that owns it.

Only an `ACCEPTED` PD is product policy. A proposal is not.

## States

| State | Meaning |
| --- | --- |
| `PROPOSED` | Written for decision. It does not govern yet. |
| `ACCEPTED` | The product choice in force. |
| `SUPERSEDED` | Replaced by a later accepted decision. Kept as history. |
| `REJECTED` | Considered and not accepted. Kept as history. |

Do not delete an old decision because it changed. Mark it `SUPERSEDED` or `REJECTED` and point to what replaced it.

## Identifiers

Use `PD-001`, `PD-002`, and so on. Do not create a decision only to consume the next number. The next id is `PD-001`. None exist yet.

## Revisit

An accepted decision that depends on current conditions must say when to revisit it. Triggers can include a recurring UX bottleneck, new infrastructure, a changed ranch operation, new evidence, changed economics, or pilot findings.

Humans accept or reject the decision. An agent may draft a proposal. It may not mark a PD accepted on its own.
