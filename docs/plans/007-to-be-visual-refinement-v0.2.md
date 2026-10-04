# 007 — TO-BE visual refinement v0.2

## Objective

Make the existing TO-BE map easier to read, explore, and use for a decision. The domain model stays as approved for this stage. This plan does not add or remove capabilities, processes, pains, families, or options, and it does not change effectiveness or recommendations.

The screen inspected before this change fits all 19 processes into the canvas, shrinks the titles, and keeps a detail column, a tall principles band, two filter rows, and a legend above the map even when nothing is selected.

## Current visual problems

- `fitView` on every node makes primary titles too small at a normal desktop size.
- The detail column reserves roughly 28% of the width while it only shows “Cómo leer el mapa”.
- The critical-pain strip leads with `PP-*` ids and wraps into tall cards.
- The transversal band spends several lines on text that should start as one row.
- Horizon, area, and the edge legend each take their own strip.
- Process cards mix a catalog title with pain names. The card tries to preview the process instead of naming the job.
- Groups sit in a compact grid. Entry, operation, sale, support, and conditional milk do not read as one operating picture.
- A selected process dumps objective, pains, families, and open questions in one scroll. Comparing alternatives means opening each option.
- Effectiveness colors lean on red and green. The words should do the work, with “Evaluación inicial” still visible.

## Progressive disclosure

| Layer | What stays in view | What opens on demand |
| --- | --- | --- |
| Map card | Horizon, ranch-language title, one outcome or exposure line | Objective, steps, facts, capabilities, pains |
| Empty map | Almost the full width | “Cómo leer”, in a side panel |
| Principles | One row | The four-point explanation and the transversal families |
| Solution family | Primary approach and at most two alternatives | Shelves, and a comparison of those visible options |
| Detail panel | Sticky title and three tabs | Proceso, Soluciones, Pendientes |

No accordion library and no drawer library. Local React state only.

## Map space

The map is the protagonist. With nothing selected, the side panel is not mounted, so it does not reserve its width. A toolbar button, “Cómo leer”, opens that text.

The first viewport frames Alta / identidad, Operación ganadera, and Reproducción at a zoom that keeps card titles readable. Finance, warehouse, security, gestión, and milk may sit outside that frame. Pan, the minimap, and the fit control remain. The fit control keeps a readable zoom floor instead of shrinking all 19 cards.

## Detail panel

Closed until a process or group is selected, or until help is opened.

When open, the panel is about 32% of the width, capped so a wide monitor does not give it an equal column. The map stays beside it. The panel scrolls on its own. The header, including the tabs, stays pinned to the top of that scroll. “Cerrar” hides the panel and does not change domain data. Clicking the empty canvas also clears the selection.

Help uses the same panel. It holds the previous empty-state explanation.

## Toolbar and filters

One toolbar:

- Horizonte: Todos, Mínimo útil, Deseable, Pendiente, Condicional
- Área: a single menu, default Todas
- Restablecer, Leyenda, Cómo leer

The legend is a popover. Filtering still dims unrelated nodes and does not change data. Restablecer clears horizon, area, and the critical-pain highlight, and returns to the general frame.

## Focus

When a horizon, an area, or a critical pain is active, matching nodes stay fully visible and the others dim. The viewport then frames the matching processes, with a zoom floor so the titles do not collapse. Examples: Alimentación frames the feed purchase and the warehouse entry (and any other process already tagged to that area). Rentabilidad frames purchase, expense, sale, and the provisional reading.

Motion stays short. The general frame is the obvious way back, through Restablecer or Todos / Todas with the pain cleared.

Selecting a process while the panel is closed pans that card into view at the current zoom, so the opening panel does not cover it.

## Solution comparison

Inside a selected family, “Comparar alternativas” compares the primary approach and at most two visible alternatives. It does not list the other shelves and it does not score them.

The table rows are qualitative: tipo, costo, complejidad, fricción operativa, confiabilidad del dato, dependencia humana, dependencia de conectividad, dependencia de hardware, escalabilidad, auditabilidad, viabilidad actual.

