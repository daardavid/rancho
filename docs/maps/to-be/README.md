# Diseño TO-BE v0.1

Modelo deseado del rancho, a nivel de dominio. No es el mapa interactivo, no es arquitectura y no es un alcance aprobado.

El hoy sigue en [../as-is/README.md](../as-is/README.md) y en [../../domain/README.md](../../domain/README.md). El plan de esta versión es [../../plans/004-to-be-domain-design-v0.1.md](../../plans/004-to-be-domain-design-v0.1.md).

La pestaña TO-BE de `apps/domain-map` sigue vacía a propósito.

## Cómo leer la cadena

| Nivel | Pregunta | Dónde |
| --- | --- | --- |
| Dolor | ¿Qué está débil hoy? | [../../domain/pain-points.md](../../domain/pain-points.md) |
| Capacidad | ¿Qué necesita poder hacer el rancho? | [target-capabilities.md](target-capabilities.md) |
| Proceso | ¿Cómo debería operar? | [target-process-catalog.md](target-process-catalog.md) |
| Opción | ¿Con qué mecanismo se podría habilitar? | [solution-catalog.md](solution-catalog.md) |
| Elección futura | ¿Cómo se decidirá? | [decision-framework.md](decision-framework.md) |

Una capacidad no es un proceso. Un proceso no es una pantalla. Una opción no es una decisión. Las puntuaciones cualitativas dicen **Evaluación inicial del proyecto**.

## Paquete inicial

Lectura para el hato de aproximadamente 21 cabezas. Bajo costo, poca o moderada fricción, sin hardware nuevo y sin exigir señal en el potrero. El propietario registra a partir de lo que ya recibe. Los trabajadores no son usuarios de una aplicación en esta etapa.

Esa lectura no está decidida. Se cae si `DQ-HABIT-001` muestra que el propietario no puede sostener el registro.

| Pieza | Opciones | Límite que no se cierra |
| --- | --- | --- |
| Identidad interna, con foto de apoyo | `SOL-ID-001`, `SOL-ID-002` | No se elige marca física. El SINIIGA sigue como atributo. |
| Declarado distinto de observado, con archivo del evento | `SOL-DATA-001`, `SOL-DATA-002` | Clasificar no vuelve verdadero un dicho. |
| Pesaje de becerros en serie, con foto del indicador y hueco visible | `SOL-GROW-001`, `SOL-GROW-002`, `SOL-GROW-004` | No se integra la báscula. Las vacas adultas no entran a la rutina. |
| Alimento por lote, de preferencia con evidencia | `SOL-FEED-001`, `SOL-FEED-002` | No se cuadran las cifras de `OQ-FEED-002`. La cantidad puede seguir siendo estimada. |
| Gasto con ticket o nota, y clase de gestión | `SOL-FIN-002`, `SOL-FIN-001` | No es contabilidad fiscal. El criterio exacto sigue abierto. |
| Costo de compra y flete | `SOL-PUR-001` | «Bulto» no se traduce. |
| Bodega simple de ingredientes y conteo | `SOL-INV-001` | El límite a la dieta es una propuesta, `DQ-INV-001`. |
| Nacimiento con ficha previa al arete, y padre supuesto | `SOL-REPRO-001`, `SOL-REPRO-002` | El padre no es prueba. No se exige el mismo día. |
| Nota sanitaria cuando el hecho ocurre | `SOL-HEALTH-001` | Sin calendario ni recordatorios. |
| Canal actual, registrado después | `SOL-COMM-001`, `SOL-CONN-001` | Sin API de WhatsApp y sin diseño de sincronización. |
| Revisión semanal y aviso solo crítico | `SOL-GOV-001`, `SOL-GOV-002` | La lista fina de urgencias sigue abierta. |
| Presencia de quienes ya pasan por un manejo | `SOL-SEC-002` | No cubre el hato que no entra a la manga y no detecta intrusión. |

## Ahora no, o solo investigar

RFID, GPS, dosificación automática, báscula de alimento conectada, integración de la báscula de ganado, cámaras, sensores, luz de accesos, internet de sitio, aplicación para trabajadores, API de mensajería, captura de campo sin conexión, recordatorios sanitarios, comparación de líneas, lectura de rentabilidad cerrada y cualquier opción de leche quedan fuera del paquete inicial.

El detalle de `yes`, `no` e `investigate` está en cada ficha. La intrusión se evaluó y no tiene opción recomendada para adoptar ahora (`OQ-SEC-001`).

## Cobertura de los 16 dolores

`covered` significa que el modelo tiene capacidad y al menos un camino. No significa que el dolor quede resuelto ni que la opción esté decidida.

`intentionally deferred` no se usó. Ningún dolor vigente se dejó fuera del modelo. Varios caminos de hardware sí quedaron fuera del paquete inicial.

`conditional` se reserva a la leche, que no es operación activa.

