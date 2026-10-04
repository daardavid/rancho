# Architecture principles

Rules for the ranch management system. They constrain later technical choices. They do not choose a framework, a database, or a vendor, and they do not change the TO-BE operating model.

Each principle is followed by what it requires in this ranch.

## 1. Start as a modular monolith unless evidence requires distribution

The first system is one deployable application with internal domain modules. A bounded context is not a service. Network hops, separate databases, and deployment pipelines are costs this team and this herd do not have a reason to pay.

Evidence that would reopen the question is listed in [ADR-002](adr/ADR-002-modular-monolith.md). Hope of a larger herd later is not that evidence.

## 2. Domain boundaries are more important than deployment boundaries

Modules are cut by language, ownership, and invariants. Whether those modules share a process is a separate decision. Getting the cut right matters while everything still ships together, because a wrong cut inside one codebase is how a later extraction fails.

## 3. A module owns its writes and its data

Herd owns the animal roster and the historical records that describe it: parentage, health notes, paddock references, expected location, verification, and confirmed-missing assertions. Growth owns weights. Feeding owns prepared and delivered diet quantities. Inventory owns stock movements, receipts, issues, and counts. Finance owns money facts and explicit attributions. A read model owns only what it derived.

Ownership means: the authoritative insert, correction, and exit of that fact goes through the owning module.

## 4. One module does not directly modify another module's internal data

Growth may store an `AnimalId`. It does not set tenure, exit an animal, or edit a mark. Finance does not set an animal inactive by updating a herd table. The sale use case calls Herd's exit command. The database may be shared. The tables of another module are not a back door.

## 5. Cross-module writes go through the application layer

Allowed paths:

- an application orchestrator calling the public application interface of each module involved, inside one local transaction ([ADR-003](adr/ADR-003-application-orchestration.md))
- a public query interface, used rarely, when a module must read another module's fact and the orchestrator cannot simply pass a validated id
- a stable identifier held by the caller

A cross-module event bus is not a required path ([ADR-004](adr/ADR-004-no-cross-module-event-bus-yet.md)). Internal events inside one module may exist. They do not authorize another module to subscribe its way into a write.

Disallowed paths: a domain module writing another module's persistence, a domain module calling another module to perform a write, and reading or writing another module's internal structures because they happen to sit in the same process.

## 6. Capture once, reuse facts

The TO-BE catalog already requires this at business level. A chute pass records identity confirmation, weight, and the material for a last observation in one capture. A feed purchase records the expense and the warehouse receipt once; the purchased quantity is that receipt, not a third diet figure. A birth creates the animal and the parentage record once, inside Herd. A sale of identified animals records income and causes the exit once.

Architecturally, a capture that crosses modules is one application orchestrator and one local transaction, writing each fact through its owner's public interface. A capture inside one module is that module's application operation. Downstream screens, the weekly summary, and provisional profitability read those facts. They do not ask the owner to type them again.

## 7. Preserve history and corrections

Important ranch facts keep their history. A correction records who changed the value, when, and why. The previous value remains findable.

This applies in particular to weights, parentage certainty, tenure notes, expenses, stock counts, deliveries, and exit reasons. Replacing a row in silence destroys the difference between a measurement and a later edit, which is the failure `PP-DATA-002` already describes in informal form.

An animal that leaves the active herd keeps the file (`CAP-LIFE-001`). Exit is a state transition with a reason, not a delete.

## 8. Evidence and source quality are transversal

Declared, observed, and measured travel with the fact (`CAP-DATA-002`). Photos, tickets, audio, and other files attach to the business record they support. They are not a separate ranch operation and not a bounded context.

A photo of a scale display can support an observed weight. It does not, by itself, promote a spoken number into a measured one. The same rule the TO-BE model states for feed applies everywhere: a picture that does not show the quantity does not change the quantity's quality.

## 9. Unknown is a valid domain state

The model already allows unknown tenure, unknown economic participation, unknown place, unknown parentage, unknown exit reason, unclassified expense, and a feed quantity whose quality is only declared.

