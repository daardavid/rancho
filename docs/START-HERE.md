# Start here

Universal entry point for humans and AI agents working on RANCHO.

Read this page to choose sources. Do not treat it as a copy of the domain or the architecture.

## Mandatory first reads

For meaningful product, domain, UX, architecture, or implementation work, read:

1. [product/constitution.md](product/constitution.md)
2. [product/uncertainty-protocol.md](product/uncertainty-protocol.md)
3. [checkpoints/design-v1.md](checkpoints/design-v1.md)

Then load only the sources that govern the task.

Do not read every project document for every small change. Load context by responsibility.

## Source of truth by question type

Authority depends on the kind of question. There is no single document that outranks every other document for every question.

| Question | Authority |
| --- | --- |
| Product purpose and principles | [Product Constitution](product/constitution.md). An accepted [Product Decision](product/decisions/README.md), once one exists. |
| Ranch and domain facts | [docs/domain/](domain/README.md), the [open-question registry](domain/open-questions.md), and accepted domain refinements. |
| AS-IS and TO-BE | [docs/maps/as-is/](maps/as-is/README.md) and [docs/maps/to-be/](maps/to-be/README.md). |
| Architecture | [docs/architecture/](architecture/README.md), accepted ADRs, and [docs/maps/architecture/](maps/architecture/README.md). |
| Current design baseline | [docs/checkpoints/design-v1.md](checkpoints/design-v1.md). |
| Repository delivery: branches, Pull Requests, CI, GitHub review, and merge | [docs/development/github-workflow.md](development/github-workflow.md). |
| Current work | Direction and phase: [Master Plan](product/master-plan.md). Accepted product policy: [Product Decisions](product/decisions/README.md). Current product scope: the Product Increment, when one exists. A PR brief or linked issue may define the repository change. |

The Master Plan provides direction. An Increment, when one exists, provides the current product scope. A prompt provides instructions. A prompt does not override the Increment, the Master Plan, or other governance.

Current-work documents define scope. They do not silently override the Constitution, domain truth, or accepted architecture.

## Conflict rule

If sources appear to conflict:

1. Identify the type of decision.
2. Use the authoritative source for that type.
3. Check explicit supersession.
4. If the conflict is still unresolved, stop and ask.

Do not resolve contradictions by convenience. Do not assume the newest timestamp wins. Do not assume running code defines correct business behavior.

## Unknown rule

Follow [product/uncertainty-protocol.md](product/uncertainty-protocol.md).

Unknown and not blocking: preserve it.

Unknown and blocking: ask.

Never invent ranch truth.

## Context loading by task

**Product or scope.** Constitution, Uncertainty Protocol, Design Checkpoint v1, the [Master Plan](product/master-plan.md), and the pain or capability the work claims to serve. Read an accepted Product Decision when the task depends on one. When judging whether a meaningful idea, workflow, automation, or integration deserves to be pursued now, also use the [Product Scorecard](product/product-scorecard.md), together with current evidence and the current phase. The [Opportunity Backlog](product/opportunity-backlog.md) is for evaluating a future idea, not for every task. The scorecard supports judgment. It does not override the Constitution, and it does not set priority by arithmetic. Do not reopen architecture or invent domain facts in a scope note. A typo or an equivalent trivial change does not need the scorecard, the Master Plan, or the Opportunity Backlog.

**UX.** Constitution, [UX Principles](product/ux-principles.md), Uncertainty Protocol, plus the target process and the actor who actually captures or reads. Workers are not assumed to be application users. Unknown must remain expressible. The UX principles are not required reading for a change that does not affect how someone works.

**Domain.** [docs/domain/](domain/README.md) and [open questions](domain/open-questions.md). Keep `a la parte` and `bulto` in their original terms until their meaning is established. Keep `SINIIGA` as the name of the official ear tag, not as an integration design. Do not close an open question inside a code change.

**Architecture.** [docs/architecture/](architecture/README.md), the relevant ADRs, and the [architecture map](maps/architecture/README.md) as an explanation of the accepted baseline. The map does not replace the architecture documents.

