# RANCHO Product Constitution

## Status

- Status: ACCEPTED GOVERNANCE BASELINE
- Version: v1
- Last updated: 2026-10-04

This constitution governs product tradeoffs for humans and AI agents. It does not replace ranch facts in [../domain/README.md](../domain/README.md), the AS-IS or TO-BE maps, or accepted architecture. It does not approve a feature scope, and it does not start implementation.

How uncertainty is handled is in [uncertainty-protocol.md](uncertainty-protocol.md). Where to read first is in [../START-HERE.md](../START-HERE.md).

## Purpose

RANCHO exists to help the ranch become more profitable, more measurable, and more capable of growing sustainably through better decisions, better operational visibility, and progressively better use of technology.

RANCHO is not merely cattle-management software. It is intended to become the digital operating and decision-support foundation of the ranch. The ranch and the system should be able to mature together.

The system must create value with available infrastructure today while remaining capable of benefiting later from better internet connectivity, livestock scales, cameras, sensors, RFID or other identification technologies, messaging integrations, field applications, automation, and machine learning and AI.

Future capabilities are not current requirements merely because the architecture allows them.

## North star

RANCHO should help the ranch make better economic decisions with less operational friction while progressively converting important ranch activity into reliable, structured, traceable, and reusable data that can later support people, automation, and AI.

Three constraints are first-class:

1. Ranch profitability and sustainable growth.
2. User experience and actual adoption.
3. Reliable data and a clean path toward future automation and AI.

A solution that performs well on only one of these dimensions is not automatically a good RANCHO solution.

## AI-native meaning

Progressively AI-native does not mean adding an LLM everywhere, automating everything immediately, or installing cameras and sensors before value is proven.

For RANCHO, progressively AI-native means that important records have:

- stable identities;
- useful temporal context;
- source and quality;
- linked evidence where useful;
- explicit uncertainty;
- reusable structured semantics;
- a distinction between fact, inference, recommendation, and prediction.

Manual capture today should be replaceable later by a better technological source without redefining domain truth.

Example: manual weight capture today can later be supplied by a livestock-scale adapter. The meaning of a weight must not depend on which mechanism supplied it.

## Product value

RANCHO work should have a plausible path to one or more of:

- increasing revenue;
- reducing cost;
- reducing preventable loss or risk;
- reducing operational effort;
- improving decision quality;
- improving profitability visibility;
- improving reliability and reuse of data;
- enabling a valuable future capability at proportionate current cost.

Not every feature must immediately generate money. A technically interesting feature without a clear ranch-value path should not be prioritized merely because it is interesting.

Profitability visibility stays a management reading. It is not fiscal or statutory accounting truth. A provisional profitability view does not become the financial book.

## UX as a business constraint

RANCHO creates value only if people can and will use it. Recurring user effort is an operational cost. Theoretical data completeness is not automatically more valuable than a workflow that users actually complete.

Prefer fewer meaningful steps, event-oriented workflows, reuse of known information, sensible defaults, progressive disclosure, explicit unknown values, easy correction, and ranch language rather than software jargon.

Avoid duplicate capture, asking humans for known information, requiring certainty that does not exist, large forms designed for hypothetical completeness, and UX burden disproportionate to value.

Detailed UX rules will exist separately later. This UX constraint has constitutional status.

The current capture direction is the owner, using what workers already communicate. Workers are not assumed to be application users before the value justifies that change.

## Capture once, reuse many times

Important ranch activity should be captured once and reused wherever the same fact is useful.

Weighing is one fact with many uses: weight history, growth analysis, identity confirmation, last-observation calculation, profitability analysis, and future anomaly detection.

Do not require users to recreate the same underlying fact in multiple modules or screens. Derived information must remain distinguishable from authoritative facts. A read model does not write domain truth.

## Decision usefulness over data accumulation

RANCHO should not collect data merely because it may theoretically be useful someday.

Every recurring capture has UX and operational cost. Prefer data with a plausible relationship to a current decision, an important control, a known future capability with reasonable likelihood, or better reliability of an existing process.

AI readiness means better-structured useful data, not maximum data collection.

## Truth, evidence, and uncertainty

RANCHO must prefer truthful incompleteness over invented precision. Unknown is a valid state.

Preserve meaningful distinctions such as declared, observed, measured, inferred, and unknown. Declared, observed, and measured describe how a recorded value was obtained. An inference stays an inference. Unknown stays unknown. Do not collapse these into one another.

Evidence does not automatically upgrade a fact's quality. A photo attached to a declared feed quantity does not make the quantity measured. A reasonable inference remains an inference. AI or automation must not silently convert inference into authoritative fact.

Reported feed quantity is not, by that report alone, a measured quantity. Individual consumption is not a measured fact in the accepted baseline.

