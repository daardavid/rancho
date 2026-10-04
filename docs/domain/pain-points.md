# Puntos de dolor

Debilidades o riesgos que el descubrimiento ya permite nombrar. No son requisitos de software.

La severidad es una estimación inicial del proyecto para ordenar la conversación. No es un hecho objetivo del rancho ni una prioridad aprobada. Se revisará con el propietario.

Escala usada aquí: baja, media, alta, crítica.

La confianza dice qué tan directo es el respaldo de la entrevista:

- Alta: la entrevista lo describe de forma directa.
- Media: el impacto se sigue del relato, pero el caso no está medido.
- Baja: el propio dato es incompleto o se contradice en el relato.

| ID | Título | Situación actual | Impacto | Evidencia actual | Severidad inicial | Confianza |
| --- | --- | --- | --- | --- | --- | --- |
| PP-ID-001 | Identificación física frágil | Arete SINIIGA, nombre o memoria del trabajador. Algunos becerros están un tiempo sin arete y sin nombre. El arete puede caerse o retirarse. No hay arete secundario del rancho. | Se puede perder el hilo de un animal justamente al inicio de su vida, que es cuando empieza el dato de crecimiento. | Práctica descrita en entrevista. Disposición a mejorar la identificación, todavía sin método elegido. | Alta | Alta |
| PP-DATA-001 | Sin historial formal del animal | Partos no registrados. Genealogía informal. Sanidad en la memoria. Pesos en cuadernos. | No se puede responder con registro a preguntas que el propietario ya hace, ni comparar líneas o lotes. | Ausencia explícita de registro formal de partos y de genealogía. | Alta | Alta |
| PP-DATA-002 | Datos declarados sin rastro comprobable | La información llega por teléfono, WhatsApp, fotos, audios y memoria. No hay una distinción operativa entre lo que alguien afirma y lo que se midió. | Un error o un dato falso puede quedar como si fuera medición. Afecta confianza y cualquier costo calculado encima. | Principio explícito: no depender a ciegas de valores reportados por trabajadores. El principio de evidencia es deseo futuro, no control actual. | Alta | Alta |
| PP-GROW-001 | El pesaje no deja un historial utilizable | Los becerros se pesan aproximadamente cada 15 días en báscula IBN ARGON. El flujo actual no guarda el dato en el sistema deseado. Históricamente se anota a mano. Las vacas adultas no entran en esa rutina. | No hay base confiable para ganancia diaria, curvas, comparación ni detección de animales por debajo de lo esperado. Esas lecturas son objetivo, no un resultado que hoy exista. | Marca de báscula, intervalo aproximado, cuadernos y duración aproximada de una hora por sesión de becerros. Modelo y conexión de la báscula sin confirmar. | Alta | Alta |
| PP-FEED-001 | No se puede verificar el alimento | La meta relatada es alrededor de 1.5 kg por animal. El ejemplo de riesgo es que se entregue 1.0 kg y la diferencia pueda venderse o sustraerse. El propietario no puede comprobar con fiabilidad cuánto se preparó, cuánto se entregó ni cuánto quedó. No se mide el consumo individual; hay competencia en el comedero. | Puede alterar rentabilidad, crecimiento, existencia en bodega y confianza. Es un riesgo de merma o fraude, no una acusación a una persona. | Ejemplo numérico de la entrevista y la afirmación de que hoy no hay verificación. Las cifras de dieta no cuadran entre sí; véase `OQ-FEED-002`. | Crítica | Alta |
| PP-FIN-001 | No se conoce la rentabilidad real | No hay un cálculo de costo de criar, ingreso de venta, margen, prorrateo ni comparación entre actividades. El reparto «a la parte» complica todavía más la parte del ranchero. | No se puede decidir qué actividad conviene. Es uno de los objetivos más importantes del proyecto y hoy no está cubierto. | Objetivo explícito de entender rentabilidad, crecimiento y qué actividades dejan utilidad. Metodologías de prorrateo aún no diseñadas. | Crítica | Alta |
| PP-FIN-002 | Gasto e inversión no están separados para la gestión | Se guardan la mayoría de los tickets. El pago de compras suele ser con tarjeta y la nómina en efectivo. No hay una contabilidad de gestión que separe gasto operativo y activo fijo. | Una mejora del rancho puede mezclarse con el costo de producir un kilo y deformar el margen. | Intención explícita de separar ambos. Criterio contable exacto sin definir. No reemplaza la contabilidad fiscal. | Media | Media |
| PP-INV-001 | Inventario formal de bodega limitado | Hay bodega cerrada. El control formal de alimento, medicamento, insumos, herramientas u otros materiales es limitado. No hay conciliación entre existencia teórica y física. | La merma de alimento y el costo de medicamentos quedan sin contraste. | Existencia de bodega y limitación explícita del seguimiento formal. | Media | Alta |
| PP-SEC-001 | El faltante de ganado se descubre tarde | El robo es una preocupación histórica. El cerco se puede cortar, a menudo de noche. El ganado puede faltar aproximadamente 1 o 2 semanas antes de que se note. A veces puede haber participación interna; no es siempre el caso. | Pérdida del animal y de la información de cuándo ocurrió. Detección de inventario y detección de intrusión son problemas distintos. | Patrón descrito en entrevista. Sin cámaras hoy. | Crítica | Alta |
| PP-SEC-002 | No hay verificación frecuente del hato | Puede tardarse varios días o más en notar que falta un animal. No hay un conteo o verificación frecuente y confiable. | Aunque no haya robo, el inventario de cabezas no es oportuno. | Práctica actual descrita así. Ninguna política de verificación fue elegida. | Alta | Alta |
| PP-SEC-003 | La intrusión no se detecta | No hay cámaras. El perímetro está cercado, con alrededor de 5 accesos. Cortar el cerco o sacar ganado no genera un aviso. | El software, por sí solo, no impide ni detecta la entrada física. | Ausencia de cámaras y distinción explícita entre inventario e intrusión. Las cámaras solo se están considerando. | Alta | Alta |
| PP-HEALTH-001 | Sanidad apoyada en la memoria | Vacunas, medicamentos y tratamientos dependen a menudo de la memoria y del conocimiento informal de los trabajadores. El paso ideal es por la manga; si hace falta, se laza, y eso es más peligroso. El baño puede hacerse con bombas. | Se pierde historia sanitaria y se aumenta el riesgo de manejo. No es, según la entrevista, la prioridad más alta frente a rentabilidad, peso, alimento y seguridad. | Control limitado descrito de forma explícita, con esa salvedad de prioridad. | Media | Alta |
| PP-REPRO-001 | Partos y genealogía sin registro | La filiación se conoce de manera informal. Con un solo toro la paternidad es simple, pero no hay registro. Los nacimientos no se anotan de forma formal. | No se puede medir después qué línea produce mejores animales, ni contestar con registro cuántas vacas han parido. | Ausencia explícita de registro. El interés genético es de largo plazo. | Media | Alta |
| PP-MILK-001 | La leche no está en condiciones de evaluarse | La infraestructura de ordeña existe y requiere mantenimiento; no está operativa como se desea. El esquema anterior no se consideró lo bastante rentable. No hay producción de leche documentada como vigente. | No se puede comparar carne, leche y doble propósito con cifras actuales. Usar el máximo histórico como si fuera producción de hoy sería un error. | Cifras históricas aproximadas en `BR-MILK-001`. Economía detallada abierta. | Media | Media |
| PP-CONN-001 | Conectividad limitada y poco confiable | No hay Wi-Fi. Los trabajadores tienen teléfonos Android. La cobertura celular se describió de formas que no coinciden del todo. | Una aplicación que exija red continua no encaja con el campo. El detalle de la cobertura no se puede dar por sentado. | Conclusión única permitida: limitada, poco confiable y pendiente de validación (`OQ-CONN-001`). | Media | Baja |
| PP-GOV-001 | Gestión a distancia sin comprobación | El propietario no está de tiempo completo. Depende de llamadas, mensajes, fotos y audios. Los trabajadores viven en el rancho y concentran el conocimiento operativo. | La decisión semanal puede apoyarse en un relato incompleto o interesado. El riesgo de dato falso, error u omisión está nombrado; no se atribuye a una persona. | Dirección de producto explícita sobre quién captura, y principio de no depender a ciegas del dato reportado. | Alta | Alta |

## Notas de priorización

En esta estimación inicial quedan como críticas la falta de rentabilidad, la imposibilidad de verificar el alimento y el retraso para descubrir ganado faltante. Identificación, historial, pesaje, verificación del hato y gestión a distancia quedan altas. Sanidad, leche, bodega, reproducción y conectividad quedan medias, en parte porque la propia entrevista bajó la sanidad frente a otros temas o porque el dato aún es débil.

Esa clasificación se valida después. No autoriza a construir primero esos tres temas críticos.

## Estado del documento

- Versión: 0.1
- Estado: Descubrimiento
- Última actualización: 2026-10-03
- Fuente: Entrevistas iniciales de descubrimiento del rancho
- Validación: Pendiente de validación iterativa con el propietario del rancho