**Code or implementation.** When one exists, the current [Product Increment](product/increments/README.md) is the product scope. Also read its PR brief when the change is one PR of that increment; the relevant ADRs; the relevant module and domain documents; the Constitution; and the Uncertainty Protocol. For a meaningful product increment, also use the [Definition of Done](product/definition-of-done.md). Design Checkpoint v1 still bounds what has been accepted. No production application is the behavior specification. A trivial change does not need every Done section.

**Repository delivery.** When the task creates a branch, prepares a commit meant for `main`, opens or reviews a Pull Request, or concerns merge, read the [GitHub delivery workflow](development/github-workflow.md). A task that does not touch delivery does not need it.

**Review.** Check the change against the Constitution, the Uncertainty Protocol, the authoritative source for the question type, and the scope of the current work. A meaningful implementation review should also consider the [Definition of Done](product/definition-of-done.md). Look for invented ranch facts, collapsed uncertainty, duplicated capture, derived data written as truth, and future tools promoted into current requirements. A typo or an equivalent trivial fix does not need the full Definition of Done.

## Repository knowledge rule

If an important accepted decision exists only in a ChatGPT conversation, a Cursor conversation, a Work run, a personal note, or a GitHub comment, it is not safely preserved as project knowledge yet.

Once accepted, record it in the correct repository artifact.

GitHub preserves discussion and history. The repository preserves accepted project knowledge.

## Agent behavior

AI agents should distinguish fact from proposal, distinguish current from future, preserve unknowns, surface conflicts, minimize unnecessary scope, protect UX, protect reliable data semantics, respect architecture, and avoid speculative infrastructure.

They may recommend changes. They may not silently redefine the project.

## AI-assisted work

For a meaningful task done with Cursor, ChatGPT, ChatGPT Work, or another agent, read [ai/context-guide.md](ai/context-guide.md) after this page. The guide says how to load context and how to behave. It does not replace the sources above.

In Cursor, behavior is also constrained by `.cursor/rules/`.

Reusable prompt playbooks:

- [prompts/implement-pr.md](prompts/implement-pr.md)
- [prompts/review-pr.md](prompts/review-pr.md)
- [prompts/ux-review.md](prompts/ux-review.md)
- [prompts/domain-review.md](prompts/domain-review.md)

Open the playbook that matches the task. Do not read every prompt file by default.

A trivial human-only edit does not require the AI context guide.

## Before modifying files

For non-trivial work, the agent or developer should be able to answer:

1. What problem is this solving?
2. Who has the problem?
3. Why does it matter to RANCHO?
4. Which sources govern it?
5. What is out of scope?
6. Are required facts unknown?
7. Does it affect accepted architecture?
8. How will the result be validated?

If required answers are unavailable, apply the [Uncertainty Protocol](product/uncertainty-protocol.md).

## Current project state

RANCHO Design Phase v1 is closed. Accepted artifacts include AS-IS v1, TO-BE v1, Logical Architecture v1, Physical Architecture v1, and Architecture Map v1. Details and commit pins are in [checkpoints/design-v1.md](checkpoints/design-v1.md).

Governance v1 is closed. Details and commit pins are in [checkpoints/governance-v1.md](checkpoints/governance-v1.md).

The current phase is MVP Framing, with a proposed MVP and first increment awaiting David's merge.

MVP Framing is proposed in [product/mvp-framing.md](product/mvp-framing.md) and the first increment is [INC-001](product/increments/INC-001-ficha-y-pesaje.md). The production application is built by the repository factory (`fabrica/`, rules in `AGENTS.md`). The interactive domain map in `apps/domain-map` is not the ranch application.

Direction and the current phase are in the [Master Plan](product/master-plan.md).

## Fundamental reminder

Do not optimize a local task at the expense of RANCHO's global goal.

Prefer work that improves ranch economic decision-making, reduces user friction, increases trustworthy reusable information, and keeps a proportionate path toward future automation and AI.

And always:

Unknown and not blocking: preserve it.

Unknown and blocking: ask.

Never invent ranch truth.
