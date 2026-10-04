# Review UX

This playbook is a Reviewer prompt. It is not a source of truth.

Default behavior: read-only. Do not modify files unless the user explicitly asks for edits.

CURRENT WORK:
<path, screen, workflow, or proposal supplied by user>

## Read first

1. Read [../START-HERE.md](../START-HERE.md).
2. Read the artifact supplied above. If none was supplied, stop and ask for it.
3. Read [../product/ux-principles.md](../product/ux-principles.md) and the UX constraint in [../product/constitution.md](../product/constitution.md).
4. Read the domain or TO-BE source for the ranch task being reviewed. Do not review a screen against an imagined ranch practice.

## Evaluate

Judge the workflow against the relevant UX principles:

- the real ranch task being performed
- recurring effort
- how many times the same input is repeated
- known information asked again
- whether a valid unknown can be expressed
- whether an ordinary correction is practical
- batch work versus a one-animal form
- phone use
- what happens if the person is interrupted
- progressive disclosure
- ranch language, including unresolved terms left intact
- whether an error tells the person how to recover
- whether the information helps a decision
- UX debt that is accepted knowingly, and whether it is labeled as temporary

Workers are not assumed to be application users. Phone usability does not require a worker app or offline sync. Do not impose a click count or a visual system.

## How to label findings

Use one of these labels. Do not present an imagined behavior as something a user did.

- `OBSERVED ISSUE` — supported by actual user or pilot evidence named in the materials.
- `DESIGN RISK` — inferred from the proposed UX, and not yet observed.

If the evidence needed to judge a point is missing and the point blocks the review, ask. If it does not block the review, say it is unknown and continue.

Separate findings that are outside the supplied workflow. Do not redesign them in this review.
