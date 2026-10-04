# Domain boundaries

How the TO-BE operating model is cut into modules. A module is a boundary of language and write ownership inside the modular monolith of [ADR-002](adr/ADR-002-modular-monolith.md). It is not a service, a screen, or a TO-BE group copied into a folder.

The judgment used for every candidate:

1. Does it have its own language and rules?
2. Does it own authoritative business data?
3. Does it have meaningful invariants?
4. Would separating it reduce coupling?
5. Is it a bounded context, or a projection, a cross-cutting concern, a reporting concern, an integration, or a subdomain of something else?

The aim is a handful of modules that can each protect a rule. Five passed. v0.1 also passed Reproduction and Health. Architecture QA folded those two into Herd as historical records. Several familiar headings still do not pass.

## Proposal

| Module | Owns | Does not own |
| --- | --- | --- |
| Herd | Identity, marks, sex and category, tenure, economic-participation descriptor, active state and exit, paddock references, expected-location history, herd verification, confirmed-missing assertions, parentage records, health records | Weights, money, diet quantities, stock balances, last-observation cache, suspected-missing as a lifecycle |
| Growth | Weighing sessions and weight records, including an arrival weighing when one happens | The animal file, sale weight as a commercial term, herd verification |
| Feeding | Prepared batches, deliveries, and the quality of each | Purchased kilograms as a second copy, warehouse balance, the expense, individual intake, strategy comparison |
| Inventory | Stock items, movements, receipts, issues, theoretical balance as a derivation, physical counts | What a delivery means for the diet, the purchase money |
| Finance | Expenses, management classification, explicit allocations, cattle-purchase cost, sale income, commercial quantity | Animal exit state, provisional margin as an editable figure, fiscal profit, automatic proration |

Application layers that are not bounded contexts:

- orchestrators for captures that write more than one module ([ADR-003](adr/ADR-003-application-orchestration.md))
- management read models
- evidence, audit, source quality, and capture channel, all transversal
- integration adapters

A module in this list is a place for rules. It is not a promise that every record is in the first build. Herd verification, health notes, declared feed delivery, and the profitability view are already marked desirable or method-pending in TO-BE. They still need a home so a later build does not invent a new owner.

Pain severity does not decide the class. A critical pain with a simple record can be supporting. A rule that generic software will flatten can be core even when the herd is small. Parentage and health matter, and they still do not earn a module: their current rules fit inside Herd records, and a separate context would mostly forward an `AnimalId`.

## Herd

Accepted. Core domain.

Language: internal identity, mark, SINIIGA, name, tenure, economic participation, active, exit reason, paddock reference, expected place, herd verification, confirmed missing, parentage certainty, health note.

Authoritative data: the roster of animals the ranch manages, the places it uses for them, the verifications and missing assertions it actually records, the parentage history of offspring, and the health notes it records.

The module is not one wide Animal form. `Animal` is the roster aggregate. The other Herd facts are sibling records with their own identity. They are appended or corrected on their own. They are not columns that a save of the animal silently replaces.

Conceptual records, not tables:

| Record | What it holds | How it changes |
| --- | --- | --- |
| `Animal` | Internal identity, marks, sex and category when known, tenure, economic-participation descriptor and optional verbal note, active flag, exit reason and when the exit was known | Lifecycle and identity corrections. A replaced mark stays findable. Exit keeps the file |
| `ParentageRecord` | Offspring `AnimalId`, dam and sire each observed, inferred, or unknown, inference reason, correction history | Append a correction. The latest certainty is current. Earlier certainties remain |
| `HealthEvent` | Animal or group, what happened or what treatment was noted, when, product if known, evidence or source if available, whether the note says the animal was seen | Append or correct the note. It does not edit identity or tenure |
| `LocationAssignment` | Animal or group reference, expected paddock reference or unknown, effective time | Append. The current expected place is the latest assignment |
| `HerdVerification` | The attempt: place used or unknown, who was confirmed, who was not, when, method note if one exists | Append. The method stays open (`OQ-COUNT-001`) |
| `ConfirmedMissingAssertion` | Who asserted it, when, and the context | Append. The animal stays active until a separate exit |
| `PaddockReference` | Stable id, display label or reference. May be incomplete | Reference data. Not a grazing model |

Invariants:

- An animal has an internal identity that survives a missing, lost, replaced, or late SINIIGA tag (`CAP-ID-001`, `BR-ID-001`).
- Tenure and economic participation are separate. Either may be unknown. A verbal «a la parte» note stays a note (`CAP-OWN-001`). The module does not compute a share.
- Third-party cattle on rented land need not have individual files (`BR-OWN-002`). The land-use question stays open with `OQ-OWN-004`.
- Exit keeps the file. Reasons are sale, death, confirmed missing, other, or unknown (`CAP-LIFE-001`).
- Not seen, a verification result of "not confirmed," and even a confirmed-missing assertion leave the animal active until an exit is recorded (`TGT-ANIMAL-EXIT-001`).
- A sale of identified managed animals causes the exit through Herd's operation, called by the sale orchestrator. There is no second exit form (`TGT-SALE-001`).
- Expected place is a dated assignment, or unknown (`CAP-LAND-001`). Assigning a place is not an observation that the animal was seen.
- Parentage stores observed, inferred, or unknown independently for dam and sire. Inferred is not confirmed. The single bull is an inference reason, not a stored confirmed father (`CAP-REPRO-001`, `TGT-REPRO-001`). Unknown is a valid value, including on the birth itself.
- A parentage correction does not open a new animal and does not rewrite the animal's identity fields.
- A health note exists so the workers' memory is not the only file (`CAP-HEALTH-001`). It does not create a calendar, a withdrawal period, a dose rule, or a veterinarian workflow (`OQ-HEALTH-001`).
- A confirmed-missing assertion stores the person, the time, and the context. It does not flip the active flag.

