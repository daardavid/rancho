# Data ownership

One authoritative owner per business fact. Consumers may query, project, or cache. A cache is not a second source. If two columns can diverge, one of them is derived or one of them is the wrong owner.

Read this matrix with [domain-boundaries.md](domain-boundaries.md). "Derived" means the value is computed from the owner's facts and is not edited on its own.

## Matrix

| Business concept | Authoritative owner | Consumers |
| --- | --- | --- |
| Animal internal identity | Herd, `Animal` | Growth, Finance, Reproduction, Health, Feeding via place, all read models |
| Sex, approximate category | Herd, `Animal` | Growth (who may enter the calf routine), Reproduction, weekly summary |
| Marks: SINIIGA, name, later tags | Herd, `Animal` | Read models. Growth displays them and does not store a private copy as truth |
| Tenure (ranch, «a la parte», third party, unknown) | Herd, `Animal` | Profitability view, as a label. The view does not compute a share from it |
| Economic participation (known, partial, unknown) and the verbal note | Herd, `Animal` | Profitability view, which must keep the rancher's share unknown while `OQ-OWN-001` is open |
| Active or inactive | Herd, `Animal` | Presence views, weekly summary, next weighing session's expected list |
| Exit reason and when the exit was known | Herd, `Animal` | Weekly summary. Finance links a sale by id and does not store a second exit flag |
| Paddock identity and label | Herd, `Paddock` | Feeding, herd verification, weekly summary |
| Expected location history, including unknown | Herd, assignments on `Animal` | Feeding reads the current place when recording a delivery. Verification reads it. A desk assignment is not a sighting |
| Herd verification (confirmed and not confirmed) | Herd, `HerdVerification` | `MissingAnimalRiskView`, alert policy |
| Owner's assertion that an absence is a confirmed missing while the animal stays active | Herd, exact record still open ([AQ-P0-004](architecture-open-questions.md)) | Alert policy |
| Last observation | Derived, `LastObservationView` | Weekly summary, missing-animal risk. Not written by Growth, Health, or Herd onto the animal |
| Weighing session membership and gaps | Growth, `WeighingSession` | Weekly summary, growth view |
| Scale or transcribed weight, with source quality | Growth, weight inside the session | Growth view, last-observation projection, weekly summary |
| Interval gain | Derived from Growth weights | Growth view, weekly summary. Not an editable field |
| Arrival weight after transport | Growth, a weight with that role | Purchase screen may show the weight id. Finance does not copy the kilograms into the price |
| Commercial quantity or weight on a purchase or sale | Finance, `CattlePurchase` or `Sale` | Profitability view. Allowed to differ from the last Growth weight |
| Purchased feed amount and its quality | Feeding, `FeedPurchaseQuantity` | Weekly summary. Profitability uses the quality only as a gate on cost-per-kilogram, which stays withheld |
| Prepared amount and its quality | Feeding, `FeedBatch` | Weekly summary |
| Delivered amount and its quality (declared or measured) | Feeding, `FeedDelivery` | Weekly summary. Inventory does not treat a declaration as an issue unless the capture also recorded a movement |
| Stock item identity | Inventory, `StockItem` | Feeding and, later, Health, by reference |
| Stock movement | Inventory, movements on `StockItem` | Variance view. Feeding and Finance keep the movement id |
| Theoretical on-hand balance | Derived from Inventory movements | `InventoryVarianceView` |
| Physical count | Inventory, `PhysicalCount` | Variance view, weekly summary |
| Count variance | Derived from count and balance | Variance view. Not a silent balance reset |
| Explicit stock adjustment | Inventory, adjustment movement with a reason | Variance view |
| Expense amount | Finance, `Expense` | Profitability view |
| Management class (operating, investment, unclassified) | Finance, `Expense` | Profitability view. Unclassified stays visible |
| Explicit attribution of a cost to an animal or a paddock | Finance, `Expense` | Profitability view |
| Unallocated cost pool | Derived: expenses with no explicit attribution | Profitability view. Not a parallel ledger |
| Cattle purchase price, form, freight | Finance, `CattlePurchase` | Profitability view |
| Sale income, unit price if any, buyer if known | Finance, `Sale` | Profitability view |
| Provisional margin, completeness, and the quality label of that reading | Derived, `ProvisionalProfitabilityView` | The owner. No domain module reads it as an input |
| Parentage, certainty, inference reason, correction history | Reproduction, `ParentageRecord` | Animal-facing read model |
| Health event | Health, `HealthEvent` | Weekly summary, last-observation projection when the event was a sighting |
| Evidence bytes | Transversal file port | Nobody treats the file store as the weight, the expense, or the count |
| Association of a file to a fact | The module that owns the fact | Read models follow the association |
| Source quality of a fact | Stored on that fact, in the owning module | Any view that shows or gates the fact |
| Audit of a record (created, corrected, reason) | The module that owns the record, using shared primitives | Read models |
| Channel the owner received the story through | Metadata on the capture | Audit and evidence display |
| Weekly summary | Derived read model | The owner |
| Perimeter or intrusion event | No owner in v0.1 | None |
| Milk volume, milk cost, milk income | No owner in v0.1 | None |
| Worker application account | None in v0.1 | The worker is a reported source, not a user |

