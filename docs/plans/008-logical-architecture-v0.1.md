# 008 — Logical architecture v0.1

## Objective

Design the logical software architecture of the future ranch management system, and stop there.

The design derives from the chain already recorded in discovery and in the TO-BE model:

pain → capability → target process → owning context

It does not approve a product scope, close an interview question, or choose an implementation stack. `docs/domain` remains the factual source. AS-IS v0.2 remains the current operation. TO-BE v0.2, as of commit `13c4ef2ff067404af5fa76141986b863d5cd18c5`, remains the desired operating model. This plan does not change those semantics.

The result lives in [../architecture/README.md](../architecture/README.md). This plan is the method. If a module list here ever diverges from the architecture documents, the architecture documents are the proposal under review.

## Baseline

| Input | Role in this design |
| --- | --- |
| `docs/domain` v0.1 | Facts, rules, pains, actors, evidence, constraints, open questions |
| `docs/maps/as-is` v0.2 | What the ranch does today. Not a module list |
| `docs/maps/to-be` v0.2 at `13c4ef2` | Capabilities and target processes the architecture must be able to house |
| [ADR-001](../architecture/adr/ADR-001-domain-maps-as-code.md) | Domain maps stay in code. That decision is about the discovery tool, not about the ranch system |
| `apps/domain-map` | Traceability IDs only. The ARCHITECTURE tab stays a placeholder |

Known scale used as a design constraint, not as a forecast: about 21 head, about two workers, one owner who records from a distance, a two-person hobby team, and a preference for a weekly management cadence (`BR-CADENCE-001`, `CON-ENTRY-001`).

## Architectural questions to answer

1. Which TO-BE areas are bounded contexts, and which are projections, transversal rules, integrations, or subdomains inside another context?
2. Where is each business fact owned, with one authoritative writer?
3. Which facts are records, which are calculations, and which are history that must survive a correction?
4. How a single ranch event that produces several facts (`TGT-FEED-001`, `TGT-BIRTH-001`, `TGT-SALE-001`, `TGT-WEIGH-001`) is one capture without becoming one shared database write.
5. Whether the first deployment shape is a modular monolith, a layered monolith without module boundaries, or microservices.
6. Which future integrations are ports, and which vendor details must stay outside the domain.
7. Which constraints keep a later offline field client possible without designing that client now.
8. Which questions are still domain questions, and must remain open inside the model as «unknown».

## DDD boundary analysis approach

A candidate area is taken from a capability and a target process. It is not taken from a screen, a TO-BE group label, or a noun in the glossary.

For each candidate, answer all five:

1. Does it have its own language and rules?
2. Does it own authoritative business data?
3. Does it have meaningful invariants?
4. Would separating it reduce coupling?
5. Is it a bounded context, or only a projection, a cross-cutting concern, a reporting concern, an integration concern, or a subdomain inside another context?

Bias: fewer stronger modules. A modular monolith of about five to eight modules is the target shape. Fifteen superficial modules would repeat the TO-BE catalog in technical clothing.

Special cases that must be decided explicitly, because the TO-BE headings invite a wrong split:

- Presence and last observation (`CAP-SEC-001`, `TGT-SEC-001`, `TGT-HERD-VERIFY-001`)
- Physical intrusion (`CAP-SEC-002`, `TGT-SEC-002`)
- Reporting and the weekly review (`CAP-GOV-001`, `TGT-GOV-001`)
- Land, paddock, and group (`CAP-LAND-001`, `TGT-MOVE-001`)
- Inventory versus feeding (`CAP-INV-001`, `CAP-FEED-001`)
- Provisional profitability (`CAP-FIN-001`, `TGT-PROFIT-001`)

Subdomains are then classified, conservatively, as core, supporting, or generic. A cattle feature is not core merely because it is about cattle.

Aggregates are discovered only where there is a transactional consistency boundary. A noun in the glossary does not become an aggregate.

## Modular-monolith hypothesis

Hypothesis under test, not a slogan to copy:

> One deployable application, internally divided into domain modules with explicit write ownership, in-process commands for multi-fact captures, and domain or application events where another part of the system needs the fact. Separate services only if a later constraint requires them.

The hypothesis is compared in [ADR-002](../architecture/adr/ADR-002-modular-monolith.md) with:

- a traditional layered monolith without strong module boundaries
- microservices

Distribution is not assumed to follow from a bounded context. A module that owns its writes can still share one database and one transaction.

## Architecture views to produce

| View | Document | Question it answers |
| --- | --- | --- |
| Principles | [architecture-principles.md](../architecture/architecture-principles.md) | What rules constrain later technical choices |
| System context | [system-context.md](../architecture/system-context.md) | Who and what sits outside the system, and who does not need an account |
| Domain boundaries | [domain-boundaries.md](../architecture/domain-boundaries.md) | Which modules exist, how subdomains are classified, which aggregates they own, how processes trace to them |
| Context map | [context-map.md](../architecture/context-map.md) | How modules depend on each other, and where a call or an event fits |
| Data ownership | [data-ownership.md](../architecture/data-ownership.md) | Which module is the authority for each business fact |
| Events | [domain-events.md](../architecture/domain-events.md) | Which facts are worth publishing, and why the system is not event-sourced |
| Cross-cutting concerns | [cross-cutting-concerns.md](../architecture/cross-cutting-concerns.md) | Evidence, audit, source quality, corrections, capture-once |
| Offline readiness | [offline-readiness.md](../architecture/offline-readiness.md) | Which data constraints stay open for a later field client |
| Integrations | [integrations.md](../architecture/integrations.md) | Which external systems are adapters |
| Open questions | [architecture-open-questions.md](../architecture/architecture-open-questions.md) | What architecture QA and later implementation still have to decide |
| Decision | [ADR-002](../architecture/adr/ADR-002-modular-monolith.md) | Modular monolith, layered monolith, or microservices |

