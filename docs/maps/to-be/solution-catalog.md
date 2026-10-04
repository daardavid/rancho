# Catálogo de opciones

Mecanismos posibles para habilitar un proceso objetivo. Una opción no es una decisión. `recommendedNow` y `recommendedAtScale` son una lectura inicial para el hato conocido de aproximadamente 21 cabezas y para un hato mayor no cuantificado. El valor `investigate` significa que la evidencia no alcanza para recomendar la adopción.

Las puntuaciones cualitativas de esta ficha son una **Evaluación inicial del proyecto**. No son mediciones del rancho ni un retorno calculado. La complejidad de implementación es la dificultad de poner la opción a trabajar en este rancho. No es una estimación de construcción de software.

Valores usados:

- Costo: `low`, `medium`, `high`, `very_high`
- Complejidad de implementación, fricción operativa, confiabilidad del dato, dependencia humana, escalabilidad, auditabilidad, factibilidad actual: `low`, `medium`, `high`
- Dependencia de conectividad y de hardware: `none`, `low`, `medium`, `high`, salvo el costo
- `recommendedNow` y `recommendedAtScale`: `yes`, `no`, `investigate`

NOW es el rancho descubierto. SCALE es un hato en el que el mismo hábito manual puede dejar de ser realista. No se inventa esa cantidad de cabezas.

Las familias de presentación están en [solution-families.md](solution-families.md). Las fichas de abajo conservan el detalle. v0.2 añade `SOL-SALE-001`, `SOL-LIFE-001` y `SOL-LAND-001`. No borra las anteriores.

El paquete mínimo no es la lista de todo `recommendedNow: yes`. Está en [README.md](README.md).

## Identidad

### SOL-ID-001 — Identificador interno estable

- Descripción: cada animal gestionado recibe una identidad del rancho, distinta del arete SINIIGA. En la misma ficha caben la tenencia y la participación económica, incluso cuando son desconocidas. El arete, el nombre y la foto se cuelgan de esa identidad.
- Tipos: `SOFTWARE`, `PROCESS`
- Dolores: `PP-ID-001`, `PP-DATA-001`
- Capacidades: `CAP-ID-001`, `CAP-DATA-001`, `CAP-OWN-001`, `CAP-LIFE-001`
- Cómo ayuda: el historial sobrevive a un becerro sin arete, a un arete caído y a un SINIIGA que llega después.
- Ventajas: no exige hardware nuevo. Sirve de base para peso, cría, gasto y presencia. Escala como dato aunque el hato crezca.
- Desventajas: alguien tiene que abrir la ficha y reconocer al animal. La identidad de papel o de registro no impide que en el campo se confunda una cabeza si no hay marca física.
- Precondiciones: `TGT-ANIMAL-001`. Hace falta saber, aunque sea de a poco, qué cabezas se gestionan (`OQ-OWN-003`).
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: es la pieza que los demás registros necesitan, a un costo bajo para aproximadamente 21 cabezas, y no cierra la tecnología del arete.
- Preguntas para validar: `OQ-OWN-003`. Si el propietario acepta una ficha antes de la marca física. Esa disposición ya está dicha como objetivo; el método físico no.

### SOL-ID-002 — Foto de apoyo a la identidad

- Descripción: una fotografía ayuda al propietario, que no está en el rancho, a reconocer al animal y a ligar mensajes posteriores con la ficha. La foto no es la identidad.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-ID-001`, `PP-DATA-002`, `PP-GOV-001`
- Capacidades: `CAP-ID-001`, `CAP-COMM-001`, `CAP-DATA-002`
- Cómo ayuda: una marca visual viaja por el teléfono que ya se usa y reduce la dependencia de la memoria del trabajador cuando el propietario registra.
- Ventajas: usa un teléfono que ya existe. Baja fricción si la foto se toma cuando el animal ya está en la manga.
- Desventajas: el animal cambia, la foto envejece y dos becerros pueden parecerse. No sustituye una marca física ni el identificador interno.
- Precondiciones: alguien toma la foto y el propietario la recibe. `CON-DEV-001` no obliga a que el trabajador use una aplicación.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `low`
  - Escalabilidad: `medium`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: como apoyo, junto con `SOL-ID-001`, aprovecha la comunicación actual. Como única identidad no serviría, y no se recomienda así.
- Preguntas para validar: en qué manejo es realista tomar la foto (`DQ-HABIT-001`).

### SOL-ID-003 — Marca física secundaria convencional

- Descripción: un arete u otra marca propia del rancho, además del SINIIGA, para reconocer al animal cuando el arete oficial falta. No se especifica el tipo de marca.
- Tipos: `HARDWARE`, `PROCESS`, `POLICY`
- Dolores: `PP-ID-001`
- Capacidades: `CAP-ID-001`
- Cómo ayuda: da una segunda marca física si la oficial se cae o aún no está.
- Ventajas: es un objeto simple, independiente de la red, y refuerza el identificador interno en el campo.
- Desventajas: el propietario prefiere no aretar a un recién nacido de inmediato porque lo percibe traumático. El plazo de alrededor de un mes no está medido. Una marca más no está elegida.
- Precondiciones: elegir método, momento y quién lo coloca. Hoy `BR-ID-002` dice que no hay arete secundario.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `medium`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `none`
  - Dependencia de hardware: `medium`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `medium`
- recommendedNow: `investigate`
- recommendedAtScale: `investigate`
- Razón: el dolor es real y la disposición a mejorar existe, pero el método no está elegido y choca con la preferencia de no marcar al recién nacido. Recomendar una marca ahora cerraría `BR-ID-003` sin evidencia.
- Preguntas para validar: `OQ-ID-001`. Qué marca aceptaría el propietario y a partir de qué momento.

### SOL-ID-004 — Depender solo del SINIIGA

- Descripción: seguir usando el arete oficial, el nombre o la memoria como única identidad lógica. Es la práctica actual, puesta aquí para no olvidar que se consideró.
- Tipos: `PROCESS`, `POLICY`
- Dolores: `PP-ID-001`
- Capacidades: ninguna de forma suficiente. Deja `CAP-ID-001` sin cumplir.
- Cómo ayuda: no añade trabajo.
- Ventajas: no cambia el manejo. El arete oficial sigue siendo necesario para su propio fin.
- Desventajas: el arete puede faltar, caerse o retirarse. El becerro nace sin él. El historial se corta en el momento en que el crecimiento empieza.
- Precondiciones: ninguna. Ya es el estado actual.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `low`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `none`
  - Dependencia de hardware: `low`
  - Escalabilidad: `low`
  - Auditabilidad: `low`
  - Factibilidad actual: `high`
- recommendedNow: `no`
- recommendedAtScale: `no`
- Razón: es el origen de `PP-ID-001`. Conservar el SINIIGA como atributo sí; usarlo como única identidad no.
- Preguntas para validar: ninguna. El dolor está descrito de forma directa.

### SOL-ID-005 — RFID como identidad

- Descripción: un identificador electrónico leído por un aparato, como opción futura de marca. No se elige frecuencia, lector ni momento de colocación.
- Tipos: `HARDWARE`, `SOFTWARE`, `AUTOMATION`
- Dolores: `PP-ID-001`
- Capacidades: `CAP-ID-001`
- Cómo ayuda: podría reducir errores al pasar la manga y dejar una lectura repetible.
- Ventajas: si un día el hato y los manejos lo justifican, la lectura puede alimentar el mismo identificador interno sin cambiar la ficha.
- Desventajas: costo y aparatos que el rancho no tiene. No resuelve el lapso previo a cualquier marca si no se coloca al nacer, y colocar al nacer choca con la preferencia actual. Exige energía, lectores y un hábito de paso.
- Precondiciones: decidir que una marca electrónica vale más que una marca simple. Esa decisión no tiene evidencia de costo en el descubrimiento.
- Evaluación inicial del proyecto:
  - Costo: `high`
  - Complejidad de implementación: `high`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `high`
  - Dependencia humana: `low`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `high`
  - Escalabilidad: `high`
  - Auditabilidad: `high`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: aproximadamente 21 cabezas no justifican el aparato. La conectividad se puntúa `low` porque una lectura se puede guardar y pasar después; un aviso en vivo sería otro uso, no evaluado aquí. El identificador interno de `SOL-ID-001` deja el camino abierto.
- Preguntas para validar: si en un hato mayor el error de identificación en manga es el problema dominante. Hoy no está medido.

## Evidencia

### SOL-DATA-001 — Distinguir dato declarado y dato observado

- Descripción: cada valor importante dice si alguien lo afirmó o si salió de una medición o de una observación directa, y guarda quién, cuándo y origen.
- Tipos: `SOFTWARE`, `PROCESS`, `POLICY`
- Dolores: `PP-DATA-002`, `PP-DATA-001`
- Capacidades: `CAP-DATA-002`, `CAP-DATA-001`
- Cómo ayuda: un peso de mensaje no se usa como peso de báscula. Un cálculo puede mostrar que está incompleto o apoyado en dichos.
- Ventajas: no requiere hardware. Mejora la confianza sin afirmar que el dicho sea falso.
- Desventajas: no vuelve verdadero un dato declarado. Alguien tiene que clasificarlo.
- Precondiciones: `BR-EVID-001`, que es principio, no control actual.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `high`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: es la regla que impide construir rentabilidad encima de un relato indistinto. La confiabilidad se queda en `medium` porque clasificar no corrige el valor.
- Preguntas para validar: si el propietario está dispuesto a marcar el origen cada vez que asienta un número (`DQ-HABIT-001`).

### SOL-DATA-002 — Adjuntar foto, audio o nota al evento

- Descripción: el archivo que ya circula, o una nota, queda ligado al evento concreto. No ordena por sí solo el chat.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-DATA-002`, `PP-GOV-001`
- Capacidades: `CAP-DATA-002`, `CAP-COMM-001`
- Cómo ayuda: el propietario puede volver a ver en qué se apoyó un peso, una mezcla o un ticket.
- Ventajas: coincide con teléfono, WhatsApp, fotos y audios. No exige una integración.
- Desventajas: una foto puede no mostrar la cantidad. Un audio sigue siendo un dicho. Guardar todo satura.
- Precondiciones: que el archivo llegue al propietario. La señal del rancho puede impedir el envío inmediato (`OQ-CONN-001`).
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `low`
  - Escalabilidad: `high`
  - Auditabilidad: `high`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: sube la auditabilidad con fricción baja si se adjunta solo lo que respalda un evento, no la conversación completa.
