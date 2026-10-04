# 005 — TO-BE refinement v0.2

## Objective

Correct the domain model after the QA of v0.1 (`63c8f09`). The model still describes a desired ranch operation. It does not approve a scope, draw the TO-BE screen, or choose architecture.

`docs/domain` remains the factual source. Open questions stay open. «A la parte» is not rewritten into a share rule.

## QA problems being corrected

- Feed declarations were readable as verified delivery. `PP-FEED-001` is visibility, not control.
- Profitability was either a closed margin or nothing. Sale income had no recommended option.
- An animal could leave the active herd only by sale. Death, confirmed loss, and other exits had no status.
- Tenure was a sentence. Economic participation could not be unknown without looking blank or settled.
- Expected paddock or group did not exist, so feed lots, counts, and last-seen had no place. GPS is still not the answer.
- Herd presence and “seen at the chute” were the same process. Method and cadence were treated as if a partial signal closed `PP-SEC-001`.
- Parentage inference could be shown as a father.
- One ranch event was split into several captures.
- Evidence, channel, and connectivity looked like peer operations.
- `CAP-FEED-002` looked active while feed figures do not reconcile.
- Intrusion had options and no adoption, but the pain could still be read as covered.
- Forty-nine options were a flat catalog. The first package listed every `recommendedNow: yes` item.
- The word covered overstated fifteen pains.

## Capability changes

Added:

- `CAP-OWN-001` — tenure separate from economic participation. Participation may be known, partially known, or unknown. The verbal agreement stays a note. No 50 percent rule. No rancher’s final share while `OQ-OWN-001` is open.
- `CAP-LIFE-001` — active or not, and why an animal left. History remains.
- `CAP-LAND-001` — expected paddock or group, date, or unknown. About eight known or identified paddocks do not describe all of the roughly 530 hectares. The interviews do not establish formal names for them. The target design may later assign an internal name or identifier. No GPS and no hectare requirement.

Refined:

- `CAP-FEED-001` distinguishes purchased, prepared, declared delivered, measured delivered, and physical remainder. Each quantity has a business quality: declared, observed, or measured. It does not promise verification of a declaration.
- `CAP-FEED-002` is blocked as a future analytical capability until quantity, group, time, and growth can be connected. It stays in the catalog.
- `CAP-FIN-001` includes a provisional management result: known income, known and assigned costs, an unallocated bucket, completeness, and data quality. Ranch share stays unknown. Cost per kilogram gained stays withheld while feed quantity is unreliable. This is not fiscal profit.
- `CAP-SEC-001` separates last observation during an event from a herd or group verification whose method is still pending.
- `CAP-SEC-002` states that the desired control exists and the implementation is not selected.
- `CAP-REPRO-001` uses observed, inferred, or unknown for mother and father, with the reason for an inference.
- `CAP-DATA-002`, `CAP-COMM-001`, and `CAP-CONN-001` stay. They are transversal attributes of events, not peer operation nodes on a future map.

## Target-process changes

Added:

- `TGT-ANIMAL-EXIT-001` — stop an animal from staying active after a real exit. Reasons: sale, death, confirmed missing, other, unknown. Missing and removal from the active list are not the same event. No replacement economics.
- `TGT-MOVE-001` — assign or move an animal or group, with effective time, or leave the place unknown.
- `TGT-HERD-VERIFY-001` — presence verification. Method: pending validation. Cadence: pending validation. Uses expected place. Does not select RFID, GPS, cameras, or sensors.
- `TGT-PROFIT-001` — provisional economic review. It reads other events. It does not re-enter them and does not settle a partner.

Refined so one operational event yields several facts:

- Birth creates the animal, the birth, parentage with certainty, and evidence.
- A calf at the chute yields weight, identity confirmation, and last-observed presence.
- A feed purchase yields the expense, the warehouse entry, and the purchased quantity with its quality.
- A sale yields quantity or weight when known, unit price when it applies, known income, buyer, evidence, and the exit fact. Income does not wait for a full profitability model.