Why Herd is still one module: these records share the roster language. Every one of them is a statement about an animal the ranch manages, or about a place used for that roster. Splitting parentage or health out again would leave a module whose only invariant is "do not collapse this note into a column," which Herd can protect by keeping the sibling record. The coupling that would return is the birth transaction and the `AnimalId`.

Why `Animal` stays narrow: if parentage, health, location history, verification, and missing assertions were editable fields on one aggregate, every note would lock the roster file and a correction of a sire would look like an edit of the calf. The birth operation writes `Animal` and `ParentageRecord` in one Herd transaction. After that, a parentage correction writes the parentage history alone.

### Parentage, inside Herd

`TGT-BIRTH-001` creates the calf and the parentage statement in one capture. `TGT-REPRO-001` corrects that statement later and keeps the previous certainty.

The birth operation, inside Herd:

- creates `Animal` (active, tag optional, tenure unknown when the share rule is unknown)
- creates `ParentageRecord` with dam and sire each set to observed, inferred, or unknown, and with the inference reason when the value is inferred

Mother and father are not mutable columns on `Animal`. There is no rival parent pointer elsewhere.

Reconsider a Reproduction module only if independent rules appear, for example mating history, multiple-bull assignment rules, breeding windows, or reproductive protocols. Comparing lines (`OQ-GEN-001`, `OQ-REPRO-001`) is not that trigger by itself, and those rules are not built now. A second bull does not, by itself, extract the module: it invalidates the "single bull present" inference reason, which `ParentageRecord` can already store as a correction.

### Health, inside Herd

`TGT-HEALTH-001` records what happened, to which animal or group, when, and which product if known, with evidence or source when the owner has it.

`HealthEvent` does not invent treatment schedules, withdrawal-period logic, medicine dosing rules, or veterinarian workflows. The interview ranked this history below profitability, weight, feed, and security. The record is proportional to that ranking.

A health note may say the animal was seen. Only then may the observation projection treat it as a sighting. A problem reported without a sighting does not become one.

Medicine stock, if the ranch later tracks it, stays in Inventory. While the first inventory scope is ingredients, the health note stands without a movement id (`TGT-HEALTH-001`). A later capture that both writes a health note and issues medicine would be an orchestrator over Herd and Inventory. It is not built now.

Reconsider a Health module if independent rules appear, for example a vaccination calendar, withdrawal periods, significant treatment protocols, or a veterinarian workflow of its own. A longer list of notes does not, by itself, extract the module.

### Paddock reference and expected location

`CAP-LAND-001` and `TGT-MOVE-001` are real and small. `PaddockReference` is an identified place the ranch can point at: a stable id and a display label or reference. About eight paddocks are currently identified. The record may be incomplete. It does not represent the roughly 530 hectares. It does not store hectares, carrying capacity, water, pasture condition, lease rules, or a GPS or GIS shape.

That is not enough language for a Land context. It is also not enough to make the paddock an aggregate root. Reference data does not protect a grazing invariant, because no grazing invariant was given.

`LocationAssignment` is the historical fact: an animal or a group reference, an expected paddock reference or unknown, and the time it becomes effective. A move appends a new assignment. It does not erase the previous one. The current expected place is the latest assignment. It is not an observation.

A group reference on an assignment is not a new aggregate. Until a feeding group needs an identity that is not a paddock, that reference may be a paddock, a set of animals, an approximate description, or unknown ([AQ-P1-009](architecture-open-questions.md)).

A feeding delivery may name the same paddock reference when the place is known (`TGT-FEED-001`). Feeding does not own the reference.

Revisit a Land split if lease economics (`OQ-OWN-004`) or paddock-level rules become real. Identifying about eight paddocks does not trigger that split.

### Herd verification and confirmed missing

`TGT-HERD-VERIFY-001` is a statement about the roster: the ranch attempted to confirm a place or a group, these animals were confirmed, and these were not. Herd owns that record. Unconfirmed does not exit the animal and does not count as a sighting. The method and the cadence remain pending (`OQ-COUNT-001`). The module can store a verification when the ranch has one. It does not invent the method, and it does not claim `PP-SEC-001` is controlled.

`ConfirmedMissingAssertion` is a later, explicit statement by an authorized person: this absence is a confirmed missing. It stores who asserted it, when, and the context. The animal remains active. Exit, if the ranch decides the animal is no longer managed, is `TGT-ANIMAL-EXIT-001` and may use confirmed missing as the reason. The assertion is not that exit.

Suspected missing is not a Herd state. It lives only in `MissingAnimalRiskView`.

### Presence projection, not a Herd field

