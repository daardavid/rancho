# Domain boundaries

How the TO-BE operating model is cut into modules. A module is a boundary of language and write ownership inside the modular monolith of [ADR-002](adr/ADR-002-modular-monolith.md). It is not a service, a screen, or a TO-BE group copied into a folder.

The judgment used for every candidate:

1. Does it have its own language and rules?
2. Does it own authoritative business data?
3. Does it have meaningful invariants?
4. Would separating it reduce coupling?
5. Is it a bounded context, or a projection, a cross-cutting concern, a reporting concern, an integration, or a subdomain of something else?

The aim is a handful of modules that can each protect a rule. Seven passed. Several familiar headings did not.

## Proposal

| Module | Owns | Does not own |
| --- | --- | --- |
| Herd | Identity, marks, sex and category, tenure, economic-participation descriptor, active state and exit, paddocks, expected location, herd verification | Weights, money, diet quantities, stock balances, parentage certainty, health notes, last-observation cache |
| Growth | Weighing sessions and weight records, including an arrival weighing when one happens | The animal file, sale weight as a commercial term, herd verification |
| Feeding | Purchased quantity, prepared batch, delivery to a group, and the quality of each | Warehouse balance, the expense, individual intake, strategy comparison |
| Inventory | Stock items, movements, theoretical balance as a derivation, physical counts | What a delivery means for the diet, the purchase money |
| Finance | Expenses, management classification, explicit allocations, cattle-purchase cost, sale income | Animal exit state, provisional margin as an editable figure, fiscal profit |
| Reproduction | Birth parentage: certainties, inference reason, corrections | The animal file itself, genetic comparison |
| Health | Health events on an animal or a group | A sanitary calendar, warehouse stock of medicine |

Application layers that are not bounded contexts:

- composition commands for captures that write more than one module
- management read models
- evidence and audit, transversal
- integration adapters

A module in this list is a place for rules. It is not a promise that every module is in the first build. Herd verification, health notes, declared feed delivery, and the profitability view are already marked desirable or method-pending in TO-BE. They still need a home so a later build does not invent a new owner.

## Herd

Accepted. Core domain.

Language: internal identity, mark, SINIIGA, name, tenure, economic participation, active, exit reason, paddock, expected place, herd verification, confirmed presence versus a passing sighting.

Authoritative data: the roster of animals the ranch manages, the places it uses for them, and any verification it actually performs.

Invariants:

- An animal has an internal identity that survives a missing, lost, replaced, or late SINIIGA tag (`CAP-ID-001`, `BR-ID-001`).
- Tenure and economic participation are separate. Either may be unknown. A verbal «a la parte» note stays a note (`CAP-OWN-001`). The module does not compute a share.
- Third-party cattle on rented land need not have individual files (`BR-OWN-002`). The land-use question stays open with `OQ-OWN-004`.
- Exit keeps the file. Reasons are sale, death, confirmed missing, other, or unknown (`CAP-LIFE-001`).
- Not seen, and even a confirmed absence that the owner has not turned into an exit, leaves the animal active. Exit is a later fact (`TGT-ANIMAL-EXIT-001`).
- A sale causes the exit through Herd's command. There is no second exit form (`TGT-SALE-001`).
- Expected place is a dated assignment, or unknown (`CAP-LAND-001`). Assigning a place at a desk is not an observation that the animal was seen.

Why a separate module: every other fact hangs on `AnimalId`. Mixing weights, money, and parentage into this write model would make one aggregate the transaction boundary for the whole ranch.

Herd verification belongs here. It is a statement about the roster: who was supposed to be in a place, who was confirmed, who was not. The method and the cadence are still pending (`OQ-COUNT-001`). The module can store a verification when the ranch has one. It does not invent the method, and it does not claim `PP-SEC-001` is controlled.

Last observation does not belong here as a field other modules update. See Presence below.

### Land, inside Herd for now

`CAP-LAND-001` and `TGT-MOVE-001` are real and small. A paddock is an identified place. About eight are known. They are not asserted to cover the roughly 530 hectares, and they are not asserted to have formal names. A movement is a dated expected place, or unknown. There is no hectare rule, no map rule, no grazing rule, and no lease tariff.