- Preguntas para validar: qué eventos merecen archivo y cuáles bastan con una nota.

## Pesaje

### SOL-GROW-001 — Historial por transcripción del peso

- Descripción: el peso de cada becerro de la rutina se anota en su ficha, con fecha. Con dos pesos se ve la ganancia del intervalo.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-GROW-001`, `PP-DATA-001`
- Capacidades: `CAP-GROW-001`, `CAP-DATA-001`
- Cómo ayuda: el cuaderno deja de ser el único archivo. Aparecen serie, comparación simple y hueco si se combina con `SOL-GROW-004`.
- Ventajas: usa la báscula y la manga que ya existen. No depende del modelo del indicador.
- Desventajas: alguien transcribe. Un número mal copiado queda como medición si no hay foto. En un hato mucho mayor, la transcripción de la sesión pesa más.
- Precondiciones: la rutina actual de becerros, aproximadamente cada 15 días, de alrededor de una hora (`BR-WEIGH-003`).
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `medium`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `investigate`
- Razón: para los becerros que hoy se pesan, el salto de cuaderno a serie es grande y el aparato electrónico no está confirmado. A escala, la transcripción puede dejar de ser el mejor mecanismo; el modelo de la serie sí puede permanecer.
- Preguntas para validar: `OQ-OWN-003`, quién anota después de la sesión.

### SOL-GROW-002 — Foto del indicador como evidencia del peso

- Descripción: se fotografía la lectura asociada al animal y esa foto acompaña el peso transcrito. No evita, por sí sola, escribir el número.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-GROW-001`, `PP-DATA-002`
- Capacidades: `CAP-GROW-001`, `CAP-DATA-002`
- Cómo ayuda: el propietario puede ver la lectura y no depender solo del número que le dijeron.
- Ventajas: bajo costo. Encaja con las fotos que ya se mandan. Refuerza `SOL-GROW-001`.
- Desventajas: hay que lograr que la foto muestre el indicador y se sepa de qué animal es. No calcula solo la ganancia.
- Precondiciones: cámara del teléfono y un momento en la manga. La señal puede ser posterior (`SOL-CONN-001`).
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `low`
  - Escalabilidad: `medium`
  - Auditabilidad: `high`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: es evidencia, no un sustituto de la báscula conectada. Conviene ahora y sigue sirviendo como respaldo aunque más adelante exista otra captura.
- Preguntas para validar: si en la sesión de una hora es práctico fotografiar cada lectura.

### SOL-GROW-003 — Lectura electrónica de la báscula

- Descripción: el peso pasaría del indicador al historial sin transcribirlo. Solo si el aparato puede hacerlo. El modelo IBN ARGON no está confirmado.
- Tipos: `HARDWARE`, `SOFTWARE`, `AUTOMATION`
- Dolores: `PP-GROW-001`, `PP-DATA-002`
- Capacidades: `CAP-GROW-001`, `CAP-DATA-002`
- Cómo ayuda: reduciría el error de copiado y dejaría un dato de aparato, que es la forma más clara de peso observado.
- Ventajas: menos fricción de transcripción si funciona. El historial de `SOL-GROW-001` podría recibir el mismo dato.
- Desventajas: `CON-SCALE-001` prohíbe asumir puertos o protocolo. Puede hacer falta otro indicador. No identifica solo al animal.
- Precondiciones: `OQ-SCALE-001`. Sin esa respuesta no hay opción que adoptar.
- Evaluación inicial del proyecto:
  - Costo: `high`
  - Complejidad de implementación: `high`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `high`
  - Dependencia humana: `low`
  - Dependencia de conectividad: `medium`
  - Dependencia de hardware: `high`
  - Escalabilidad: `high`
  - Auditabilidad: `high`
  - Factibilidad actual: `low`
- recommendedNow: `investigate`
- recommendedAtScale: `investigate`
- Razón: es el camino de automatización del pesaje, y hoy es una pregunta, no un requisito. El costo `high` no es una cotización: cubre tanto un enlace simple desconocido como la posibilidad de cambiar el indicador.
- Preguntas para validar: `OQ-SCALE-001`.

### SOL-GROW-004 — Política de pesaje de becerros y hueco visible

- Descripción: se mantiene el intervalo ya practicado, aproximadamente cada 15 días, solo para becerros. No se pesa a diario. Un becerro esperado que no pasa queda visible.
- Tipos: `POLICY`, `PROCESS`
- Dolores: `PP-GROW-001`
- Capacidades: `CAP-GROW-001`
- Cómo ayuda: evita diseñar un pesaje imposible y convierte la ausencia en información.
- Ventajas: respeta `BR-WEIGH-002` y `CON-WEIGH-001`. No añade una sesión nueva.
- Desventajas: no crea el peso. Si no se sabe qué becerros entran a la rutina, el hueco tampoco se puede marcar.
- Precondiciones: `SOL-GROW-001` y una lista de becerros de la rutina.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `medium`
  - Dependencia de conectividad: `none`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: la política ya cabe en la práctica actual. Lo nuevo es no perder el hueco. Las vacas adultas siguen fuera de la rutina.
- Preguntas para validar: `OQ-OWN-003`.

## Alimentación

### SOL-FEED-001 — Declaración estructurada de compra, preparación y entrega

- Descripción: se anota la materia prima que entra, el lote que se prepara y la cantidad que alguien dice haber ofrecido. Cada cantidad dice si es comprada, preparada o entregada declarada, y si su calidad es declarada, observada o medida. No es una entrega verificada. No se anota lo que comió cada animal.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-FEED-001`
- Capacidades: `CAP-FEED-001`
- Cómo ayuda: separa la compra de lo preparado y de lo declarado como entregado. Una compra, además, puede ser el mismo evento que el gasto y la entrada de bodega.
- Ventajas: no exige báscula de alimento ni red. Deja el hueco a la vista.
- Desventajas: el número de preparación o de entrega puede ser un dicho. No prueba el ejemplo de 1.0 kg frente a 1.5 kg. No cuadra `OQ-FEED-002`.
- Precondiciones: `OQ-FEED-001` sigue abierta. `OQ-FEED-003` impide fijar la fórmula.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `low`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `medium`
  - Auditabilidad: `low`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `investigate`
- Paquete: la compra está en el mínimo. La preparación y la entrega declarada son deseables, no necesarias para empezar.
- Razón: archivar el dicho es mejor que no tenerlo, y llamarlo verificación sería una falsa confianza. La cantidad medida sigue en `SOL-FEED-003`.
- Preguntas para validar: `OQ-FEED-001`, `OQ-FEED-002`, `DQ-FEED-004`.

### SOL-FEED-002 — La misma declaración, con evidencia

- Descripción: `SOL-FEED-001` más foto o nota del ticket, del tambo o del reparto. La evidencia no convierte una entrega declarada en entrega medida.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-FEED-001`, `PP-DATA-002`
- Capacidades: `CAP-FEED-001`, `CAP-DATA-002`
- Cómo ayuda: el propietario puede ver en qué se apoyó el dicho. El ticket de compra sí puede hacer observada la cantidad comprada, cuando el ticket la trae.
- Ventajas: usa el teléfono actual.
- Desventajas: una foto del comedero no prueba 1.5 kg ni 1.0 kg.
- Precondiciones: las de `SOL-FEED-001`.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `low`
  - Escalabilidad: `medium`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Paquete: deseable. El ticket de la compra, cuando ya se guarda, entra al mínimo junto con el gasto.
