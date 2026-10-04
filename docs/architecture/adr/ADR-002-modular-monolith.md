# ADR-002: Modular monolith with explicit domain boundaries

## Status

Accepted

The deployment style is accepted. The exact module list is not part of this decision. Architecture QA refined the v0.1 proposal to the five-module cut in [../domain-boundaries.md](../domain-boundaries.md). A later merge or split of a module does not reopen this decision unless the criteria under "When to revisit" are met.

## Context

RANCHO needs a logical architecture for a management system that can record the TO-BE operating model: animal identity and tenure, weights, feed quantities, a small warehouse, known income and expenses, births and parentage, basic health notes, and a weekly reading of those facts.

The implementing team is a two-person hobby project. The herd in view is about 21 head. The users of a first system are few; the working assumption is that the owner records, and the workers do not receive application accounts (`BR-ENTRY-001`, `CON-ENTRY-001`). The business rules are real and still moving: «a la parte» is not interpretable yet, feed figures do not reconcile, and several controls have no chosen method.

Some target processes are one capture that produces several facts. Those facts need a single outcome: the sale and the exit, the birth and the new animal, the feed purchase and the stock and the expense. The owner also needs history and corrections, because declared and measured values are easy to blur (`PP-DATA-002`).

A later scale link, a camera, or a field client may appear. None of those integrations is chosen. `OQ-CONN-001` blocks a synchronization design. `OQ-SCALE-001` blocks a scale protocol. `OQ-SEC-001` blocks a perimeter implementation.

[ADR-001](ADR-001-domain-maps-as-code.md) remains in force for the discovery maps. It does not decide how the ranch system is deployed.

## Decision

Build the ranch management system as a modular monolith.

- One deployable application.
- Explicit domain modules with separate write ownership. The current logical cut lives in [../domain-boundaries.md](../domain-boundaries.md) and can change without this ADR changing.
- One database is allowed. Cross-module writes to another module's tables are not.
- Multi-fact captures that cross modules run as application orchestrators in a local transaction ([ADR-003](ADR-003-application-orchestration.md)).
- A cross-module event backbone is not required ([ADR-004](ADR-004-no-cross-module-event-bus-yet.md)).
- External hardware and accounts sit behind adapters.
- The authoritative state is the current persisted record plus history and audit. The system is not event-sourced.

## Alternatives considered

### A. Modular monolith

One process, module boundaries enforced by ownership and by how code is allowed to call code.

Fits a small team: one deployment, one transaction for a capture, logs and failures in one place. Fits the domain: the modules still cannot casually edit each other's facts. Fits later change: a port can gain an adapter, and a module could be extracted if a future ADR says so.

The cost is discipline. A monolith does not keep its boundaries by itself. Without review and a later enforcement choice (packages, tests, or schema permissions — still open), it decays into shared tables.

### B. Traditional layered monolith without strong module boundaries

One application organized as interface, application, domain, and database layers, with the domain treated as a single model.

This is simpler to start and worse for this domain. The failures the TO-BE model is trying to prevent are ownership failures: a report becoming the place a weight is fixed, a feed declaration stored as if it were a warehouse balance, a sale screen setting an animal row to inactive, a profitability figure written back onto the animal. Layers do not stop those writes if every feature shares one model and one set of tables.

The ranch rules are few enough to live in one deployable, and distinct enough that "the domain" as a single pile will hide which language owns a correction.

### C. Microservices

A deployable service per bounded context, with network calls between them.

This adds distributed transactions or sagas to every capture that the business wants to be atomic, operational dashboards, deployment coordination, and failure modes between "the sale committed and the exit did not." The herd is about 21 head. The team is two people. No context has an independent scaling, availability, or security-zone requirement today.

A camera ingestion path or a vendor protocol could create such a requirement later. It does not exist now. Choosing services in advance would also have frozen a module list that architecture QA had not reviewed. QA later kept Inventory separate and folded the thin Reproduction and Health boundaries into Herd. That refinement is recorded in domain-boundaries v0.2. It is not a reversal of this ADR.

Microservices are not selected. Scalability of a future larger herd is not, by itself, a reason to select them.

## Consequences

- The team deploys and observes one application.
- Capture-once flows can be transactional without a saga.
- The current logical cut is five domain modules: Herd, Growth, Feeding, Inventory, and Finance, with parentage and health as records inside Herd. That list is a consequence of the later boundary refinement. It is not a permanent clause of this decision. Replacing it does not, by itself, reopen the monolith.
- Module authors need a public application interface and a rule against touching another module's tables. The enforcement mechanism is [ADR-012](ADR-012-repository-module-enforcement.md).
- Read models live in the same process and are computed on read while the data is small ([persistence-strategy.md](../persistence-strategy.md)).
- Cross-module publication is not required. The decision is [ADR-004](ADR-004-no-cross-module-event-bus-yet.md).
- A shared database does not mean shared write ownership.
- The discovery application in `apps/domain-map` is unaffected. It is not a module of this monolith.
- This ADR does not itself select the database product, schema layout, language, or host. Physical architecture v0.1 records those choices in [ADR-005](ADR-005-backend-runtime.md) through [ADR-012](ADR-012-repository-module-enforcement.md). Those ADRs do not reopen the monolith. The hosting vendor remains unselected.

## When to revisit

Reopen the deployment style when at least one of these is true:

- A module must stay available, or must fail, independently of the others. A plausible future case is high-volume ingestion from a sensor, if one is ever adopted.
- The people building a module need to release on a different cycle from the rest, because the team is no longer one pair working in one codebase.
- A transaction that must be atomic cannot be kept local, because a real process boundary has been introduced for another reason.
- Boundary reviews show that the monolith's modules are ignored in practice and a stronger physical split is the only remaining control. Try in-process enforcement first.
- Architecture QA rejects the idea of modules entirely and prefers alternative B. That would be a reversal of this ADR, not a small edit.

Do not reopen it only because the herd grew, because a diagram would look more modern with services, or because a bounded context was given a name.

## Status of this document

- Version: 0.2 (decision unchanged; consequences point at the later physical ADRs)
- Status: Accepted
- Last updated: 2026-10-04
- Source: `docs/domain` v0.1, AS-IS v0.2, TO-BE v0.2 at `13c4ef2`, architecture v0.1, and architecture QA
- Validation: The style decision stands. The module list remains outside this ADR and is maintained in domain-boundaries v0.2. Physical choices do not revise this decision