## Architecture principles

The working set is recorded in [architecture-principles.md](../architecture/architecture-principles.md). Short form:

1. Start as a modular monolith unless evidence requires distribution.
2. Domain boundaries matter more than deployment boundaries.
3. A module owns its writes and its data.
4. One module does not directly modify another module's internal data.
5. Cross-module communication goes through explicit interfaces, domain events, or application events.
6. Capture once, and reuse the facts.
7. Preserve history and corrections. Important ranch facts are not silently overwritten.
8. Evidence and source quality are transversal.
9. Unknown is a valid domain state.
10. Optimize for the current ranch scale, and keep a path for change.
11. Hardware integrations are adapters, not domain dependencies.
12. Reports and analytics do not become the source of truth.
13. Domain events do not imply event sourcing.
14. A generic shared module must not become a dumping ground.
15. Prefer a simple local transaction over premature distributed consistency.

## Cross-cutting concerns

These accompany operational facts. They are not peer modules of weighing or sale (`CAP-DATA-002`, `CAP-COMM-001`, `CAP-CONN-001`).

- Source quality on a fact: declared, observed, or measured.
- Evidence attached to the business record that it supports: photo, ticket, file, source, timestamps.
- Audit of creation and correction, including who recorded it and why a correction was made.
- The channel by which the owner received the story (phone, message, photo, audio) as metadata of the capture.
- A small shared kernel limited to identifiers, source quality, and audit primitives.
- Application composition for one ranch event that must write several modules in one local transaction.

Detail: [cross-cutting-concerns.md](../architecture/cross-cutting-concerns.md).

## Dependency analysis

Dependencies are drawn after ownership, not before.

Rules used while drawing them:

- A downstream module may hold a stable identifier from upstream. It does not update the upstream record.
- A use case that the TO-BE model defines as one capture may call several module ports. That orchestration sits in the application layer. It is not a new bounded context and it is not a shared domain library.
- Read models may query many modules. No domain module depends on a read model.
- Adapters depend inward on application ports. Domain modules do not import vendor APIs, and they do not import the discovery UI or a future product UI.
- One database is acceptable. Cross-module table writes are not.
- Where the business result must be complete together (a sale and its exit, a birth and its animal, a feed purchase and its stock and expense), the default mechanism is one local transaction, not a saga.

The resulting map is [context-map.md](../architecture/context-map.md).

## Validation criteria

The architecture v0.1 is ready for review when all of the following hold:

- Every proposed module traces to at least one target capability and one target process.
- A concept with no TO-BE justification is flagged, not smuggled in as a module.
- Each business fact in the ownership matrix has one authoritative owner. Derived values are marked as derived.
- Last observation, provisional profitability, and the weekly summary are not writable sources of animal, finance, feeding, or inventory facts.
- Intrusion is not a domain module merely because TO-BE has a security section.
- Evidence is transversal unless the boundary analysis finds independent domain rules. This version does not find those rules.
- The event list contains facts that have a consumer or a real business meaning. It is not the list of every noun with a past-tense name.
- The document states that the system starts from persisted current state, history, and audit, and does not reconstruct itself by replaying a full event log.
- No document selects a database, an ORM, a backend framework, a cloud provider, a messaging product, or an object-storage product.
- No document designs field synchronization. `OQ-CONN-001` still blocks that architecture.
- Open domain questions that block a calculation (`OQ-OWN-001`, `OQ-FEED-002`, `OQ-TRADE-001`, and the others already classified in the TO-BE decision framework) stay open. The model can store unknown.
- `apps/domain-map` and the package manifests are unchanged. The ARCHITECTURE tab remains a placeholder.

Review also rejects these failure modes:

- one module per screen or per TO-BE group
- one module per entity
- duplicated source-of-truth fields
- a reporting context that owns operational facts
- premature microservices, event sourcing, vendor coupling, or offline machinery

## Explicit non-goals

- Implementing backend code, production modules, migrations, or the ARCHITECTURE tab.
- Adding dependencies or changing package manifests.
- Choosing an ORM, a web framework, a language, a cloud, or a database.
- Designing or implementing offline synchronization, CRDTs, or a worker field client.
- Creating microservices, a message broker, or a second deployable per module.
- Treating every bounded context as a future service.
- Changing AS-IS or TO-BE meanings, closing `OQ-*` or `DQ-*` questions, or interpreting «a la parte».
- Designing fiscal accounting, partner settlement, cost per kilogram gained, feed-strategy comparison (`CAP-FEED-002`), or milk (`CAP-MILK-001`).
- Selecting a scale protocol, a camera layout, or a messaging API.
- Drawing detailed class diagrams or physical tables.

## Output of this pass

The proposal that came out of the method above is summarized in the architecture README: a modular monolith, seven domain modules (Herd, Growth, Feeding, Inventory, Finance, Reproduction, Health), read models for management, transversal evidence and audit, and ports for hardware that is not yet adopted.

[ADR-002](../architecture/adr/ADR-002-modular-monolith.md) records the deployment-style decision. The module edges remain a v0.1 proposal for architecture QA. Merging a thin module later does not, by itself, reopen the monolith decision.

## Status

- Version: 0.1
- Status: Plan of record for logical architecture. Not an approved scope
- Last updated: 2026-10-04
- Source: `docs/domain` v0.1, AS-IS v0.2, TO-BE v0.2 at `13c4ef2`
- Validation: Pending architecture QA. Ranch-owner validation of the domain remains pending