- Razón: evidencia de un dicho, no verificación de la ración. No es un segundo proyecto respecto de `SOL-FEED-001`.
- Preguntas para validar: `DQ-FEED-004`.

### SOL-FEED-003 — Medir el lote con báscula o recipiente no conectado

- Descripción: la preparación o la entrega se pesa o se mide con un aparato simple que no transmite el dato. Alguien anota la lectura.
- Tipos: `PROCESS`, `HARDWARE`
- Dolores: `PP-FEED-001`, `PP-INV-001`
- Capacidades: `CAP-FEED-001`, `CAP-INV-001`
- Cómo ayuda: convierte la cantidad ofrecida en medición, que es el salto que el registro manual no da.
- Ventajas: no depende de red ni de un dosificador. Encaja con el seguimiento por grupo.
- Desventajas: no se sabe si hoy existe báscula de alimento, recipiente o solo el ojo (`OQ-FEED-001`). Recomendar la compra ahora inventaría una necesidad no medida.
- Precondiciones: respuesta a `OQ-FEED-001`.
- Evaluación inicial del proyecto:
  - Costo: `medium`
  - Complejidad de implementación: `medium`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `high`
  - Dependencia humana: `medium`
  - Dependencia de conectividad: `none`
  - Dependencia de hardware: `medium`
  - Escalabilidad: `high`
  - Auditabilidad: `high`
  - Factibilidad actual: `low`
- recommendedNow: `investigate`
- recommendedAtScale: `investigate`
- Razón: es la dirección más creíble si hace falta medir de verdad, y este diseño no establece que ya se pueda ni que haya que comprar el aparato. El costo `medium` asume un medio simple, no una planta.
- Preguntas para validar: `OQ-FEED-001`. Si un recipiente ya usado en el tambo puede servir de medida.

### SOL-FEED-004 — Báscula de alimento conectada

- Descripción: una báscula de ingredientes o de ración enviaría la cantidad al registro.
- Tipos: `HARDWARE`, `SOFTWARE`, `AUTOMATION`
- Dolores: `PP-FEED-001`
- Capacidades: `CAP-FEED-001`
- Cómo ayuda: reduciría la transcripción de la cantidad medida.
- Ventajas: dato de aparato y mejor auditabilidad si el resto del proceso existe.
- Desventajas: aparato, instalación y enlace que no están en el descubrimiento. La conectividad del rancho es mala. No identifica merma después del pesaje, por ejemplo en el comedero o fuera de él.
- Precondiciones: `SOL-FEED-003` tendría que tener sentido primero. No hay evidencia de este equipo.
- Evaluación inicial del proyecto:
  - Costo: `high`
  - Complejidad de implementación: `high`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `high`
  - Dependencia humana: `low`
  - Dependencia de conectividad: `high`
  - Dependencia de hardware: `high`
  - Escalabilidad: `high`
  - Auditabilidad: `high`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: aproximadamente 21 cabezas y una forma de medir todavía desconocida no justifican el enlace. Medir sin conectar es el peldaño anterior.
- Preguntas para validar: `OQ-FEED-001`, `OQ-CONN-001`.

### SOL-FEED-005 — Dosificación automatizada

- Descripción: un equipo prepararía o entregaría la ración con poca intervención.
- Tipos: `HARDWARE`, `AUTOMATION`
- Dolores: `PP-FEED-001`
- Capacidades: `CAP-FEED-001`
- Cómo ayuda: podría estabilizar la cantidad ofrecida y dejar registro de dosis.
- Ventajas: menos dependencia del dicho diario.
- Desventajas: cambia el sistema de alimentación, no solo la medición. El rancho describe dieta en tambo, comedero común y competencia. El consumo individual no es el concepto viable. El costo es desproporcionado para el hato actual.
- Precondiciones: una decisión de cambiar la forma de alimentar, que no está en la entrevista.
- Evaluación inicial del proyecto:
  - Costo: `very_high`
  - Complejidad de implementación: `high`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `high`
  - Dependencia humana: `low`
  - Dependencia de conectividad: `medium`
  - Dependencia de hardware: `high`
  - Escalabilidad: `high`
  - Auditabilidad: `high`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: no es el siguiente paso de un tambo y un grupo de aproximadamente 21 animales. A escala solo se investiga si el rancho cambiara de sistema de alimentación. La conectividad se deja en `medium` porque un equipo local no tiene por qué avisar en vivo; eso no lo hace recomendable.
- Preguntas para validar: ninguna que este hato pueda contestar con utilidad ahora. `OQ-FEED-003` ni siquiera fija la fórmula.

### SOL-FEED-006 — Comparar estrategia, crecimiento y costo

- Descripción: poner lado a lado periodos de dieta distinta, su costo de alimento y la ganancia de los becerros pesados. Si falta un insumo, la comparación se muestra incompleta.
- Tipos: `SOFTWARE`, `PROCESS`
- Dolores: `PP-FEED-001`, `PP-FIN-001`, `PP-GROW-001`
- Capacidades: `CAP-FEED-002`, `CAP-FIN-001`, `CAP-GROW-001`
- Cómo ayuda: es el uso posterior de cantidades, costos y pesos. No crea esas cantidades.
- Ventajas: no exige hardware. Responde a una pregunta que el propietario ya tiene, cuando los datos existan.
- Desventajas: con `OQ-FEED-002` abierto, una comparación numérica parecería una respuesta falsa.
- Precondiciones: series de peso, egresos clasificados y cantidades de alimento que el rancho reconozca. Hoy no están.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `medium`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `low`
  - Dependencia humana: `low`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: la capacidad existe. Producir el número ahora no. La dependencia humana es `low` porque el trabajo estaría en los registros previos, no en esta comparación.
- Preguntas para validar: `OQ-FEED-002`, `OQ-FEED-003`, `OQ-FIN-001`.

## Economía

### SOL-FIN-001 — Anotación del gasto, incluida la nómina en efectivo

- Descripción: el propietario anota el egreso y lo clasifica como gasto operativo o inversión cuando puede. Si no hay ticket, queda la nota. No se inventa el criterio contable.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-FIN-002`, `PP-FIN-001`
- Capacidades: `CAP-FIN-002`, `CAP-FIN-001`
- Cómo ayuda: la nómina y otros pagos en efectivo dejan de existir solo en la memoria. La clase de gestión empieza a separarse.
- Ventajas: cubre el caso que la foto del ticket no cubre. Bajo costo.
- Desventajas: la clasificación puede ser débil mientras `OQ-FIN-001` siga abierta. No calcula la parte del socio.
- Precondiciones: `BR-PAY-001`, `BR-FIN-001`.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `medium`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: es el complemento de `SOL-FIN-002`, no un sistema paralelo. Hace visible el efectivo sin pretender ser contabilidad fiscal.
- Preguntas para validar: `OQ-FIN-001`, `OQ-PEOPLE-001`.

### SOL-FIN-002 — Foto del ticket y clasificación

- Descripción: el ticket que ya se guarda se fotografía y se clasifica como gasto operativo o inversión, a nivel de gestión.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-FIN-002`, `PP-FIN-001`, `PP-DATA-002`
- Capacidades: `CAP-FIN-002`, `CAP-DATA-002`
- Cómo ayuda: el comprobante deja de estar solo en papel suelto y puede atribuirse después, si el criterio existe.
- Ventajas: la mayoría de los tickets ya se conservan. La fricción añadida es la foto y la clase, no la disciplina de guardar el papel.
- Desventajas: no separa solo lo que el criterio contable aún no define. No lee el estado de cuenta.
- Precondiciones: `OQ-FIN-001` puede dejar egresos sin clase. Esos quedan explícitamente sin clasificar.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `low`
  - Escalabilidad: `high`
  - Auditabilidad: `high`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: mucho comprobante ya existe. Ligarlo y clasificarlo es de las ganancias de información más altas por peso de trabajo. La confiabilidad de la clase se queda en `medium` a propósito.
