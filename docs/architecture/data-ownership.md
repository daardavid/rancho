# Data ownership

One authoritative owner per business fact. Consumers may query or project. A projection is not a second source. If two stored figures can diverge, one of them is derived or one of them is the wrong owner.

Read this matrix with [domain-boundaries.md](domain-boundaries.md). "Derived" means the value is computed from the owner's facts and is not edited on its own.

"Not an aggregate root" in the boundary document does not remove a row from this matrix. Parentage, health, location, verification, confirmed missing, and physical counts are still authoritative records.

## Matrix

| Business concept | Authoritative owner | Consumers |
| --- | --- | --- |
| Animal internal identity | Herd, `Animal` | Growth, Finance, Feeding via place, Inventory only as a reference on a later movement, all read models |
| Sex, approximate category | Herd, `Animal` | Growth (who may enter the calf routine, when known), weekly summary |
| Marks: SINIIGA, name, later tags | Herd, `Animal`, with previous marks kept on correction | Read models. Growth displays them and does not store a private copy as truth |
| Tenure (ranch, «a la parte», third party, unknown) | Herd, `Animal` | Profitability view, as a label. The view does not compute a share from it |
| Economic participation (known, partial, unknown) and the verbal note | Herd, `Animal` | Profitability view, which must keep the rancher's share unknown while `OQ-OWN-001` is open |
| Active or inactive | Herd, `Animal` | Presence views, weekly summary, next weighing session's expected list |
| Exit reason and when the exit was known | Herd, `Animal` | Weekly summary. Finance links a sale by id and does not store a second exit flag |
| Paddock identity and label | Herd, `PaddockReference` | Feeding, herd verification, weekly summary |
| Expected location history, including unknown | Herd, `LocationAssignment` | Feeding may read the current place when recording a delivery. Verification reads it. A desk assignment is not a sighting |
| Current expected place | Derived: latest `LocationAssignment` | Same readers. Not a second column that can drift from the history |
| Herd verification (confirmed and not confirmed) | Herd, `HerdVerification` | `MissingAnimalRiskView`, last-observation projection (confirmations only), alert policy |
| Confirmed missing while the animal stays active | Herd, `ConfirmedMissingAssertion` | Alert policy. The risk view may display it and must not create it |
| Suspected missing | Derived, `MissingAnimalRiskView` | The owner. No domain module reads it as an input |
| Last observation | Derived projection | Weekly summary, missing-animal risk. Not written onto the animal |
| Weighing session membership and gaps | Growth, `WeighingSession` | Weekly summary, growth view |
| Scale or transcribed weight, with source quality | Growth, weight inside the session | Growth view, last-observation projection when identity was confirmed, weekly summary |
| Interval gain | Derived from Growth weights | Growth view, weekly summary. Not an editable field |
| Arrival weight after transport | Growth, a weight with that role | A purchase reading may show the weight id. Finance does not copy the kilograms into the price |
| Commercial quantity or weight on a purchase or sale | Finance, `CattlePurchase` or `Sale` | Profitability view. Allowed to differ from the last Growth weight |
| Purchased feed amount and its quality | Inventory, receipt on `StockItem` from the feed-purchase workflow | Weekly summary. Profitability uses the quality only as a gate on cost-per-kilogram, which stays withheld |
| Prepared amount and its quality | Feeding, `FeedBatch` | Weekly summary |
| Delivered amount and its quality (declared or measured) | Feeding, `FeedDelivery` | Weekly summary. Inventory does not treat a declaration as an issue |
| Stock item identity | Inventory, `StockItem` | Feeding and, later, a Herd health note, by reference |
| Stock movement | Inventory, movements on `StockItem` | Variance view. Feeding and Finance keep the movement id or the capture id |
| Theoretical on-hand balance | Derived from Inventory movements | `InventoryVarianceView` |
| Physical count | Inventory, `PhysicalCount` | Variance view, weekly summary |
| Count variance | Derived from count and balance | Variance view. Not a silent balance reset |
| Explicit stock adjustment | Inventory, adjustment movement with a reason | Variance view |
| Expense amount | Finance, `Expense` | Profitability view |
| Management class (operating, investment, unclassified) | Finance, `Expense` | Profitability view. Unclassified stays visible |
| Explicit attribution of a cost to an animal or a paddock | Finance, on the expense, made by a person | Profitability view |
| Unallocated cost pool | Derived: expenses with no explicit attribution | Profitability view. Not a parallel ledger and not an automatic split |
| Cattle purchase price, form, freight | Finance, `CattlePurchase` | Profitability view |
| Sale income, unit price if any, buyer if known | Finance, `Sale` | Profitability view. A margin is not stored on the sale |
| Provisional margin, completeness, and the quality label of that reading | Derived, `ProvisionalProfitabilityView` | The owner. No domain module reads it as an input |
| Parentage, certainty, inference reason, correction history | Herd, `ParentageRecord` | Animal-facing readings. Not a column on `Animal` |
| Health event | Herd, `HealthEvent` | Weekly summary. Last-observation projection only when the record says the animal was seen |
| Evidence bytes | Transversal file port | Nobody treats the file store as the weight, the expense, or the count |
| Association of a file to a fact | The module that owns the fact | Read models follow the association |
| Source quality of a fact | Stored on that fact, in the owning module | Any view that shows or gates the fact |
| Audit of a record (created, corrected, reason) | The module that owns the record, using shared primitives | Read models |
| Who entered the fact | `RecordedBy` on the capture | Audit |
| Who reported the fact in the real world, when that person is not the account | `ReportedBy`, optional | Audit and evidence display |
| Channel the owner received the story through | Metadata on the capture | Audit and evidence display |
| Weekly summary | Derived read model | The owner |
| Perimeter or intrusion event | No owner in v0.2 | None |
| Milk volume, milk cost, milk income | No owner in v0.2 | None |
| Worker application account | None in v0.2 | The worker is a reported source, not a user |