## Facts that must not be copied as truth

| Tempting copy | Rule |
| --- | --- |
| Last seen, stored on `Animal` and updated by every module | The projection is the only derived copy. Herd does not accept writes to it from Growth or Health |
| On-hand kilograms stored on a feed delivery | Inventory derives the balance. Feeding stores the delivery's own amount and quality |
| Price stored on the purchased-quantity record as the cost authority | Finance owns the expense. Feeding may reference it |
| Margin stored on `Sale` or on `Animal` | The profitability view computes it. A correction of an expense changes the view |
| Father stored as a bare `AnimalId` with no certainty | Reproduction stores certainty and reason. Herd does not keep a rival parent pointer |
| Purchase weight overwritten by the first chute weight | Commercial quantity and Growth weight both remain |
| SINIIGA copied into Growth as the identity | Growth stores `AnimalId`. Marks resolve through Herd |
| Report cell edited to "fix" a gap | The gap is closed by recording the missing source fact, or it stays a gap |

## One capture, several owners

These ranch events are one command and several rows. The matrix still has one owner per row.

| Capture | Owners touched | Shared identity of the capture |
| --- | --- | --- |
| Calf birth | Herd (animal), Reproduction (parentage) | Offspring `AnimalId` |
| Calf weighed at the chute | Growth (weight). Projection updates last observation after the fact | Weight id and `AnimalId` |
| Feed purchased | Feeding (quantity), Inventory (receipt), Finance (expense) | Capture id referenced by all three |
| Feed prepared and drawn from stock | Feeding (batch), Inventory (issue) | Capture id |
| Feed delivered, declared or measured | Feeding only, unless a separate issue is also recorded | Delivery id |
| Cattle sold | Finance (income), Herd (exit) | Sale id stored on the exit |
| Cattle bought and later identified | Finance (purchase) then Herd (files or links) | Purchase id |
| Physical count | Inventory only | Count id |

The capture id is a correlation. It does not become an aggregate that owns all of the facts inside it. Each owner still corrects through its own rules, preferably via the same command so the correlated facts stay aligned.

## Derived values and their inputs

| Derived value | Inputs | Withheld when |
| --- | --- | --- |
| Interval gain | Two Growth weights of one `AnimalId` | Fewer than two weights |
| Theoretical balance | Inventory movements for one `StockItem` | Always shown as derived; never typed |
| Variance | Latest `PhysicalCount` and theoretical balance | No count yet |
| Unallocated pool | Finance expenses without attribution | Never "solved" by an automatic split |
| Provisional margin | Known sale income and explicitly allocated costs | The view may still show incompleteness. It does not invent the missing costs |
| Rancher's share | — | While `OQ-OWN-001` is open. No input is sufficient |
| Cost per kilogram gained | Feed quantity quality plus gain | Feed quantity is not observed or measured (`OQ-FEED-002`) |
| Last observation | Sighting events | No sighting. The view says so. It does not copy the expected paddock into "last seen" |
| Strategy comparison | — | `CAP-FEED-002` is blocked. The view is not built |

## Status

- Version: 0.1
- Status: Proposed ownership. Not a schema
- Last updated: 2026-10-04
- Source: domain boundaries v0.1
- Validation: Pending architecture QA
