# RANCHO Definition of Done

## Status

- Status: ACCEPTED PRODUCT DEFINITION OF DONE BASELINE
- Version: v1
- Last updated: 2026-10-04

Done does not mean only that the code compiles, that tests pass, or that a screen exists.

A meaningful product increment is Done only when it is sufficiently correct across product value, UX, domain semantics, data semantics, evolution, technical quality, and validation.

Apply this definition proportionally. It elaborates the [Product Constitution](constitution.md). It does not weaken that constitution, the [Uncertainty Protocol](uncertainty-protocol.md), the [UX Principles](ux-principles.md), accepted domain truth, or accepted architecture.

## Value

- [ ] The problem being solved is identified.
- [ ] The primary user or actor receiving value is known.
- [ ] The work has a plausible relationship to RANCHO's North Star.
- [ ] The work is not being built merely because the technology is interesting.
- [ ] Explicit out-of-scope items remain out of scope.

The North Star asks for better economic decisions, less operational friction, and trustworthy reusable data, together. Strength on only one of those is not automatically enough.

## UX

- [ ] The main workflow is understandable in ranch terms.
- [ ] The system does not ask for information it already knows without justification.
- [ ] Duplicate capture is avoided unless explicitly justified.
- [ ] Valid unknown states can be represented where the domain allows them.
- [ ] Normal mistakes have a practical correction path.
- [ ] Recurring frequency and friction were considered.
- [ ] The expected device and environment were considered.
- [ ] Progressive disclosure is used where detail would otherwise burden the main task.
- [ ] User-facing errors support recovery where relevant.
- [ ] Known temporary UX debt is documented rather than silently accepted.

Do not impose an arbitrary rule such as a maximum of three clicks. Judge the recurring burden against the value of the task. Phone usability matters. It does not require a worker app or offline sync.

## Domain

- [ ] No ranch fact or business rule was invented.
- [ ] Blocking unknowns were resolved through the Uncertainty Protocol.
- [ ] Non-blocking unknowns remain explicitly unknown where appropriate.
- [ ] Open domain questions were not silently closed.
- [ ] Declared, observed, measured, and inferred distinctions remain correct where relevant.
- [ ] Authoritative ownership of facts remains correct.
- [ ] Legitimate historical changes and corrections are represented appropriately.
- [ ] Future capabilities were not promoted into current facts or requirements.

Declared, observed, and measured describe how a recorded value was obtained. An inference stays an inference. One known bull does not confirm paternity. `a la parte` and `bulto` stay unresolved until their meaning is established. A reported feed quantity is not, by that report, a measured quantity.

## Data and AI readiness

- [ ] Important facts have appropriate stable identity where required.
- [ ] Relevant temporal context is preserved.
- [ ] Source, quality, and provenance are preserved where meaningful.
- [ ] Fact, inference, recommendation, and prediction are not silently conflated.
- [ ] The collected data has a plausible product or decision use.
- [ ] Data was not added solely because it might hypothetically help AI someday.
- [ ] Derived information does not silently become authoritative domain truth.

AI-native, for RANCHO, means useful records can later support people, automation, and AI. It does not mean an LLM on every screen, or sensors installed before value is proven.

## Evolution

- [ ] The current mechanism is not unnecessarily coupled to a specific input method, device, vendor, or future assumption.
- [ ] A reasonable replacement or integration path remains possible where relevant.
- [ ] Speculative future capabilities were not implemented without a current reason.
- [ ] Complexity remains proportionate to current ranch needs and expected learning.
- [ ] Known revisit triggers are documented when a temporary compromise is important.

A manual weight today and a scale-supplied weight later must remain the same kind of fact. That path does not make a scale integration, a camera, RFID, GPS, a worker app, a milk module, or full offline sync a current requirement.

## Technical

- [ ] Accepted architecture is respected.
- [ ] Module ownership and boundaries are respected.
- [ ] Relevant automated tests pass.
- [ ] Relevant lint, typecheck, and build checks pass.
- [ ] Security and authorization implications were considered where relevant.
- [ ] Audit and history behavior is correct where required.
- [ ] No important hidden assumption is left as an unexplained TODO.
- [ ] No unrelated scope was added opportunistically.

This baseline does not define a test-coverage percentage. It does not introduce framework coding standards. Those belong to later technical governance.

A read model does not write domain truth. A correction keeps the previous relevant state. Modules do not write one another's facts.

## Validation

- [ ] Acceptance criteria are satisfied.
- [ ] The team knows how to verify the result behaves as intended.
- [ ] Newly discovered unknowns are recorded or escalated appropriately.
- [ ] Accepted product, domain, or architecture decisions discovered during the work were preserved in the repository.
- [ ] Real-user validation is planned or completed when the increment depends on actual workflow usability.
- [ ] The result can be explained in terms of what changed and why.

An important answer must not remain only in chat. Domain facts belong in the domain documents. Architecture decisions belong with the architecture and an accepted ADR.

## Observed use

For workflows whose value depends on repeated ranch use, implementation completion is not the same as product validation.

A workflow may be technically Done for a pull request while still requiring pilot or real-use validation before broader product confidence is claimed.

Actual user behavior should feed future product decisions. Repeated friction is evidence. It is a reason to review the design, not a reason to blame the user or to invent a missing ranch rule.

## Proportional application

The complete Definition of Done applies to meaningful features, workflows, UX changes, domain changes, integrations, architecture-affecting changes, and substantial refactors.

A typo fix or an equivalent trivial change does not require a ceremonial review of every section.

Governance should increase quality and clarity, not create process for its own sake.

## Final Done question

Before calling meaningful work Done, ask:

Did this work improve RANCHO without sacrificing truthful domain semantics, realistic UX, or the project's ability to evolve responsibly?

If the answer is unclear, the work may require review before being considered complete.
