# 003 — AS-IS refinement v0.2

## Objective

Correct the current-state map after the QA of v0.1 (`9721a71`). The map still describes what the ranch does today. It does not design the future system.

`docs/domain` wins wherever this plan and an earlier sketch could disagree.

## Problems found by QA

- Feeding, calf weighing, and health were drawn as steps that lead to the sale. The interviews describe them as concurrent work during fattening.
- Identification was drawn as a gate after arrival. It is an ongoing, informal way of recognizing animals.
- One security card hid late discovery of a missing animal and undetected physical intrusion.
- The bodega was labeled Inventario and “Vigente, informal,” which can be read as a stock-control process. The ranch has a closed storeroom and no formal stock control.
- Finance, the storeroom, and field communication had no visible relationship to the cattle work.
- Egresos stated that fuel is used mainly in pickups and tractors. The domain glossary only uses combustible as an example of an operating expense.
- Monta listed “gestaciones conocidas de manera informal.” The interviews support informal parentage, one bull, and no genealogical record.
- Fire and burns were filed under security. They are an environmental open question.
- The filter Crecimiento named an analysis that does not exist. The current practice is calf weighing.
- Cards showed a pain count, including “0 dolores,” and hid whether the initial assessment was crítica, alta, or media.
- The catalog and the app disagreed on the finance title, the security title, the partner on a purchase, and the surrounding roads.
- The root README still described five scaffolding nodes.
- Arrival weighing was easy to miss, and it must stay an unconfirmed preference.

## Semantic changes to the graph

Strict sequences, and only these:

- Compra de ganado → Transporte → Llegada y descanso
- Monta natural → Parto

After arrival, these current activities sit together as concurrent fattening work. No arrows among them, and no arrows from them into the sale:

- Identificación
- Alimentación
- Pesaje de becerros
- Vacunas, medicamentos y baños
- Pastoreo en potreros

Venta de becerros stays in the calf section as the commercial exit. It is not the result of completing feeding, weighing, and health.

Pastoreo keeps its own process id and its land uncertainty. It moves into the calf section so grazing is visibly part of current fattening, not a later step. The separate one-node terreno frame goes away.

Security splits the former combined card:

- `PROC-SEC-001` is narrowed to late discovery of a missing animal and the lack of a frequent herd check (`PP-SEC-001`, `PP-SEC-002`).
- `PROC-SEC-002` is new: fenced perimeter, and no automatic notice when the fence is cut or cattle are taken out (`PP-SEC-003`).

No node is added for completed fattening, birth registration, cameras, growth curves, fuel control, or fire.

## Edge semantics

| Kind | Meaning | Drawing |
| --- | --- | --- |
| Sequence | The interviews support that this happens after the previous one. | Solid line, arrow. |
| Association | The things are related. No order and no cause is claimed. | Dashed line, no arrow. |

Sequence edges:

- `PROC-PUR-001` → `PROC-TRANS-001`
- `PROC-TRANS-001` → `PROC-REC-001`
- `PROC-REP-001` → `PROC-BIRTH-001`

Association edges:

- `PROC-BIRTH-001` — `PROC-ID-001` (a calf is then present; recognition stays informal)
- `PROC-INV-001` — `PROC-FEED-001`
- `PROC-FIN-001` — `PROC-PUR-001`
- `PROC-FIN-001` — `PROC-FEED-001`
- `PROC-SALE-001` — `PROC-FIN-001`
- `PROC-COMM-001` — the calf-cycle section, one line for the whole operation

No edge from arrival to recurring calf weighing. No edge from feeding, weighing, or health to the sale.

A short legend in the AS-IS view names the two line styles.

## Visual changes

