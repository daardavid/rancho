# RANCHO Opportunity Backlog

## Status

- Status: ACTIVE PRODUCT OPPORTUNITY REGISTER
- Version: v1
- Last updated: 2026-10-04

This register remembers future ideas that already appear in accepted project sources.

An opportunity is not a requirement.

An opportunity is not committed roadmap work.

An opportunity is not permission to implement.

Promotion into the [Master Plan](master-plan.md), a [Product Decision](decisions/README.md), or an [Increment](increments/README.md) is a separate accepted step. Until then the idea stays here.

## States

| State | Meaning |
| --- | --- |
| `IDEA` | Worth remembering. Evidence is not yet sufficient. |
| `INVESTIGATE` | There is enough potential value to justify discovery or evaluation. This state is not used merely because an idea exists. |
| `DEFERRED` | Potential value is known, and timing or dependencies make it inappropriate now. |
| `PROMOTED` | The idea has moved into accepted planning, a Product Decision, or an Increment. |
| `REJECTED` | Considered, and not appropriate under the current strategy or evidence. |

A deferred or rejected idea may be revisited when new evidence justifies it. Do not delete the entry.

## Entry shape

```
## OPP-XXX — Title

Status:
Potential value:
Current evidence:
Important unknowns:
Dependencies:
Investigate / revisit when:
Why not now:
Related artifacts:
```

Keep each field as long as the evidence requires. Do not invent ROI, dates, or a technical design.

## What is listed

The entries below are high-level possibilities already named as future or explicitly not adopted. They are all `IDEA`. None is selected.

Other explicit non-decisions in [../checkpoints/design-v1.md](../checkpoints/design-v1.md) stay non-decisions and do not get entries here: GPS, perimeter sensors, a connected feed scale, automated dosing, microservices, and Event Sourcing. Microservices and Event Sourcing are architecture choices, not product ideas.

## OPP-001 — Livestock scale integration

Status: IDEA

Potential value: A later adapter could supply a weight that manual capture records today, without changing what a weight means.

Current evidence: The ranch uses an IBN ARGON livestock scale. Model, ports, and protocol are unconfirmed (`OQ-SCALE-001`). Design v1 does not adopt a connected scale.

Important unknowns: Whether that scale can transmit a weight.

Dependencies: Manual capture must keep source and quality. The protocol stays unknown until it is evidenced.

Investigate / revisit when: A confirmed protocol and a real transcription cost justify an adapter.

Why not now: Scale integration is not current scope. Manual weighing does not require it.

Related artifacts: [../checkpoints/design-v1.md](../checkpoints/design-v1.md), `OQ-SCALE-001`, `CON-SCALE-001`

## OPP-002 — Cameras or other physical-security technology

Status: IDEA

Potential value: A future tool might help with physical intrusion. That problem is not the same as noticing a missing animal.

Current evidence: There are no cameras today. `PP-SEC-003` is not addressed, and the method is unselected.

Important unknowns: Priority against herd records (`OQ-SEC-001`), cost, power, connectivity, and who would review anything captured.

Dependencies: None that make this current work.

Investigate / revisit when: The ranch chooses a physical-security method and the operating conditions are known.

Why not now: Cameras are an explicit non-decision. They are not required for the product to be useful.

Related artifacts: [../checkpoints/design-v1.md](../checkpoints/design-v1.md), `PP-SEC-003`, `OQ-SEC-001`

## OPP-003 — RFID or other advanced identification

Status: IDEA

Potential value: A later identification mechanism could attach to a stable animal identity.

Current evidence: Today the ranch uses a `SINIIGA` ear tag, a name, or visual recognition. RFID is an explicit non-decision. There is no secondary ranch tag.

Important unknowns: Which physical mark, if any, the ranch will choose.

Dependencies: Animal identity must not depend on RFID.

Investigate / revisit when: Real use shows that current marks are not enough, and a method is chosen.

Why not now: RFID is not current scope.