## Facts that must not be copied as truth

| Tempting copy | Rule |
| --- | --- |
| Last seen, stored on `Animal` and updated by Growth or by a health note | The projection is the only derived copy. Herd does not accept that write |
| Expected paddock stored as "last seen" | `LocationAssignment` is not an observation |
| Suspected missing stored as a Herd lifecycle | Only `ConfirmedMissingAssertion` is an authoritative missing statement, and even that leaves the animal active |
| On-hand kilograms stored on a feed delivery | Inventory derives the balance. Feeding stores the delivery's own amount and quality |
| Purchased kilograms stored on a Feeding record and again on the receipt | The receipt is the authority. Finance does not keep a rival quantity. Feeding does not keep one either |
| Price stored on the receipt as the cost authority | Finance owns the expense. The receipt may reference the capture |
| Margin stored on `Sale` or on `Animal` | The profitability view computes it when it is allowed to. A correction of an expense changes the view |
| Father or mother stored as columns on `Animal` | `ParentageRecord` stores certainty and reason. Herd does not keep a rival parent pointer on the animal |
| Purchase weight overwritten by the first chute weight | Commercial quantity and Growth weight both remain |
| SINIIGA copied into Growth as the identity | Growth stores `AnimalId`. Marks resolve through Herd |
| A count that rewrites movements | The count is history. Variance is derived. A new baseline is an explicit adjustment |
| Report cell edited to "fix" a gap | The gap is closed by recording the missing source fact, or it stays a gap |
| An allocation invented by the profitability view | Attribution exists only when Finance stored an explicit one |

## One capture, several owners

These ranch events are one command and one or more records. The matrix still has one owner per record.

| Capture | Owners touched | What ties them |
| --- | --- | --- |
| Calf birth | Herd only: `Animal` and `ParentageRecord` | Offspring `AnimalId`, one Herd transaction |
| Parentage correction | Herd, `ParentageRecord` | The same offspring id. Previous certainty kept |
| Calf weighed at the chute | Growth. The projection may later show a last observation | Weight id and `AnimalId` |
| Feed purchased | Finance (expense), Inventory (receipt and its quantity) | Capture id. Feeding is not a third writer |
| Feed prepared and drawn from stock | Feeding (batch), Inventory (issue) | Capture id, when the command claims both |
| Feed delivered, declared or measured | Feeding only | Delivery id. No stock issue |
| Cattle sold, animals identified | Finance (income), Herd (exit) | Sale id stored on the exit |
| Cattle sold or bought as a lote, heads not identified | Finance only | Purchase or sale id. No invented animals or exits |
| Cattle bought and later identified | Finance already holds the purchase. A follow-up calls Herd | Purchase id. Explicit command |
| Physical count | Inventory only | Count id |
| Health note | Herd only, until a medicine issue is in scope | Health-event id |
| Confirmed missing | Herd. Notice may follow | Assertion id |

The capture id is a correlation. It does not become an aggregate that owns all of the facts inside it. Each owner still corrects through its own rules, preferably via the same command so the correlated facts stay aligned.

## Derived values and their inputs

| Derived value | Inputs | Withheld when |
| --- | --- | --- |
| Interval gain | Two Growth weights of one `AnimalId` | Fewer than two weights |
| Theoretical balance | Inventory movements for one `StockItem` | Always shown as derived; never typed in |
| Variance | Latest `PhysicalCount` and theoretical balance | No count yet |
| Current expected place | Latest `LocationAssignment` | No assignment. The view says unknown. It does not guess a paddock |
| Unallocated pool | Finance expenses without explicit attribution | Never "solved" by an automatic split |
| Provisional margin | Known sale income and explicitly allocated costs | The view may still show incompleteness. It does not invent the missing costs or write the margin back |
| Rancher's share | — | While `OQ-OWN-001` is open. No input is sufficient |
| Cost per kilogram gained | Feed quantity quality plus gain | Feed quantity is not observed or measured (`OQ-FEED-002`). Declared quality is not enough |
| Last observation | Source records that genuinely imply a sighting | No such record. The view says so. It does not copy the expected paddock into "last seen" |
| Suspected missing | Roster, expected place, last observation, verification gaps | Never stored as Herd state |
| Strategy comparison | — | `CAP-FEED-002` is blocked. The view is not built |

Feed quantity for the cost-per-kilogram gate may be a receipt, a batch, or a delivery, depending on which quantity the reading is about. The gate looks at that quantity's own quality. It does not upgrade a declared delivery because a receipt was measured, and it does not treat the three quantities as one number.

## Status

- Version: 0.2
- Status: Refined ownership. Not a schema
- Last updated: 2026-10-04
- Source: domain boundaries v0.2
- Validation: Architecture QA applied. No table design is authorized