| Dolor | Estado | Capacidad | Proceso | Opciones que importan ahora |
| --- | --- | --- | --- | --- |
| `PP-ID-001` | covered | `CAP-ID-001` | `TGT-ANIMAL-001`, `TGT-BIRTH-001` | `SOL-ID-001`, `SOL-ID-002`. Marca y RFID no se adoptan. |
| `PP-DATA-001` | covered | `CAP-DATA-001` | `TGT-ANIMAL-001`, `TGT-BIRTH-001`, `TGT-WEIGH-001`, `TGT-HEALTH-001`, `TGT-REPRO-001` | Los registros del paquete inicial. |
| `PP-DATA-002` | covered | `CAP-DATA-002`, `CAP-COMM-001` | `TGT-COMM-001` | `SOL-DATA-001`, `SOL-DATA-002`, `SOL-COMM-001`. |
| `PP-GROW-001` | covered | `CAP-GROW-001` | `TGT-WEIGH-001` | `SOL-GROW-001`, `SOL-GROW-002`, `SOL-GROW-004`. Enlace electrónico en investigar. |
| `PP-FEED-001` | covered | `CAP-FEED-001`, `CAP-FEED-002` | `TGT-FEED-001` | `SOL-FEED-001`, `SOL-FEED-002`. Medir, conectar y dosificar no se adoptan. `CAP-FEED-002` no se calcula ahora. |
| `PP-FIN-001` | covered | `CAP-FIN-001` | `TGT-EXPENSE-001`, `TGT-PUR-001`, `TGT-SALE-001` | Captura de egreso y de costo de entrada. `SOL-FIN-003` no se recomienda: faltan reglas. |
| `PP-FIN-002` | covered | `CAP-FIN-002` | `TGT-EXPENSE-001` | `SOL-FIN-001`, `SOL-FIN-002`. |
| `PP-INV-001` | covered | `CAP-INV-001` | `TGT-INV-001` | `SOL-INV-001`. |
| `PP-SEC-001` | covered | `CAP-SEC-001` | `TGT-SEC-001` | Solo señal parcial, `SOL-SEC-002`. Conteo total, RFID y GPS no se adoptan. El plazo de detección no se promete. |
| `PP-SEC-002` | covered | `CAP-SEC-001` | `TGT-SEC-001` | La misma señal parcial. `OQ-COUNT-001` sigue abierta. |
| `PP-SEC-003` | covered | `CAP-SEC-002` | `TGT-SEC-002` | Ninguna opción queda en `yes`. Procedimiento, luz, cámara, sensor y combinación están en investigar o en no. |
| `PP-HEALTH-001` | covered | `CAP-HEALTH-001` | `TGT-HEALTH-001` | `SOL-HEALTH-001`. Sin recordatorio. |
| `PP-REPRO-001` | covered | `CAP-REPRO-001` | `TGT-BIRTH-001`, `TGT-REPRO-001` | `SOL-REPRO-001`, `SOL-REPRO-002`. Comparar líneas no es alcance inicial. |
| `PP-MILK-001` | conditional | `CAP-MILK-001` | `TGT-MILK-001` | `SOL-MILK-001`, `SOL-MILK-002`. Fuera del flujo inicial. |
| `PP-CONN-001` | covered | `CAP-CONN-001` | Condición de `TGT-COMM-001` y de los registros. No hay proceso de red. | `SOL-CONN-001`. Sincronización e internet de sitio no se diseñan ni se adoptan. |
| `PP-GOV-001` | covered | `CAP-GOV-001`, `CAP-COMM-001` | `TGT-GOV-001`, `TGT-COMM-001` | `SOL-COMM-001`, `SOL-GOV-001`, `SOL-GOV-002`. |

## Dónde la evidencia no alcanza para recomendar

- Presencia de todo el hato y plazo para notar un faltante (`OQ-COUNT-001`, `PP-SEC-001`).
- Intrusión (`OQ-SEC-001`).
- Medición física del alimento (`OQ-FEED-001`) y cualquier comparación de estrategias (`OQ-FEED-002`).
- Rentabilidad del ranchero, «a la parte» y «bulto» (`OQ-OWN-001`, `OQ-TRADE-001`).
- Enlace con la báscula IBN ARGON (`OQ-SCALE-001`).
- Marca secundaria (`BR-ID-003`).
- Peso de llegada (`BR-WEIGH-004`).
- Leche (`OQ-MILK-001`).
- Si el propio paquete inicial es sostenible para el propietario (`DQ-HABIT-001`).

## Qué no cambió

Las preguntas de `docs/domain/open-questions.md` siguen abiertas. No se creó un punto de dolor nuevo. Las preguntas `DQ-…` viven en [decision-framework.md](decision-framework.md) y no se promovieron al registro de entrevistas.

## Estado del documento

- Versión: 0.1
- Estado: Diseño de dominio, no alcance aprobado
- Última actualización: 2026-10-03
- Fuente: `docs/domain` v0.1 y AS-IS v0.2
- Validación: Pendiente de validación iterativa con el propietario del rancho