- The purchase chain is the only arrowed path in the calf section.
- Concurrent work is one row, with no arrows between the cards.
- The sale sits apart from that row and apart from the purchase chain.
- A one-line note on the calf section states that the rest happens alongside and that the sale is the commercial exit.
- The security section shows two cards and states that a missing animal and an entry are different problems.
- Storeroom, money, and communication stay in their own sections, linked only by dashed lines.
- The repeated “Engorda” label comes off the cards. The section title already says it. A restrained category color can remain.
- Single-card frames stay only where the topic is genuinely separate, and they shrink to the card.
- Handle dots are hidden. The lines remain.

## Wording changes

| Current | v0.2 |
| --- | --- |
| Egresos y comprobantes | Gastos, nómina y tickets |
| Salud | Vacunas, medicamentos y baños |
| Bodega de insumos | Bodega, sin control de existencias |
| Section Inventario / insumos | Bodega / insumos |
| Category label Inventario | Bodega |
| Perímetro y hato | Two cards: Ganado que se nota tarde; Cerco, sin aviso de entrada |
| Vigente | Se hace |
| Vigente, informal | Se hace, sin registro |
| Filter Crecimiento | Pesaje |
| Sin kardex descrito | Sin control de existencias |
| Gestaciones conocidas de manera informal | Parentesco informal, un solo toro, sin registro genealógico |

Cards with pain points show the highest initial severity, labeled “Evaluación inicial.” The count is secondary and disappears when nothing is linked. Severity does not repaint the map.

Llegada y descanso keeps a visible warning: weighing on arrival is desirable, and the current practice still needs validation.

Fuel stays only as the glossary example of an operating expense. Pickups, tractors, and an undescribed fuel-control process come out.

`OQ-FIRE-001` moves from security to Pastoreo. No fire process is added.

Compra names the partner when the animal enters «a la parte». The perimeter card keeps the approximate five accesses and three surrounding roads from the ranch context. It does not mention cameras or sensors.

## Files expected to change

- `docs/plans/003-as-is-refinement-v0.2.md`
- `docs/maps/as-is/README.md`
- `docs/maps/as-is/process-catalog.md`
- `docs/domain/README.md` (version pointer only)
- `README.md` (replace the scaffolding sentence)
- `apps/domain-map/src/types/map.ts`
- `apps/domain-map/src/data/asIsProcesses.ts`
- `apps/domain-map/src/data/asIsMap.ts`
- `apps/domain-map/src/features/maps/components/AsIsMap.tsx`
- `apps/domain-map/src/features/maps/components/ProcessNode.tsx`
- `apps/domain-map/src/features/maps/components/SectionNode.tsx`
- `apps/domain-map/src/features/maps/components/DetailPanel.tsx`
- `apps/domain-map/src/styles/app.css`

No new dependencies. Pain-point texts copied from `docs/domain` stay as they are.

## Validation criteria

- Lint and production build pass.
- The only solid arrows in acquisition are Compra → Transporte → Llegada.
- Monta → Parto is the other solid sequence.
- Feeding, weighing, and health have no arrow into the sale.
- The sale remains visible as the commercial exit.
- Parto links to identification with a dashed line.
- Security shows two current problems and no camera or sensor node.
- The bodega does not read as a working inventory process.
- Feed quantities, «a la parte», connectivity, paddocks versus hectares, and arrival weighing stay unresolved.
- Milk is not a node.
- Workers are not application users.
- The pickup/tractor fuel sentence is gone.
- The empty panel explains current state, both line styles, open ambiguities, and historical milk.
- The catalog and the app use the same titles, actors, and open-question links.
- TO-BE and ARCHITECTURE stay empty placeholders.

## Non-goals

- TO-BE solutions, technology choices, and architecture.
- Backend, database, authentication, or APIs.
- New packages.
- Answering open questions, including feed reconciliation, «a la parte», and arrival weighing.
- A growth-analytics process, a birth-record process, a fuel-control process, or a fire process.
- Cameras, sensors, Starlink, an internal tag, or a worker-facing app.
- Treating workers as application users.
- Rewriting `docs/domain` beyond the map version pointer.
