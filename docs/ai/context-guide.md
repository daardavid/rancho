# RANCHO AI context guide

## Status

- Status: ACCEPTED AI AGENT GOVERNANCE BASELINE
- Version: v1
- Last updated: 2026-10-04

This guide explains how an AI agent should work on RANCHO. It covers Cursor, ChatGPT, ChatGPT Work, and future coding or review agents.

Authority by question type lives in [../START-HERE.md](../START-HERE.md). This guide does not replace that page, the [Product Constitution](../product/constitution.md), the domain documents, or the architecture baseline. It says how to load and obey them.

These playbooks are not source of truth: [implement](../prompts/implement-pr.md), [review](../prompts/review-pr.md), [UX review](../prompts/ux-review.md), and [domain review](../prompts/domain-review.md). Open only the playbook that matches the task.

In Cursor, the rules in `.cursor/rules/` add behavioral constraints. Those rules point back here and at the accepted documents. They do not become a second constitution.

## 1. Agent role

An agent may analyze, propose, challenge, review, implement approved work, find inconsistencies, and automate mechanical repository work.

An agent may not silently establish ranch facts, business meaning, product policy, accepted architecture changes, or scope expansion.

Humans retain the authority defined in the [Product Constitution](../product/constitution.md): product priorities, business meaning, ranch-specific rules, UX tradeoffs, domain ambiguity, architecture changes, and merge decisions.

## 2. Session bootstrap

For a meaningful task, start at [../START-HERE.md](../START-HERE.md). Then load context by responsibility.

Do not load every repository document. Prefer the smallest sufficient authoritative context.

A typical future implementation task should load:

- [Product Constitution](../product/constitution.md)
- [Uncertainty Protocol](../product/uncertainty-protocol.md)
- the current Increment or PR brief, when one is supplied
- the relevant domain documents
- the relevant ADRs
- [UX Principles](../product/ux-principles.md), when the work is user-facing
- [Definition of Done](../product/definition-of-done.md), for a meaningful review

No production application has been scaffolded. Do not assume `apps/api` or `apps/web` exists. `apps/domain-map` is the discovery map, not the ranch application.

## 3. Task classification

Before meaningful work, classify the task as one or more of: Product, Domain, UX, Architecture, Implementation, Review, or Discovery / investigation.

Use that class to choose what to read, following the context-loading section of Start Here. Do not reopen unrelated concerns.

## 4. Fact versus proposal

Keep these categories distinct. Do not present one as another.

| Category | Meaning |
| --- | --- |
| Fact | Supported by an accepted project source. |
| Open question | Explicitly unresolved. The register is [../domain/open-questions.md](../domain/open-questions.md). |
| Assumption | A temporary, reversible technical assumption allowed by the Uncertainty Protocol. |
| Proposal | A suggested future decision. It is not yet accepted. |
| Future possibility | Not current scope. |
| Derived information | Calculated or projected from authoritative facts. It does not write those facts. |
| AI inference or recommendation | Not an authoritative ranch fact. |

## 5. Uncertainty

Follow [../product/uncertainty-protocol.md](../product/uncertainty-protocol.md).

Unknown and not blocking: preserve it and continue.

Unknown and blocking: ask.

Never invent ranch truth.

## 6. Conflict handling

If the current request conflicts with the Product Constitution, accepted domain truth, an accepted Product Decision, an accepted ADR, or the boundaries of the current Increment, do not silently work around the conflict.

Report what conflicts, which sources are involved, why it matters, and the smallest decision needed.

If the repository contains an explicit supersession, use that. Otherwise stop and ask. Do not treat the newest timestamp, a chat message, or running code as the winner.

## 7. Scope control

Implement the requested and approved scope only.

Do not refactor unrelated areas, add a future capability because it might be useful later, install technology without a need, turn a TODO into a requirement, or close an unrelated open question.

If a nearby improvement is useful and outside scope, report it separately. Do not implement it silently.

## 8. Repository memory

A conversation is temporary context. Accepted decisions belong in the repository.

When a discussion resolves an important ambiguity, classify it and record it in the artifact that owns that class:

- domain documents, for a ranch fact or business rule
- an ADR, for an architecture decision
- the Increment or PR brief, when the answer is only for that work
- a governance file, when the change is governance
- a Product Decision, when that record type exists

This guide does not create Product Decision files. An important accepted decision must not remain only in chat.

## 9. Builder and reviewer modes

Use one mode for the task. Do not mix them.

**Builder.** Implement the approved scope. Ask when blocked. Run the required checks. Leave unrelated improvements unbuilt.

**Reviewer.** Stay read-only. Look for violations. Challenge assumptions. Compare the work with governance and the acceptance criteria. Do not modify files unless the user explicitly asks for edits.

The same product may do both jobs. It must not do both ambiguously in one task. A review playbook stays read-only even when the agent is capable of editing.

## 10. Review priorities

For meaningful work, review in this order: product value and scope, UX, domain truth, uncertainty handling, data semantics, architecture, security where it is relevant, then implementation quality.

Technical elegance does not excuse a product or domain error.

## 11. Output discipline

Report what changed or is proposed, assumptions made, blocking unknowns, validation performed, out-of-scope findings, and conflicts found.

State a check only if it was actually run. Do not claim that tests passed when they were not run.

Do not bury a blocking question inside a long implementation summary.

## 12. Do not over-engineer context

The context system exists to improve decisions, not to maximize tokens.

Do not automatically ingest every domain note, map, ADR, and governance file. Load what the task requires.

When in doubt, follow [../START-HERE.md](../START-HERE.md).

## Cursor rule index

These rules constrain Cursor. They are behavioral. The documents they cite remain the authority.

| Rule | Application | Use when |
| --- | --- | --- |
| [00-rancho-core.mdc](../../.cursor/rules/00-rancho-core.mdc) | Always | Every meaningful RANCHO task. |
| [60-uncertainty-protocol.mdc](../../.cursor/rules/60-uncertainty-protocol.mdc) | Always | Every meaningful RANCHO task. |
| [10-domain-safety.mdc](../../.cursor/rules/10-domain-safety.mdc) | Agent-requested | Ranch meaning, facts, source quality, or open questions are in play. |
| [20-product-ux.mdc](../../.cursor/rules/20-product-ux.mdc) | Agent-requested | User-facing behavior or product priority is in play. |
| [30-architecture.mdc](../../.cursor/rules/30-architecture.mdc) | Agent-requested | Boundaries, persistence, APIs, or ADRs are in play. |
| [40-development-workflow.mdc](../../.cursor/rules/40-development-workflow.mdc) | Agent-requested | Files, checks, commits, or scope of a change are in play. |

An agent outside Cursor should follow this guide and Start Here. It should open a playbook only when the task matches that playbook.
