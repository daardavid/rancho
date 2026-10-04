# Diseño TO-BE v0.2

Modelo deseado del rancho, a nivel de dominio, después de la auditoría de la v0.1. No es el mapa interactivo, no es arquitectura y no es un alcance aprobado.

El hoy sigue en [../as-is/README.md](../as-is/README.md) y en [../../domain/README.md](../../domain/README.md). El plan de esta corrección es [../../plans/005-to-be-refinement-v0.2.md](../../plans/005-to-be-refinement-v0.2.md). Las familias están en [solution-families.md](solution-families.md).

La pestaña TO-BE de `apps/domain-map` sigue vacía a propósito.

## Cómo leer la cadena

| Nivel | Pregunta | Dónde |
| --- | --- | --- |
| Dolor | ¿Qué está débil hoy? | [../../domain/pain-points.md](../../domain/pain-points.md) |
| Capacidad | ¿Qué necesita poder hacer el rancho? | [target-capabilities.md](target-capabilities.md) |
| Proceso | ¿Cómo debería operar? | [target-process-catalog.md](target-process-catalog.md) |
| Familia | ¿Qué se muestra primero? | [solution-families.md](solution-families.md) |
| Opción | ¿Con qué mecanismo? | [solution-catalog.md](solution-catalog.md) |
| Elección futura | ¿Cómo se decidirá? | [decision-framework.md](decision-framework.md) |

Un evento operativo se captura una sola vez y puede producir varios hechos. Desconocido es un estado válido. `CAP-DATA-002`, `CAP-COMM-001` y `CAP-CONN-001` son transversales: calidad, canal y señal. No se dibujan como operaciones junto al pesaje o la venta.

## Efectividad

La v0.1 decía cubierto cuando había un enlace. Esta versión usa otra escala. Tener una opción no sube el dolor de escalón.

| Efectividad | Significado |
| --- | --- |
| SUBSTANTIALLY CONTROLLED | El paquete mínimo, si se hace, cambia el resultado de negocio de ese dolor en este hato. |
| PARTIALLY CONTROLLED | Una parte queda usable. Otra parte importante sigue abierta. |
| VISIBILITY IMPROVED ONLY | Se puede archivar o ver el hecho. No se puede comprobar ni decidir con él. |
| NOT ADDRESSED | Ninguna opción adoptada cambia el resultado. |
| CONDITIONAL | Solo si vuelve una actividad que hoy no opera. |

| Pain | Severity | Capabilities | Process | Family | Effectiveness | Remaining exposure |
| --- | --- | --- | --- | --- | --- | --- |
| PP-FEED-001 | Crítica | CAP-FEED-001. CAP-FEED-002 bloqueada | TGT-FEED-001 | FAM-FEED-001 | VISIBILITY IMPROVED ONLY | Compra y dicho. La entrega medida no está. 1.0 contra 1.5 kg no se prueba. OQ-FEED-002 sigue abierto. |
| PP-FIN-001 | Crítica | CAP-FIN-001, CAP-OWN-001 | TGT-SALE-001, TGT-EXPENSE-001, TGT-PUR-001, TGT-PROFIT-001 | FAM-SALE-001, FAM-FIN-001, FAM-PROFIT-001 | PARTIALLY CONTROLLED | Hay ingreso y costos conocidos. La parte del ranchero no se calcula. El costo por kilo espera alimento confiable. La lectura provisional es deseable, no el arranque. |
| PP-SEC-001 | Crítica | CAP-SEC-001, CAP-LIFE-001, CAP-LAND-001 | TGT-HERD-VERIFY-001, TGT-SEC-001, TGT-ANIMAL-EXIT-001 | FAM-SEC-001, FAM-LIFE-001 | VISIBILITY IMPROVED ONLY | Última observación en la manga. Método y cadencia de la verificación del hato: pendientes. El plazo de 1–2 semanas no se da por bajado. |
| PP-ID-001 | Alta | CAP-ID-001 | TGT-ANIMAL-001, TGT-BIRTH-001 | FAM-ID-001 | PARTIALLY CONTROLLED | La ficha sobrevive al arete. La marca física sigue sin elegir. |
| PP-DATA-001 | Alta | CAP-DATA-001, CAP-LIFE-001 | Nacimiento, pesaje, salida, sanidad | FAM-ID-001, FAM-WEIGH-001, FAM-LIFE-001 | PARTIALLY CONTROLLED | Esos eventos pueden quedar. No todo hecho del campo está en el mínimo. |
| PP-DATA-002 | Alta | CAP-DATA-002 | Atributo de cada evento | FAM-DATA-001 | PARTIALLY CONTROLLED | Declarado, observado y medido se distinguen. Un dicho puede seguir siendo falso. |
| PP-GROW-001 | Alta | CAP-GROW-001 | TGT-WEIGH-001 | FAM-WEIGH-001 | SUBSTANTIALLY CONTROLLED | Serie y hueco de becerros. Quién entra a la rutina sigue en OQ-OWN-003. |
| PP-FIN-002 | Media | CAP-FIN-002 | TGT-EXPENSE-001 | FAM-FIN-001 | PARTIALLY CONTROLLED | El ticket se clasifica cuando se puede. OQ-FIN-001 sigue abierto. |
| PP-INV-001 | Media | CAP-INV-001 | TGT-INV-001 | FAM-INV-001 | PARTIALLY CONTROLLED | El conteo físico de ingredientes entra al mínimo. El saldo teórico hereda salidas declaradas. |
| PP-SEC-002 | Alta | CAP-SEC-001 | TGT-SEC-001, TGT-HERD-VERIFY-001 | FAM-SEC-001 | VISIBILITY IMPROVED ONLY | Ver a un becerro en la manga no es verificar el hato. |
| PP-SEC-003 | Alta | CAP-SEC-002 | TGT-SEC-002 | FAM-SEC-002 | NOT ADDRESSED | El control deseado existe. La implementación no está elegida. |
| PP-HEALTH-001 | Media | CAP-HEALTH-001 | TGT-HEALTH-001 | FAM-HEALTH-001 | PARTIALLY CONTROLLED | La nota existe como deseable. No hay calendario. |
| PP-REPRO-001 | Media | CAP-REPRO-001 | TGT-BIRTH-001, TGT-REPRO-001 | FAM-REPRO-001 | PARTIALLY CONTROLLED | El nacimiento crea la ficha. El padre inferido no es paternidad confirmada. |
| PP-MILK-001 | Media | CAP-MILK-001 | TGT-MILK-001 | FAM-MILK-001 | CONDITIONAL | Fuera del flujo inicial. |
| PP-CONN-001 | Media | CAP-CONN-001 | Condición del registro | FAM-CONN-001 | PARTIALLY CONTROLLED | Se asienta después. Un aviso urgente sigue necesitando señal. |
| PP-GOV-001 | Alta | CAP-GOV-001, CAP-COMM-001 | TGT-GOV-001 | FAM-GOV-001 | PARTIALLY CONTROLLED | El aviso crítico entra al mínimo. El resumen semanal es deseable. Su verdad depende de los otros registros. |

