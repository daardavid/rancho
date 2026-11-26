# RANCHO MVP Framing

## Status

- Status: ACCEPTED
- Version: v0.4
- Last updated: 2026-11-25
- Accepted: 2026-11-25, when David merged INC-001 through INC-004
- Owner of the decision: David (product), with the ranch owner for ranch facts

This document closes MVP Framing. It produces the five outputs proposed at the end of the design conversation (MVP North Star, Decision Map, Value Map, Data Foundation, MVP Boundaries) and, through them, answers the six questions the [Master Plan](master-plan.md) left open. It does not add ranch facts: every ranch statement points to the domain source that holds it, and open sources stay open.

## Origin and objective

RANCHO started when the family that owns the ranch asked David for help controlling the herd, its growth, and parentage, with full freedom to choose the tools. David and his brother work on it as a side project. The design phase and Governance v1 were built in one long ChatGPT conversation that wrote the prompts for Cursor; its last step recommended exactly this framing. From INC-001 on, the coding is done by the repository factory ([fabrica/](../../fabrica/README.md)).

The objective David set for the MVP, in his words, is to add the greatest possible value so the ranch becomes more profitable and can grow, with the system growing alongside it: an "AI-native" ranch adapted to technology. Cameras and internet will arrive later. The MVP does not program them, but when they arrive the system must be able to talk to them and help the ranch get there. That is the [Constitution](constitution.md)'s north star and its "technology follows the ranch problem" rule, applied to scope.

"Done" (David, 2026-11-22): the whole TO-BE is the end goal, and the MVP is the first "done." The MVP is the first slice of the accepted architecture, built so later increments add modules instead of rewriting it.

## Central question

What is the smallest set of capabilities that can start improving the ranch's decisions and profitability, with a UX good enough to produce reliable data and real learning?

## 1. MVP North Star

**The owner's weekly review rests on records, not on messages and memory.** The first measurable step: every calf weighing session becomes a record within a few days, and the owner uses the growth view to decide which calves need attention. Each later increment extends the same review to feed, money, and herd control.

## 2. Decision Map

Decisions the owner already makes or asks about ([ranch-context.md](../domain/ranch-context.md), "Preguntas que el propietario ya formula"), and when the MVP path reaches them:

| Decision or question | Needs | Increment |
| --- | --- | --- |
| Which animals do we manage, whose are they, and with which tags? | Roster with identity, tenure, marks | INC-001 |
| Are the calves gaining weight? Which are behind? Which were not weighed? | Weight series, interval gain, gaps | INC-001 |
| Can the same records be opened on this laptop and on the phone in the same Wi-Fi? | Local operation | INC-002 |
| Can a capture be filled on the phone? | Experience redesign | INC-003 |
| How many cows have calved? Who is the mother? | Births and parentage | INC-004 |
| Who left, where is each animal, and what should this week show? | Exits, expected place, health notes, last observation, Inicio | INC-004 |
| Is feed being delivered as intended? | Purchase, preparation, delivery, warehouse count, each with its quality | Later |
| What does raising and selling actually leave? Which activity pays? | Expenses, purchases, sales, explicit allocations | Later |
| Is any animal missing? | Herd verification | Later |
| How many cows are in milk, and how many liters? | Milk records | Not in the MVP. Milk is not the current operation (`PP-MILK-001`) |

## 3. Value Map

The three critical pains stay the direction of the MVP: profitability (`PP-FIN-001`), feed verification (`PP-FEED-001`), and late discovery of missing cattle (`PP-SEC-001`) ([pain-points.md](../domain/pain-points.md)). They are not the first increment because their first real step is blocked:

| Critical pain | Blocked by | What unblocks it |
| --- | --- | --- |
| `PP-FEED-001` | `OQ-FEED-001`, `OQ-FEED-002` | How feed is measured today, and reconciling the three approximate figures |
| `PP-FIN-001` | `OQ-OWN-001`, `OQ-OWN-002`, `OQ-TRADE-001` | The meaning of «a la parte» and «por bulto» |
| `PP-SEC-001` | `OQ-COUNT-001`, plus a roster that does not exist yet (`OQ-OWN-003`) | A roster first, then a verification method |

All three depend on the same foundation: a trustworthy roster with stable identity, and a weight series. Growth also feeds profitability (cost per kilogram gained) and the missing-animal risk (last observation). The pains with the highest confidence that are **not** blocked by a P0 question are `PP-ID-001`, `PP-DATA-001`, and `PP-GROW-001`. So the first increment builds that foundation while the interview answers arrive through [cuestionario-002.md](../domain/cuestionario-002.md).

## 4. Data Foundation