- Preguntas para validar: `OQ-FIN-001`.

### SOL-FIN-003 — Rentabilidad administrativa provisional

- Descripción: con ingresos y costos ya registrados, se muestra un margen provisional de lo asignado, la bolsa de lo no asignado, la completitud y la calidad de los datos. La parte del ranchero queda desconocida. No es utilidad fiscal, no finiquita al socio y no calcula costo por kilo si el alimento no es confiable.
- Tipos: `SOFTWARE`, `PROCESS`
- Dolores: `PP-FIN-001`
- Capacidades: `CAP-FIN-001`
- Cómo ayuda: el propietario ve el dinero conocido y lo que falta, sin una cifra que parezca cerrada.
- Ventajas: usa los registros que ya se capturaron. No exige reglas de «a la parte».
- Desventajas: un lector apurado puede ignorar la completitud. Por eso la parte del ranchero se muestra como no calculable, no como cero.
- Precondiciones: que existan algunos ingresos o costos. `OQ-OWN-001` y `OQ-FEED-002` siguen abiertas y limitan la lectura. No la impiden.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `medium`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `low`
  - Dependencia humana: `medium`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `medium`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Paquete: deseable. No hace falta para empezar. El ingreso de venta se registra igual, en `SOL-SALE-001`.
- Razón: aplazar toda lectura dejaba el objetivo principal en una gaveta de tickets. La lectura de ahora es provisional a propósito. La confiabilidad `low` es la del conjunto, no la de un ticket suelto.
- Preguntas para validar: `OQ-OWN-001`, `OQ-TRADE-001`, `OQ-FEED-002`, `DQ-FIN-003`.

### SOL-FIN-004 — Integración con cuentas financieras

- Descripción: traer movimientos desde una cuenta o un medio de pago, en lugar de capturar cada ticket. No se nombra un proveedor ni un mecanismo.
- Tipos: `SOFTWARE`, `AUTOMATION`
- Dolores: `PP-FIN-001`, `PP-FIN-002`
- Capacidades: `CAP-FIN-002`
- Cómo ayuda: podría reducir la captura de lo que ya pasó por tarjeta.
- Ventajas: las compras se pagan comúnmente con tarjeta. Un estado de cuenta existe en algún lado, aunque el descubrimiento no lo revisó.
- Desventajas: la nómina en efectivo no estaría ahí. Un movimiento bancario no dice si fue gasto o inversión, ni a qué animal pega. Exige enlace y credenciales que no se han estudiado.
- Precondiciones: saber qué cuentas hay y qué muestran. Eso no está en la entrevista.
- Evaluación inicial del proyecto:
  - Costo: `high`
  - Complejidad de implementación: `high`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `low`
  - Dependencia de conectividad: `high`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `high`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: el ticket fotografiado cubre el ahora. La cuenta es una investigación posterior, no un requisito, y no sustituye la clasificación ni el efectivo.
- Preguntas para validar: `OQ-FIN-001`. Si el propietario quiere que un tercero vea movimientos de sus cuentas. Eso no se preguntó.

## Compra de ganado

### SOL-PUR-001 — Registrar costo, flete y forma de compra

- Descripción: cada compra guarda precio, flete pagado por el comprador y si fue por kilogramo o por bulto, sin traducir el bulto.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-FIN-001`
- Capacidades: `CAP-FIN-001`, `CAP-DATA-001`
- Cómo ayuda: el costo de entrada deja de vivir solo en el trato. Es insumo de cualquier lectura posterior.
- Ventajas: el propietario ya participa en la compra. Poca fricción añadida.
- Desventajas: no dice si la compra resultó bien. No define «bulto».
- Precondiciones: `BR-BUY-001`, `BR-BUY-002`. `OQ-TRADE-001` permanece.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: sin el costo de entrada no hay economía del animal. Registrarlo no exige cerrar el bulto ni «a la parte».
- Preguntas para validar: `OQ-TRADE-001`, `OQ-OWN-004`.

### SOL-PUR-002 — Peso de llegada distinto del peso de compra

- Descripción: si el ganado se pesa en el rancho después de descansar, ese peso se guarda aparte del peso o del precio de la compra.
- Tipos: `PROCESS`
- Dolores: `PP-FIN-001`, `PP-GROW-001`
- Capacidades: `CAP-FIN-001`, `CAP-GROW-001`
- Cómo ayuda: permitiría ver merma de viaje o un punto de partida, si la práctica existe.
- Ventajas: usaría la báscula de ganado ya presente. No pide un aparato nuevo.
- Desventajas: la entrevista lo dice como preferencia, no como rutina. No hay plazo de descanso. No se sabe si el peso de compra y el de llegada son el mismo concepto.
- Precondiciones: `BR-WEIGH-004`. Confirmar que el pesaje de llegada ocurre.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `none`
  - Dependencia de hardware: `low`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `medium`
- recommendedNow: `investigate`
- recommendedAtScale: `investigate`
- Razón: es deseable y no está confirmado. Recomendarlo como práctica actual repetiría el error que el AS-IS ya corrigió.
- Preguntas para validar: si hoy se pesa al llegar, después de cuánto descanso, y qué se hace con un bulto no pesado cabeza por cabeza.

## Bodega

### SOL-INV-001 — Saldo simple y conteo físico

- Descripción: entradas y salidas de los insumos que se decida llevar, un saldo teórico y un conteo físico con la diferencia anotada. La lectura inicial limita el hábito a ingredientes de la dieta.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-INV-001`, `PP-FEED-001`
- Capacidades: `CAP-INV-001`, `CAP-FEED-001`
- Cómo ayuda: la bodega deja de ser solo un cuarto cerrado. Una merma de ingrediente se puede ver como diferencia, no como sospecha tardía.
- Ventajas: proporcional a un rancho chico. Se apoya en compras que el propietario ya hace y en las preparaciones de `SOL-FEED-001`.
- Desventajas: un conteo abandonado devuelve el problema. Incluir herramientas y medicamentos el primer día sube la fricción sin que la entrevista lo pida como prioridad.
- Precondiciones: `DQ-INV-001`. La bodega existe. El control no.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `medium`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: el método de teórico contra físico sirve ahora para alimento y sigue siendo el método correcto si el almacén crece. La frecuencia y el catálogo completo no se fijan. `yes` a escala se refiere al método, no a un inventario industrial.
- Preguntas para validar: `DQ-INV-001`, `OQ-FEED-001`.

### SOL-INV-002 — Contar solo cuando se sospecha

- Descripción: no se lleva saldo. Se cuenta la bodega cuando alguien duda.
- Tipos: `PROCESS`
- Dolores: `PP-INV-001`
- Capacidades: `CAP-INV-001`, de forma insuficiente.
- Cómo ayuda: es más fácil que un saldo corrido.
- Ventajas: poca disciplina.
- Desventajas: repite el descubrimiento tardío. Sin entradas y salidas no hay teórico contra qué contrastar.
- Precondiciones: ninguna.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `low`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `none`
  - Dependencia de hardware: `none`
  - Escalabilidad: `low`
  - Auditabilidad: `low`
  - Factibilidad actual: `high`
- recommendedNow: `no`
- recommendedAtScale: `no`
- Razón: es casi la práctica actual. No responde `PP-INV-001`.
- Preguntas para validar: ninguna.

## Presencia del ganado

### SOL-SEC-001 — Conteo periódico de todo el hato

- Descripción: en una cadencia fija se recorre o se reúne el ganado y se contrasta contra la lista de quién debería estar.
- Tipos: `PROCESS`, `POLICY`
- Dolores: `PP-SEC-001`, `PP-SEC-002`
- Capacidades: `CAP-SEC-001`
- Cómo ayuda: sería la verificación más directa de presencia.
- Ventajas: no exige aparato. Un conteo hecho de verdad sube la confiabilidad.
- Desventajas: el predio es de aproximadamente 530 hectáreas, con potreros grandes. Reunir toma tiempo. `OQ-COUNT-001` dice que no se sabe de qué forma realista se podría hacer. Un conteo imposible no se recomienda por ser lógico en abstracto.
- Precondiciones: `OQ-COUNT-001`, `OQ-LAND-001`, `OQ-LAND-002`.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `medium`
  - Fricción operativa: `high`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `none`
  - Dependencia de hardware: `none`
  - Escalabilidad: `low`
  - Auditabilidad: `medium`
  - Factibilidad actual: `low`
