# Architecture open questions

Questions the refined v0.2 architecture leaves open. Domain questions already tracked as `OQ-*` and `DQ-*` are not restated as if architecture could close them. Where a domain question blocks a calculation or an integration, this list points at it and does not answer it.

P0 is empty. The boundary questions that v0.1 left for architecture QA are closed below. Physical architecture v0.1 answers the P1 questions that are technology choices. Those answers do not change the logical modules. Two P1 items remain: the hosting vendor, and whether a feeding group needs an id that is not a paddock. P2 waits on an external choice or on a ranch capability that is not active.

## P0 — boundary and ownership

No open P0 question. The refinement did not uncover a new logical-boundary blocker.

The v0.1 questions are closed as follows. Closing them does not close the domain questions they cite.

| ID | Resolution in v0.2 |
| --- | --- |
| AQ-P0-001 | Five domain modules: Herd, Growth, Feeding, Inventory, Finance. Reproduction and Health are historical records inside Herd. Inventory stays separate from Feeding. The module list is not a clause of [ADR-002](adr/ADR-002-modular-monolith.md) |
| AQ-P0-002 | Herd keeps expected location as `LocationAssignment` and keeps `PaddockReference` as reference data, not as an aggregate root and not as a land model. `OQ-LAND-001` and `OQ-OWN-004` stay open |
| AQ-P0-003 | Inventory remains its own module. The first items may be diet ingredients only. `DQ-INV-001` still asks the ranch what the first count includes |
| AQ-P0-004 | Last observation is a projection and does not write Herd. Confirmed missing while the animal stays active is `ConfirmedMissingAssertion`. Suspected missing exists only on `MissingAnimalRiskView` |
| AQ-P0-005 | Provisional profitability remains a read model. It does not invent allocations. The rancher's share stays withheld (`OQ-OWN-001`). Cost per kilogram stays withheld (`OQ-FEED-002`). No analytics context |

## P1 — implementation, not a new logical cut

### Closed by physical architecture v0.1

| ID | Resolution |
| --- | --- |
| AQ-P1-001 | Command-oriented REST. [ADR-009](adr/ADR-009-api-style.md) |
| AQ-P1-002 | TypeScript on Node.js. Fastify is the HTTP adapter, not the module system. [ADR-005](adr/ADR-005-backend-runtime.md) |
| AQ-P1-003 | One PostgreSQL database and one schema per domain module. [ADR-007](adr/ADR-007-postgresql.md). Drizzle, with the transaction passed into module functions. [ADR-008](adr/ADR-008-data-access.md) |
| AQ-P1-004 | Library-based sessions in PostgreSQL. [ADR-010](adr/ADR-010-authentication.md) |
| AQ-P1-005 | Filesystem in development, S3-compatible object storage when deployed. No storage vendor. [ADR-011](adr/ADR-011-evidence-storage.md) |
| AQ-P1-007 | Module directories inside the API, a public index, and an import test. [ADR-012](adr/ADR-012-repository-module-enforcement.md) |
| AQ-P1-008 | Query on demand. [persistence-strategy.md](persistence-strategy.md) |

### Still open

| ID | Question | Notes |
| --- | --- | --- |
| AQ-P1-006 | Which provider and region host the single deployable? | The shape is closed in [deployment-strategy.md](deployment-strategy.md): one Node process, managed PostgreSQL, S3-compatible storage. The vendor is not chosen |
| AQ-P1-009 | Does a feeding group ever need an id that is not a paddock? | Until it does, a delivery or a location assignment stores a paddock id, an approximate description, a set of animals, or unknown |

## P2 — later, and blocked by a domain or product choice

| ID | Question | Blocked by |
| --- | --- | --- |
| AQ-P2-001 | How would a scale adapter speak to the device? | `OQ-SCALE-001`. The normalized measurement is already the inner side of the port. Growth stays the consumer |
| AQ-P2-002 | What consumes a camera or a fence sensor? | `OQ-SEC-001`. No consumer module in v0.2 |
| AQ-P2-003 | What is the offline field client and its sync? | `OQ-CONN-001`. Constraints in [offline-readiness.md](offline-readiness.md) are as far as this version goes |
| AQ-P2-004 | Is there a messaging API, and is it for alerts, for ingest, or for both? | No product decision. Human forwarding remains the path. This is not the cross-module event bus rejected in [ADR-004](adr/ADR-004-no-cross-module-event-bus-yet.md) |
| AQ-P2-005 | If milking resumes, does milk become its own module? | `CAP-MILK-001` is conditional. Do not pre-build the context |
| AQ-P2-006 | Should any module leave the monolith? | Only under the revisit conditions in ADR-002 |

## Domain questions this architecture refuses to answer

Closing any of these inside a module would falsify the operating model:

| Question | What the architecture does instead |
| --- | --- |
| `OQ-OWN-001`, `OQ-OWN-002` | Store tenure, a note, and unknown participation. Do not calculate a share, a replacement, or a 50/50 split |
| `OQ-FEED-002`, `CAP-FEED-002` | Keep purchased, prepared, declared, measured, and counted distinct. Do not build the strategy comparison. Do not copy purchased kilograms into Feeding |
| `OQ-TRADE-001` | Store the purchase or sale form, including «bulto», without expanding it. Do not invent animals or exits for an unidentified lote |
| `OQ-COUNT-001` | Leave verification's method empty. Herd can store a verification after a method exists |
| `OQ-SEC-001` | No intrusion implementation |
| `OQ-HEALTH-001` | A health note only. No calendar, withdrawal period, or dosing rule |
| `OQ-REPRO-001`, `OQ-GEN-001` | Parentage certainty and inference reason. No mating plan and no line comparison |
| `OQ-LAND-001`, `OQ-OWN-004` | A paddock reference and an expected place, or unknown. No hectares and no lease tariff |
| `DQ-FIN-003` | Explicit attribution only. The rest stays an unallocated pool |
| `DQ-INV-001` | Inventory can start with ingredients and can later hold medicine, tools, or other items. The ranch still chooses the first count |
| `DQ-GOV-001` | Alert policy has two known triggers and an extension point the owner marks. The full list is not invented |
| `OQ-CONN-001` | No sync design |

## Status

- Version: 0.2 logical questions, with P1 technology items closed by physical architecture v0.1
- Status: P0 closed. P1 technology choices closed. AQ-P1-006 vendor and AQ-P1-009 still open. P2 open. Domain questions untouched
- Last updated: 2026-10-04
- Source: architecture QA, the v0.1 question list, and physical architecture v0.1
- Validation: Closed P1 items point at ADRs. They do not change the five-module cut. No technology choice is smuggled into a closed P0
