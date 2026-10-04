# 012 — Architecture map v0.1

## Objective

Show the frozen architecture in the ARCHITECTURE tab of `apps/domain-map`, and stop there.

The map explains decisions that are already accepted. It does not approve a product scope, reopen AS-IS or TO-BE, or start the ranch application. Logical architecture v1 is `762739b06d830146d61084497eff3f1a1edafd18`. Physical architecture v1 is `4a262c9fbf1330594832c4a70e8472922e50d0ba`. TO-BE v1 is `13c4ef2ff067404af5fa76141986b863d5cd18c5`.

## Information hierarchy

| Layer | Question | Where it appears |
| --- | --- | --- |
| Contexto | ¿Quién se relaciona con RANCHO y qué queda fuera? | Vista Contexto |
| Despliegue | ¿Qué piezas correrían? | Vista Despliegue |
| Módulos | ¿Quién guarda cada verdad de negocio? | Vista Módulos, la vista inicial |
| Flujos | ¿Cómo cooperan los módulos en una captura? | Vista Flujos, un diagrama por captura |
| Detalle | Reglas, datos, ADRs y procesos TO-BE | Panel al seleccionar un nodo |
| Estado | Qué está congelado y qué espera la implementación | Franja sobre el mapa |

The whole architecture is not one canvas. Each view has its own graph.

## Subviews

Spanish labels: Contexto, Despliegue, Módulos, Flujos. Default: Módulos.

## Node types

| Kind | Meaning |
| --- | --- |
| Actor | A person. A worker can be a source of information without an account |
| Channel | The human path (phone, WhatsApp, photo, audio). Not an integrated system |
| System | The RANCHO monolith |
| Future | A possible external integration that is not selected |
| Runtime | Browser, and the pieces listed inside the one Node process |
| Store | PostgreSQL or object storage |
| Layer | Application layer above the modules |
| Module | One of the five domain modules. Core or supporting |
| Read model | A read-only query, including last observation as a projection |
| Transversal | Shared kernel, evidence and audit, identity, persistence, external adapters. Not domain modules |
| Step | One box in a workflow |
| Note | A clarification that is not a writer |

## Edge semantics

| Edge | Drawing | Meaning |
| --- | --- | --- |
| Call | Solid arrow | A synchronous application call |
| Read | Dashed arrow | A read-only use, a human channel, or a future boundary that is not integrated |
| Technical | Blue arrow | Persistence or another external technical resource |

There is no event-bus edge. Arrows that would only decorate the picture are omitted. The legend names the three kinds.

## Interaction

The subview control sits in the toolbar, with Leyenda and Cómo leer. On Flujos, a second row selects the capture. The side panel stays unmounted until a node or the help text is open, so the map keeps the width. Clicking the empty canvas closes the panel. Nodes do not drag. MiniMap appears on Módulos, the largest graph. Fit keeps a zoom floor so titles stay readable. Below a narrow width the panel stacks under the map instead of squeezing it.

## Detail panel

A selected module shows, in Spanish: name, core or supporting, responsibility, data it owns, rules, what it does not own, PostgreSQL schema, allowed reads, workflows, read models, TO-BE ids resolved from the existing catalog, related ADRs, and extraction notes already documented. Other nodes open a shorter explanation of the same shape. The panel does not paste an ADR.

## Workflows

| Selector | What the diagram shows |
| --- | --- |
| Venta de ganado | `RecordCattleSale`, one transaction, Finance sale and Herd exit |
| Compra de ganado | `RecordCattlePurchase`, Finance purchase and Herd registration when heads are known |
| Compra de alimento | `RecordFeedPurchase`, expense and inventory receipt. Feeding is not a writer |
| Preparar lote de alimento | `PrepareFeedBatch`, batch and stock issue when the command claims both |
| Pesaje de ganado | Growth writes the session. Last observation is a later read |
| Nacimiento | One Herd transaction creates the animal and appends parentage |

Nuances that would clutter the picture stay in the panel: an unidentified sale does not invent exits; «bulto» stays undefined; a declared delivery does not issue stock; unknown parentage is valid.

## ADR and TO-BE traceability

Details cite ADR-002 through ADR-013 by id. TO-BE links are `TGT-*` and `CAP-*` ids that already exist in the catalog. The graph does not draw those ids as nodes. A development check rejects a duplicate architecture id, a missing module, a missing workflow reference, an unknown ADR, and an unknown read model or TO-BE id.

## Pending versus frozen

The strip lists the frozen baseline: modular monolith, React/Vite/TypeScript, Node/Fastify, REST/Zod, PostgreSQL/Drizzle, five modules, one Node process, one PostgreSQL database. The open line lists the auth library, hosting provider, route catalog, display-code format, scale protocol, offline sync, and external alert transport. Those items do not look like blockers of the map. Better Auth and a hosting vendor are not drawn as selected technology.

## Responsive behavior

Desktop is the review size. The toolbar wraps. On a narrow viewport the detail panel moves below the canvas and scrolls inside a limited height. The graphs do not gain a second layout.

## Non-goals

- `apps/api`, `apps/web`, schemas, migrations, backend dependencies, authentication, deployment, or an MVP slice.
- Changing AS-IS or TO-BE domain data.
- Redrawing the accepted module cut.
- A route catalog, a vendor, event sourcing, a broker, Kubernetes, Redis, or a second database.
- Production classes or database tables. The names in the map are architecture concepts.

## Regression checklist

1. AS-IS data and behavior stay as they were.
2. TO-BE data and behavior stay as they were.
3. Five domain modules, Herd and Feeding core, the other three supporting.
4. No Health, Reproduction, Presence, Land, Reporting, Evidence, Identity, Security, Milk, or Analytics module.
5. Orchestrators sit above modules. Modules do not write each other.
6. Read models are marked read-only. Risk is not a confirmed-missing assertion. Profitability is not the finance ledger.
7. RanchId is scope. One ranch. The session supplies it. It is not SaaS.
8. Workers are not shown as accounts. WhatsApp is not an integration.
9. One Node process and one PostgreSQL database are obvious. Object storage stays vendor-neutral.
10. `npm run lint:map` and `npm run build:map` pass.

## Status

- Version: 0.1
- Status: Interactive explanation of the frozen architecture. Not an authorization to scaffold
- Last updated: 2026-10-04
- Source: logical architecture v1 at `762739b`, physical architecture v1 at `4a262c9`, TO-BE v1 at `13c4ef2`
- Validation: The map is visualization data in `apps/domain-map`
