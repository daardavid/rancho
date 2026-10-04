# Marco de decisión

Cómo se elegirá después. Esta versión no elige. Un `recommendedNow: yes` del [catálogo](solution-catalog.md) es una lectura inicial del proyecto para aproximadamente 21 cabezas. No es una decisión comprometida ni un alcance aprobado.

No hay puntaje numérico. Sumar las etiquetas `low` y `high` no produce un ganador.

## Orden de las preguntas

Una opción se mira en este orden. Si una pregunta temprana falla, las siguientes no la salvan.

1. ¿Resuelve de forma material un dolor documentado? El dolor tiene que existir en [../../domain/pain-points.md](../../domain/pain-points.md). Un aparato atractivo sin ese dolor no avanza.
2. ¿La gente de este rancho puede ejecutarlo de verdad? Cuentan el predio grande, dos trabajadores, el propietario a distancia, la manga, el tambo y la ausencia de una aplicación para los trabajadores.
3. ¿Mejora la evidencia o la confiabilidad del dato? Distinguir un dicho de una medición cuenta. Un registro que parece exacto y no lo es, no.
4. ¿La fricción se justifica con el dolor? Un hábito diario imposible no se adopta porque el dolor sea crítico.
5. ¿El costo es proporcionado a aproximadamente 21 cabezas? `high` o `very_high` necesita un problema que el registro simple no pueda tocar. Esta versión no encontró ese caso para RFID, GPS, dosificación automática ni sensores de perímetro.
6. ¿Deja un camino de mejora? Se prefiere un identificador interno que después pueda recibir una lectura de aparato, frente a un aparato que obligue a cambiar el registro.
7. ¿Exige infraestructura que el rancho no tiene, o un hecho que la entrevista no dio? Si la respuesta depende de una pregunta abierta, la opción queda en `investigate` o en `no`. No se cierra la pregunta para poder recomendar.

La séptima pregunta pesa más que el entusiasmo por automatizar. `CON-SCALE-001`, `OQ-FEED-001`, `OQ-COUNT-001`, `OQ-SEC-001`, `OQ-OWN-001` y `OQ-CONN-001` son ejemplos: sin ellos no hay báscula conectada, medida de alimento, conteo total, cámara, margen del ranchero ni mapa de señal.

## Qué no hace este marco

- No convierte la severidad inicial del dolor en orden de construcción. El propio registro de dolores dice que esa clasificación no autoriza a construir primero los tres temas críticos.
- No sustituye la validación con el propietario.
- No diseña requisitos de software ni arquitectura.
- No asigna dinero, retorno ni plazo de obra.
- No declara ganadora una opción `investigate`.

## Cómo se leyeron tres casos

Sirven para ver el marco aplicado. No añaden decisiones.

**Declaración de alimento** (`SOL-FEED-001`, `SOL-FEED-002`). El dolor es directo. Anotar la compra y, si se quiere, lo que se dijo de la mezcla no exige un aparato. La evidencia no vuelve medida una entrega. La lectura de ahora es `yes` como declaración, no como verificación. `OQ-FEED-002` sigue sin cuadrarse.

**Lectura provisional** (`SOL-FIN-003`). El dolor es de los más importantes. Una utilidad cerrada no se puede calcular. Una lectura que muestra lo asignado, la bolsa no asignada, la completitud y la parte del ranchero como no calculable sí cabe, y queda como deseable, fuera del mínimo. No calcula costo por kilo mientras el alimento no sea confiable.

**GPS** (`SOL-SEC-004`). El faltante es crítico. El costo no es proporcionado a unas 21 cabezas, y la señal no sostiene un aviso remoto. La lista de activos y el lugar esperado no lo necesitan. La lectura de ahora es `no`. A escala queda `investigate`.

## Horizontes

`recommendedNow` mira el rancho descubierto: aproximadamente 21 cabezas, aproximadamente dos trabajadores que viven ahí, propietario que no está de tiempo completo, sin Wi-Fi, cobertura celular limitada y poco confiable, captura inicial por el propietario.