Apply [uncertainty-protocol.md](uncertainty-protocol.md).

## Human and machine roles

Humans retain judgment where business meaning is unresolved.

Software may record, validate, calculate, summarize, detect anomalies, recommend, forecast, and automate well-defined operations.

AI may assist decisions. AI must not fabricate authoritative ranch history. Predictions, recommendations, classifications, and inferences must remain distinguishable from measured or explicitly recorded facts.

## Technology follows the ranch problem

Do not adopt technology merely because it exists.

Technology should have a credible path to reduced recurring friction, improved data quality, better timeliness, lower risk or loss, improved profitability, or valuable capability.

Cameras, RFID, GPS, IoT, connected scales, automated dosing, machine vision, and similar tools are possible future tools, not assumed requirements. The accepted design baseline does not adopt them as current scope.

## Build for evolution without building the future early

The architecture may stay ready for later change without implementing that change now. Examples already accepted in spirit:

- command and idempotency readiness, without implementing offline sync now;
- adapters for future hardware, without installing that hardware;
- stable identifiers, without RFID today;
- `RanchId` as data scope for one ranch, without SaaS tenancy;
- evidence references, without selecting every future storage workflow.

Architectural readiness is not permission to prebuild speculative features.

## Manual today is not failure

A manual workflow is acceptable when it is currently the simplest reliable mechanism. Do not automate simply to remove the word "manual".

Today's mechanism should only avoid unnecessarily corrupting the business model or blocking replacement by a better mechanism later. A handwritten weight that later comes from a scale must still mean a weight, with its source and quality intact.

## Simplicity and reversibility

When alternatives provide similar value, prefer the one that is simpler for the user, simpler to operate, easier to understand, easier to test, easier to reverse, less vendor-coupled, and lower maintenance.

Complexity must earn its place. Future scale does not automatically justify enterprise infrastructure today.

## History and correction

Ranch history must not be silently rewritten.

Incorrect facts should preserve the previous relevant state, actor, time, and reason. Legitimate state changes should be represented as new historical facts where appropriate.

Correction should be practical and normal, not punitive.

## Real-world evidence outranks design assumptions

The ranch is reality. Documents, architecture, code, and AI outputs are models of it.

If verified ranch reality contradicts an accepted assumption, do not force reality into the model. Identify the conflict, determine which artifact must be reopened, and update the baseline deliberately.

Frozen means accepted until evidence justifies change.

## Repository as project memory

Important accepted project knowledge belongs in the repository.

Chats, Cursor sessions, Work runs, prompts, personal notes, and LLM outputs are not permanent project truth by themselves. When an important decision is accepted, record it in the proper repository artifact.

The repository is the durable context across people, AI agents, tools, sessions, model changes, and long pauses.

## Decision authority

Humans retain final authority over product priorities, business meaning, ranch-specific rules, acceptable UX tradeoffs, resolution of domain ambiguity, changes to accepted architecture, and merge decisions.

AI and tools may analyze, propose, challenge, implement approved work, and identify inconsistencies. They may not silently establish ranch facts or product policy.

Actual ranch usage is a critical source of evidence. Repeated user friction is evidence that the product may be designed incorrectly.

## Anti-goals

RANCHO is not, by default:

- a generic ERP;
- statutory or fiscal accounting software;
- a collection of unrelated CRUD screens;
- a dashboard full of metrics without decision value;
- a system requiring perfect internet;
- a system requiring cameras, RFID, sensors, or automation to be useful;
- a full SaaS multi-ranch platform before that need exists;
- an AI experiment built on weak or ambiguous data;
- a system requiring workers to become app users before value justifies it;
- a platform where more automation automatically means better.

## Non-negotiable product rules

1. Do not invent ranch facts.
2. Unknown is a valid state.
3. If a missing fact is required to continue, ask.
4. Do not silently resolve open domain questions.
5. Do not convert future possibilities into current requirements.
6. Do not sacrifice recurring UX for theoretical completeness without a compelling reason.
7. Do not duplicate capture without justification.
8. Do not let derived data write authoritative domain truth.
9. Do not couple business meaning to current hardware or vendor mechanism.
10. Do not implement technology without a clear product or operational reason.
11. Preserve meaningful history and source quality.
12. Treat new verified ranch evidence as a legitimate reason to revisit previous decisions.

## Change policy

The Constitution should change rarely.

A normal feature, bug fix, refactor, prompt, or implementation PR must not silently weaken or reinterpret it.

If work appears to require changing a constitutional rule:

1. Identify the conflict.
2. Explain why the rule no longer serves the ranch.
3. Decide the governance or product change separately.
4. Update the Constitution deliberately.
5. Only then continue dependent implementation.

The Constitution governs implementation. Implementation does not silently redefine the Constitution.
