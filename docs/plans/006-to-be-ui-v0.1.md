# 006 — Interactive TO-BE map v0.1

## Objective

Replace the TO-BE placeholder in `apps/domain-map` with an interactive target-process map. The domain documents remain the source of truth. This plan does not redesign the TO-BE model, approve a scope, or design software architecture.

The screen must keep three layers apart:

- desired process (`TGT-*`)
- selected or candidate solution (`FAM-*`, `SOL-*`)
- open method (pending validation, or not chosen)

## Visual information architecture

Desktop first. The TO-BE view keeps the existing shell: top navigation, React Flow, background, controls, minimap, and fit view.

| Zone | Share | Content |
| --- | --- | --- |
| Map column | about 70–75% | Critical-pain strip, transversal band, filters, edge legend, process map |
| Detail panel | about 25–30% | Scrolls on its own. Empty state, or the selected target process |

The map is a target-process map. Capabilities, families, and the 52 options are not map nodes.

Above the canvas:

1. Critical-pain strip for `PP-FEED-001`, `PP-FIN-001`, and `PP-SEC-001`, with the v0.2 effectiveness in Spanish.
2. Transversal band for `CAP-DATA-002`, `CAP-COMM-001`, and `CAP-CONN-001`.
3. Horizon filter and business-area filter. Filtering dims other nodes. It does not change the data.
4. Edge legend.

`ARCHITECTURE` stays a placeholder. AS-IS data and AS-IS wording stay as they are.

## Map node strategy

Only `TGT-*` processes are process nodes. There are 19. Each card shows:

- process name
- horizon
- a role label only when the role is not an ordinary operation
- a few related pain points

The card does not list capabilities or solutions. A process card is not a green “solved” state.

`TGT-COMM-001` is rendered because it is one of the 19 target processes, with a supporting role, inside Gestión. It is not drawn as a peer step of weighing or feeding. The three transversal capabilities stay in the band.

## Process grouping

Groups are ranch work, drawn as section frames. Edges stay inside a group when a link is local. Cross-group facts are explained in the group note or the detail panel.

| Group | Processes |
| --- | --- |
| Alta / identidad | `TGT-ANIMAL-001`, `TGT-PUR-001`, `TGT-ANIMAL-EXIT-001` |
| Operación ganadera / engorda | `TGT-WEIGH-001`, `TGT-HEALTH-001`, `TGT-MOVE-001` |
| Reproducción | `TGT-BIRTH-001`, `TGT-REPRO-001` |
| Bodega / alimentación | `TGT-FEED-001`, `TGT-INV-001` |
| Finanzas | `TGT-EXPENSE-001`, `TGT-SALE-001`, `TGT-PROFIT-001` |
| Presencia / seguridad | `TGT-SEC-001`, `TGT-HERD-VERIFY-001`, `TGT-SEC-002` |
| Gestión | `TGT-GOV-001`, `TGT-COMM-001` |
| Leche, apart | `TGT-MILK-001` |

Milk uses a dashed frame and the label Condicional. It is not an active operation and not part of the minimum package.

## Edge semantics

Same discipline as AS-IS. Few edges. Grouping carries the rest.

| Kind | Drawing | Meaning |
| --- | --- | --- |
| Sequence | Solid arrow | The target process is meant to follow another. |
| Association | Dashed, no arrow | Related or the same event producing another fact. Not a time order. |

Planned edges:

- Sequence: `TGT-BIRTH-001` → `TGT-REPRO-001`. A later correction of parentage. Not a second birth record.
- Association: `TGT-FEED-001` → `TGT-INV-001`. A feed purchase is also the warehouse entry. Not a second capture.

Not drawn, on purpose:

- Birth does not point at a second animal-create step. The birth produces the record.
- Weighing does not point at a second last-seen form. Last observation is derived.
- Sale does not point at a second exit form. The sale produces the exit.
- Purchase does not require a following weigh.
- Profit does not receive a bundle of arrows. The finance group says it reads events already captured.
- Herd verification does not follow last observation as if the method were chosen.

## Horizon semantics

Spanish labels in the UI:

| Horizon | Label | Use on a process |
| --- | --- | --- |
| Minimum useful now | Mínimo útil | Identity, purchase, exit, birth, calf weighing, feed purchase path, warehouse count, expense, known sale income, last observation, critical alert, field evidence channel |
| Desirable now | Deseable ahora | Health note, expected place, parentage correction, provisional economic reading |
| Pending method | Método pendiente | Herd verification. Intrusion evidence |
| Scale / later | A escala | Not a process horizon in v0.1. Used on solution options. It does not mean a future obligation |
| Conditional | Condicional | Milk only |

`TGT-FEED-001` stays on Mínimo útil because the purchase is in the minimum package. The panel still says prepared and declared delivery are desirable, and measured delivery is to investigate.

`TGT-GOV-001` stays on Mínimo útil because the critical alert is in the minimum package. The weekly summary stays desirable inside the family.

## Solution-family interaction

Families are not map nodes. A selected process shows its families in the detail panel. Transversal families open from the band.

Initial view of a family:

- primary approach
- at most two visible alternatives

Further options sit in collapsed sections, with local React state and no accordion library:

- Recomendado ahora
- Investigar
- A escala
- No recomendado ahora

`FAM-SEC-002` has no primary option. The panel says the desired control exists and the implementation is not selected. Camera, light, sensor, RFID, and GPS stay collapsed and are not promoted.

`FAM-OWN-001` has no option of its own. Tenure and participation are explained on the animal, birth, and purchase processes, and they ride on `SOL-ID-001`.

`FAM-MILK-001` stays conditional and outside the initial package.

## Pain-effectiveness interaction

