# RANCHO Design Checkpoint v1

## Purpose

This checkpoint ends the design phase before any MVP implementation. It records what the interviews, the maps, and the architecture documents have already accepted. It does not start a product build.

## Current ranch scope

The ranch is in Balancán, Tabasco. The property is about 530 hectares. About eight paddocks have been identified; those figures do not describe the whole property. The perimeter is fenced. There are no cameras today.

The current cattle operation is calf fattening for sale. The herd in the interviews is about 21 head: 11 of the ranch owner and 10 of another person under an arrangement called «a la parte». The contractual meaning of that arrangement is still open. Land or third-party cattle rental was not established as a current fact.

About two workers live on the ranch. The owner is not there full time and today hears from them by phone, WhatsApp, photos, and audio. Workers are not the capture users of the system described so far. Management is preferred about once a week.

Milk infrastructure exists and is not the current operation. Dual purpose is a long-term intention. «Por bulto» remains an undefined commercial form. Cellular coverage is limited and still needs validation. These sentences restate the discovery notes. They do not close them.

## Frozen artifacts

| Artifact | Where | Commit |
| --- | --- | --- |
| AS-IS v1 | [../maps/as-is/README.md](../maps/as-is/README.md), [../domain/README.md](../domain/README.md) | Domain context `d3a85b9`. Current-state map `9721a71`. Semantic clarification `100542a` |
| TO-BE v1 | [../maps/to-be/README.md](../maps/to-be/README.md) | Domain model `bc6884f`. Visual baseline `13c4ef2` |
| Logical Architecture v1 | [../architecture/README.md](../architecture/README.md) | `762739b` |
| Physical Architecture v1 | [../architecture/physical-architecture.md](../architecture/physical-architecture.md) | `4a262c9` |
| Architecture Map v1 | [../maps/architecture/README.md](../maps/architecture/README.md) | `5656ab6` |

Full hashes are in [Git checkpoints](#git-checkpoints).

## Core pain points still NOT fully solved

A TO-BE model does not mean the ranch problem is solved. The accepted effectiveness ratings still say:

| Pain | Rating |
| --- | --- |
| Feed control (`PP-FEED-001`) | Visibility improved only |
| Profitability (`PP-FIN-001`) | Partially controlled. The view stays provisional |
| Missing cattle (`PP-SEC-001`) | Visibility improved only |
| Physical intrusion (`PP-SEC-003`) | Not addressed. The method is unselected |

## Accepted logical architecture

Five domain modules.

Core: Herd, Feeding.

Supporting: Growth, Inventory, Finance.

Application orchestrators coordinate a capture that writes more than one module. Read models query. Evidence, audit, and source quality are transversal.

There is no microservice split, no Event Sourcing, and no cross-module event backbone.

## Accepted physical baseline

- React, TypeScript, and Vite
- TypeScript, Node.js, and Fastify
- Command-oriented REST and Zod
- PostgreSQL
- Drizzle
- One Node deployable
- One PostgreSQL database
- A vendor-neutral evidence storage port
- `RanchId` from the first persistence version, as data scope for one seeded ranch

## Important architecture rules

- One authoritative owner per fact.
- Capture a fact once and reuse it.
- Modules do not write each other.
- A cross-module atomic workflow belongs to an application orchestrator and one local transaction.
- A correction keeps the previous value.
- A real change of state is a new historical record.
- Declared, observed, and measured stay distinct.
- Read models do not write domain truth.
- Unknown is a valid value.
- Offline-ready commands are not an offline sync implementation.

The five read models are `WeeklyRanchSummary`, `AnimalGrowthView`, `ProvisionalProfitabilityView`, `InventoryVarianceView`, and `MissingAnimalRiskView`. Last observation is a projection in that same read layer. It is not a sixth read model and not a column on the animal.

## Open implementation decisions

These stay open:

- Final authentication library
- Hosting provider
- Route catalog
- Display-code format
- Scale protocol
- Offline synchronization
- External alert transport
- Exact persistence column catalog
- Final UI and component choices

## Open domain questions

Unresolved ranch questions remain unresolved. The interview register is [../domain/open-questions.md](../domain/open-questions.md). Design questions that are not interview questions stay in the TO-BE notes and are not copied into that register.

## Explicit non-decisions

This checkpoint does not adopt:

- RFID
- GPS
- Cameras
- Perimeter sensors
- A connected feed scale
- Automated dosing
- A worker application
- A messaging API
- A milk module
- Full offline sync
- Microservices
- Event Sourcing

## Git checkpoints

| Commit | Subject |
| --- | --- |
| `afe1f76f9fc34155a390965ef0ecd9fb7f39f5b0` | chore: bootstrap interactive domain map |
| `d3a85b9ff935c3e6ecd7ad518b897b88c1e64c13` | docs: capture ranch domain context v0.1 |
| `9721a712c737eed0eac4bb2b5c0e84f2994bd22f` | feat: build ranch as-is process map v0.1 |
| `100542a7f2aefa40371ef28f0d94e2050b7be663` | refactor: clarify ranch as-is process semantics |
| `63c8f09e53c6cbd1e1acf21af20bae894ac4a316` | docs: design ranch to-be model v0.1 |
| `bc6884f6ddf24c711db2eeceb1ba4768f7f6aee1` | docs: refine ranch to-be model v0.2 |
| `7d522dc1a1db74477fb6e7eff69ab7121b2259ea` | feat: build interactive ranch to-be map v0.1 |
| `13c4ef2ff067404af5fa76141986b863d5cd18c5` | refactor: improve to-be map decision experience |
| `47420febdadf02de7ea9ffa7d6cc921275027c7d` | docs: design logical architecture v0.1 |
| `762739b06d830146d61084497eff3f1a1edafd18` | docs: refine logical architecture v0.2 |
| `0a0f8190e3c8c7402721163cceaa53783fe04686` | docs: design physical architecture v0.1 |
| `4a262c9fbf1330594832c4a70e8472922e50d0ba` | docs: freeze physical architecture v1 |
| `5656ab6b943c0247481e6897faed32f742070dbf` | feat: build interactive ranch architecture map v0.1 |

## Where to resume

When the project resumes, first revisit:

1. What do we want to learn from the first real use?
2. Which ranch pain should be attacked first?
3. Which assumptions have changed since this checkpoint?
4. What is the smallest experiment or software slice worth building?
5. Which open domain questions should be answered before code?

Only after that review should implementation planning begin.

## Stop condition

The RANCHO design phase ends at this checkpoint.

No production application has been scaffolded.