That is not enough language for a Land context. Paddock and expected location are reference facts Herd owns because feeding, verification, and the weekly review all point at "where this animal is expected."

A feeding group uses that place when the place is known, and may be approximate or unknown when it is not (`TGT-FEED-001`). v0.1 does not add a Group aggregate beside Paddock. If the ranch later feeds a set of animals that is not "whoever is expected in this paddock," that identity can be added. It is [AQ-P1-009](architecture-open-questions.md), not a module.

Revisit a Land split if lease economics (`OQ-OWN-004`) or paddock-level rules become real. Identifying eight paddocks does not trigger that split.

## Growth

Accepted. Supporting subdomain.

Language: weighing session, calf routine, weight, source quality of the weight, gap (expected and not weighed), interval between two weights, arrival weighing after a purchase.

Authoritative data: the weight records.

Invariants:

- The routine is for calves. Adult cows are not pulled into it (`BR-WEIGH-001`). Who counts as a calf in the routine is still open (`OQ-OWN-003`) and may be unknown.
- A session is not a herd verification. An animal that was not called to the chute was not checked by the session (`TGT-WEIGH-001`).
- A gap is "expected in this session and did not pass." It is also the absence of a new observation. It is not an exit and not a theft finding.
- Interval gain is computed from two weights of the same animal. It is not an independently editable number.
- Source quality is stored on the weight. Transcribed from the scale, it is measured. A photo of the indicator, without a transcribed reading treated as the scale value, is observed. A number someone stated is declared.
- The commercial weight on a purchase or a sale is a Finance fact. An arrival weighing, if the ranch takes one, is a Growth fact and stays distinct from the purchase price (`TGT-PUR-001`, `BR-WEIGH-004`).
- The scale brand is not a type in this module (`CON-SCALE-001`).

Why separate from Herd: the rules are about a series and a session, the write rhythm is the weighing day, and Herd should not change when a calf steps on the scale. Coupling drops to `AnimalId`.

Why supporting, not core: once identity exists, the record is a straightforward series. `PP-GROW-001` is important and, in the TO-BE reading, substantially controlled by that series. The distinctive ranch rules are tenure and feed quality, not the arithmetic of two dates.

## Feeding

Accepted. Core domain.

Language: purchased, prepared, delivered declared, delivered measured, physical remnant (pointed at Inventory, not stored here as a balance), group, source quality of each quantity.

Authoritative data: the diet quantities and what kind of quantity each one is.

Invariants:

- A declaration is not a measurement (`CAP-FEED-001`). The default delivery is declared. Measured requires an actual measure (`TGT-FEED-001`).
- A photo does not change that classification by existing.
- Individual intake is not recorded as measured. Animals eat together (`BR-FEED-001`).
- The physical remnant is a count in Inventory. It is not inferred from a delivery declaration.
- The approximations around MXN $8/kg, 1.5 kg per animal per day, and 270 kg lasting about 15 days are not reconciled here (`OQ-FEED-002`).
- `CAP-FEED-002` is not implemented in this module. Comparing strategies needs quantity, group, period, and gain, and must stay hidden while any of those is missing.

Why separate from Inventory: the warehouse answers "what should be on the shelf, what was counted." Feeding answers "which business quantity is this, and was it measured." Collapsing them makes a declared delivery look like a stock issue that has already been verified. That is the failure mode of `PP-FEED-001`.

Why separate from Finance: the money of a feed purchase is an expense. The kilograms purchased are a feed fact. They share a capture. They do not share an owner.

Why core: a generic stock or cost system will store one "feed quantity" and let reports treat it as consumption. The ranch's critical pain is specifically that those quantities are different facts. The language that keeps them apart is the language this product has to get right.

## Inventory

Accepted as its own module. Supporting subdomain. Initial scope is diet ingredients.

Language: stock item, receipt, issue, theoretical balance, physical count, variance.

Authoritative data: movements and counts. The theoretical balance is derived from movements. The variance is derived from the latest count against that balance. Neither derived number is edited in place.

Invariants:

- A variance is a fact to review. It does not assign blame (`TGT-INV-001`).
- A count does not silently rewrite history. If the ranch adopts the count as the new baseline, that is an explicit adjustment movement with a reason, not a overwritten balance.
- Issues of diet ingredients can be the same capture as a feed batch. Inventory still owns the movement. Feeding owns the batch meaning.
- Medicine, tools, and other materials fit the same module later. They are not required on the first day (`DQ-INV-001`, and the TO-BE minimum is the ingredient count).

Why not a submodule of Feeding forever: the dependency would point the wrong way as soon as a medicine leaves the warehouse for a health event. Health and Feeding would both be writing "their" stock inside a feed module. A separate Inventory module lets both reference a movement id, and lets Feeding stay about diet meaning.

Why not a generic platform inventory product inside the domain: the behavior is ordinary stock control, which is why the classification is supporting. The boundary still exists so Feeding's vocabulary does not become the stock ledger.

The open piece is scope, not ownership. [AQ-P0-003](architecture-open-questions.md) asks architecture QA to confirm the split. `DQ-INV-001` asks the ranch whether the first counts are ingredients only. Both can stay open while the boundary is in place: start with ingredient items, keep other categories unbuilt.

## Finance

Accepted. Supporting subdomain.

Language: expense, operating versus investment versus unclassified, ticket or cash note, explicit attribution to an animal or a group, unallocated remainder, cattle purchase, purchase form (per kilogram, «bulto», or unknown), freight, sale, known income, commercial quantity.

Authoritative data: the money facts and the explicit attributions the owner actually made.

Invariants:

- Income can be recorded before any profitability view exists (`TGT-SALE-001`).
- «Bulto» is stored as the form of the deal. It is not translated into a per-head price or an average weight (`OQ-TRADE-001`).
- Freight on a purchase is part of the entry cost. The buyer pays it (`BR-BUY-002`).
- An expense the owner cannot tie to an animal or a group stays unallocated. The unallocated pool is the set of those expenses, not a second ledger and not a proration (`DQ-FIN-003`).
- Nothing in this module computes the rancher's personal share while `OQ-OWN-001` is open.
- Management class may be unclassified (`OQ-FIN-001`). Classification is management visibility, not fiscal accounting (`BR-FIN-001`, `CON-ACC-001`).
- A sale records income here and requests exit in Herd. Finance does not own the active flag.
- Commercial weight or quantity on the sale or purchase stays here even when a Growth weight also exists. They are allowed to differ.

Why supporting: recording a known expense, a purchase, and a known income is necessary and mostly ordinary. The hard part of `PP-FIN-001` is refusing a false precision. That refusal lives in the profitability read model and in Herd's decision not to interpret tenure. It does not require a second money module.

### Profitability

`TGT-PROFIT-001` produces a provisional margin on what was explicitly allocated, plus the unallocated pool, completeness, and source quality. It produces no new evidence. It reads sale income, purchase cost, freight, and direct expenses. It leaves the rancher's share unknown. It withholds cost per kilogram gained while feed quantity is not reliably observed or measured.

That is a read model, `ProvisionalProfitabilityView`. It is not an aggregate, not an analytics bounded context, and not a set of figures someone corrects on the report. If a number is wrong, the correction is the expense, the sale, the purchase, or the feed quality that gated the display.

Creating an Analytics context would give a home to `CAP-FEED-002` before that capability is unblocked, and would invite the report to become the place ranch facts are stored. The view may sit beside the weekly summary in the application layer.

## Reproduction

Accepted. Supporting subdomain. Thin on purpose.