- recommendedNow: `investigate`
- recommendedAtScale: `investigate`
- Razón: el dolor es crítico y el método realista no está descrito. La confiabilidad `medium` vale solo si el conteo ocurre; la factibilidad actual es `low`.
- Preguntas para validar: `OQ-COUNT-001`.

### SOL-SEC-002 — Última observación en un manejo

- Descripción: la última vez que un animal se vio queda escrita por el evento que ya lo reunió, sobre todo el pesaje. No es un formulario de presencia aparte ni una verificación del hato.
- Tipos: `PROCESS`
- Dolores: `PP-SEC-001`, `PP-SEC-002`
- Capacidades: `CAP-SEC-001`
- Cómo ayuda: aprovecha una hora de manga que ya existe. Un becerro que no llega al pesaje deja de ser solo un hueco de peso.
- Ventajas: fricción baja. No añade una recorrida. Sirve también a `CAP-GROW-001`.
- Desventajas: no ve a los animales que no se manejan. Las vacas adultas no se pesan de rutina. No acorta por sí solo el plazo de una o dos semanas para el hato completo. No detecta una intrusión.
- Precondiciones: `TGT-WEIGH-001` o un manejo equivalente, y la lista de `TGT-ANIMAL-001`.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `low`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `medium`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: es una última observación de quien ya estaba en la manga, con fricción nula si sale del pesaje. No acorta por sí sola el plazo de una o dos semanas del hato. `TGT-HERD-VERIFY-001` sigue con método y cadencia pendientes. La confiabilidad del hato completo se queda en `low`.
- Preguntas para validar: `OQ-OWN-003`, `DQ-SEC-003`. Qué fracción del hato no entra a la manga en dos semanas.

### SOL-SEC-003 — Puntos de paso con RFID

- Descripción: un lector en un punto de manejo registraría qué animales pasaron.
- Tipos: `HARDWARE`, `AUTOMATION`, `SOFTWARE`
- Dolores: `PP-SEC-001`, `PP-SEC-002`, `PP-ID-001`
- Capacidades: `CAP-SEC-001`, `CAP-ID-001`
- Cómo ayuda: la verificación de los que pasan sería una lectura, no una lista dictada.
- Ventajas: combina identidad y presencia en la manga. Escala mejor que el conteo visual si el hato crece.
- Desventajas: el aparato no está justificado con aproximadamente 21 cabezas. Un punto de paso no cubre el potrero. Sigue sin ver a quien no pasa.
- Precondiciones: `SOL-ID-005`, que tampoco se recomienda ahora.
- Evaluación inicial del proyecto:
  - Costo: `high`
  - Complejidad de implementación: `high`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `high`
  - Dependencia humana: `low`
  - Dependencia de conectividad: `medium`
  - Dependencia de hardware: `high`
  - Escalabilidad: `high`
  - Auditabilidad: `high`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: opción de escala, no de este hato. El mismo identificador interno puede recibir esas lecturas más adelante.
- Preguntas para validar: `OQ-COUNT-001`. Si el problema que queda es el animal que nunca entra a un punto de paso.

### SOL-SEC-004 — Rastreo activo o GPS

- Descripción: un dispositivo por animal, o un esquema equivalente, para saber ubicación. Se considera solo como alternativa de costo alto.
- Tipos: `HARDWARE`, `SOFTWARE`, `AUTOMATION`
- Dolores: `PP-SEC-001`
- Capacidades: `CAP-SEC-001`
- Cómo ayuda: en teoría acortaría el tiempo para saber que un animal no está donde se espera.
- Ventajas: es la opción que mira el potrero, no solo la manga.
- Desventajas: costo muy alto para aproximadamente 21 cabezas en aproximadamente 530 hectáreas. La cobertura celular es limitada y poco confiable, así que un aviso remoto no se puede suponer. No detecta por sí solo una intrusión. No hay evidencia de que sea económicamente sensato.
- Precondiciones: energía, cobertura y un costo que el descubrimiento no tiene.
- Evaluación inicial del proyecto:
  - Costo: `very_high`
  - Complejidad de implementación: `high`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `low`
  - Dependencia de conectividad: `high`
  - Dependencia de hardware: `high`
  - Escalabilidad: `medium`
  - Auditabilidad: `high`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: no se diseña como si el GPS fuera razonable hoy. La confiabilidad se queda en `medium` porque un aviso remoto no se puede suponer con la cobertura descrita. A escala tampoco se recomienda; solo se deja investigable si un problema futuro, medido, lo justificara. La escalabilidad `medium` refleja predio grande, señal débil y mantenimiento de dispositivos, no una virtud del mapa.
- Preguntas para validar: `OQ-CONN-001`. Ninguna cotización se inventa aquí.

## Intrusión

### SOL-SEC-005 — Procedimiento de accesos y de cerco

- Descripción: una forma de trabajo para revisar accesos o tramos y anotar una anomalía. No se fija un horario nocturno ni un recorrido de 530 hectáreas.
- Tipos: `PROCESS`, `POLICY`
- Dolores: `PP-SEC-003`
- Capacidades: `CAP-SEC-002`
- Cómo ayuda: puede dejar constancia de lo que alguien vio, sin aparato.
- Ventajas: costo bajo. No confunde el faltante de ganado con la entrada.
- Desventajas: un corte de noche entre dos revisiones no se detecta. No se sabe si la gente del rancho puede sostener la ronda. La evidencia sigue siendo un dicho o una foto ocasional.
- Precondiciones: `OQ-SEC-001`. Saber qué accesos importan.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `medium`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `low`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `none`
  - Dependencia de hardware: `none`
  - Escalabilidad: `medium`
  - Auditabilidad: `low`
  - Factibilidad actual: `medium`
- recommendedNow: `investigate`
- recommendedAtScale: `investigate`
- Razón: es la opción de proceso que hay que entender antes de comprar cámaras. La evidencia no dice que una ronda sea realista, así que no se adopta en el paquete inicial.
- Preguntas para validar: `OQ-SEC-001`. Qué revisión cabe en el trabajo que los dos trabajadores ya hacen.

### SOL-SEC-006 — Iluminación en accesos

- Descripción: luz en algunos accesos o puntos de paso, no en el perímetro completo.
- Tipos: `HARDWARE`
- Dolores: `PP-SEC-003`
- Capacidades: `CAP-SEC-002`
- Cómo ayuda: puede disuadir o facilitar que una persona vea un acceso de noche. No crea un archivo.
- Ventajas: no depende de la señal celular.
- Desventajas: no avisa al propietario. No demuestra un corte. El descubrimiento no habla de iluminación ni de energía disponible en los accesos; no se afirma ni se niega que haya energía.
- Precondiciones: `OQ-SEC-001` y un conocimiento del acceso que no está en las entrevistas.
- Evaluación inicial del proyecto:
  - Costo: `medium`
  - Complejidad de implementación: `medium`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `low`
  - Dependencia humana: `low`
  - Dependencia de conectividad: `none`
  - Dependencia de hardware: `high`
  - Escalabilidad: `medium`
  - Auditabilidad: `low`
  - Factibilidad actual: `medium`
- recommendedNow: `investigate`
- recommendedAtScale: `investigate`
- Razón: puede acompañar un procedimiento y no lo sustituye. Sin prioridad dicha por el propietario, no entra al ahora.
- Preguntas para validar: `OQ-SEC-001`.

### SOL-SEC-007 — Cámaras en pocos puntos de paso

- Descripción: cámaras solo donde el ganado o las personas tienen que pasar, no a lo largo del cerco. Están siendo consideradas. No están instaladas.
- Tipos: `HARDWARE`
- Dolores: `PP-SEC-003`
- Capacidades: `CAP-SEC-002`
- Cómo ayuda: podría dejar imagen de un acceso. Una imagen revisada después no es lo mismo que un aviso inmediato.
- Ventajas: ataca un punto concreto. Evita la idea de vigilar 530 hectáreas con cámaras.
- Desventajas: el software y la cámara no cubren el cerco que se corta en otro lado. La señal para un aviso remoto es poco confiable. Quién revisa las imágenes no está definido. `OQ-SEC-001` no ha puesto esto por encima del registro de ganado.
- Precondiciones: prioridad del propietario, punto elegido, y una forma de conservar la imagen que no se diseña aquí.
- Evaluación inicial del proyecto:
  - Costo: `high`
  - Complejidad de implementación: `high`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `medium`
  - Dependencia de conectividad: `high`
  - Dependencia de hardware: `high`
  - Escalabilidad: `medium`
  - Auditabilidad: `medium`
  - Factibilidad actual: `low`