Under the table, each compared option can still be opened for description, how it helps, pros, cons, rationale, and questions. Shelves stay collapsed: Recomendado ahora, Investigar, A escala, No recomendado ahora. Every `SOL-*` remains reachable from some family.

## Ranch-owner wording

Card titles are presentation labels. Catalog titles and stable ids stay in the panel. The card does not restate the whole objective.

Examples of the card title, with the catalog title kept as metadata:

- Entrada económica del ganado comprado → Registrar compra, costo y flete
- Salida del activo → Registrar salida del ganado
- Gasto con comprobante y clase de gestión → Registrar gasto y ticket
- Filiación que permanece → Anotar madre y padre

“Lectura económica provisional” stays visible. So do “declarado no es medido”, “no verifica a todo el hato”, “no atendido”, “condicional”, and “a la parte” left uninterpreted.

## Critical pains and principles

The strip stays visible and becomes one compact row. Primary words: Alimentación, Rentabilidad, Faltantes de ganado. Secondary words: Solo mejora visibilidad, Control parcial, Solo mejora visibilidad. The `PP-*` id is metadata. Clicking still highlights the related processes. “Evaluación inicial” stays on the strip.

The principles row, collapsed: “Principios de todo evento: Declarado / Observado / Medido · Evidencia · Canal conocido · Tolera captura posterior”, plus “Ver detalles”.

Effectiveness is a restrained chip with the words. It is not a red / yellow / green status.

## Spatial arrangement

Position and grouping carry the story. No new edges.

- Reproducción sits on the entry side. Birth is above the later parentage correction. The existing sequence edge stays inside that group.
- Alta / identidad sits beside it. The exit card is the right-hand card of that group.
- Operación ganadera is the center, under identity.
- Finanzas sits under that operation. Sale is the right-hand card, so the commercial exit lines up with the lifecycle exit without a new arrow.
- Bodega / alimentación sits under reproduction, as support. The existing dashed association stays between purchase and warehouse entry.
- Presencia / seguridad and Gestión sit along the bottom as cross-cutting support.
- Leche stays in a dashed frame, separated from the main column, labeled Condicional.

## Files expected to change

- `docs/plans/007-to-be-visual-refinement-v0.2.md`
- `docs/maps/to-be/README.md` (how the screen behaves)
- `apps/domain-map/src/styles/app.css`
- `apps/domain-map/src/types/toBe.ts` (card presentation fields only)
- `apps/domain-map/src/data/toBe/toBePresentation.ts` (new, labels only)
- `apps/domain-map/src/data/toBe/toBeMap.ts` (placement and card copy)
- `apps/domain-map/src/features/maps/components/ToBeMap.tsx`
- `apps/domain-map/src/features/maps/components/ToBeProcessNode.tsx`
- `apps/domain-map/src/features/maps/components/ToBeFilters.tsx`
- `apps/domain-map/src/features/maps/components/ToBeDetailPanel.tsx`
- `apps/domain-map/src/features/maps/components/CriticalPainStrip.tsx`
- `apps/domain-map/src/features/maps/components/TransversalBand.tsx`
- `apps/domain-map/src/features/maps/components/SolutionFamilyCard.tsx`

AS-IS components, AS-IS data, and domain catalogs are not part of the change.

## Explicit non-goals

- No new or removed `CAP-*`, `TGT-*`, `FAM-*`, `SOL-*`, or `PP-*`
- No change to pain effectiveness, family recommendations, or option recommendations
- No new ranch fact, and no reading of «a la parte» as a share
- No hardware promoted, and no open question closed
- No architecture, backend, database, or new dependency
- No new sequence arrows
- No change to AS-IS meaning or AS-IS behavior

## Regression checklist

- AS-IS loads, selects, filters, keeps its edges, and keeps a readable detail panel
- TO-BE still renders the same 19 processes and the same two edges
- Feed stays declared rather than measured
- Profit stays a provisional reading, not accounting profit or the rancher’s share
- Last observation is not a herd verification
- Intrusion stays “No atendido”
- Milk stays conditional and visually apart
- Inferred parentage is not confirmed parentage
- «A la parte» is not interpreted
- All 52 options remain reachable
- `npm run lint:map` and `npm run build:map` pass