## Paquete mínimo útil — operación actual

Para aproximadamente 21 cabezas. Es el conjunto más chico que empieza a dejar información de gestión usable. No incluye todo lo que tiene `recommendedNow: yes`.

- Identidad interna del animal (`SOL-ID-001`).
- Tenencia conocida o explícitamente desconocida, y participación económica conocida, parcial o desconocida (`CAP-OWN-001`). Sin interpretar «a la parte».
- Cada número marcado como declarado, observado o medido (`SOL-DATA-001`).
- Sesión de pesaje de becerros: una fila deja peso, identidad y última observación (`SOL-GROW-001`, `SOL-GROW-004`, `SOL-SEC-002`).
- El nacimiento crea la ficha (`SOL-REPRO-001`). El padre puede quedar desconocido.
- Ingreso conocido de la venta, sin margen (`SOL-SALE-001`).
- Costo de compra y flete (`SOL-PUR-001`).
- Gasto con ticket o nota (`SOL-FIN-002`, `SOL-FIN-001`).
- Compra de alimento como cantidad comprada y entrada de bodega, en el mismo evento.
- Conteo físico simple de ingredientes (`SOL-INV-001`, solo el conteo).
- Salida del activo cuando se conoce el hecho, con motivo incluso desconocido (`SOL-LIFE-001`). La venta no se captura dos veces.
- El propietario asienta después, con teléfono, WhatsApp, foto o audio (`SOL-COMM-001`, `SOL-CONN-001`).
- Aviso solo por faltante confirmado o problema grave de un animal (`SOL-GOV-002`).

El lugar puede quedar desconocido. La verificación del hato no entra, porque su método sigue pendiente.

## Deseable ahora, no necesario para empezar

- Fotos como evidencia (`SOL-ID-002`, `SOL-DATA-002`, `SOL-GROW-002`, `SOL-FEED-002`).
- Nota sanitaria básica (`SOL-HEALTH-001`).
- Padre inferido por el único toro, con el motivo a la vista (`SOL-REPRO-002`).
- Saldo teórico de bodega, mostrando la calidad de las salidas.
- Resumen semanal (`SOL-GOV-001`).
- Preparación y entrega declarada de alimento (`SOL-FEED-001`). No es entrega medida.
- Lugar esperado cuando se sepa (`SOL-LAND-001`).
- Lectura económica provisional (`SOL-FIN-003`): margen de lo asignado, bolsa no asignada, completitud, calidad, parte del ranchero no calculable.

## Fuera del paquete inicial

- RFID, GPS, báscula conectada, dosificación automática.
- Cámaras, luz como proyecto, sensores de perímetro.
- Aplicación para trabajadores e integración de mensajería.
- Leche.
- Contabilidad fiscal, finiquito del socio, costo por kilogramo ganado con alimento no confiable.
- Comparación de estrategias de alimento (`CAP-FEED-002`, bloqueada).
- Internet de sitio y captura de campo sin conexión, como diseño.

## Preguntas

Siguen en [../../domain/open-questions.md](../../domain/open-questions.md) y, las de diseño, en [decision-framework.md](decision-framework.md). Esta versión no las cierra. Las que bloquean una implementación posterior, y no el hecho de guardar «desconocido», son sobre todo `OQ-OWN-001`, `OQ-OWN-002` en su parte económica, `OQ-FEED-002`, `OQ-TRADE-001`, `OQ-SCALE-001` y `DQ-FIN-003`. `OQ-COUNT-001` y `OQ-SEC-001` dejan la presencia del hato y la intrusión sin método elegido.

## Estado del documento

- Versión: 0.2
- Estado: Diseño de dominio, no alcance aprobado
- Última actualización: 2026-10-03
- Fuente: `docs/domain` v0.1, AS-IS v0.2 y la auditoría de TO-BE v0.1
- Validación: Pendiente de validación iterativa con el propietario del rancho
