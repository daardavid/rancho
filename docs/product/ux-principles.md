# RANCHO UX Principles

## Status

- Status: ACCEPTED UX GOVERNANCE BASELINE
- Version: v1
- Last updated: 2026-10-04

These principles govern future UX and product-interaction decisions. They apply the UX constraint in the [Product Constitution](constitution.md). They do not weaken that constitution, the [Uncertainty Protocol](uncertainty-protocol.md), accepted domain truth, or accepted architecture.

This document is not a visual design system, a component library, a screen catalog, a mobile mockup, a color or typography guide, or a fixed click-count standard. The workflow names below illustrate task language. They do not approve a screen list or add current scope.

## UX-01 — Optimize for ranch work, not software operation

Users should think in ranch tasks and events, not internal entities.

Prefer workflows such as register weighing, record sale, record feed purchase, and register birth over workflows that expose internal CRUD structure.

The product should translate a real operational event into the relevant underlying records. One event can produce more than one fact. The user should not have to reassemble those facts by hand.

## UX-02 — Recurring friction is a real product cost

A field or step repeated frequently may be more expensive than a large one-time setup action.

Evaluate recurring work in context: frequency, times number of animals or items, times number of sessions, times the time horizon.

Do not optimize a form only for theoretical completeness. Recurring user burden must justify its business value.

Current understanding is that calf weighing happens about every fifteen days, not as a daily pass, and that it does not cover every animal. That interval is approximate. A form designed as if every head were weighed every day would invent a ranch practice. This principle does not create a schedule requirement.

## UX-03 — Ask only what is required now

A workflow should ask only for information needed to complete the current task safely and meaningfully.

Do not block an operation because unrelated information is incomplete.

A weighing should not require resolving parentage, health history, or economic participation unless the current task genuinely depends on it.

Use the [Uncertainty Protocol](uncertainty-protocol.md). If the missing fact is not required now, preserve it as unknown and continue.

## UX-04 — Unknown must be easy

Where the domain permits uncertainty, the UX must permit uncertainty.

Examples include unknown, not measured, not yet identified, not assigned, and pending confirmation.

Do not force false certainty merely to satisfy a form schema. Unknown should feel like a valid business state, not a user failure.

Validation should prevent impossible states. It should not demand knowledge the ranch does not have. Unknown tenure, unknown economic participation, unknown parentage, and an unreconciled quantity may remain explicit gaps.

## UX-05 — Corrections are normal

Users will make ordinary mistakes. The product should make correction understandable and practical.

Conceptual flow: wrong value, then correct, then a reason when required, then save.

The system preserves relevant history underneath. A correction of a mistaken value keeps the previous relevant state, actor, time, and reason. A later real event is a new fact. Another weighing is not an edit of the earlier weighing.

Do not make normal correction unnecessarily punitive. Destructive historical deletion is different from correction.

## UX-06 — Default to the common case

If the system already knows a value, do not ask unnecessarily.

Examples may include the current `RanchId`, the current account, `recorded_at`, and a default currency when appropriate.

The session already carries the one ranch scope. Do not ask the user to pick a ranch. The account that is recording should not be requested again without a reason. `recorded_at` is when the system accepts the record. It is not a substitute for the time the ranch event happened. Do not fill an unknown event time with a default that pretends the user knew it.

Use sensible defaults where they reduce work without creating false assumptions. Defaults must not silently invent ranch truth.

## UX-07 — Match batch UX to batch ranch work

When the real operation happens as a session or group activity, prefer a session-oriented or batch-oriented workflow.

Example: a weighing session produces many animal weights. The person recording should be able to stay in that session. Do not force repeated navigation through one individual form when the real-world activity is naturally batch-based.

This principle may later apply to weighing, verification, movements, feeding, and other group operations. Do not prebuild batch workflows where the ranch does not need them. Herd verification and paddock movement still have open method questions. A declared feed delivery is not a measured delivery.

## UX-08 — Use progressive disclosure

Primary screens should show what the user needs to understand or act.

Secondary details may include source quality, evidence, reporter, recorder, correction history, and technical provenance.

The person who reports a fact and the person who records it may differ. The owner may record what a worker reported. That distinction belongs in secondary detail. It does not make the reporter an application user.

Do not permanently expose all audit or domain detail on every screen. Preserve access without overwhelming the primary workflow.

## UX-09 — Use ranch language first

The UI should use terminology meaningful to ranch users.

Prefer weighing, sale, expense, paddock, and last-seen or last-observation wording appropriate to the user. In English project language, paddock is the accepted term for potrero. A Spanish interface should use the ranch word, potrero. Last observation is user language for the latest relevant sighting or capture. It is not a field the user maintains by hand, and the interface should not call it a projection.