Effectiveness is an initial project assessment, labeled Evaluación inicial. It is not a project-completion status.

| Value | Spanish |
| --- | --- |
| SUBSTANTIALLY CONTROLLED | Sustancialmente controlado |
| PARTIALLY CONTROLLED | Control parcial |
| VISIBILITY IMPROVED ONLY | Solo mejora visibilidad |
| NOT ADDRESSED | No atendido |
| CONDITIONAL | Condicional |

The strip uses the v0.2 reading:

- `PP-FEED-001`: Solo mejora visibilidad
- `PP-FIN-001`: Control parcial
- `PP-SEC-001`: Solo mejora visibilidad

Clicking a strip card highlights the related target processes and can be clicked again to clear. No extra interaction library.

`PP-SEC-003` stays No atendido on the intrusion process.

## Transversal capabilities

A band, not three process boxes:

TODO EVENTO OPERATIVO

- fuente: declarado / observado / medido
- evidencia cuando exista
- canal/origen conocido
- puede asentarse después cuando la conectividad no permita capturarlo en el momento

The band does not say that offline synchronization has been designed. Expanding it shows `FAM-DATA-001`, `FAM-COMM-001`, and `FAM-CONN-001`.

## Presentation roles

Roles are UI only. They do not change domain meaning.

| Role | Examples |
| --- | --- |
| operational | Ordinary desired operation |
| supporting | Channel (`TGT-COMM-001`), provisional reading (`TGT-PROFIT-001`), later parentage correction |
| derived | Last observation (`TGT-SEC-001`) |
| pending_method | Herd verification, intrusion |
| conditional | Milk |

## Data-model changes

New types, separate from AS-IS process types:

- `TargetProcessData`
- `TargetCapabilityData`
- `SolutionFamilyData`
- `SolutionOptionData`
- `PainEffectiveness`
- `TargetHorizon`
- `SolutionHorizon` (shelf: recommended now, investigate, scale, not recommended now)
- `VisualRole`

New modules:

```text
apps/domain-map/src/data/toBe/
├── targetCapabilities.ts
├── targetProcesses.ts
├── solutionFamilies.ts
├── solutionOptions.ts
├── painEffectiveness.ts
└── validateToBe.ts
```

Stable IDs are copied from v0.2. No new `PP-*`, `CAP-*`, `TGT-*`, `FAM-*`, or `SOL-*`.

Pain titles and definitions stay in `src/data/painPoints.ts`. The TO-BE modules reference those IDs.

A development-time function checks:

- every `painPointId` exists
- every `capabilityId` exists
- every `familyId` exists
- every `SOL-*` cited by a family exists
- every rendered `TGT-*` exists
- every documented target process is rendered
- every solution option is reachable from some family
- duplicate stable IDs are reported

It throws when imported in the app. It is not a schema library and adds no dependency.

## Files expected to change

- `docs/plans/006-to-be-ui-v0.1.md` (this plan)
- `docs/maps/to-be/README.md` (UI conventions)
- Wording only, already applied before this plan’s implementation: “named paddocks” / “potreros ya nombrados” become known or identified paddocks in the TO-BE docs that said otherwise
- `apps/domain-map/src/App.tsx`
- `apps/domain-map/src/styles/app.css` (additive TO-BE rules)
- `apps/domain-map/src/types/map.ts` only if a shared section needs an optional visual variant
- `apps/domain-map/src/features/maps/components/SectionNode.tsx` only for that optional variant
- New TO-BE data and view components under `src/data/toBe/` and `src/features/maps/components/`

AS-IS process data is not edited.

## Explicit non-goals

- No architecture tab
- No backend, database, auth, or API
- No new runtime dependency
- No new domain IDs
- No fiscal or accounting profit
- No sample money
- No reading of «a la parte» as 50%
- No claim that feed delivery is measured
- No claim that herd presence is controlled
- No claim that intrusion is addressed
- No promotion of cameras, sensors, RFID, or GPS
- No GIS
- No formal current paddock names
- No event-sourcing description of “capture once”
- No replacement-compensation rule
- No deletion of animal history

## Honesty that the panel must keep

- Feed: purchased, prepared, declared delivered, measured delivered, physical remainder. Sources: declarado, observado, medido. Family line: «Declaración estructurada + evidencia» and «Entrega física medida: investigar».
- Profit: «Lectura económica provisional». Can list known income, purchase, freight, direct costs, assigned costs, unassigned costs, provisional margin, completeness and quality. Cannot claim the rancher’s final share, fiscal profit, a reliable cost per kilogram gained while feed is unreliable, or partner settlement.
- Presence: «Última vez observado» versus «Verificación completa del hato», with method and cadence pending. The 1–2 week gap is not treated as solved.
- Intrusion: desired control, effectiveness «No atendido».
- Tenure: propio del rancho, a la parte, tercero, desconocido. Participation: conocida, parcialmente conocida, desconocida.
- Parentage: observado, inferido, desconocido. Inference reasons when documented: parto observado, reporte del trabajador, único toro presente, desconocido. One bull is not a confirmed father.
- Exit: venta, muerte, faltante confirmado, otra salida, desconocido. History remains.
- Place: animal or group, expected paddock, effective from. Unknown stays valid. Wording: aproximadamente 8 potreros conocidos/identificados.
- Capture once, where the catalog already uses it: weighing, feed purchase, birth.

## Validation criteria

- `npm run lint:map` and `npm run build:map` pass
- AS-IS still loads and selects a process
- TO-BE loads 19 process nodes and no placeholder
- Critical strip, effectiveness, family, expand/collapse, and horizon filter work
- Pending method and conditional milk are visible
- Feed, profit, intrusion, and paddocks stay within the wording above
- The first view is not a wall of 52 options
- Architecture remains a placeholder