- recommendedNow: `investigate`
- recommendedAtScale: `investigate`
- Razón: la conectividad se puntúa `high` para un aviso inmediato. Una grabación que alguien ve después sería otro uso, de menos dependencia de red y de más dependencia humana, y tampoco está elegido. Las cámaras solas no se recomiendan.
- Preguntas para validar: `OQ-SEC-001`, `OQ-CONN-001`.

### SOL-SEC-008 — Sensores de perímetro

- Descripción: sensores a lo largo del cerco para detectar un corte o un paso.
- Tipos: `HARDWARE`, `AUTOMATION`
- Dolores: `PP-SEC-003`
- Capacidades: `CAP-SEC-002`
- Cómo ayuda: sería el intento de cubrir entrada física y no solo un acceso.
- Ventajas: mira el perímetro, que es donde la entrevista sitúa el corte.
- Desventajas: predio grande, costo muy alto, falsas alarmas no estudiadas, aviso remoto con señal mala. No está mencionado como opción concreta del propietario; las cámaras sí se están considerando, los sensores no.
- Precondiciones: un plano que `OQ-LAND-001` no da, y una prioridad que `OQ-SEC-001` no da.
- Evaluación inicial del proyecto:
  - Costo: `very_high`
  - Complejidad de implementación: `high`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `low`
  - Dependencia de conectividad: `high`
  - Dependencia de hardware: `high`
  - Escalabilidad: `low`
  - Auditabilidad: `medium`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: no es sensato para el perímetro descrito. La escalabilidad es `low` porque más cerco implica más puntos. No se recomienda ni ahora ni como camino natural del paquete inicial.
- Preguntas para validar: `OQ-SEC-001`. Solo tendría sentido si un diseño físico futuro, que aquí no se hace, lo acotara a tramos cortos.

### SOL-SEC-009 — Combinación de procedimiento y evidencia en pocos puntos

- Descripción: no es un aparato adicional. Es la opción de no elegir una cámara, una luz o un sensor por separado, sino un procedimiento de accesos más evidencia solo en los puntos que el propietario marque. Qué evidencia, no está elegido.
- Tipos: `PROCESS`, `POLICY`, `HARDWARE`
- Dolores: `PP-SEC-003`
- Capacidades: `CAP-SEC-002`
- Cómo ayuda: evita la lectura de que una cámara resuelve el rancho, y también la lectura de que un procedimiento nocturno imposible es el plan.
- Ventajas: obliga a decir qué punto queda cubierto y cuál no.
- Desventajas: no se puede adoptar hasta saber la prioridad y el punto. El costo depende del medio de evidencia. La puntuación de abajo usa un medio todavía indefinido y no es una cotización.
- Precondiciones: `SOL-SEC-005` entendido, más `OQ-SEC-001`.
- Evaluación inicial del proyecto:
  - Costo: `medium`
  - Complejidad de implementación: `high`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `medium`
  - Dependencia de hardware: `medium`
  - Escalabilidad: `medium`
  - Auditabilidad: `medium`
  - Factibilidad actual: `low`
- recommendedNow: `investigate`
- recommendedAtScale: `investigate`
- Razón: es la forma honesta de dejar la intrusión abierta. No entra al paquete inicial. No duplica una compra; dice que `SOL-SEC-007` sin procedimiento no se recomienda.
- Preguntas para validar: `OQ-SEC-001`.

## Sanidad

### SOL-HEALTH-001 — Nota sanitaria en la ficha

- Descripción: cuando hay vacuna, medicamento, baño o problema observado, se anota qué, a quién y cuándo, con el producto si se sabe.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-HEALTH-001`, `PP-DATA-001`
- Capacidades: `CAP-HEALTH-001`, `CAP-DATA-001`
- Cómo ayuda: la memoria deja de ser el archivo. No intenta dirigir el calendario veterinario.
- Ventajas: fricción baja si el hecho ya se le cuenta al propietario. Proporcional a la prioridad dicha.
- Desventajas: no mejora el manejo en manga ni evita lazar. No recuerda una vacuna cuyo calendario se desconoce.
- Precondiciones: `TGT-HEALTH-001`. `OQ-HEALTH-001` sigue abierta.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: cabe en el mismo hábito de registro del propietario, sin subir la sanidad por encima de alimento, peso, rentabilidad y seguridad.
- Preguntas para validar: `OQ-HEALTH-001`. Si el medicamento debe descontar bodega desde el primer día (`DQ-INV-001`).

### SOL-HEALTH-002 — Recordatorios de calendario sanitario

- Descripción: avisos de vacunas, baños o refuerzos según un calendario.
- Tipos: `SOFTWARE`, `POLICY`
- Dolores: `PP-HEALTH-001`
- Capacidades: `CAP-HEALTH-001`
- Cómo ayuda: podría evitar olvidos cuando exista un calendario real.
- Ventajas: encaja con la revisión semanal si los avisos son pocos.
- Desventajas: no hay calendario documentado. Un recordatorio inventado sería una política veterinaria que este diseño no tiene.
- Precondiciones: `OQ-HEALTH-001`.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `medium`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `low`
  - Dependencia humana: `medium`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: la nota sí; el recordatorio no, hasta que el calendario sea del rancho y no de esta ficha.
- Preguntas para validar: `OQ-HEALTH-001`.

## Reproducción

### SOL-REPRO-001 — Registro de nacimiento

- Descripción: al conocer un nacimiento se abre la ficha del becerro y se anotan madre si se reconoce, sexo y fecha aproximada, con foto si se tomó.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-REPRO-001`, `PP-ID-001`, `PP-DATA-001`
- Capacidades: `CAP-REPRO-001`, `CAP-ID-001`
- Cómo ayuda: el parto deja de existir solo en la memoria y el becerro tiene identidad antes del arete.
- Ventajas: usa datos que el rancho dijo estar dispuesto a tomar. No exige corral de parto.
- Desventajas: no registra los partos que nadie vio. La fecha puede ser aproximada.
- Precondiciones: `OQ-ID-001` no bloquea anotar lo que sí se vio. Sí impide exigir detección el mismo día.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: es el inicio del historial de crecimiento y de la genealogía, con fricción baja. La foto, si existe, entra por `SOL-DATA-002`.
- Preguntas para validar: `OQ-ID-001`.

### SOL-REPRO-002 — Inferencia de padre por el único toro

- Descripción: si sigue habiendo un solo toro de monta natural, el padre puede quedar inferido, con motivo «único toro presente». La certeza es inferida, nunca observada ni confirmada. La madre usa las mismas tres certezas en el nacimiento: observada, inferida o desconocida.
- Tipos: `PROCESS`, `POLICY`
- Dolores: `PP-REPRO-001`
- Capacidades: `CAP-REPRO-001`
- Cómo ayuda: el parentesco informal queda escrito con su límite.
- Ventajas: no exige otro manejo ni un análisis.
- Desventajas: la inferencia cae si hay otro toro, si el toro no estaba, o si más adelante hay inseminación. Nada de eso está medido.
- Precondiciones: `BR-REPRO-001`. Un solo toro.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `low`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `none`
  - Dependencia de hardware: `none`
  - Escalabilidad: `low`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `no`
- Paquete: deseable. El nacimiento del mínimo puede dejar el padre desconocido.
- Razón: el único toro es un motivo de inferencia, no una paternidad. A escala, con más de un padre posible, esta política no sirve.
- Preguntas para validar: `OQ-REPRO-001`.

### SOL-REPRO-003 — Comparar líneas más adelante