Avoid exposing internal software terms such as aggregate, projection, repository, bounded context, and transaction handle.

Technical vocabulary belongs in implementation and architecture documents, not primary user interfaces.

Preserve unresolved ranch terminology rather than silently replacing it. Keep `a la parte`, `bulto`, and `SINIIGA` in their accepted forms. `SINIIGA` names the official ear tag. It is not an integration design.

## UX-10 — Communicate uncertainty in human terms

Internal distinctions such as declared, observed, measured, and inferred should be represented in user-facing language that is understandable.

Do not require users to understand implementation or domain-modeling terminology. Where needed, use a concise explanation or progressive disclosure.

The distinction itself stays. A spoken number, a photo of a reading, and a value taken from the scale are not the same kind of fact. An inferred father is not a confirmed father. Human wording must not collapse those meanings.

## UX-11 — Do not make users reconstruct known information

If the system already knows relevant context from the current workflow, session, selected animal, or previous step, reuse it.

Do not ask users to re-enter data solely because separate internal records need it.

This reinforces capture once, reuse many times. Derived information stays distinguishable from the authoritative fact.

## UX-12 — Design for interruption

Ranch work may be interrupted by calls, workers, animal movement, poor connectivity, device switching, or accidental navigation.

Long workflows should avoid unnecessary fragility. A design should not throw away substantial in-progress entry because of an ordinary interruption.

This principle does not require offline synchronization. Full offline sync is not implemented. The accepted capture path can still be: something happens in the pasture, and the owner records it later from a place with a usable connection.

## UX-13 — Mobile usability is first-class

RANCHO should remain reasonably usable from a phone because mobile devices are a natural operating environment for the ranch.

This does not mean mobile-only, a worker mobile app now, or offline sync now.

Workers are not the capture users described so far. Phone usability is for the people who actually use the product, on the devices they already have. Future product UX should not assume that all meaningful tasks happen on a large desktop screen with a mouse.

## UX-14 — Information should support action

Avoid decorative dashboards.

Important information should help the user understand what happened, whether it matters, and what may deserve attention.

A metric without decision context is lower value than an explanation that helps the user act. Provisional profitability is a management reading. It is not fiscal or statutory accounting truth.

Do not fabricate recommendations merely to make a dashboard feel smart. A recommendation stays distinguishable from a measured or recorded fact.

## UX-15 — Apply friction where risk justifies it

Normal recurring actions should be efficient. High-risk or destructive actions may require stronger confirmation.

Registering a normal weighing should be easy. Permanently deleting historical evidence should require explicit, intentional action.

Do not use the same confirmation burden for every action.

## UX-16 — Current input mechanism must not define business meaning

A manual input today should be replaceable later by a scale, camera, sensor, or another adapter where appropriate.

Do not create domain concepts whose meaning is tied unnecessarily to the current UI mechanism.

Example: manual weight entry today, and a scale-supplied weight later, are the same business fact with a different source. The IBN ARGON protocol is unknown. Manual capture does not require a scale integration, a camera, or any other future adapter.

## UX-17 — Error messages should enable recovery

User-facing errors should explain what happened and what the user can do next.

Avoid exposing raw technical codes as the only explanation. Technical error codes may remain available internally for support and debugging.

Bad: `409 conflict`.

Better: this record changed since you opened it. Reload the latest information before saving your correction.

## UX-18 — Empty states should point to the next useful action

Avoid empty screens that only say "No data."

Where appropriate, explain why the screen is empty and what useful action can begin the workflow.

Example concept: no weighings have been recorded yet. Register the first weighing to start the growth history.

Keep empty states concise. An empty state must not invent a ranch fact in order to look complete.

## UX-19 — Observed UX outranks imagined UX

Actual user behavior is stronger evidence than designer preference.

If real users repeatedly struggle with an accepted workflow, treat the friction as evidence, investigate, and revise the design if justified.

Do not blame the user for repeatedly failing a workflow that the product could reasonably improve. Repeated friction is evidence that the product may be designed incorrectly. It does not, by itself, rewrite a domain rule or an accepted architecture decision.

## UX-20 — Temporary UX debt must be explicit

Temporary friction may sometimes be accepted to reach a useful pilot or to learn quickly.

When meaningful UX friction is knowingly accepted, state that it is temporary, explain why it is acceptable now, and define a trigger or condition for revisiting it where practical.

Do not allow known UX friction to disappear into the product as an unexamined permanent default.

## How to apply these principles

These principles should be applied proportionally.

A typo fix does not require a full UX review.

A new recurring ranch workflow, form, batch operation, dashboard, decision-support feature, or integration should be evaluated explicitly against the relevant principles.

The goal is product discipline, not bureaucracy.
