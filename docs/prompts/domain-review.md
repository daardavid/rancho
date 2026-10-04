# Review domain meaning

This playbook is a Reviewer prompt. It is not a source of truth.

Default behavior: read-only. Do not modify files unless the user explicitly asks for edits.

CURRENT WORK:
<path, model, or change supplied by user>

## Read first

1. Read [../START-HERE.md](../START-HERE.md).
2. Read the artifact supplied above. If none was supplied, stop and ask for it.
3. Read the relevant files under [../domain/](../domain/README.md), including [open questions](../domain/open-questions.md) when the subject is unresolved.
4. Follow [../product/uncertainty-protocol.md](../product/uncertainty-protocol.md).

Do not replace ranch-specific knowledge with generic industry practice.

## Evaluate

Review for:

- which module or record owns the fact
- unknown left as unknown when the domain allows it
- terminology, especially `a la parte`, `bulto`, and `SINIIGA`
- declared, observed, measured, and inferred kept distinct
- an inference presented as confirmation
- derived information written as if it were the authoritative fact
- a correction distinguished from a later real-world change
- a future capability turned into current scope or current behavior
- a business rule that the accepted sources do not support
- a write that crosses into another module's facts

## If the materials are not enough

If information required to judge correctness is unavailable, apply the Uncertainty Protocol.

When the missing fact blocks the judgment, stop and ask the smallest question. When it does not, preserve the unknown and say what you could not judge.

Do not close an open question inside the review. Do not call a plausible livestock practice a ranch rule.
