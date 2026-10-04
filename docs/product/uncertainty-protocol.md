# RANCHO Uncertainty Protocol

## Status

- Status: ACCEPTED GOVERNANCE RULE
- Version: v1
- Last updated: 2026-10-04

## Core rule

If something is unknown and is not necessary to complete the current task, preserve it as unknown.

If something is unknown and is necessary to complete the current task, stop and ask.

Never silently invent, infer, normalize, or reinterpret a ranch fact or business rule merely to make implementation easier.

```
UNKNOWN + NOT BLOCKING → preserve unknown and continue
UNKNOWN + BLOCKING     → ask
NEVER                  → invent ranch truth
```

This protocol is part of the [Product Constitution](constitution.md). Where sources disagree, follow [../START-HERE.md](../START-HERE.md).

## Why this exists

RANCHO legitimately contains unknowns. Examples already accepted as open include the exact economics of `a la parte`, the exact meaning of `bulto` in a specific context, unknown parentage, unknown tenure or economic participation, unreconciled feed quantities, unverified ranch practices, unknown hardware protocols, future security procedures, and connectivity assumptions.

The interview register is [../domain/open-questions.md](../domain/open-questions.md). False certainty is worse than explicit incompleteness.

## Assumption decision tree

For missing information, ask whether it is actually required for the current task.

If it is not required:

- preserve unknown;
- continue;
- do not invent a default.

If it is required, ask whether it affects business meaning, money or profitability, ownership or economic participation, animal lifecycle, health, security, UX or workflow, persisted data semantics, API contracts, destructive behavior, authorization, audit or history, or future interpretation.

If it affects any of those, stop and ask.

If it is required and it affects none of those, a reversible technical assumption may be allowed only under the test below.

## Reversible technical assumptions

A small technical assumption is permitted without asking only if all of the following are true:

- no ranch meaning changes;
- no persisted business semantics change;
- no material UX impact;
- no security or financial risk;
- the assumption is cheap to reverse;
- the task did not already specify a choice.

Prefer existing project conventions. State the assumption when it is relevant. Never present it as ranch truth.

## How to ask

When blocked:

1. Stop before the dependent change.
2. State the exact missing information.
3. Briefly explain why it matters.
4. Ask the smallest specific question needed.
5. Do not bury the question inside unrelated output.

Bad:

> I'll treat `a la parte` as an even split so the settlement can be calculated and the screen can ship.

Good:

> Stopped. Automatic settlement needs the contractual and economic meaning of `a la parte`, which is still open (`OQ-OWN-001`). What expenses, medicines, offspring, and death of the original animal does that arrangement cover in practice?

## Preserve original terminology

Do not silently reinterpret ranch language.

- `a la parte` is not automatically a settled 50/50 rule. Keep the term until its meaning is established.
- `bulto` is not automatically a price per head. Keep the term until its local economics are established.
- A reported feed quantity is not a measured quantity.
- `SINIIGA` names the official ear tag the ranch uses. It is not an integration design.

Unknown terminology should remain in its original form until its meaning is established. An approximate interview understanding is not an operable rule.

## Inference is not confirmation

One known bull does not confirm paternity.

Allowed:

- father = inferred
- reason = only known bull present

Not allowed:

- father = confirmed

The same rule applies to AI and automation. An inference may be stored as an inference, with its reason visible. It must not be written as a confirmed fact.

## Conflicting sources

If accepted project sources appear to conflict:

1. Identify the conflict.
2. Determine whether they refer to the same scope and time.
3. Check explicit supersession.
4. If the conflict is still unresolved, stop and ask.

Do not choose based only on recency. A chat message is not automatically authoritative.

Use the source-of-truth model in [../START-HERE.md](../START-HERE.md).

## Future capability is not current fact

A possibility is not a present requirement. Examples that stay future until an accepted decision changes scope:

- cameras may be installed;
- Starlink may arrive;
- workers may get an app;
- a scale may be integrated;
- milk production may resume.

Do not turn these into current requirements unless an accepted decision changes scope. There are no cameras today. Milk infrastructure is not an active milk operation. Workers are not the capture users described so far. Full offline synchronization is not implemented.

## Unknown in UX

Do not force false certainty because a field is technically required.

Where the domain allows it, support states such as unknown, not yet identified, not measured, not assigned, and pending confirmation.

Validation should prevent impossible states, not require knowledge the ranch does not have. Unknown tenure, unknown economic participation, unknown parentage, and an unclassified or unreconciled quantity may remain explicit gaps.

## Answers become project knowledge

When a human resolves a blocking question:

1. Use the answer for the current work.
2. Classify whether it changes a domain fact, a business rule, a product decision, an architecture decision, or the current increment only.
3. Record it in the correct repository artifact before or with the dependent implementation.

Domain facts and business rules belong in [../domain/README.md](../domain/README.md). Architecture decisions belong in [../architecture/README.md](../architecture/README.md) and an accepted ADR. This baseline does not create Product Decision files. Whatever the class, an important resolved ambiguity must not remain only in chat.

## Examples

### A. Unknown but non-blocking

The IBN ARGON protocol is unknown while implementing manual weight capture. Continue without inventing a protocol. The weight can still be captured manually, with its source and quality.

### B. Blocking business meaning

Automatic `a la parte` settlement. Stop and ask. The arrangement is not an operable settlement rule.

### C. Future capability

A manual weight flow does not require camera infrastructure.

### D. Inferred fact

One known bull does not equal confirmed paternity. Record the inference and the reason, or leave the father unknown. Do not mark the father confirmed.

## Closing principle

Being blocked because required information is missing is an acceptable outcome.

Inventing a business rule to avoid being blocked is not.