- Descripción: cuando haya nacimientos, pesos y ventas suficientes, comparar resultados entre líneas. Las razas no se nombraron.
- Tipos: `SOFTWARE`
- Dolores: `PP-REPRO-001`, `PP-GROW-001`
- Capacidades: `CAP-REPRO-001`, `CAP-GROW-001`
- Cómo ayuda: es el uso de largo plazo de la genealogía. No crea los datos.
- Ventajas: no cambia el manejo de hoy.
- Desventajas: con un solo toro y sin razas, la comparación casi no tiene contraste. Presentarla ahora sería vacía.
- Precondiciones: historia de `SOL-REPRO-001` y de pesos. `OQ-GEN-001`.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `medium`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `low`
  - Dependencia humana: `low`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: el interés es explícito y de largo plazo. El registro de nacimiento es el camino. La comparación no es alcance inicial.
- Preguntas para validar: `OQ-GEN-001`, `OQ-REPRO-001`.

## Comunicación

### SOL-COMM-001 — El propietario asienta lo que ya recibe

- Descripción: teléfono, WhatsApp, foto y audio siguen como canal de campo. El propietario pasa al registro lo que decide conservar. No hay integración con una API.
- Tipos: `PROCESS`
- Dolores: `PP-GOV-001`, `PP-DATA-002`, `PP-CONN-001`
- Capacidades: `CAP-COMM-001`, `CAP-DATA-002`, `CAP-CONN-001`
- Cómo ayuda: respeta `BR-ENTRY-001`. La evidencia llega sin convertir a los trabajadores en usuarios.
- Ventajas: no cambia el teléfono del trabajador. Tolera que el mensaje salga cuando haya señal.
- Desventajas: el propietario puede volverse el cuello de botella. Si el hábito se abandona, el paquete inicial se cae. A escala ese cuello aprieta más.
- Precondiciones: `CON-ENTRY-001`, `DQ-HABIT-001`.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `low`
  - Escalabilidad: `low`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `investigate`
- Razón: es la única vía de captura alineada con la dirección actual. Se recomienda ahora y no se da por buena para un hato grande. La fricción `medium` reconoce el trabajo nuevo del propietario.
- Preguntas para validar: `DQ-HABIT-001`.

### SOL-COMM-002 — Aplicación de captura para los trabajadores

- Descripción: los trabajadores registrarían en un aplicativo, en una etapa posterior a la inicial.
- Tipos: `SOFTWARE`
- Dolores: `PP-GOV-001`, `PP-DATA-002`
- Capacidades: `CAP-COMM-001`, `CAP-CONN-001`
- Cómo ayuda: repartiría la captura si el volumen deja de caber en el propietario.
- Ventajas: los trabajadores viven en el rancho y tienen teléfonos Android. Podría acercar el dato al hecho.
- Desventajas: contradice la dirección inicial. Añade hábito, entrenamiento y un problema de conectividad en el campo que ahora se puede posponer. No está justificada con aproximadamente 21 cabezas.
- Precondiciones: que `SOL-COMM-001` se haya vuelto insuficiente, y `OQ-CONN-001`.
- Evaluación inicial del proyecto:
  - Costo: `medium`
  - Complejidad de implementación: `high`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `medium`
  - Dependencia de conectividad: `medium`
  - Dependencia de hardware: `low`
  - Escalabilidad: `high`
  - Auditabilidad: `high`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: la propia dirección de producto la deja para después. La complejidad es de adopción en el campo, no una estimación de programación.
- Preguntas para validar: `DQ-HABIT-001`, `OQ-CONN-001`.

### SOL-COMM-003 — Integración con una API de mensajería

- Descripción: los mensajes entrarían solos al registro desde WhatsApp u otro canal, por una integración. No se diseña.
- Tipos: `SOFTWARE`, `AUTOMATION`
- Dolores: `PP-DATA-002`, `PP-GOV-001`
- Capacidades: `CAP-COMM-001`
- Cómo ayuda: reduciría el copiado del propietario.
- Ventajas: el canal de campo ya es WhatsApp, entre otros.
- Desventajas: no está requerida. Un mensaje automático seguiría siendo, muchas veces, un dato declarado. Dependencia alta de un tercero y de la red. Puede capturar ruido.
- Precondiciones: que el copiado manual sea el problema dominante. Hoy ni siquiera existe el registro.
- Evaluación inicial del proyecto:
  - Costo: `high`
  - Complejidad de implementación: `high`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `low`
  - Dependencia de conectividad: `high`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `high`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: el deseo de recibir fotos y audios no implica integrar el canal. `SOL-COMM-001` basta para evaluar el hábito.
- Preguntas para validar: ninguna hasta que el registro manual exista y se sepa qué mensajes merecen guardarse.

## Conectividad

### SOL-CONN-001 — Registrar después, donde el propietario sí tiene conexión

- Descripción: el hecho ocurre en el rancho aunque no haya señal. La foto, el audio o la nota esperan. El propietario completa el registro cuando puede. No se diseña sincronización.
- Tipos: `PROCESS`
- Dolores: `PP-CONN-001`, `PP-GOV-001`
- Capacidades: `CAP-CONN-001`, `CAP-COMM-001`
- Cómo ayuda: los flujos críticos no exigen red en el potrero.
- Ventajas: coincide con la captura por el propietario. No pide internet de sitio ni una aplicación de campo.
- Desventajas: hay demora entre el hecho y el registro. Un faltante confirmado que no puede comunicarse sigue sin aviso remoto; esta opción no crea magia de señal.
- Precondiciones: `CON-NET-001`, `CON-NET-002`. El propietario necesita conexión en el lugar donde registra, que puede no ser el potrero.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `medium`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: es la forma actual de tolerar mala cobertura sin diseñar arquitectura. La dependencia `low` significa que el rancho puede estar sin señal y el registro ocurre después, no que el sistema funcione para siempre sin ninguna red.
- Preguntas para validar: `OQ-CONN-001`, `DQ-HABIT-001`.

### SOL-CONN-002 — Captura de campo sin conexión y sincronización posterior

- Descripción: una captura hecha en el rancho se completaría sin red y se incorporaría después, evitando perder el dato. El cómo técnico no se diseña. Está nombrado en `CON-NET-003` como restricción prevista, no como alcance.
- Tipos: `SOFTWARE`
- Dolores: `PP-CONN-001`
- Capacidades: `CAP-CONN-001`
- Cómo ayuda: importaría si los trabajadores capturaran en el campo.
- Ventajas: acerca el registro al momento del hecho cuando la señal falla.
- Desventajas: hoy no hay usuario de campo. Diseñar conflictos, duplicados y sobrescrituras sería arquitectura, y este documento no la hace. La factibilidad se queda baja por eso, no porque la necesidad sea falsa.
- Precondiciones: `SOL-COMM-002` o un equivalente, y `OQ-CONN-001`.
- Evaluación inicial del proyecto:
  - Costo: `high`
  - Complejidad de implementación: `high`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `medium`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `low`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `low`
- recommendedNow: `investigate`
- recommendedAtScale: `investigate`
- Razón: se reconoce la restricción y no se adopta el mecanismo. `SOL-CONN-001` cubre el ahora.
- Preguntas para validar: `OQ-CONN-001`, `OQ-NET-001`.

### SOL-CONN-003 — Internet de sitio

- Descripción: una conexión del predio, del tipo que sea. Starlink es un ejemplo dicho en el descubrimiento, no una decisión.
- Tipos: `HARDWARE`
- Dolores: `PP-CONN-001`
- Capacidades: `CAP-CONN-001`
- Cómo ayuda: podría facilitar avisos y captura en el sitio. No ordena los datos por existir.
- Ventajas: bajaría la dependencia del celular irregular, si funcionara en ese terreno.
- Desventajas: no está decidido. No sustituye identidad, alimento ni presencia. El costo no se cotizó aquí; la puntuación `high` no es un precio.
- Precondiciones: `OQ-NET-001`.
- Evaluación inicial del proyecto:
  - Costo: `high`
  - Complejidad de implementación: `high`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `low`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `high`
  - Escalabilidad: `high`
  - Auditabilidad: `low`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: el paquete inicial tiene que servir sin esa obra. Instalar internet no es una recomendación de este diseño.
- Preguntas para validar: `OQ-NET-001`, `OQ-CONN-001`.

## Gestión

### SOL-GOV-001 — Resumen aproximadamente semanal

