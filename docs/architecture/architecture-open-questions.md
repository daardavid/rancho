# Architecture open questions

Questions this v0.1 architecture leaves open. Domain questions already tracked as `OQ-*` and `DQ-*` are not restated as if architecture could close them. Where a domain question blocks a calculation or an integration, this list points at it and does not answer it.

P0 should be settled in architecture QA, because it changes ownership or a lifecycle. P1 needs an implementation decision before a production build, and does not change the logical modules. P2 waits on an external choice or on a ranch capability that is not active.

## P0 — boundary and ownership

| ID | Question | Why it is P0 | v0.1 stance, not a closure |
| --- | --- | --- | --- |
| AQ-P0-001 | Do the seven modules stand, especially the thin ones (Reproduction, Health) and the Inventory/Feeding split? | Merging or splitting changes who may write a fact | Proposed as in [domain-boundaries.md](domain-boundaries.md). A merge of a thin module does not reopen [ADR-002](adr/ADR-002-modular-monolith.md) |
| AQ-P0-002 | Does Herd keep expected location, given that lease economics and the real sketch of the land are still open? | A Land module would move `Paddock` and assignments | Herd owns them until land has rules of its own. `OQ-LAND-001` and `OQ-OWN-004` stay open |
| AQ-P0-003 | Is Inventory a separate module while its first items are only diet ingredients? | A submodule of Feeding looks smaller and becomes the wrong dependency when medicine is stocked | Separate module, ingredient scope first. `DQ-INV-001` still asks the ranch what the first count includes |
| AQ-P0-004 | How is last observation stored, and where does an owner-asserted confirmed missing live while the animal stays active? | A writable last-seen field on `Animal` would duplicate the projection and invite other modules to update Herd | Last observation is a derived view. Herd owns verification. The exact record for "confirmed missing, still active" is not pinned down |
| AQ-P0-005 | Is provisional profitability only a read model, and which inputs may it show while share rules and feed figures are open? | A stored margin will be edited and will drift from the expenses | Read model. Rancher's share withheld (`OQ-OWN-001`). Cost per kilogram withheld (`OQ-FEED-002`). No analytics context |

## P1 — needed before a production build, not before this review

| ID | Question | Notes |
| --- | --- | --- |
| AQ-P1-001 | What API style do owner-facing commands use? | Not implied by the module cut |
| AQ-P1-002 | Which language and backend framework? | Out of scope for logical architecture |
| AQ-P1-003 | Which persistence technology, and how module-owned data is separated inside one database? | One database is allowed. The product is not chosen |
| AQ-P1-004 | How does the owner authenticate? | Port only. See [integrations.md](integrations.md) |
| AQ-P1-005 | Where do evidence bytes live? | Port only. No vendor |
| AQ-P1-006 | Where does the single deployable run? | Follows from ADR-002. No cloud is selected |
| AQ-P1-007 | How are module boundaries enforced in the repo: packages, tests, schema privileges, or review alone? | The monolith will not enforce them by goodwill forever |
| AQ-P1-008 | Are management projections computed on read or maintained as tables? | Either can respect ownership. About 21 head does not force materialization |
| AQ-P1-009 | Does a feeding group ever need an id that is not a paddock? | Until it does, a delivery stores a paddock id, an approximate description, or unknown |

## P2 — later, and blocked by a domain or product choice

| ID | Question | Blocked by |
| --- | --- | --- |
| AQ-P2-001 | How would a scale adapter speak to the device? | `OQ-SCALE-001`. The normalized measurement is already the inner side of the port |
| AQ-P2-002 | What consumes a camera or a fence sensor? | `OQ-SEC-001`. No consumer module in v0.1 |
| AQ-P2-003 | What is the offline field client and its sync? | `OQ-CONN-001`. Constraints in [offline-readiness.md](offline-readiness.md) are as far as this version goes |
| AQ-P2-004 | Is there a messaging API, and is it for alerts, for ingest, or for both? | No product decision. Human forwarding remains the path |
| AQ-P2-005 | If milking resumes, does milk become its own module? | `CAP-MILK-001` is conditional. Do not pre-build the context |
| AQ-P2-006 | Should any module leave the monolith? | Only under the revisit conditions in ADR-002 |

## Domain questions this architecture refuses to answer

Closing any of these inside a module would falsify the operating model:

| Question | What the architecture does instead |
| --- | --- |
| `OQ-OWN-001`, `OQ-OWN-002` | Store tenure, a note, and unknown participation. Do not calculate a share or a replacement |
| `OQ-FEED-002`, `CAP-FEED-002` | Keep the five quantities distinct. Do not build the strategy comparison |
| `OQ-TRADE-001` | Store the purchase or sale form, including «bulto», without expanding it |
| `OQ-COUNT-001` | Leave verification's method empty. Herd can store a verification after a method exists |
| `OQ-SEC-001` | No intrusion implementation |
| `DQ-FIN-003` | Explicit attribution only. The rest stays an unallocated pool |
| `DQ-GOV-001` | Alert policy has two known triggers and an extension point the owner marks. The full list is not invented |
| `OQ-CONN-001` | No sync design |

## Status

- Version: 0.1
- Status: Open. P0 is the architecture QA agenda
- Last updated: 2026-10-04
- Source: boundary analysis v0.1 and the TO-BE decision framework
- Validation: Pending architecture QA
