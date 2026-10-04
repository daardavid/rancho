# 002 — AS-IS process map v0.1

## Objective

Replace the five scaffolding nodes in `apps/domain-map` with the first current-state map of the ranch. The source of truth is `docs/domain`. This version describes what the ranch does today. It does not design the future system.

## Conflict with the task sketch

Where the task sketch and `docs/domain` disagree, the domain documents win.

- "Seguimiento de crecimiento" is not a current process. Calves are weighed and weights have been written by hand. Gain curves, comparisons, and below-expectation detection are desired and do not exist (`PP-GROW-001`). `PROC-GROW-001` is therefore **Pesaje de becerros**, not an analytics step.
- Historical milking stays off the active map. A `historical_inactive` node would still sit beside current work and is easier to misread. `PP-MILK-001` remains in the pain-point data and is intentionally not attached to a drawn process.
- "Operación de engorda" is not its own process. Feeding, calf weighing, and health happen during fattening; they are not a sequence with a parent step. They sit in one section.
- Arrival is not a receiving checklist. The interview says purchased cattle arrive stressed and may rest before weighing, and that weighing them on arrival is a preference. `PROC-REC-001` stops there.

## Information architecture

Seven sections. Fourteen process nodes. No milk node. No worker-application node. No camera node.

| Section | Processes |
| --- | --- |
| Ciclo del becerro / engorda | `PROC-PUR-001`, `PROC-TRANS-001`, `PROC-REC-001`, `PROC-ID-001`, `PROC-FEED-001`, `PROC-GROW-001`, `PROC-HEALTH-001`, `PROC-SALE-001` |
| Reproducción | `PROC-REP-001`, `PROC-BIRTH-001` |
| Inventario / insumos | `PROC-INV-001` |
| Finanzas | `PROC-FIN-001` |
| Seguridad | `PROC-SEC-001` |
| Terreno / potreros | `PROC-LAND-001` |
| Información / comunicación | `PROC-COMM-001` |

Primary edges:

- Compra → Transporte → Llegada → Identificación
- Monta natural → Parto → Identificación
- Identificación connects to Alimentación, Pesaje de becerros, and Salud as concurrent current work, not as a pipeline
- Those three connect to Venta as the commercial exit, not as "weighing causes the sale"

Bodega, potreros, dinero, and comunicación stay in their own sections. Their link to the calf cycle is described on the node. Extra edges would invent a sequence.

## Status semantics

| Status | Meaning on this map |
| --- | --- |
| `current` | The activity happens today and is described as a regular practice. |
| `current_informal` | The activity or situation is current, but there is no formal record or closed procedure. |
| `historical_inactive` | Reserved. Unused in v0.1 so historical milk is not drawn as a peer of current work. |

No `future` status. Future work stays in TO-BE.

## Pain-point traceability

Process nodes store `painPointIds` only. Titles, severity, impact, and evidence live once in application data copied from `docs/domain/pain-points.md`. The panel joins them. Severity is labeled **Evaluación inicial**.

`PP-MILK-001` is the only pain point with no process. Mapping it would require an active or historical milking node. The empty state says it is omitted on purpose.

## UI

- Spanish labels for ranch content.
- Node shows category, name, status, and pain-point count. Category uses a restrained border. Severity does not color the process node.
- Detail panel is about 28% of the AS-IS width and scrolls on its own. The map keeps the rest.
- Empty selection explains the map and the preserved uncertainties.
- Filters highlight matching processes and dim the others: Todos, Datos, Crecimiento, Alimentación, Finanzas, Inventario, Seguridad, Salud, Reproducción. They do not delete nodes.
- TO-BE and ARCHITECTURE stay placeholders.
- Pan, zoom, fit view, minimap, and selection stay. Connections still cannot be created or deleted. Positions are not saved.

## Files expected to change

- `docs/plans/002-as-is-map-v0.1.md`
- `docs/maps/as-is/README.md`
- `docs/maps/as-is/process-catalog.md`
- `docs/domain/README.md` (one correction: the app graph is no longer scaffolding)
- `README.md` (short link)
- `apps/domain-map/src/types/map.ts`
- `apps/domain-map/src/data/painPoints.ts`
- `apps/domain-map/src/data/openQuestions.ts`
- `apps/domain-map/src/data/asIsProcesses.ts`
- `apps/domain-map/src/data/asIsMap.ts`
- `apps/domain-map/src/features/maps/components/*`
- `apps/domain-map/src/styles/app.css`

No new dependencies.

## Non-goals

- TO-BE solutions, technology choices, and architecture.
- Backend, database, authentication, or APIs.
- Editable persistence.
- Answering open questions, including feed-quantity reconciliation and the meaning of «a la parte».
- Treating workers as application users.
- Drawing cameras, Starlink, formal birth records, growth analytics, or active milking.

## Validation checklist

- Lint and production build pass.
- AS-IS opens on real nodes. The five dummy titles are gone.
- Selection fills the Spanish panel, including pain points and open questions.
- The feed warning is visible on Alimentación.
- Milk is not an active node.
- Filters dim rather than delete.
- TO-BE and ARCHITECTURE are unchanged placeholders.
- No package manifest or lockfile change.