- Descripción: una revisión de periodo con identidad, pesos, alimento, egresos, diferencias de bodega y presencia. Los huecos se ven.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-GOV-001`
- Capacidades: `CAP-GOV-001`
- Cómo ayuda: junta lo que hoy llega disperso, en la cadencia que el propietario ya prefiere.
- Ventajas: no añade una ronda de campo. Evita abrir el rancho todos los días para gestión ordinaria.
- Desventajas: si nadie registró, el resumen está vacío. No crea los datos de los otros procesos.
- Precondiciones: el paquete de registro. `BR-CADENCE-001`.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `medium`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `medium`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: es la cadencia de gestión, no un tablero comprometido. La factibilidad es `medium` porque depende de que existan registros. Mostrar el vacío es parte del resultado.
- Preguntas para validar: `DQ-HABIT-001`. Qué cabe en la revisión sin volverla tediosa.

### SOL-GOV-002 — Aviso solo de excepciones críticas

- Descripción: aviso en el momento para un faltante confirmado, un problema grave de un animal, u otra situación que el propietario marque. El resto espera a la semana.
- Tipos: `PROCESS`, `POLICY`
- Dolores: `PP-GOV-001`, `PP-SEC-001`
- Capacidades: `CAP-GOV-001`, `CAP-SEC-001`
- Cómo ayuda: separa lo urgente del ruido.
- Ventajas: coincide con `BR-CADENCE-001`. Un faltante confirmado no espera quince días.
- Desventajas: no hay lista cerrada de problemas graves. Un aviso no sale del rancho si no hay cómo comunicarlo (`OQ-CONN-001`). La política no detecta el faltante; solo dice qué se hace cuando ya se confirmó.
- Precondiciones: `DQ-GOV-001`. Una confirmación humana, no un sensor.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `medium`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Razón: la política es clara aunque la lista fina no lo sea. No se recomienda un aviso por pesaje, ticket o mensaje.
- Preguntas para validar: `DQ-GOV-001`.

## Leche

### SOL-MILK-001 — Economía de leche de grupo, solo si se retoma

- Descripción: si volviera la ordeña, registrar producción de grupo, costo e ingreso de esa actividad, aparte de la engorda. No usa el recuerdo de aproximadamente 150 litros ni de 22 vacas.
- Tipos: `PROCESS`
- Dolores: `PP-MILK-001`
- Capacidades: `CAP-MILK-001`
- Cómo ayuda: daría la base para decidir si la leche conviene.
- Ventajas: no exige medición por vaca, que sigue sin decidirse.
- Desventajas: no hay operación vigente. La infraestructura requiere mantenimiento y este diseño no lo ordena. La economía histórica detallada está abierta.
- Precondiciones: una decisión de retomar, que no existe. `OQ-MILK-001`.
- Evaluación inicial del proyecto:
  - Costo: `medium`
  - Complejidad de implementación: `medium`
  - Fricción operativa: `medium`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `medium`
  - Escalabilidad: `medium`
  - Auditabilidad: `medium`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: condicional. `no` ahora no es un rechazo de la leche a largo plazo. Es la negativa a meterla en el flujo inicial. El hardware `medium` reconoce infraestructura existente sin afirmar que sirva.
- Preguntas para validar: `OQ-MILK-001`, `OQ-MILK-002`.

### SOL-MILK-002 — Medición de leche por vaca

- Descripción: producción atribuida a cada vaca, solo si se retoma la leche y si entonces se decide que el grupo no basta.
- Tipos: `PROCESS`, `HARDWARE`
- Dolores: `PP-MILK-001`
- Capacidades: `CAP-MILK-001`
- Cómo ayuda: permitiría ver diferencias entre vacas. Puede ser útil después. No es requisito inicial ni siquiera del futuro condicional.
- Ventajas: más detalle para comparar animales.
- Desventajas: más manejo, más fricción, y `OQ-MILK-002` lo deja sin decidir. Inútil mientras no haya ordeña.
- Precondiciones: `SOL-MILK-001` activo y `OQ-MILK-002` respondida.
- Evaluación inicial del proyecto:
  - Costo: `medium`
  - Complejidad de implementación: `high`
  - Fricción operativa: `high`
  - Confiabilidad del dato: `high`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `medium`
  - Escalabilidad: `high`
  - Auditabilidad: `high`
  - Factibilidad actual: `low`
- recommendedNow: `no`
- recommendedAtScale: `investigate`
- Razón: ni el futuro condicional la da por necesaria. Medir el grupo sería el primer peldaño si la leche volviera.
- Preguntas para validar: `OQ-MILK-002`.

## Salida, venta y lugar

Estas tres fichas se añaden en v0.2. El resto del catálogo permanece.

### SOL-SALE-001 — Registrar el ingreso conocido de una venta

- Descripción: una venta deja cantidad o peso si se conoce, precio unitario si aplica, ingreso total conocido, comprador y evidencia si existe. No calcula margen. El mismo evento deja la salida con motivo venta.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-FIN-001`
- Capacidades: `CAP-FIN-001`, `CAP-LIFE-001`
- Cómo ayuda: el ingreso existe aunque la rentabilidad provisional todavía no se mire.
- Ventajas: el propietario ya cierra la venta. Poca fricción.
- Desventajas: no dice si convino. No traduce el bulto.
- Precondiciones: `BR-SALE-001`. `OQ-TRADE-001` sigue abierta.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Paquete: mínimo.
- Razón: sin ingreso no hay lectura económica, ni siquiera provisional. Registrarlo no exige el modelo completo.
- Preguntas para validar: `OQ-TRADE-001`.

### SOL-LIFE-001 — Registrar la salida y conservar la historia

- Descripción: un animal deja de estar activo por venta, muerte, faltante confirmado, otra salida o motivo desconocido. La ficha permanece. Dejar de verlo no es, por sí solo, esta baja.
- Tipos: `PROCESS`, `SOFTWARE`
- Dolores: `PP-SEC-001`, `PP-DATA-001`
- Capacidades: `CAP-LIFE-001`, `CAP-SEC-001`
- Cómo ayuda: la lista de activos no se queda con animales que ya salieron, y el historial no se borra.
- Ventajas: no exige saber la regla de reposición.
- Desventajas: un motivo desconocido es honesto y poco útil para el dinero. No calcula compensación.
- Precondiciones: `TGT-ANIMAL-EXIT-001`. La venta usa el mismo hecho, no otro trámite.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `low`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Paquete: mínimo.
- Razón: sin salida, la presencia y la economía siguen contando animales que ya no están. `OQ-OWN-002` no se interpreta.
- Preguntas para validar: `DQ-HERD-001`, `OQ-OWN-002`.

### SOL-LAND-001 — Lugar esperado, o desconocido

- Descripción: un animal o un grupo queda en un potrero o lugar, desde una fecha, o queda con lugar desconocido. Sirven los potreros ya nombrados. No se pide su superficie ni un aparato.
- Tipos: `PROCESS`
- Dolores: `PP-SEC-002`, `PP-FEED-001`, `PP-GOV-001`
- Capacidades: `CAP-LAND-001`, `CAP-SEC-001`, `CAP-FEED-001`
- Cómo ayuda: el grupo de alimento, el conteo y la última observación tienen un dónde, cuando se sabe.
- Ventajas: no exige GPS ni el croquis de las 530 hectáreas.
- Desventajas: un lugar dicho puede estar mal. No verifica que el animal siga ahí.
- Precondiciones: `OQ-LAND-001` puede seguir abierta. Desconocido es válido.
- Evaluación inicial del proyecto:
  - Costo: `low`
  - Complejidad de implementación: `low`
  - Fricción operativa: `low`
  - Confiabilidad del dato: `medium`
  - Dependencia humana: `high`
  - Dependencia de conectividad: `none`
  - Dependencia de hardware: `none`
  - Escalabilidad: `high`
  - Auditabilidad: `medium`
  - Factibilidad actual: `high`
- recommendedNow: `yes`
- recommendedAtScale: `yes`
- Paquete: deseable. El mínimo puede dejar el lugar desconocido.
- Razón: el modelo necesita el lugar para no inventar un mapa. Llenarlo el primer día no es requisito.
- Preguntas para validar: `OQ-LAND-001`, `OQ-LAND-002`.

## Lectura de los indicadores

`recommendedNow: yes` no significa que la opción entre al paquete mínimo. El mínimo, lo deseable y lo que queda fuera están en [README.md](README.md). Las familias están en [solution-families.md](solution-families.md).

Ninguna marca es una decisión. Donde la efectividad de un dolor es solo visibilidad, o no está abordado, la existencia de una opción no lo promueve.

## Estado del documento

- Versión: 0.2
- Estado: Diseño de dominio, no alcance aprobado
- Última actualización: 2026-10-03
- Fuente: `docs/domain` v0.1, TO-BE v0.1 y el plan 005
- Validación: Pendiente de validación iterativa con el propietario del rancho