INC-001 needs only Herd (animal ficha and marks), Growth (weighing sessions and weights), identity (the owner's login), and one read model (`AnimalGrowthView`). The accepted rules apply from day one: `RanchId` on business rows, client-safe UUIDs, idempotent commands, versions on corrections, history on corrections, and source quality on each weight ([persistence-strategy.md](../architecture/persistence-strategy.md)). Feeding, Inventory, and Finance are not scaffolded until their increment.

Two existing sources may become loadable history and are asked about in the questionnaire: the weight notebooks, and an Excel that existed at some point (`OQ-DATA-001`).

## 5. MVP Boundaries

### What we want to learn from real use

- Whether the owner records a weighing session within a few days of receiving the worker's numbers, every session, for at least four sessions.
- How the numbers actually arrive (photo of the indicator, notebook photo, WhatsApp text, audio), and therefore which source quality is realistic per weight (`OQ-WEIGH-001`).
- Which calves enter the routine (`OQ-OWN-003`), learned by doing it, not assumed.
- Whether interval gain changes any decision: which calves to watch, sell, or move.
- How much of the roster can be "unknown" before the ficha stops being useful.

### UX assumptions to validate

- The owner captures a whole session in one sitting on a phone, one row per calf ([UX-07](ux-principles.md), [UX-13](ux-principles.md)).
- Unknown is quick to choose and does not feel like an error ([UX-04](ux-principles.md)).
- Correcting a mistyped weight is easy and keeps the previous value ([UX-05](ux-principles.md)).
- The owner needs no training beyond one guided session.

### Explicit non-goals of the first increment

No feed, inventory, expenses, sales, purchases, profitability view, births, exits, paddock assignments, herd verification, health notes, photos and evidence storage, offline sync, worker accounts, notifications, scale integration, RFID, cameras, or milk. Each one either has its own later increment or stays in the [Opportunity Backlog](opportunity-backlog.md).

The occasional gravel sale ([ranch-context.md](../domain/ranch-context.md), "Finanzas") is not cattle income. When Finance arrives, it must not be mixed into the cattle margin.

## Proposed MVP path

INC-001 through INC-004 are accepted. David merged them on 2026-11-25. Ranch validation with the family is still open. Feed, money, and herd verification stay Later: they were not part of those increments. INC-005 is in progress.

| Increment | Outcome | Depends on |
| --- | --- | --- |
| [INC-001](increments/INC-001-ficha-y-pesaje.md) | Animal ficha and calf weighing with growth view, usable by the owner | Nothing blocking. Accepted. |
| [INC-002](increments/INC-002-todo-en-local.md) | Todo en local: one command on the laptop, the phone on the same Wi-Fi, backup and restore, photo of the scale | INC-001. Accepted. |
| [INC-003](increments/INC-003-rediseno.md) | Experience redesign: the working screens follow the visual guide | INC-002. Accepted. |
| [INC-004](increments/INC-004-vida-del-hato.md) | Births, exits, expected place, health notes, last observation and the Inicio screen | Nothing P0 blocking those facts. Accepted. Herd verification is not included. |
| [INC-005](increments/INC-005-listo-para-uso-real.md) | Ready for real use: weighing differences use the previous weight, forms do not invent an answer, Inicio is the weekly review, capture takes fewer steps, and a forgotten user or password can be recovered on the laptop | INC-004. In progress. |
| Later migration increment | Publication: the app leaves the laptop (hosting). Its id is assigned when it is framed | Local use |
| Later | Feed: purchase, preparation, delivery, each with its quality, and warehouse count | `OQ-FEED-001`, `OQ-FEED-002` answered |
| Later | Expenses, purchases, sales, and provisional profitability view | `OQ-OWN-001`, `OQ-OWN-002`, `OQ-TRADE-001` answered |
| Later | Herd verification and missing-animal risk | `OQ-COUNT-001` answered |

MVP v1 is INC-001 through INC-004 accepted, with INC-005 in progress so the family can use what was built, plus the later feed, money, and verification work as the interview answers allow. Publication is a later migration increment, after local use. Feed, money, and herd verification stay direction, as the Master Plan's progressive planning requires, and their order can change with the interview answers. After MVP v1, the TO-BE continues in the order learning dictates (camera and connectivity integrations included, when the infrastructure arrives).

## How the Master Plan's six questions are answered

| Master Plan question | Answered in |
| --- | --- |
| Which ranch decisions should the first MVP improve? | 2. Decision Map |
| Which economic or control problems offer the highest current value? | 3. Value Map |
| What do we want to learn from real use? | 5. MVP Boundaries |
| Which UX assumptions need validation? | 5. MVP Boundaries |
| Which data foundation is actually needed? | 4. Data Foundation |
| Which explicit non-goals keep the MVP focused? | 5. MVP Boundaries |