Last observation is not stored on `Animal` and is not updated by Growth or by a health save. The projection rules are under [Presence](#presence). Herd does not accept a write whose only purpose is to stamp "last seen."

## Growth

Accepted. Supporting subdomain.

Language: weighing session, calf routine, weight, source quality of the weight, gap (expected and not weighed), interval between two weights, arrival weighing after a purchase.

Authoritative data: the weight records inside the session.

Invariants:

- The routine is for calves. Adult cows are not pulled into it (`BR-WEIGH-001`). Who counts as a calf in the routine is still open (`OQ-OWN-003`) and may be unknown. The session stores expected participants when they are known. It does not invent the calf set.
- A session is not a herd verification. An animal that was not called to the chute was not checked by the session (`TGT-WEIGH-001`).
- A gap is "expected in this session and did not pass." It is also the absence of a new observation. It is not an exit and not a theft finding.
- Interval gain is computed from two weights of the same animal. It is not an independently editable number.
- Source quality is stored on the weight. Transcribed from the scale, it is measured. A photo of the indicator, without a transcribed reading treated as the scale value, is observed. A number someone stated is declared.
- Persisting the weight does not depend on the last-observation projection. The projection may lag, or be computed on read, and the weight remains.
- The commercial weight on a purchase or a sale is a Finance fact. An arrival weighing, if the ranch takes one, is a Growth fact and stays distinct from the purchase price (`TGT-PUR-001`, `BR-WEIGH-004`).
- The scale brand is not a type in this module (`CON-SCALE-001`). There is no generic Measurement module. A weight is not a template for every future quantity.

Why separate from Herd: the rules are about a series and a session, the write rhythm is the weighing day, and Herd should not change when a calf steps on the scale. Coupling drops to `AnimalId` and, where the session must know who is active, to a public Herd query.

Why supporting, not core: once identity exists, the record is a straightforward series. `PP-GROW-001` is important and, in the TO-BE reading, substantially controlled by that series. The distinctive ranch rules are tenure and feed quality, not the arithmetic of two dates. The pain is not what makes the context core.

## Feeding

Accepted. Core domain.

Language: prepared quantity, declared delivery, measured delivery, source quality of each, group or paddock reference when known.

Authoritative data: the batch and the delivery, and what kind of quantity each one is. Semantic feed operations in this module begin at preparation and delivery.

Invariants:

- A declaration is not a measurement (`CAP-FEED-001`). The default delivery is declared. Measured requires an actual measure (`TGT-FEED-001`).
- A photo does not change that classification by existing.
- Individual intake is not recorded as measured. Animals eat together (`BR-FEED-001`).
- A declared delivery does not create an inventory issue. The physical remnant is a count in Inventory. It is not inferred from a delivery declaration.
- A prepared batch records what was mixed and how much, declared unless it was measured. A warehouse issue is recorded only when the same command says the mix left the warehouse, and Inventory owns that movement.
- The purchased quantity is not stored here. The feed-purchase workflow writes the expense in Finance and the receipt in Inventory. The receipt's quantity, with its source quality, is the purchased amount `CAP-FEED-001` asks to know. Copying those kilograms onto a Feeding record would put one ticket in three modules.
- The approximations around MXN $8/kg, 1.5 kg per animal per day, and 270 kg lasting about 15 days are not reconciled here (`OQ-FEED-002`).
- `CAP-FEED-002` is not implemented in this module. Comparing strategies needs quantity, group, period, and gain, and must stay hidden while any of those is missing.

Why the purchased kilograms moved: v0.1 made `FeedPurchaseQuantity` the authority for those kilograms and also needed a receipt so Inventory could derive a balance. One ticket then had two homes for the same quantity. TO-BE still wants the purchased quantity to be visible, with its quality. v0.2 keeps that quantity once, on the Inventory receipt. The expense holds the money and does not keep a rival kilogram figure. Feeding remains the language that stops a declaration from being presented as a measured delivery or as consumption.

Reconsider a purchased-quantity record inside Feeding only if the ranch must record a diet quantity that is deliberately different from the warehouse receipt. That split is not described today. Do not build it in advance.

Why separate from Inventory: the warehouse answers "what should be on the shelf, what was counted." Feeding answers "which business quantity is this delivery or this batch, and was it measured." Collapsing them makes a declared delivery look like a stock issue. That is the failure mode of `PP-FEED-001`.

Why separate from Finance: the money of a feed purchase is an expense. The kilograms received are stock. They share a capture. They do not share an owner, and Feeding is not a third owner.

Why core: a generic stock or cost system will store one "feed quantity" and let reports treat it as consumption. The ranch's critical pain is specifically that prepared, declared, measured, and counted are different facts. The language that keeps them apart is the language this product has to get right. The pain ranking supports the priority. The classification rests on that language, not on the ranking alone.

## Inventory

Accepted as its own module. Supporting subdomain. Initial scope may be diet ingredients only. That scope does not make Inventory a part of Feeding.

Language: stock item, receipt, issue, adjustment, theoretical balance, physical count, variance.

Authoritative data: movements and counts. The theoretical balance is derived from movements. The variance is derived from the latest count against that balance. Neither derived number is edited in place.

Invariants:

- A variance is a fact to review. It does not assign blame (`TGT-INV-001`).
- A count does not rewrite stock movements. If the ranch later adopts the count as a new baseline, that is an explicit adjustment movement with a reason, not an edited history.
- A receipt from a feed purchase holds the quantity and the source quality of that quantity: observed when the ticket shows it, declared when someone states it without that backing (`TGT-FEED-001`). The receipt does not store the price as the money authority.
- An issue of diet ingredients can be the same capture as a feed batch, via the orchestrator. Inventory still owns the movement. Feeding owns the batch meaning.
- A delivery declaration is not an issue unless a command explicitly records one.
- Medicine, tools, and other warehouse items fit the same module later. They are not required on the first day (`DQ-INV-001`). Documenting that compatibility does not implement those categories.

Why not a submodule of Feeding: the dependency would point the wrong way as soon as a medicine leaves the warehouse for a health note. Herd and Feeding would both be writing "their" stock inside a feed module. A separate Inventory module lets both reference a movement id, and lets Feeding stay about diet meaning.

Why supporting: the behavior is ordinary stock control. The ranch-specific meaning of a kilogram of feed stays in Feeding, and the purchased-versus-delivered distinction stays visible because the receipt is not a delivery.

The open piece is which items the ranch counts first. `DQ-INV-001` still asks that. The boundary does not wait on the answer: start with ingredient items if that is the first count, and keep other categories unbuilt.

## Finance

Accepted. Supporting subdomain.

Language: expense, operating versus investment versus unclassified, ticket or cash note, explicit attribution to an animal or a group, unallocated remainder, cattle purchase, purchase form (per kilogram, «bulto», or unknown), freight, sale, known income, commercial quantity.

Authoritative data: the money facts and the explicit attributions a person actually made.

Invariants:

- Income can be recorded before any profitability view exists (`TGT-SALE-001`). Income may exist with no margin beside it.
- «Bulto» is stored as the form of the deal. It is not translated into a per-head price or an average weight (`OQ-TRADE-001`).
- Freight on a purchase is part of the entry cost. The buyer pays it (`BR-BUY-002`).
- An expense a person cannot tie to an animal or a group stays unallocated. Unallocated means no explicit attribution exists. The unallocated pool is that set of expenses, not a second ledger and not a proration (`DQ-FIN-003`).
- Nothing in this module prorates a cost while the rule is unknown, and nothing settles «a la parte» automatically.
- Nothing in this module computes the rancher's personal share while `OQ-OWN-001` is open. The share may remain unknown.
- Management class may be unclassified (`OQ-FIN-001`). Classification is management visibility, not fiscal accounting (`BR-FIN-001`, `CON-ACC-001`).
- A sale of identified animals records income here. The orchestrator asks Herd to exit those animals. Finance does not own the active flag and does not update herd tables.
- A commercial sale or lote that does not identify individual animals is still a Finance fact. It does not invent exits.
- Commercial weight or quantity on the sale or purchase stays here even when a Growth weight also exists. They are allowed to differ. A chute weight is not forced to equal the commercial weight.

Why supporting: recording a known expense, a purchase, and a known income is necessary and mostly ordinary. The hard part of `PP-FIN-001` is refusing a false precision. That refusal lives in the profitability read model and in Herd's decision not to interpret tenure. It does not require a second money module, and the severity of the pain does not make the ledger core.

If a real allocation rule is introduced later, that rule is authoritative Finance logic first. The profitability view may then read the attributions the rule produced. The view does not become the place the rule is invented.

### Profitability

`TGT-PROFIT-001` produces a provisional margin on what was explicitly allocated, plus the unallocated pool, completeness, and source quality. It produces no new evidence. It reads sale income, purchase cost, freight, and direct expenses that were explicitly allocated. It may read Herd tenure labels and repeat them. It may use feed-quantity quality as a gate. It leaves the rancher's share unknown. It withholds cost per kilogram gained while feed quantity is not reliably observed or measured.

That is a read model, `ProvisionalProfitabilityView`. It is not an aggregate, not an analytics bounded context, and not a set of figures someone corrects on the report. If a number is wrong, the correction is the expense, the sale, the purchase, the explicit allocation, or the feed quality that gated the display. The view does not write a margin back onto Finance, `Sale`, or `Animal`.

The view must not invent an allocation, prorate, assume a 50/50 share, or manufacture a cost per kilogram when the quantity quality is inadequate.

Creating an Analytics context would give a home to `CAP-FEED-002` before that capability is unblocked, and would invite the report to become the place ranch facts are stored. The view may sit beside the weekly summary in the application layer.

## Presence

Seven ideas stay separate. Mixing them is how a desk assignment, a gap, or a risk screen becomes an exit.

| Concept | Where it lives | What it is allowed to do |
| --- | --- | --- |
| Last observation | Projection infrastructure | Show when a source record implies the animal was seen. Rebuildable from those records |
| Expected location | Herd, `LocationAssignment` | State where the animal or group is expected from a given time |
| Herd verification | Herd, `HerdVerification` | Record an attempt to confirm presence. Method still open |
| Not confirmed during verification | A result inside `HerdVerification` | Say this animal was not confirmed in that attempt |
| Suspected missing | `MissingAnimalRiskView` | Show risk from the facts above. Write nothing |
| Confirmed missing | Herd, `ConfirmedMissingAssertion` | Record an authorized person's assertion, with who, when, and context |
| Animal exit | Herd, lifecycle on `Animal` | Make the animal inactive and keep the history |

### Last observation

`TGT-SEC-001` says the last observation is produced by another event, usually weighing, and is not a second capture. v0.2 normalizes that reading in the projection layer. There is no cross-module `AnimalObserved` event and no new module to hold it.

An internal normalized observation may carry, conceptually: `AnimalId`, time, a reference to the source record, a location only if that source genuinely observed it, and the source quality.

Source records that may count:

- a Growth weight whose animal identity was confirmed in that pass
- a herd verification row that confirmed presence
- a health record only when the record says the animal was actually seen

Source records that do not count:

- `LocationAssignment`
- a weighing gap
- a "not confirmed" verification result
- an administrative edit, including a correction of a mark, a tenure note, or a typo

Modules do not update the projection as a shortcut. Weight persistence does not wait for it. The weekly summary does not become the place that "fixes" a sighting. `MissingAnimalRiskView` may read the projection. It must not write Herd.

A location assignment is not a sighting. The owner can set an expected paddock without anyone having seen the animal that day.

### Suspected versus confirmed

The risk view may show an animal as suspected missing from gaps, an old observation, or a verification that did not confirm them. That label is a reading. It is not an authoritative lifecycle state.

Confirmed missing exists only when an authorized person asserts it. The assertion persists even if the later notice fails or waits. The notice is application policy over the assertion (`TGT-GOV-001`). The policy does not create the assertion, and the risk view does not create it either.

Exit remains a separate transition. One allowed reason is confirmed missing. Until that exit is recorded, the animal stays active and the history of the assertion remains.

## Security and intrusion

Rejected as a module.

`CAP-SEC-002` and `TGT-SEC-002` describe a desired control: evidence of an unauthorized entry or a cut fence, distinct from a missing animal. The TO-BE reading of `PP-SEC-003` is NOT ADDRESSED. No camera, light, sensor, or patrol is selected (`OQ-SEC-001`). Software does not detect the intrusion by itself (`CON-SEC-001`).

A Security module copied from the TO-BE section would own no rule and no adopted fact. The future shape, if an option is adopted, is an adapter that delivers a perimeter observation. That port is named in [integrations.md](integrations.md) and has no domain consumer in v0.2. A manual note of a fence finding, if the ranch later wants one without hardware, can be reviewed then. It should not be invented now to fill the gap.

## Reporting

Rejected as a bounded context.

`TGT-GOV-001` reviews identity, tenure gaps, expected place, weights, feed and its quality, known income and expenses, physical counts, and who is still active. It shows gaps. It does not fill them. `TGT-PROFIT-001` is the same kind of reading for money.

The application layer holds read models. Materialized storage versus calculation on read is undecided ([AQ-P1-008](architecture-open-questions.md)). At the current scale the preference is to calculate on read until a demonstrated need says otherwise. That preference is not a persistence decision.

| Read model | Reads | Forbidden |
| --- | --- | --- |
| `WeeklyRanchSummary` | The weekly picture `TGT-GOV-001` describes, including gaps. Purchased feed quantity comes from Inventory receipts. Prepared and delivered quantities come from Feeding | Writing any source fact. Filling a gap with a guessed figure |
| `AnimalGrowthView` | Weights and computed intervals from Growth, identity labels from Herd | Editing a weight or an interval. Treating interval gain as an authoritative fact |
| `ProvisionalProfitabilityView` | Explicit Finance facts, feed quality only as a gate, tenure only as a displayed label | Inventing an allocation, prorating, assuming 50/50, calculating the rancher's share, writing a margin back, manufacturing cost per kilogram when feed quantity quality is inadequate |
| `InventoryVarianceView` | Counts versus the balance derived from movements | Rewriting movements. Treating variance as blame or as a silent baseline |
| `MissingAnimalRiskView` | Active roster, expected place, last observation, verification results | Writing Herd. Turning suspected missing into an exit or into a confirmed-missing assertion |

Critical alerts are an application policy over authoritative facts: a confirmed-missing assertion, a severe animal problem, or another case the owner marked (`BR-CADENCE-001`, `DQ-GOV-001`). The policy does not create a domain module. The channel that delivers the alert is not chosen. Delivery may follow the persisted assertion. A weighing, a ticket, or a small warehouse difference does not raise an alert by itself. Suspected missing on the risk view is not, by itself, the critical alert.

`CAP-FEED-002` does not get a view that compares strategies. The pieces it requires are not reliable yet.

## Other candidates that are not contexts

| Candidate | What it actually is |
| --- | --- |
| Reproduction | Supporting records inside Herd (`ParentageRecord`). Not a module in v0.2 |
| Health | Supporting records inside Herd (`HealthEvent`). Not a module in v0.2 |
| Evidence and audit | Transversal. See [cross-cutting-concerns.md](cross-cutting-concerns.md) |
| Communication (`CAP-COMM-001`, `TGT-COMM-001`) | The path by which facts arrive. Metadata on the capture. `RecordedBy` is not `ReportedBy` |
| Connectivity (`CAP-CONN-001`) | A constraint on commands and identifiers. See [offline-readiness.md](offline-readiness.md) |
| Milk (`CAP-MILK-001`, `TGT-MILK-001`) | Conditional. No module until milking is actually resumed. [AQ-P2-005](architecture-open-questions.md) |
| Ownership as its own context | Tenure is a descriptor on the animal |
| Identity as its own context | The internal id, the marks, and the tenure are one roster language |
| Analytics | The blocked comparison and the provisional margin are read models and refusals |
| Presence | A projection plus Herd records. Not a module |
| Land | Reference data and assignments inside Herd, until land has rules of its own |
| Generic measurement | Not created. Weights stay in Growth. Feed measures stay on the feed fact that was measured |

## Subdomain classification

| Area | Class | Reasoning |
| --- | --- | --- |
| Herd, including tenure, lifecycle, expected place, verification, and confirmed missing | Core | The file has to survive a missing tag, keep unknown tenure distinct from unknown economic participation, and leave the herd without deleting history. A generic animal registry tends to require an owner and a tag. Those defaults would falsify this ranch. |
| Feeding | Core | Prepared, declared, measured, and counted are different facts, and the purchased quantity must not be silently copied into that language. The critical pain is their collapse. Strategy comparison stays out until the facts exist. |
| Parentage records | Supporting records inside Herd | Certainty and inference reason must not collapse into a father column. The rules that would make a Reproduction context — mating history, assignment rules, breeding windows, protocols — are not present. |
| Health records | Supporting records inside Herd | A note with a small invariant. Ranked below the critical pains by the interview itself. Stock of medicine would still be Inventory. |
| Paddock references and verification | Supporting records inside Herd | Real facts, thin rules. They do not make a Land or Presence context. |
| Growth | Supporting | Own invariants and own data, and a high pain, with a standard shape: a series of weights and the gaps in a session. Severity does not promote it to core. |
| Finance | Supporting | Known income, entry cost, expenses, and explicit allocation. The dangerous calculation is withheld in a read model. Severity of `PP-FIN-001` does not create a second core ledger. |
| Inventory | Supporting | A stock ledger and a count. Independence from Feeding protects the diet language. Ingredient scope is a starting cut, not a merger. |
| Evidence, audit, source quality, capture channel | Transversal | Rules about every fact. Not a business area with its own process outcomes. |
| Authentication | Generic | One expected human user. No ranch-specific identity rules. The provider is a port. |
| Alert delivery and file storage | Generic | Mechanisms. The decision of what is critical is application policy over domain facts. |
| Reporting | Not a subdomain | Read models. |
| Last observation | Not a subdomain | Projection infrastructure. |
| Suspected missing | Not a subdomain | A label inside `MissingAnimalRiskView`. |
| Intrusion implementation | Not a current subdomain | Unadopted integration. |
| Land economics | Not a current subdomain | Lease rules were not given. `OQ-OWN-004` stays open. |
| Milk | Not a current subdomain | Conditional capability. |

## Aggregates and transactional owners

Only concepts that need a consistency boundary as aggregate roots are listed as roots. Names are responsibilities, not classes and not tables.

"Not an aggregate root" does not mean "not independently persisted." The historical records below have their own identity. Their operations append or correct them without folding them into `Animal`. The Herd application operation is what keeps a birth's animal and parentage record in one transaction.

### Herd

**`Animal` is the aggregate root.** The roster file: internal identity, sex and category if known, tenure, economic-participation descriptor and optional verbal note, marks, active flag, exit reason and the time the exit was known.

Invariants are the roster invariants above. Other modules reference `AnimalId`. `Animal` does not store dam, sire, last observation, a confirmed-missing flag, or a single paddock cell that replaces location history.

Not aggregate roots, and still Herd records:

- `PaddockReference`
- `HerdVerification`
- `ParentageRecord`
- `HealthEvent`
- `LocationAssignment`
- `ConfirmedMissingAssertion`

Not Herd concepts at all: last observation, suspected missing, provisional margin, interval gain, "the herd" as one global document, a Group type, a partner account.

### Growth

**`WeighingSession` is the aggregate root.** One occasion: which animals were expected when that is known, the weight records taken, and the gaps. A weight record references `AnimalId` and carries magnitude, unit, time, source quality, whether identity was confirmed, and optional evidence ids. An arrival weighing uses the same ownership with a role that marks why it was taken, so it is not silently merged into the purchase.

Not aggregate roots: interval gain, the growth chart, a scale device, the last-observation projection.

### Feeding

**`FeedBatch` is an aggregate root.** What was mixed and how much, quality declared unless it was measured. An inventory issue of the same capture is referenced, not embedded. The issue belongs to Inventory.

**`FeedDelivery` is an aggregate root.** Amount offered, quality declared or measured, paddock reference if known, otherwise an approximate description or unknown. Recording it does not issue stock.

Not aggregate roots, and not Feeding records: purchased quantity (removed with `FeedPurchaseQuantity`), a ration per animal, a feed strategy, the remnant on the shelf.

### Inventory

**`StockItem` is the aggregate root.** The ingredient, and later any other item the ranch decides to track: identity and its movements. Movements are append-only receipts, issues, and explicit adjustments. A receipt from a feed purchase carries quantity and source quality. A movement may reference the capture that caused it. It does not copy Finance's amount or Feeding's delivery quality as a second authority.

**`PhysicalCount` is not an aggregate root.** It is a historical record of a count of a stock item at a time, with evidence if any. Variance is computed against the derived balance. The count does not delete or rewrite movements.

Not aggregate roots: the theoretical balance as an editable field, the variance, a warehouse building, a location hierarchy inside the shed.

### Finance

**`Expense` is an aggregate root.** Amount, time, management class or unclassified, evidence, optional explicit attribution to `AnimalId` or `PaddockId`. No attribution means the expense contributes only to the unallocated pool. No automatic split.

**`CattlePurchase` is an aggregate root.** Price, form (per kilogram, «bulto», or unknown), freight, counterparty if known, links to zero or more `AnimalId` values. A «bulto» may exist before each head has a file. The form is not expanded into implied per-head economics. A commercial weight used to explain a per-kilogram price, when the document has one, lives here and is not a Growth weight.

**`Sale` is an aggregate root.** Known income, commercial quantity or live weight if known, unit price if the form has one, buyer if known, evidence, and the `AnimalId` values the same command exits when those animals were identified. The sale does not store a margin. A sale with an empty animal list does not imply exits.

Not aggregate roots: provisional profitability, the unallocated pool as its own ledger, a fiscal period, a partner settlement.

## Traceability

Every module traces to a TO-BE need. A structuring choice that names a record the TO-BE text did not name is marked. Processes that produce no module are marked, with the reason.

| Target process | Capabilities | Owning module | Application workflow | Read model | Facts |
| --- | --- | --- | --- | --- | --- |
| `TGT-ANIMAL-001` | `CAP-ID-001`, `CAP-OWN-001`, `CAP-LIFE-001`, `CAP-LAND-001`, `CAP-DATA-001` | Herd | Herd operation | Weekly summary | `Animal`, tenure, participation or gap, marks, place or unknown, active |
| `TGT-BIRTH-001` | `CAP-REPRO-001`, `CAP-ID-001`, `CAP-OWN-001`, `CAP-LIFE-001`, `CAP-DATA-001` | Herd | Herd operation, one transaction | Weekly summary | `Animal` and `ParentageRecord`. Tenure unknown when the share rule is unknown |
| `TGT-REPRO-001` | `CAP-REPRO-001`, `CAP-DATA-002` | Herd | Herd operation | Weekly summary may show the current certainty as a label | Parentage correction. History kept |
| `TGT-WEIGH-001` | `CAP-GROW-001`, `CAP-ID-001`, `CAP-SEC-001`, `CAP-DATA-001` | Growth | Growth operation. May query Herd for who is active | `AnimalGrowthView`, last-observation projection, weekly summary | Weight, session gap. The projection is derived |
| `TGT-FEED-001` purchase | `CAP-FEED-001`, `CAP-INV-001`, `CAP-FIN-002` | Finance and Inventory | `RecordFeedPurchase` | Weekly summary, profitability gate via receipt quality | Expense and receipt. One purchased quantity, on the receipt |
| `TGT-FEED-001` preparation | `CAP-FEED-001`, `CAP-INV-001` | Feeding, and Inventory when stock is drawn | `PrepareFeedBatch` when a draw is claimed; otherwise Feeding alone | Weekly summary | `FeedBatch`. Issue only when claimed |
| `TGT-FEED-001` delivery | `CAP-FEED-001`, `CAP-LAND-001` | Feeding | Feeding operation | Weekly summary | `FeedDelivery`. No automatic issue |
| `TGT-INV-001` | `CAP-INV-001`, `CAP-FEED-001` | Inventory | Inventory operation. The diet issue may be the batch orchestrator | `InventoryVarianceView`, weekly summary | Movements, count, derived balance and variance |
| `TGT-EXPENSE-001` | `CAP-FIN-002`, `CAP-FIN-001`, `CAP-DATA-002` | Finance | Finance operation | `ProvisionalProfitabilityView` | Expense, class or unclassified, attribution or unallocated |
| `TGT-PUR-001` | `CAP-FIN-001`, `CAP-OWN-001`, `CAP-ID-001`, `CAP-LIFE-001` | Finance, plus Herd when a head is identified | `RecordCattlePurchase` | Profitability view. Arrival weight, if taken, is Growth | Entry cost, form, freight, animal links only when known |
| `TGT-SALE-001` | `CAP-FIN-001`, `CAP-LIFE-001` | Finance, plus Herd when managed animals are named | `RecordCattleSale` | Profitability view, weekly summary | Known income. Exit reason sale, only for identified animals |
| `TGT-PROFIT-001` | `CAP-FIN-001`, `CAP-OWN-001` | None. Read model | None | `ProvisionalProfitabilityView` | Reads. Writes nothing |
| `TGT-SEC-001` | `CAP-SEC-001` | None. Projection | None | Last-observation projection | Derived from source records |
| `TGT-HERD-VERIFY-001` | `CAP-SEC-001`, `CAP-LAND-001` | Herd | Herd operation | `MissingAnimalRiskView`, alert policy | Verification. Method still pending |
| Confirmed missing while active | `CAP-SEC-001`, `CAP-LIFE-001` | Herd | Herd operation | Alert policy reads the assertion. The risk view does not create it | `ConfirmedMissingAssertion`. Structuring name for a fact TO-BE already allows. Not a new ranch rule |
| `TGT-SEC-002` | `CAP-SEC-002` | No module. Future port only | None | None | None until an option is adopted |
| `TGT-HEALTH-001` | `CAP-HEALTH-001`, `CAP-DATA-001` | Herd | Herd operation | Weekly summary, projection only if the note says the animal was seen | `HealthEvent` |
| `TGT-COMM-001` | `CAP-COMM-001`, `CAP-DATA-002`, `CAP-CONN-001` | Transversal metadata | On whichever capture the owner records | Audit and evidence display | `RecordedBy`, `ReportedBy`, channel, quality |
| `TGT-GOV-001` | `CAP-GOV-001` | None. Read model and alert policy | Notice may follow a persisted assertion | `WeeklyRanchSummary` | Reads. A critical alert is a notice, not a new ranch fact |
| `TGT-MILK-001` | `CAP-MILK-001` | No module | None | None | None in the initial architecture |
| `TGT-ANIMAL-EXIT-001` | `CAP-LIFE-001`, `CAP-SEC-001` | Herd | Herd operation, or the sale orchestrator when the reason is a sale of identified animals | Weekly summary | Inactive, reason, when it was known |
| `TGT-MOVE-001` | `CAP-LAND-001` | Herd | Herd operation | Weekly summary, verification prep | `LocationAssignment` |

`CAP-DATA-001` is satisfied by each module retaining its own records under the animal's id, plus a read model that can list them. There is no History module.

`CAP-FEED-002` has no process that executes it and no module that implements it.

`CAP-FEED-001`'s five quantities have these homes: purchased on the Inventory receipt, prepared on `FeedBatch`, declared or measured delivery on `FeedDelivery`, physical remnant on `PhysicalCount`. Each keeps its own source quality. That mapping is an ownership refinement. It does not change the business meaning of the five quantities.

## Change scenarios

The five-module cut survives each scenario below. Extraction triggers are explicit. None of them is a reason to add a module now.

### A. Second bull, or richer parentage

`ParentageRecord` already stores observed, inferred, and unknown, plus the inference reason, and already keeps corrections. A second bull removes "single bull present" as a valid reason for new inferences. Existing inferred rows stay as history. That is a data change inside Herd.

Extract a Reproduction module only if mating history, multiple-bull assignment rules, breeding windows, or reproductive protocols become real rules with their own invariants. Do not extract it to hold a richer note.

### B. IBN ARGON scale integration

The brand stays outside the domain (`CON-SCALE-001`, `OQ-SCALE-001`). A future adapter would deliver a normalized weight measurement to Growth's weighing operation. The session, the source quality, and the gap rules do not move. No module is added. The protocol question stays [AQ-P2-001](architecture-open-questions.md).

### C. Medicine inventory

Inventory already accepts a later item category that is not feed. A health note may then reference a movement id. A capture that both records the note and issues the product becomes an orchestrator: Herd and Inventory. Feeding stays out of that path. Medicine dosing rules, if they appear, are the Health extraction trigger above, not an Inventory merger.

### D. Milk returns

`CAP-MILK-001` stays conditional. Milk volume, cost, and income have no owner until milking resumes. The five modules do not grow a placeholder. Whether milk then becomes its own module is [AQ-P2-005](architecture-open-questions.md). Finance can already hold an income or an expense once the ranch records one; that does not pre-build a milk context.

### E. Worker offline app

The first path remains the owner recording later. A field client would use the identifier, idempotency, and version constraints in [offline-readiness.md](offline-readiness.md). It would call the same module operations. It would not add a Sync module. The sync design stays blocked by `OQ-CONN-001` ([AQ-P2-003](architecture-open-questions.md)).

### F. Third-party cattle or rental grows

Tenure already allows third party and unknown. Animals that are not individually filed stay unfiled (`BR-OWN-002`). More of them do not create a Land module. Extract land economics only when lease rules, tariffs, or paddock-level obligations become real (`OQ-OWN-004`). Do not invent those rules to house the growth.

### G. Automated feed measurement

A measured delivery is already a `FeedDelivery` whose quality is measured. An adapter would supply that measurement the way a scale adapter would supply a weight. It would not create a Measurement module, and it would not automatically issue stock. An issue remains a claimed inventory movement. Connected dosing (`SOL-FEED-004`, `SOL-FEED-005`) stays unselected.

## Concepts that do not have a TO-BE justification

These showed up as architectural temptations and are not part of v0.2:

- a microservice per module
- a required cross-module event catalog, a broker, or event sourcing of the whole ranch
- a Security or Intrusion context
- a Land, GIS, or land-economics context
- a Milk context
- an Analytics context
- an Evidence or Audit context
- a Communication, Connectivity, or Sync context
- a Reproduction or Health module without the extraction triggers above
- a Presence module, or a writable last-seen field
- a shared business module for "common entities"
- `FeedPurchaseQuantity`, or any second copy of purchased kilograms
- individual feed intake
- fiscal accounts, partner settlement, and cost per kilogram gained
- hectares, carrying capacity, water, pasture, or GPS on the paddock reference
- a worker login
- CRDTs or a field-sync protocol
- vaccination calendars, withdrawal periods, mating plans, and breeding windows

`ConfirmedMissingAssertion` is a structuring name for the already-described case of a confirmed absence that has not yet become an exit. It is not an extra ranch capability.

`HealthEvent` may state whether the animal was seen. That statement exists so the observation projection does not treat every sanitary note as a sighting (`TGT-SEC-001`). It is not a clinical protocol, a calendar, or a workflow for `ACT-VET`.

## Status

- Version: 0.2
- Status: Refined boundaries after architecture QA. Not an approved scope
- Last updated: 2026-10-04
- Source: TO-BE v0.2 at `13c4ef2`, architecture v0.1, architecture QA
- Validation: Five-module cut applied. Ranch-owner validation of the domain remains pending