Language: birth, dam, sire, certainty (observed, inferred, unknown), inference reason (birth seen, worker's account, single bull present, or another named reason).

Authoritative data: parentage for an offspring `AnimalId`.

Invariants:

- Inferred is not confirmed. The single bull is a reason for inference, not a stored "father" (`CAP-REPRO-001`, `TGT-REPRO-001`).
- Unknown parentage is valid. The calf of an «a la parte» animal can be born with unknown tenure; that tenure is Herd's field, not a fertility rule.
- A correction changes certainty and keeps the previous certainty (`TGT-REPRO-001`). It does not open a new animal.
- Comparing lines is not a feature of this module (`OQ-GEN-001`).

The birth capture is one application command: Herd registers the animal, Reproduction records parentage, one transaction. Reproduction does not insert the animal row. Herd does not store the sire's certainty.

Why it is still its own module: the invariant people will get wrong is "we have one bull, so the father field is that bull." That rule does not belong as two optional columns on Animal with a silent update. A separate owner makes the correction path explicit.

Why not core: the pain is medium, the genetic interest is long-term, and the module should stay a record of certainty. It becomes core only if lineage comparison turns into a decision the ranch actually runs. That is not this version.

## Health

Accepted. Supporting subdomain. Thin on purpose.

Language: treatment, vaccination, bath, observed problem, product if known, animal or group, time.

Authoritative data: the health event.

Invariants:

- The note exists so the memory of the workers is not the only file (`CAP-HEALTH-001`).
- No calendar is required (`OQ-HEALTH-001`). A reminder is out of scope.
- If a product is also a stock item, the event may reference an inventory movement. While inventory is ingredients only, that link is absent and the health note still stands (`TGT-HEALTH-001`).
- A health handling can contribute an observation to the presence projection. The health module does not write a last-seen column on the animal.

Why separate: folding every treatment into the Animal aggregate makes Herd the transaction boundary for a note that does not change identity, tenure, or exit. A combined "care and kinship" module would be the dumping ground principle 14 rejects: baths and sires are not one language.

Why supporting: the interview ranks sanitary history below profitability, weight, feed, and security. The module is a place to put a note when the ranch records one. It is not the heart of the system.

## Presence

### Last observation is a projection

`TGT-SEC-001` says the last observation is produced by another event, usually weighing, and is not a second capture. The authoritative facts are those events: a weight in Growth, a health handling, a herd verification, and any later event that truly saw the animal.

`LastObservationView` is derived. For each active animal it can show when the animal was last seen, in which event, and where, if the event knew a place. It is rebuildable from the source records. Modules do not update it as a shortcut, and the weekly summary does not become the place that "fixes" a sighting.

A location assignment is not a sighting. The owner can set an expected paddock without anyone having seen the animal that day.

A weighing gap updates the projection only by the absence of a new event. The animal stays active.

### Herd verification stays in Herd

`TGT-HERD-VERIFY-001` is a different statement: the ranch attempted to confirm a group, and these animals were confirmed or not. That record is authoritative operational data about the roster. Herd owns it. The projection may treat a confirmation as a stronger observation than a chute pass, because the TO-BE model insists on that distinction (`CAP-SEC-001`).

There is no Presence bounded context. One half is a derivation. The other half is a Herd use case whose method is not chosen.

### Confirmed missing, still active

The operating model allows an animal to remain active after a confirmed absence, and allows an alert in that case, with exit as a later decision. v0.1 does not add a parallel "missing" lifecycle beside active and inactive. Where the owner's assertion "this absence is a confirmed missing" is stored — on the verification, or as a follow-up Herd decision that still leaves the animal active — is [AQ-P0-004](architecture-open-questions.md). Herd would own that assertion. The projection would not.

## Security and intrusion

Rejected as a module.

`CAP-SEC-002` and `TGT-SEC-002` describe a desired control: evidence of an unauthorized entry or a cut fence, distinct from a missing animal. The TO-BE reading of `PP-SEC-003` is NOT ADDRESSED. No camera, light, sensor, or patrol is selected (`OQ-SEC-001`). Software does not detect the intrusion by itself (`CON-SEC-001`).

A Security module copied from the TO-BE section would own no rule and no adopted fact. The future shape, if an option is adopted, is an adapter that delivers a perimeter observation. That port is named in [integrations.md](integrations.md) and has no domain consumer in v0.1. A manual note of a fence finding, if the ranch later wants one without hardware, can be reviewed then. It should not be invented now to fill the gap.

## Reporting

Rejected as a bounded context.

`TGT-GOV-001` reviews identity, tenure gaps, expected place, weights, feed and its quality, known income and expenses, physical counts, and who is still active. It shows gaps. It does not fill them. `TGT-PROFIT-001` is the same kind of reading for money.

The application layer holds read models:

| Read model | Assembles | Writes back |
| --- | --- | --- |
| `WeeklyRanchSummary` | The weekly picture `TGT-GOV-001` describes, including gaps | Nothing |
| `AnimalGrowthView` | Weights and computed intervals from Growth, identity labels from Herd | Nothing |
| `ProvisionalProfitabilityView` | Finance facts, feed quality only as a gate, tenure only as a displayed unknown | Nothing |
| `InventoryVarianceView` | Counts versus derived balance | Nothing |
| `MissingAnimalRiskView` | Active roster, expected place, last observation, verification if any | Nothing |

Critical alerts are an application policy over those facts: confirmed missing, a severe animal problem, or another case the owner marked (`BR-CADENCE-001`, `DQ-GOV-001`). The policy does not create a domain module. The channel that delivers the alert is not chosen. A weighing, a ticket, or a small warehouse difference does not raise an alert by itself.

`CAP-FEED-002` does not get a view that compares strategies. The pieces it requires are not reliable yet.

## Other candidates that are not contexts

| Candidate | What it actually is |
| --- | --- |
| Evidence and audit | Transversal. See [cross-cutting-concerns.md](cross-cutting-concerns.md). No independent ranch rules beyond attachment, source, and correction. |
| Communication (`CAP-COMM-001`, `TGT-COMM-001`) | The path by which facts arrive. Metadata on the capture. |
| Connectivity (`CAP-CONN-001`) | A constraint on commands and identifiers. See [offline-readiness.md](offline-readiness.md). |
| Milk (`CAP-MILK-001`, `TGT-MILK-001`) | Conditional. No module until milking is actually resumed. [AQ-P2-005](architecture-open-questions.md). |
| Ownership as its own context | Tenure is a descriptor on the animal. A separate Ownership context would only forward fields into Herd. |
| Identity as its own context | The internal id, the marks, and the tenure are one roster language. |
| Analytics | The blocked comparison and the provisional margin are read models and refusals. They are not a context. |

## Subdomain classification

Conservative on purpose. Severity in the pain list is not the classification. A high pain with a simple record can be supporting. A rule that generic software will flatten can be core even when the herd is small.

| Area | Class | Reasoning |
| --- | --- | --- |
| Herd, including tenure, lifecycle, and expected place | Core | The file has to survive a missing tag, keep unknown tenure distinct from unknown economic participation, and leave the herd without deleting history. A generic animal registry tends to require an owner and a tag. Those defaults would falsify this ranch. |
| Feeding | Core | Purchased, prepared, declared, measured, and counted are different facts. The critical pain is their collapse. Strategy comparison stays out until the facts exist. |
| Growth | Supporting | Own invariants and own data, and a high pain, with a standard shape: a series of weights and the gaps in a session. |
| Finance | Supporting | Known income, entry cost, expenses, and explicit allocation. The dangerous calculation is withheld in a read model rather than modeled as a second core ledger. |
| Inventory | Supporting | A stock ledger and a count. Ranch-specific meaning of a kilogram of feed stays in Feeding. |
| Reproduction | Supporting | Certainty and inference reason must not collapse into a father pointer. The decision the ranch will someday want — which line performs — is explicitly later. |
| Health | Supporting | A note with a small invariant. Ranked below the critical pains by the interview itself. |
| Evidence and audit | Transversal | A rule about every fact. Not a business area with its own process outcomes. |
| Authentication | Generic | One expected human user. No ranch-specific identity rules. The provider is a port. |
| Alert delivery and file storage | Generic | Mechanisms. The decision of what is critical is application policy over domain facts. |
| Reporting | Not a subdomain | Read models. |
| Last observation | Not a subdomain | Projection. |
| Intrusion | Not a current subdomain | Unadopted integration. |
| Land | Not a current subdomain | Facts inside Herd until land has its own rules. |
| Milk | Not a current subdomain | Conditional capability. |

## Aggregates and transactional owners

Only concepts that need a consistency boundary are listed. Names are responsibilities, not classes and not tables.

### Herd

**Animal.** The roster file: internal identity, sex and category if known, tenure, economic-participation descriptor and optional verbal note, marks, active flag, exit reason and the time the exit was known.

Invariants are the Herd invariants above. Expected location history is a sequence of dated assignments on this ownership (animal, paddock or unknown, effective from). The current expected place is the latest assignment. A move appends history. It does not erase the previous place. References: none required to other modules. Other modules reference `AnimalId`.

**Paddock.** A small reference the ranch can point at: an internal id and whatever label is known. Hectares are optional and may be absent (`OQ-LAND-001`). Not an aggregate of grazing rules.

**HerdVerification.** One attempt to confirm a place or a group: place used or unknown, who was confirmed, who was not, when, and a note of the method if one exists. Unconfirmed does not exit the animal. References: `AnimalId`, `PaddockId`.

Not aggregates: last observation, "the herd" as a single global document, a Group type, a partner account.

### Growth

**WeighingSession.** One occasion: which animals were expected, the weight records taken, and the gaps. A weight record references `AnimalId` and carries magnitude, unit, time, source quality, and optional evidence ids. An arrival weighing uses the same ownership with a role that marks why it was taken, so it is not silently merged into the purchase.

Not aggregates: interval gain, the growth chart, a scale device.

### Feeding

**FeedPurchaseQuantity.** The kilograms (or other amount) purchased and their quality, with references to the Finance expense and the Inventory receipt created in the same capture. It does not store the price as authority and does not store the on-hand balance.

**FeedBatch.** What was mixed and how much, quality declared unless it was measured, optional reference to the inventory issue of the same capture.

**FeedDelivery.** Amount offered, quality declared or measured, paddock if known, otherwise an approximate description or unknown.

Not aggregates: a ration per animal, a feed strategy, the remnant on the shelf.

### Inventory

**StockItem.** The ingredient (and, later, any other item the ranch decides to track): identity and its movements. Movements are append-only receipts, issues, and explicit adjustments. Each movement may reference the capture that caused it (`FeedPurchaseQuantity`, `FeedBatch`, or a health event).

**PhysicalCount.** A count of a stock item at a time, with evidence if any. Variance is computed against the derived balance. The count does not delete movements.

Not aggregates: the theoretical balance as an editable field, a warehouse building, a forklift-level location hierarchy.

### Finance

**Expense.** Amount, time, management class or unclassified, evidence, optional attribution to `AnimalId` or `PaddockId`. No attribution means the expense contributes only to the unallocated pool. No automatic split for «a la parte».

**CattlePurchase.** Price, form (per kilogram, «bulto», or unknown), freight, counterparty if known, links to zero or more `AnimalId` values. A «bulto» may exist before each head has a file. The form is not expanded into implied per-head economics. A commercial weight used to explain a per-kilogram price, when the document has one, lives here and is not a Growth weight.

**Sale.** Known income, commercial quantity or live weight if known, unit price if the form has one, buyer if known, evidence, and the `AnimalId` values that the same command exits. The sale does not store a margin.

Not aggregates: provisional profitability, the unallocated pool as its own ledger, a fiscal period, a partner settlement.

### Reproduction

**ParentageRecord.** One offspring `AnimalId`, dam certainty, sire certainty, inference reasons, and the correction history of those certainties. The current certainty is the latest correction. Earlier ones remain.

Not aggregates: a pedigree tree, a breeding season, an estrus cycle. The ranch did not describe those rules.

### Health

**HealthEvent.** What was done or seen, `AnimalId` or `PaddockId` (or unknown subject if the note cannot be tied), when, product if known, optional inventory movement id, evidence.

Not aggregates: a vaccination calendar, a withdrawal-period engine, a veterinary work order. None of those rules were given.

## Traceability

Every module above traces to a TO-BE need. Processes that produce no module are marked, with the reason.

| Target process | Capabilities | Where it lives | Facts written or read |
| --- | --- | --- | --- |
| `TGT-ANIMAL-001` | `CAP-ID-001`, `CAP-OWN-001`, `CAP-LIFE-001`, `CAP-LAND-001`, `CAP-DATA-001` | Herd | Animal, tenure, participation or gap, marks, place or unknown, active |
| `TGT-BIRTH-001` | `CAP-REPRO-001`, `CAP-ID-001`, `CAP-OWN-001`, `CAP-LIFE-001`, `CAP-DATA-001` | Application command over Herd and Reproduction | New animal, parentage, tenure unknown when the share rule is unknown |
| `TGT-WEIGH-001` | `CAP-GROW-001`, `CAP-ID-001`, `CAP-SEC-001`, `CAP-DATA-001` | Growth writes. Presence projection reads | Weight, session gap. Last observation is derived |
| `TGT-FEED-001` | `CAP-FEED-001`, `CAP-INV-001`, `CAP-FIN-002`, `CAP-LAND-001` | Application command over Feeding, Inventory, and Finance | Purchased quantity, batch, delivery, stock movement, expense |
| `TGT-INV-001` | `CAP-INV-001`, `CAP-FEED-001` | Inventory. A diet issue may be the same command as `FeedBatch` | Movements, count, derived balance and variance |
| `TGT-EXPENSE-001` | `CAP-FIN-002`, `CAP-FIN-001`, `CAP-DATA-002` | Finance | Expense, class or unclassified, attribution or unallocated |
| `TGT-PUR-001` | `CAP-FIN-001`, `CAP-OWN-001`, `CAP-ID-001`, `CAP-LIFE-001` | Finance, plus Herd when a head is identified | Entry cost, form, freight, animal links. Arrival weight, if taken, is Growth |
| `TGT-SALE-001` | `CAP-FIN-001`, `CAP-LIFE-001` | Application command over Finance and Herd | Known income. Exit reason sale |
| `TGT-PROFIT-001` | `CAP-FIN-001`, `CAP-OWN-001` | `ProvisionalProfitabilityView` | Reads. Writes nothing |
| `TGT-SEC-001` | `CAP-SEC-001` | `LastObservationView` | Derived from the source event |
| `TGT-HERD-VERIFY-001` | `CAP-SEC-001`, `CAP-LAND-001` | Herd | Verification. Method still pending, so the feature can wait |
| `TGT-SEC-002` | `CAP-SEC-002` | No module. Future port only | None until an option is adopted |
| `TGT-HEALTH-001` | `CAP-HEALTH-001`, `CAP-DATA-001` | Health | Health event |
| `TGT-REPRO-001` | `CAP-REPRO-001`, `CAP-DATA-002` | Reproduction | Parentage correction |
| `TGT-COMM-001` | `CAP-COMM-001`, `CAP-DATA-002`, `CAP-CONN-001` | Transversal metadata on whatever event the owner records | Source, person, channel, quality |
| `TGT-GOV-001` | `CAP-GOV-001` | Weekly read model and alert policy | Reads. A critical alert is a notice, not a new ranch fact |
| `TGT-MILK-001` | `CAP-MILK-001` | No module | None in the initial architecture |
| `TGT-ANIMAL-EXIT-001` | `CAP-LIFE-001`, `CAP-SEC-001` | Herd | Inactive, reason, when it was known |
| `TGT-MOVE-001` | `CAP-LAND-001` | Herd | Expected location from a given time |

`CAP-DATA-001` is satisfied by each module retaining its own records under the animal's id, plus a read model that can list them. There is no History module.

`CAP-FEED-002` has no process that executes it and no module that implements it.

## Concepts that do not have a TO-BE justification

These showed up as architectural temptations and are not part of v0.1:

- a microservice per module
- event sourcing of the whole ranch
- a Security or Intrusion context
- a Land or GIS context
- a Milk context
- an Analytics context
- an Evidence context
- a Communication or Connectivity context
- a shared business module for "common entities"
- individual feed intake
- fiscal accounts, partner settlement, and cost per kilogram gained
- a worker login
- CRDTs or a field-sync protocol

## Status

- Version: 0.1
- Status: Proposed boundaries for architecture QA. Not an approved scope
- Last updated: 2026-10-04
- Source: TO-BE v0.2 at `13c4ef2`, traced from `docs/domain` pains and capabilities
- Validation: Pending architecture QA. Ranch-owner validation of the domain remains pending
