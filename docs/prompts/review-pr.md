# Review a change

This playbook is a Reviewer prompt. It is not a source of truth.

Default behavior: read-only. Do not modify files unless the user explicitly asks for edits in a later step.

CURRENT WORK:
<path, diff, or issue supplied by user>

## Read first

1. Read [../START-HERE.md](../START-HERE.md).
2. Read the current-work artifact supplied above. If none was supplied, stop and ask for it.
3. Load only the sources needed to judge this change:
   - [Product Constitution](../product/constitution.md)
   - [UX Principles](../product/ux-principles.md), when the change is user-facing
   - the relevant domain documents
   - [Uncertainty Protocol](../product/uncertainty-protocol.md)
   - the relevant ADRs
   - [Definition of Done](../product/definition-of-done.md)
   - any explicit out-of-scope statement in the current work

## What to look for

Review in this order: product value and scope, UX, domain truth, uncertainty, data semantics, architecture, security where relevant, then implementation quality.

Look specifically for:

- an invented assumption stated as fact
- a silent interpretation of ranch meaning
- unnecessary recurring UX friction
- duplicate capture
- false certainty where unknown is valid
- scope creep
- an architecture boundary leak
- derived data treated as authoritative
- a future capability implemented early
- missing validation
- a Done claim that overstates what was checked

## How to report

Use only these severities. Do not invent a numerical score.

- `BLOCKER` — the change contradicts accepted governance, domain truth, architecture, or the approved scope, or it would ship an invented ranch rule.
- `MAJOR` — the change is usable only with a serious product, UX, data, or design defect.
- `MINOR` — a limited defect that does not by itself make the change unsafe to accept.

A review may conclude `NO BLOCKING FINDINGS`. Do not call the work perfect.

For each finding, name the source it violates and the smallest decision or fix required. If a required fact is missing, apply the Uncertainty Protocol and ask. Do not fill the gap with generic practice.