`recommendedAtScale` mira un hato en el que ese hábito puede no alcanzar. El descubrimiento no dio la cantidad. No se usa un número inventado. Una opción puede ser `yes` ahora y `investigate` a escala, como la transcripción de pesos o el copiado por el propietario. Otra puede ser `no` ahora y `investigate` a escala, como RFID. `SOL-REPRO-002` es `yes` ahora y `no` a escala: la inferencia por un solo toro no es paternidad y no sobrevive a más de un padre posible. `recommendedNow: yes` tampoco mete la opción en el paquete mínimo. Ese corte está en [README.md](README.md).

## Preguntas de descubrimiento que este diseño no cierra

Siguen en [../../domain/open-questions.md](../../domain/open-questions.md). Las que más frenan una recomendación:

| ID | Qué impide |
| --- | --- |
| `OQ-OWN-001` | La parte económica del ranchero y el reparto de crías. |
| `OQ-OWN-002` | Muerte y reposición. Sin eso la lista de presencia se desalinea. |
| `OQ-OWN-003` | Qué es cada una de las aproximadamente 21 cabezas, y quién entra al pesaje. |
| `OQ-OWN-004` | Si hay arrendamiento hoy. |
| `OQ-FEED-001` | Si el alimento se mide o se estima. |
| `OQ-FEED-002` | Las tres cifras de dieta no se reconcilian. Ninguna opción elige el supuesto. |
| `OQ-FEED-003` | Fórmula e ingredientes. |
| `OQ-TRADE-001` | Qué significa «bulto». |
| `OQ-SCALE-001` | Si la báscula IBN ARGON puede transmitir el peso. |
| `OQ-ID-001` | Cómo se detecta un parto y cómo se reconoce al becerro antes del arete. |
| `OQ-COUNT-001` | Qué conteo es realista en este predio. |
| `OQ-SEC-001` | Prioridad de cámaras y accesos frente al registro. |
| `OQ-CONN-001` | Dónde hay señal. |
| `OQ-FIN-001` | Cómo separar, en la práctica, gasto e inversión. |
| `OQ-MILK-001` | Economía histórica de la leche. No es producción actual. |
| `OQ-MILK-002` | Si una leche futura se mediría por vaca. |
| `OQ-HEALTH-001` | Calendario sanitario. |
| `OQ-REPRO-001` | Más de un toro o inseminación. |
| `BR-PART-001` | Sigue en palabras de la entrevista. No se reinterpreta. |

## Preguntas nuevas de este diseño

Aparecieron al armar el modelo. No se copiaron a `docs/domain/open-questions.md`: ese archivo es el registro de las entrevistas. Promoverlas espera a que el propietario confirme que son huecos distintos y no una repetición.

| ID | Pregunta | Por qué importa |
| --- | --- | --- |
| `DQ-HABIT-001` | ¿El propietario puede sostener, semana a semana, pasar mensajes, fotos y audios a un registro, sin que eso sea la captura tediosa que quiere evitar? | El paquete inicial depende de ese hábito. Si no se sostiene, las opciones `yes` de registro no se sostienen. |
| `DQ-FEED-004` | ¿La preparación y la entrega se pueden anotar por lote o por tambo, o el rancho solo puede ver la compra? | Define si `SOL-FEED-001` es realista o si solo habrá tickets. |
| `DQ-INV-001` | ¿El primer contraste físico de bodega se limita a los ingredientes de la dieta? | Evita abrir un inventario de herramientas antes de tiempo, y evita dar por hecho ese límite. |
| `DQ-FIN-003` | ¿Qué costos se pueden atribuir a un animal o a un grupo mientras «a la parte» no esté definido? | `SOL-FIN-003` no debe inventar la respuesta. |
| `DQ-GOV-001` | Además de un faltante confirmado y de un problema grave de un animal, ¿qué otro hecho debe avisar de inmediato? | `BR-CADENCE-001` no trae la lista. |
| `DQ-SEC-003` | En este predio, ¿qué parte del hato puede pasar una o dos semanas sin entrar a la manga ni ser vista de otro modo? | Dice cuánto cubre `SOL-SEC-002` y cuánto sigue abierto en `OQ-COUNT-001`. |
| `DQ-HERD-001` | ¿Cómo sale hoy un animal de la cuenta cuando muere, se repone o sale por un motivo distinto de la venta? | La salida ya se puede anotar, con motivo desconocido. La reposición económica no se interpreta. |

## Clase de cada pregunta, en v0.2