Architecture must store those states explicitly. It must not coerce them into a default owner, a 50/50 share, a zero, a guessed paddock, or a confirmed father. Calculations that the TO-BE model forbids while a question is open — the rancher's final share (`OQ-OWN-001`), cost per kilogram gained (`OQ-FEED-002`), the economics of «bulto» (`OQ-TRADE-001`) — stay unimplemented. The gap is shown.

## 10. Optimize for current ranch scale while preserving evolution

Design for about 21 head, a weekly review, and capture by the owner from messages the workers already send. Do not design for a feedlot, a milk plant, or a multi-ranch platform.

Evolution that must remain possible without a rewrite of the facts:

- more animals, without a new identity model
- medicine or tools in the same inventory module, when `DQ-INV-001` is answered that way
- a measured feed delivery beside a declared one
- a herd-verification method, when one is chosen
- an adapter for a scale or a camera, behind a port
- a later field client, behind the constraints in [offline-readiness.md](offline-readiness.md)

Those are extensions of the same modules. They are not a reason to split the deployable now.

## 11. Hardware integrations are adapters, not domain dependencies

The IBN ARGON scale, a future camera, a gate sensor, or a messaging API sit behind ports. The domain sees a normalized fact, such as a weight measurement with source quality «measured». Growth does not import a vendor protocol. The brand name in the interview is a fact about today's equipment (`CON-SCALE-001`), not a package the domain is allowed to reference.

No protocol is selected in this version.

## 12. Reports and analytics do not become the source of truth

The weekly summary, growth intervals, inventory variance, missing-animal risk, and provisional profitability are read models. They assemble facts that other modules own. If a read model is wrong, the fix is the source record or the projection rule, not an edit on the report.

`CAP-FEED-002` (feed strategy versus growth and cost) stays blocked. No analytics module is created to host it.

## 13. Domain events do not imply event sourcing

The authoritative state is the persisted record of the owning module, plus its correction history. The system must be understandable without replaying a log. v0.2 does not require cross-module events at all. If a module uses an internal event for clarity, that event is still not the storage format. See [domain-events.md](domain-events.md) and [ADR-004](adr/ADR-004-no-cross-module-event-bus-yet.md).

## 14. Avoid a generic shared module that becomes a dumping ground

The shared kernel may hold `AnimalId`, `PaddockId`, an evidence reference, source quality, recorded-time primitives, an optimistic version, `RecordedBy`, and `ReportedBy`. It may not hold animal rules, feed rules, money rules, profitability helpers, feature DTOs, or "miscellaneous" entities.

Parentage and health are Herd records. They stay out of the Animal aggregate, so that aggregate does not become the place every note is stored. They also stay out of a combined blob that would erase the difference between a parentage correction and a treatment note. They do not become their own modules unless the extraction triggers in [domain-boundaries.md](domain-boundaries.md) are met.

## 15. Prefer simple transactional behavior over premature distributed consistency

A sale that names managed animals, and the matching exits, either both commit or neither does. A birth commits the new animal and its parentage record together inside Herd. A feed purchase commits the expense and the stock receipt together, without a Feeding copy of the kilograms. At this scale those consistencies are local transactions inside the monolith.

Outbox patterns, sagas, and eventual consistency are reserved for a boundary that later actually crosses a process. They are not the default for twenty-one cattle.

## How the principles relate to open domain questions

The principles do not answer `OQ-OWN-001`, `OQ-OWN-002`, `OQ-FEED-002`, `OQ-TRADE-001`, `OQ-COUNT-001`, or `OQ-SEC-001`. They require the software to keep operating while those answers are missing, and to refuse calculations that would pretend otherwise.

## Status

- Version: 0.2
- Status: Principles for the refined logical architecture. Not an approved scope
- Last updated: 2026-10-04
- Source: `docs/domain` v0.1, AS-IS v0.2, TO-BE v0.2 at `13c4ef2`, architecture QA
- Validation: Refined with the five-module cut. Frozen as part of the Logical Architecture v1 baseline. Physical architecture v0.1 does not revise these principles. Ranch-owner validation of the domain remains pending