Related artifacts: [../checkpoints/design-v1.md](../checkpoints/design-v1.md), [../domain/glossary.md](../domain/glossary.md)

## OPP-004 — Worker field application

Status: IDEA

Potential value: Workers might later capture or confirm a field event, if that reduces real friction.

Current evidence: About two workers live on the ranch and communicate by phone, WhatsApp, photos, and audio. They are not the capture users described so far (`BR-ENTRY-001`). A worker application is an explicit non-decision.

Important unknowns: Whether workers would use an application, and whether that would improve the record.

Dependencies: The value has to justify asking workers to become application users. Offline sync is a separate opportunity.

Investigate / revisit when: Owner-side capture shows a repeated field bottleneck that a worker client would actually remove.

Why not now: A worker application is not current scope.

Related artifacts: [../checkpoints/design-v1.md](../checkpoints/design-v1.md), `BR-ENTRY-001`, `CON-ENTRY-001`

## OPP-005 — Offline synchronization

Status: IDEA

Potential value: A future field client might record without a connection and synchronize later.

Current evidence: There is no Wi-Fi. Cellular coverage is limited and still needs validation (`OQ-CONN-001`). Full offline sync is an explicit non-decision. Offline-ready commands are not a sync implementation.

Important unknowns: Where usable signal exists, and whether a field client is ever in scope.

Dependencies: `OQ-CONN-001`. A field client is not current scope (`OPP-004`).

Investigate / revisit when: A field client is an accepted decision and connectivity evidence is enough to design synchronization.

Why not now: Full offline sync is not current scope. Do not build a sync engine or a local replica from this entry.

Related artifacts: [../checkpoints/design-v1.md](../checkpoints/design-v1.md), [../architecture/offline-readiness.md](../architecture/offline-readiness.md)

## OPP-006 — Messaging integration

Status: IDEA

Potential value: Messages, photos, and audio the owner already receives might later attach to an event with less retyping.

Current evidence: The owner hears from the ranch by phone, WhatsApp, photos, and audio. A messaging API is an explicit non-decision.

Important unknowns: Which channel, and what a message actually proves. A photo does not upgrade source quality.

Dependencies: The current path is still the owner recording after the message arrives.

Investigate / revisit when: Repeated re-entry of messages already received is shown to be a real cost, and a transport is chosen.

Why not now: A messaging API is not current scope. Do not integrate a provider from this entry.

Related artifacts: [../checkpoints/design-v1.md](../checkpoints/design-v1.md)

## OPP-007 — AI-assisted recommendation or anomaly detection

Status: IDEA

Potential value: Structured history might later help a person notice something unusual or review a suggestion. It would not replace ranch judgment.

Current evidence: The Constitution treats AI as a later use of reliable data, not as a current feature. Weighing is described as one future input to anomaly detection. No production records exist yet.

Important unknowns: Which decision a signal would change, and whether the data would be good enough.

Dependencies: Useful records from real use. A fact, an inference, a recommendation, and a prediction stay distinct.

Investigate / revisit when: Repeated ranch use shows a decision that this kind of signal would actually improve.

Why not now: This is not current scope. Do not add a model or a recommendation feature because the system could store data.

Related artifacts: [constitution.md](constitution.md)

## OPP-008 — Milk capability if production resumes

Status: IDEA

Potential value: If the ranch resumes milk, recording it might later matter. Dual purpose is a long-term intention, not the current operation.

Current evidence: Milk infrastructure exists and is not in operation. `PP-MILK-001` is conditional. A milk module is an explicit non-decision. Whether milk would be recorded per cow is open (`OQ-MILK-002`).

Important unknowns: Whether milk resumes, and at what level it would be recorded.

Dependencies: An accepted decision that milk is in scope.

Investigate / revisit when: Milk production resumes, or the ranch accepts it as near-term work.

Why not now: Milk is not current scope. Historical milk figures are not current production.

Related artifacts: [../checkpoints/design-v1.md](../checkpoints/design-v1.md), `BR-MILK-001`, `OQ-MILK-002`