El modelo ya puede guardar desconocido en tenencia, participación, lugar, certeza de padres y motivo de salida. Por eso varias preguntas dejan de bloquear el dibujo del dominio. No se borran del registro de entrevistas. Ninguna se da por respondida.

Bloquea el modelo: ninguna de las preguntas de abajo impide ya representar el hueco. Si una pantalla promete la parte del ranchero, el alimento verificado o el hato controlado, esa promesa sí queda bloqueada.

| ID | Clase |
| --- | --- |
| OQ-OWN-001 | BLOCKS IMPLEMENTATION de la parte final del ranchero y del reparto de crías. |
| OQ-OWN-002 | BLOCKS IMPLEMENTATION de una reposición o un pago. La salida del animal ya cabe, con motivo desconocido. |
| OQ-OWN-003 | CAN BE LEARNED DURING PILOT. El padrón se arma al usarlo. |
| OQ-OWN-004 | CAN BE LEARNED DURING PILOT. |
| OQ-FEED-001 | CAN BE LEARNED DURING PILOT. Mientras tanto la entrega declarada no se llama medida. |
| OQ-FEED-002 | BLOCKS IMPLEMENTATION del costo por kilo y de `CAP-FEED-002`. |
| OQ-TRADE-001 | BLOCKS IMPLEMENTATION de la economía del bulto. El nombre de la forma sí se anota. |
| OQ-SCALE-001 | BLOCKS IMPLEMENTATION del enlace con la báscula. |
| OQ-FEED-003 | CAN BE LEARNED DURING PILOT. |
| OQ-LAND-001 | LONG-TERM para las hectáreas. Nombrar un potrero no las necesita. |
| OQ-LAND-002 | CAN BE LEARNED DURING PILOT, en `TGT-MOVE-001`, si el movimiento se anota. |
| OQ-ID-001 | CAN BE LEARNED DURING PILOT. |
| OQ-COUNT-001 | CAN BE LEARNED DURING PILOT. Hasta entonces el método y la cadencia de `TGT-HERD-VERIFY-001` siguen pendientes, y `PP-SEC-001` no está controlado. |
| OQ-CONN-001 | BLOCKS ARCHITECTURE de una sincronización o de un mapa de señal. No bloquea el registro posterior. |
| OQ-SEC-001 | LONG-TERM. La intrusión sigue sin implementación elegida. |
| OQ-MILK-001 | LONG-TERM. |
| OQ-FIN-001 | CAN BE LEARNED DURING PILOT. Lo que no se sepa clasificar queda sin clase. |
| OQ-PEOPLE-001 | CAN BE LEARNED DURING PILOT. |
| OQ-GEN-001 | LONG-TERM. |
| OQ-FIRE-001 | LONG-TERM. |
| OQ-MILK-002 | LONG-TERM. |
| OQ-ENV-001 | LONG-TERM. |
| OQ-NET-001 | LONG-TERM. |
| OQ-HEALTH-001 | CAN BE LEARNED DURING PILOT. |
| OQ-REPRO-001 | LONG-TERM. |
| DQ-HABIT-001 | CAN BE LEARNED DURING PILOT. Por eso el mínimo es más chico que la lista de `yes`. |
| DQ-FEED-004 | CAN BE LEARNED DURING PILOT. |
| DQ-INV-001 | CAN BE LEARNED DURING PILOT. El mínimo cuenta ingredientes. |
| DQ-FIN-003 | BLOCKS IMPLEMENTATION de un prorrateo automático. La bolsa no asignada no lo necesita. |
| DQ-GOV-001 | CAN BE LEARNED DURING PILOT. |
| DQ-SEC-003 | CAN BE LEARNED DURING PILOT. |
| DQ-HERD-001 | CAN BE LEARNED DURING PILOT. El motivo de salida puede quedar desconocido. |

## De la lectura a una decisión futura

Una decisión posterior tendría que decir qué opción se adopta, cuál se rechaza y qué pregunta se dio por respondida. También tendría que decir que el propietario la validó. Este documento no contiene esa decisión. El siguiente tramo de la cadena, requisito y arquitectura, no empieza aquí.

## Estado del documento

- Versión: 0.2
- Estado: Diseño de dominio, no alcance aprobado
- Última actualización: 2026-10-03
- Fuente: `docs/domain` v0.1, TO-BE v0.1 y el plan 005
- Validación: Pendiente de validación iterativa con el propietario del rancho
