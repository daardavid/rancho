# Familias de opciones

Capa de presentación del [catálogo](solution-catalog.md). Las fichas `SOL-…` de la v0.1 siguen. Esta v0.2 añade tres, porque el catálogo anterior no tenía dónde registrar la venta, la salida ni el lugar esperado: `SOL-SALE-001`, `SOL-LIFE-001`, `SOL-LAND-001`.

Una familia no es una decisión. En una lectura inicial, un proceso muestra un camino principal y como mucho dos alternativas. El resto queda en su estante: recomendado ahora, investigar, escala, o no recomendado ahora.

Los estantes no son excluyentes. Una opción puede servir ahora y también más adelante. El paquete mínimo es un subconjunto del recomendado ahora. El detalle está en [README.md](README.md).

## FAM-ID-001 — Identidad

- Ahora, principal: `SOL-ID-001`
- Alternativa visible: `SOL-ID-002`, foto de apoyo, deseable y no necesaria para abrir la ficha
- Investigar: `SOL-ID-003`
- Escala: `SOL-ID-005`
- No recomendado ahora: `SOL-ID-004`

## FAM-OWN-001 — Tenencia y participación

No tiene una opción aparte. Vive en `SOL-ID-001` y en `TGT-ANIMAL-001`, `TGT-PUR-001` y `TGT-BIRTH-001`.

La tenencia puede ser del rancho, «a la parte», de un tercero o desconocida. La participación económica puede ser conocida, parcial o desconocida. El relato verbal se guarda como nota. No se traduce a un porcentaje.

## FAM-LIFE-001 — Salida del activo

- Ahora, principal, y en el paquete mínimo: `SOL-LIFE-001`
- La venta no es una segunda captura: `TGT-SALE-001` produce también el hecho de salida con motivo venta

## FAM-LAND-001 — Lugar esperado

- Ahora, deseable, no exigido para empezar: `SOL-LAND-001`
- Desconocido es un estado válido
- No hay alternativa de GPS en esta familia. `SOL-SEC-004` sigue en `FAM-SEC-001` como rastreo no recomendado

## FAM-WEIGH-001 — Pesaje de becerros

- Ahora, principal: `SOL-GROW-001` con `SOL-GROW-004`, una sola fila por becerro
- Alternativa visible: `SOL-GROW-002`, foto del indicador, deseable
- Investigar: `SOL-GROW-003`
- El mismo evento deja la última observación. Eso no abre `FAM-SEC-001` como formulario extra

## FAM-FEED-001 — Alimento

- Ahora, en el mínimo: la compra, como cantidad comprada con su calidad, junto con la entrada de bodega
- Deseable: preparación y entrega declarada de `SOL-FEED-001` y `SOL-FEED-002`. Siguen siendo declaración estructurada y evidencia, no entrega verificada
- Investigar: `SOL-FEED-003`, cantidad medida
- Escala: `SOL-FEED-004`, `SOL-FEED-005`
- No recomendado ahora: `SOL-FEED-006`, bloqueado con `CAP-FEED-002`

## FAM-INV-001 — Bodega

- Ahora, en el mínimo: conteo físico de ingredientes dentro de `SOL-INV-001`
- Deseable: saldo teórico del mismo `SOL-INV-001`, solo si las salidas dicen su calidad
- No recomendado: `SOL-INV-002`

## FAM-FIN-001 — Gastos

- Ahora, principal: `SOL-FIN-002`
- El efectivo sin ticket es el mismo hábito: `SOL-FIN-001`
- No recomendado ahora: `SOL-FIN-004`

## FAM-PUR-001 — Compra de ganado

- Ahora, principal: `SOL-PUR-001`
- Investigar: `SOL-PUR-002`

## FAM-SALE-001 — Ingreso de venta

- Ahora, principal, y en el paquete mínimo: `SOL-SALE-001`
- No calcula margen ni parte del socio

## FAM-PROFIT-001 — Lectura provisional

- Deseable ahora, fuera del mínimo: `SOL-FIN-003`
- Muestra margen provisional, costos asignados, bolsa no asignada, completitud y calidad
- La parte del ranchero queda desconocida
- No calcula utilidad fiscal, finiquito del socio, ni costo por kilo mientras el alimento no sea confiable

## FAM-SEC-001 — Presencia

- Hecho derivado, no un segundo registro: `SOL-SEC-002`, última observación en un manejo
- Investigar, método aún no elegido: `SOL-SEC-001`. `TGT-HERD-VERIFY-001` deja método y cadencia en validación pendiente
- Escala: `SOL-SEC-003`
- No recomendado ahora: `SOL-SEC-004`

## FAM-SEC-002 — Intrusión

El control deseado existe. La implementación no está elegida. Ninguna opción es principal.

- Investigar: `SOL-SEC-005`, `SOL-SEC-006`, `SOL-SEC-007`, `SOL-SEC-009`
- No recomendado ahora: `SOL-SEC-008`
- `PP-SEC-003` sigue sin abordar

## FAM-HEALTH-001 — Sanidad

- Deseable: `SOL-HEALTH-001`
- No recomendado ahora: `SOL-HEALTH-002`

## FAM-REPRO-001 — Nacimiento y filiación

- Ahora, en el mínimo: `SOL-REPRO-001`, el mismo evento que crea al animal
- Deseable: `SOL-REPRO-002`, inferencia por el único toro, nunca paternidad confirmada
- No recomendado ahora: `SOL-REPRO-003`

## FAM-DATA-001 — Calidad del dato

Transversal. No es un nodo de operación.

- En el mínimo: `SOL-DATA-001`
- Deseable: `SOL-DATA-002`

## FAM-COMM-001 — Canal

Transversal. No es un nodo de operación.

- En el mínimo, como forma de capturar: `SOL-COMM-001`
- No recomendado ahora: `SOL-COMM-002`, `SOL-COMM-003`

## FAM-CONN-001 — Tolerancia a la señal

Transversal. No es un nodo de operación.

- En el mínimo: `SOL-CONN-001`
- Investigar: `SOL-CONN-002`
- No recomendado ahora: `SOL-CONN-003`

## FAM-GOV-001 — Gestión

- En el mínimo: `SOL-GOV-002`, aviso solo de lo crítico
- Deseable: `SOL-GOV-001`, resumen semanal

## FAM-MILK-001 — Leche

Condicional. Fuera del paquete inicial.

- No recomendado ahora: `SOL-MILK-001`, `SOL-MILK-002`

## Estado del documento

- Versión: 0.2
- Estado: Diseño de dominio, no alcance aprobado
- Última actualización: 2026-10-03
- Fuente: TO-BE v0.1 y el plan [005](../../plans/005-to-be-refinement-v0.2.md)
- Validación: Pendiente de validación iterativa con el propietario del rancho