`TGT-SEC-001` is the last observation produced by another event. It is not a second presence log and it is not the herd check.

`TGT-COMM-001` remains the channel description. A future map should not draw it as an operation beside feeding.

No process is added for fiscal accounting, GIS, DNA, or milk as a current flow.

## Solution-catalog changes

The v0.1 options stay. Three options are added because the old catalog had no place for them:

- `SOL-SALE-001` — record known sale income. Recommended now. In the minimum package.
- `SOL-LIFE-001` — record an exit and keep history. Recommended now. In the minimum package.
- `SOL-LAND-001` — record an expected paddock or group, using the known or identified paddocks, or leave it unknown. This does not treat those paddocks as already formally named. Recommended now as desirable, not required to start.

`SOL-FEED-001` and `SOL-FEED-002` are structured declaration plus evidence. They are not verified delivery. `SOL-FEED-003` stays investigate.

`SOL-FIN-003` becomes the provisional management reading. It is desirable now, not part of the minimum package, and it still refuses ranch share, cost per kilogram while feed is unreliable, fiscal profit, and partner settlement.

`SOL-REPRO-002` records an inference from the single bull, with method “only bull present”, never as confirmed paternity.

`SOL-SEC-002` is last-observed during handling, produced by the weighing event, not a herd verification.

## Effectiveness semantics

Replace covered with:

- `SUBSTANTIALLY CONTROLLED`
- `PARTIALLY CONTROLLED`
- `VISIBILITY IMPROVED ONLY`
- `NOT ADDRESSED`
- `CONDITIONAL`

A link is not a promotion. `PP-FEED-001` and `PP-SEC-001` stay visibility only. `PP-SEC-003` is not addressed. `PP-FIN-001` is partial: known money can be read, the rancher’s share cannot. `PP-MILK-001` stays conditional.

## Solution-family approach

Families are a presentation layer. Detail stays on `SOL-…` ids. Stable ids live in `docs/maps/to-be/solution-families.md`.

For a future screen, a process shows one primary approach, at most two alternatives, and the rest behind recommended now, investigate, scale, or not recommended now. Transversal families are not operation nodes.

## Operational-capture consolidation

Principle, in the process catalog: one operational event is captured once and may produce several facts. This is a business rule about work, not a technical event design.

## Explicit non-goals

- Application code, the TO-BE screen, architecture, storage, authentication, and dependencies
- Interpreting «a la parte» or calculating the rancher’s final share
- Choosing cameras, RFID, GPS, connected scales, dosing, or sensors
- Fiscal accounting
- Closing `OQ-FEED-001`, `OQ-FEED-002`, `OQ-COUNT-001`, `OQ-SEC-001`, `OQ-SCALE-001`, or `OQ-OWN-001`
- Claiming herd detection time has improved
- Putting milk in the initial flow
- Deleting v0.1 options

## Validation criteria

v0.2 is consistent if:

- Tenure and participation can be unknown without a fake contract
- An animal can leave active inventory for a non-sale reason and the history remains
- Expected place exists without GPS, and unknown is allowed
- Herd verification exists with method and cadence pending
- Sale income is in the minimum package and does not require a finished profitability model
- Provisional profitability shows completeness and an unknown ranch share
- Feed declarations are not called measurements
- Single-bull parentage is inferred, not confirmed
- Birth, chute, and feed purchase are each one capture
- Transversal capabilities are labeled as attributes
- The original options remain, grouped in families
- The minimum package is smaller than the old list of every `yes`
- Milk stays conditional
- No expensive hardware moves to recommended now
- `apps/domain-map` and the lockfile stay untouched

## Status

- Version: 0.2
- State: Domain design, not an approved scope
- Last updated: 2026-10-03
- Source: TO-BE v0.1 and the QA that followed it
- Validation: Pending iterative validation with the ranch owner
