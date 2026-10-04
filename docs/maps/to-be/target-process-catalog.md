# Catálogo de procesos objetivo

Cómo debería operar el rancho en términos de negocio. Un proceso objetivo no es una pantalla, una tabla, un módulo ni un contrato de software.

La conectividad no es un proceso. Es una condición de los procesos críticos: el hecho puede ocurrir sin señal, y el registro puede completarlo después el propietario. Las opciones están en [solution-catalog.md](solution-catalog.md) (`SOL-CONN-001`, `SOL-CONN-002`, `SOL-CONN-003`).

Ningún paso de esta lista cierra una pregunta abierta. Donde el descubrimiento no fijó un hecho, el paso se detiene.

Los actores usan los ID de [../../domain/actors.md](../../domain/actors.md). Participar no implica una cuenta.

## TGT-ANIMAL-001 — Ficha con identidad estable

- Disparador: el rancho pasa a gestionar un animal. Puede ser del hato actual, de una compra o de un nacimiento.
- Actores: `ACT-OWNER` registra. `ACT-WORKER` puede reconocer al animal y aportar una foto o un nombre. `ACT-PARTNER` importa solo si el animal entra en «a la parte»; no se asume que use el registro.
- Pasos deseados:
  1. Abrir una identidad propia del rancho en el momento en que el animal se va a gestionar.
  2. Anotar sexo, categoría aproximada si se conoce, y régimen económico si se conoce. El régimen no se reduce a un nombre de dueño.
  3. Colgar en esa identidad las marcas que existan: SINIIGA, nombre, foto. Si no hay marca, la identidad existe igual.
  4. Cuando una marca aparezca, cambie o se pierda, actualizar la misma identidad. No abrir otro animal por un arete nuevo.
  5. Dejar dicho quién asentó el dato, cuándo y si el dato fue declarado u observado.
- Información que produce: ficha del animal, marcas asociadas, régimen si se conoce, huecos explícitos si no se conoce.
- Evidencia que produce: foto, si se tomó. La ausencia de arete queda dicha, no supuesta.
- Dolores: `PP-ID-001`, `PP-DATA-001`
- Capacidades: `CAP-ID-001`, `CAP-DATA-001`, `CAP-DATA-002`
- Excepciones y preguntas: `OQ-OWN-003` impide dar por hecha la ficha de las aproximadamente 21 cabezas. `OQ-OWN-001` y `OQ-OWN-004` impiden cerrar el régimen. No se elige arete secundario ni RFID. Una salida distinta de la venta de becerros, como muerte o reposición, no tiene paso cerrado (`OQ-OWN-002`, `DQ-HERD-001`).

## TGT-BIRTH-001 — Nacimiento con identidad previa al arete

- Disparador: se detecta un parto o un becerro recién nacido.
- Actores: `ACT-WORKER` lo observa en el campo. `ACT-OWNER` lo asienta con lo que le llega. El toro y la madre son datos, no usuarios.
- Pasos deseados:
  1. Avisar el nacimiento con lo que se sepa ese día. El mismo día es deseable y no es una regla medida: no se sabe cómo se detecta el parto (`OQ-ID-001`).
  2. Abrir la ficha del becerro aunque no tenga arete ni nombre. Vale el proceso `TGT-ANIMAL-001`.
  3. Anotar madre si se reconoce, sexo, y fecha u hora, o fecha aproximada si el día exacto no se vio.
  4. Conservar foto si se tomó.
  5. Dejar la filiación de ese día como primer vínculo. Corregirla después es `TGT-REPRO-001`.
  6. El arete posterior se asocia a esta ficha.
- Información que produce: nacimiento, cría, madre conocida o desconocida, sexo, fecha aproximada.
- Evidencia que produce: mensaje, foto o audio, con su clase de dato.
- Dolores: `PP-REPRO-001`, `PP-ID-001`, `PP-DATA-001`, `PP-DATA-002`
- Capacidades: `CAP-REPRO-001`, `CAP-ID-001`, `CAP-DATA-001`, `CAP-DATA-002`, `CAP-COMM-001`
- Excepciones y preguntas: `OQ-ID-001`. La preferencia de esperar alrededor de un mes para aretar sigue sin medirse (`BR-ID-003`). Corral de parto y calostro en las primeras horas aproximadas son meta de manejo, no paso de este proceso (`BR-COLOSTRUM-001`). El reparto de la cría «a la parte» no se calcula aquí (`OQ-OWN-001`).

## TGT-WEIGH-001 — Pesaje de becerros con historial

- Disparador: una sesión de pesaje de becerros. Hoy esa práctica es de aproximadamente cada 15 días. No es diaria.
- Actores: `ACT-WORKER` reúne y pasa la manga. `ACT-OWNER` asienta el peso a partir del cuaderno, de una foto o, solo si un día se confirmara, de una lectura de aparato.
- Pasos deseados:
  1. Partir de los becerros que entran a la rutina. Cuáles son sigue abierto (`OQ-OWN-003`).
  2. Identificar al animal en la manga contra la ficha.
  3. Asentar el peso como medición, con fecha y origen: número anotado, foto del indicador, o lectura de aparato si existiera.
  4. Marcar el becerro esperado que no se pesó.
  5. Con dos pesos del mismo animal, poder ver la ganancia del intervalo. No hace falta una curva el primer día.
  6. Una serie rara o un hueco se ve en la revisión semanal. No genera un aviso por cada kilo.
- Información que produce: serie de pesos, pesaje faltante, ganancia entre fechas.
- Evidencia que produce: la anotación, la foto del indicador, o el dato de aparato, según la opción que esté en uso. Esas opciones no están decididas.
- Dolores: `PP-GROW-001`, `PP-DATA-001`, `PP-DATA-002`
- Capacidades: `CAP-GROW-001`, `CAP-DATA-001`, `CAP-DATA-002`, `CAP-ID-001`
- Excepciones y preguntas: las vacas adultas no entran a esta rutina (`BR-WEIGH-001`). Pueden pesarse al vender o cuando sirva. `OQ-SCALE-001` y `CON-SCALE-001` impiden asumir la báscula IBN ARGON como fuente electrónica. El peso de una compra que llega no es este proceso (`TGT-PUR-001`). La sesión dura aproximadamente una hora; el tamaño exacto del grupo no se dijo (`BR-WEIGH-003`).

## TGT-FEED-001 — Compra, preparación, entrega y contraste de alimento

- Disparador: entra materia prima, se prepara una mezcla o se reparte alimento.
- Actores: `ACT-OWNER` compra y transporta. `ACT-WORKER` prepara y reparte. `ACT-FEED` es el proveedor, sin acceso supuesto al registro.
- Pasos deseados:
  1. Registrar la compra: qué entró, la cantidad que traiga el ticket o la que se anote, y el costo.
  2. Registrar la preparación por lote o por tambo: qué se mezcló y cuánto se preparó, sin inventar la fórmula (`OQ-FEED-003`).
  3. Registrar la entrega al grupo: cantidad ofrecida y grupo aproximado. No anotar consumo individual.
  4. Dejar visibles la cantidad comprada, la preparada, la entregada y, cuando se cuente, lo que queda.
  5. No elegir un supuesto que haga cuadrar alrededor de MXN $8/kg, alrededor de 1.5 kg por animal por día y alrededor de 270 kg en alrededor de 15 días (`OQ-FEED-002`).
  6. El saldo de ingredientes en bodega sigue en `TGT-INV-001`.
- Información que produce: compras, preparaciones, entregas a grupo, diferencias no explicadas.
- Evidencia que produce: ticket de compra y, si se usó, foto o nota de la preparación y de la entrega.
- Dolores: `PP-FEED-001`, `PP-INV-001`
- Capacidades: `CAP-FEED-001`, `CAP-INV-001`, `CAP-DATA-002`
- Excepciones y preguntas: `OQ-FEED-001` no dice si hoy hay báscula de alimento, recipiente o solo estimación visual. La competencia en el comedero impide leer lo que comió cada animal (`BR-FEED-001`). La frecuencia realista de la anotación es `DQ-FEED-004`. Relacionar esto con crecimiento y costo es `CAP-FEED-002` y no es un paso exigible mientras las cifras no se reconozcan.

## TGT-INV-001 — Entradas, salidas y conciliación de bodega

- Disparador: llega material, sale para usarse, o se hace un conteo.
- Actores: `ACT-OWNER`, `ACT-WORKER`.
- Pasos deseados:
  1. Anotar la entrada cuando el material llega a la bodega.
  2. Anotar la salida cuando se usa. Para la dieta, la salida puede ser la preparación de `TGT-FEED-001`.
  3. Ver el saldo que debería haber.
  4. En una cadencia corta y realista para este rancho, contar lo físico y anotar la diferencia.
  5. Tratar la diferencia como un hecho a revisar, no como una culpa ya asignada.
- Información que produce: movimientos, saldo teórico, conteo, diferencia.
- Evidencia que produce: ticket de entrada y nota o foto del conteo.
- Dolores: `PP-INV-001`, `PP-FEED-001`
- Capacidades: `CAP-INV-001`, `CAP-FEED-001`
- Excepciones y preguntas: `DQ-INV-001` pregunta si el primer contraste se limita a ingredientes de la dieta. Medicamento, herramienta y otros materiales caben en la bodega real y no están exigidos el primer día. No es un almacén industrial.

## TGT-EXPENSE-001 — Gasto con comprobante y clase de gestión

- Disparador: un pago o un ticket que el propietario ya suele guardar, incluida la nómina en efectivo.
- Actores: `ACT-OWNER`. `ACT-FEED` y `ACT-PARTNER` son referentes económicos, no usuarios supuestos.
- Pasos deseados:
  1. Conservar el comprobante. Si el pago fue en efectivo y no hay ticket, conservar una nota del pago.
  2. Clasificar el egreso, como visibilidad de gestión, en gasto operativo o inversión. El criterio exacto sigue abierto (`OQ-FIN-001`).
  3. Atribuir a un animal, a un grupo o a la operación general solo cuando esa atribución se conozca. No prorratear «a la parte» con una regla nueva.
  4. Dejar el egreso disponible para una lectura económica posterior, sin presentar esa lectura como cerrada.
- Información que produce: egreso, clase de gestión, comprobante o nota, atribución si existe.
- Evidencia que produce: foto o papel del ticket, o nota de efectivo.
- Dolores: `PP-FIN-001`, `PP-FIN-002`
- Capacidades: `CAP-FIN-002`, `CAP-FIN-001`, `CAP-DATA-002`
- Excepciones y preguntas: `CON-ACC-001`. `OQ-PEOPLE-001` deja sin monto la nómina y los apoyos. `OQ-OWN-001` bloquea la parte del ranchero. El combustible sigue siendo solo el ejemplo del glosario; no se crea aquí un control de combustible.

## TGT-PUR-001 — Entrada económica del ganado comprado

- Disparador: una compra de ganado.
- Actores: `ACT-OWNER`, `ACT-SELLER`. `ACT-PARTNER` si el animal entra a ese arreglo.
- Pasos deseados:
  1. Registrar precio, forma de compra y flete. El flete lo paga el comprador (`BR-BUY-002`).
  2. Conservar la forma «por kilogramo» o «por bulto» sin traducir el bulto a un precio por cabeza o a un peso promedio (`OQ-TRADE-001`).
  3. Asociar animales a fichas cuando se puedan identificar. En un bulto, el lote puede entrar antes que la ficha de cada cabeza.
  4. Si se pesa en el rancho después del viaje, guardar ese peso como medición distinta del peso o del precio de compra. No fijar el plazo de descanso (`BR-WEIGH-004`).
- Información que produce: costo de entrada, forma de compra, lote o animales, peso de llegada si se tomó.
- Evidencia que produce: comprobante de compra y de flete, si se guardó. El peso de llegada, si existió, con su origen.
- Dolores: `PP-FIN-001`, `PP-ID-001`
- Capacidades: `CAP-FIN-001`, `CAP-ID-001`, `CAP-DATA-002`
- Excepciones y preguntas: `OQ-TRADE-001`, `OQ-OWN-004`. Pesar al llegar es preferencia dicha, no rutina confirmada. No hay flecha obligatoria hacia `TGT-WEIGH-001`.

## TGT-SALE-001 — Venta y lectura económica

- Disparador: una venta. Hoy la venta principal es de becerros por kilogramo de peso vivo.
- Actores: `ACT-OWNER`, `ACT-BUYER`.
- Pasos deseados:
  1. Registrar ingreso y, cuando así se comercialice, el peso vivo de la venta y los animales que salen.
  2. Sacar esos animales de la lista de quienes deberían estar, sin borrar su historial.
  3. Cuando haya costos de entrada, alimento y otros egresos ya registrados, estimar costo de criar, margen y costo por kilogramo ganado.
  4. Si falta el prorrateo, el régimen o una cantidad de alimento no reconciliada, mostrar la lectura como incompleta.
  5. No tratar la venta por bulto como paso vigente (`BR-SALE-002`).
- Información que produce: ingreso, animales que salen, lectura económica parcial o incompleta.
- Evidencia que produce: comprobante de la venta, si se guardó, y el peso de venta con su origen.
- Dolores: `PP-FIN-001`
- Capacidades: `CAP-FIN-001`, `CAP-GROW-001`, `CAP-SEC-001`
- Excepciones y preguntas: `OQ-OWN-001`, `OQ-TRADE-001`, `OQ-FEED-002`. Comparar con leche no es paso de este proceso mientras `CAP-MILK-001` siga condicional. El peso de venta y el último peso de la rutina de becerros pueden no ser el mismo dato; no se fusionan por decreto.

## TGT-SEC-001 — Verificación de presencia

- Disparador: una verificación que el rancho llegue a adoptar, o un manejo que ya reúne animales, como el pesaje o la manga.
- Actores: `ACT-WORKER` ve el ganado. `ACT-OWNER` asienta el resultado.
- Pasos deseados:
  1. Partir de la lista de animales que deberían estar.
  2. Registrar a quién se vio, en qué ocasión, y a quién no se pudo confirmar.
  3. Dejar la fecha de la última verificación utilizable.
  4. Un faltante confirmado se trata como excepción crítica de `TGT-GOV-001`.
  5. No convertir un animal no visto en un robo. La participación interna está nombrada como posibilidad, no como explicación de cada falta.
- Información que produce: vistos, no confirmados, última verificación.
- Evidencia que produce: la ocasión del manejo, un conteo, una foto o un paso por un punto, según la opción. Ninguna está elegida como política única.
- Dolores: `PP-SEC-001`, `PP-SEC-002`
- Capacidades: `CAP-SEC-001`, `CAP-DATA-002`
- Excepciones y preguntas: `OQ-COUNT-001`, `CON-LAND-001`. Un pesaje de becerros no demuestra que el resto del hato siga en el predio. `DQ-HERD-001` y `OQ-OWN-002`: muerte y reposición desalinean la lista si no se anotan. Este proceso no detecta una intrusión (`TGT-SEC-002`).

## TGT-SEC-002 — Evidencia de acceso o de cerco

- Disparador: una revisión de accesos o de cerco, o un hallazgo de corte, acceso abierto o salida no explicada.
- Actores: `ACT-WORKER`, `ACT-OWNER`.
- Pasos deseados:
  1. Tratar el hecho como distinto de un faltante de cabezas.
  2. Dejar constancia de qué se revisó o de qué anomalía se vio.
  3. No describir el predio completo como vigilado porque un punto tenga evidencia.
  4. No elegir aquí cámara, luz, sensor ni ronda. Esas son opciones.
- Información que produce: revisión hecha o anomalía observada, con lugar aproximado si se conoce.
- Evidencia que produce: nota, foto o registro de aparato, según la opción no elegida.
- Dolores: `PP-SEC-003`
- Capacidades: `CAP-SEC-002`
- Excepciones y preguntas: `OQ-SEC-001`. Alrededor de 5 accesos es una aproximación. Una cámara no sustituye este proceso. La prioridad frente al registro de ganado no está decidida, así que este proceso no entra al paquete inicial como adopción.

## TGT-HEALTH-001 — Anotación sanitaria básica

- Disparador: una vacuna, un medicamento, un baño o un problema observado.
- Actores: `ACT-WORKER` ejecuta el manejo. `ACT-OWNER` anota. `ACT-VET` no tiene interacción documentada ni acceso supuesto.
- Pasos deseados:
  1. Anotar qué se hizo, a qué animal o grupo, cuándo, y con qué producto si se sabe.
  2. Si el producto salió de la bodega y ese producto se está llevando en `TGT-INV-001`, la salida puede enlazarse. No es obligatorio mientras el alcance de bodega sea solo alimento.
  3. No imponer calendario ni recordatorio. El calendario real no está documentado (`OQ-HEALTH-001`).
  4. Preferir la manga como manejo. Lazar queda como excepción más peligrosa, no como instrucción de este proceso.
- Información que produce: evento sanitario.
- Evidencia que produce: nota y, si se tomó, foto. La memoria deja de ser el único archivo.
- Dolores: `PP-HEALTH-001`, `PP-DATA-001`
- Capacidades: `CAP-HEALTH-001`, `CAP-DATA-001`
- Excepciones y preguntas: la entrevista bajó este tema frente a rentabilidad, peso, alimento y seguridad. El proceso es proporcional a eso. `OQ-HEALTH-001`.

## TGT-REPRO-001 — Filiación que permanece

- Disparador: se corrige una madre, se confirma un padre supuesto, o cambia la situación del toro.
- Actores: `ACT-OWNER` asienta. `ACT-WORKER` reconoce. El toro no es usuario.
- Pasos deseados:
  1. No repetir el alta del nacimiento. Eso ya ocurrió en `TGT-BIRTH-001`.
  2. Ligar o corregir la madre. Si no se reconoce, dejar madre desconocida.
  3. Mientras haya un solo toro de monta natural, anotar a ese toro como padre supuesto, no como prueba.
  4. Si más adelante hubiera más de un toro o inseminación, el supuesto deja de servir. Esa situación no está afirmada (`OQ-REPRO-001`).
  5. Conservar la cadena para una comparación de líneas que hoy no se puede hacer.
- Información que produce: madre, padre supuesto o desconocido, cría, corrección posterior.
- Evidencia que produce: quién dijo el parentesco y si fue reconocimiento o solo dicho.
- Dolores: `PP-REPRO-001`, `PP-DATA-001`
- Capacidades: `CAP-REPRO-001`, `CAP-DATA-002`
- Excepciones y preguntas: `OQ-GEN-001`, `OQ-REPRO-001`, `OQ-OWN-001`. Comparar producción por línea no es paso actual.

## TGT-COMM-001 — Evidencia de campo hacia el propietario

- Disparador: el trabajador ve algo que el propietario necesita para operar o para registrar.
- Actores: `ACT-WORKER` informa. `ACT-OWNER` registra.
- Pasos deseados:
  1. El trabajador comunica por los medios que ya usa: teléfono, WhatsApp, foto o audio.
  2. El propietario incorpora eso a un evento de otro proceso objetivo, sin pedir una aplicación al trabajador en esta etapa.
  3. Un relato queda como dato declarado. Una foto o una medición queda como dato observado, con el límite de lo que realmente muestra.
  4. No se ordena el historial de mensajes como si ya fuera el archivo del rancho.
- Información que produce: evento con origen, persona y clase de dato.
- Evidencia que produce: el archivo o el mensaje que se decidió conservar, ligado al evento.
- Dolores: `PP-DATA-002`, `PP-GOV-001`, `PP-CONN-001`
- Capacidades: `CAP-COMM-001`, `CAP-DATA-002`, `CAP-CONN-001`, `CAP-GOV-001`
- Excepciones y preguntas: `OQ-CONN-001`. Un mensaje puede no salir del rancho en el momento; el registro espera a que el propietario lo tenga (`SOL-CONN-001`). `DQ-HABIT-001` pregunta si ese trabajo del propietario es sostenible. No se asume integración con una API de WhatsApp.

## TGT-GOV-001 — Revisión semanal y excepción crítica

- Disparador: la revisión aproximada de cada semana, o un hecho crítico.
- Actores: `ACT-OWNER`.
- Pasos deseados:
  1. Revisar, en un solo momento, identidad usable, pesos recientes, alimento del periodo, egresos con comprobante, diferencias de bodega y verificaciones de presencia.
  2. Ver los huecos. No rellenarlos con un promedio ni con las cifras de alimento que no cuadran.
  3. Avisar en el momento solo un faltante confirmado, un problema grave de un animal, u otra situación que el propietario marque como crítica.
  4. No avisar cada pesaje, cada ticket, cada mensaje ni cada diferencia pequeña de bodega.
- Información que produce: panorama del periodo y una lista corta de excepciones.
- Evidencia que produce: la revisión se apoya en la evidencia de los otros procesos. No crea una evidencia nueva por sí misma.
- Dolores: `PP-GOV-001`
- Capacidades: `CAP-GOV-001`
- Excepciones y preguntas: `BR-CADENCE-001`, `DQ-GOV-001`. Si los otros registros están vacíos, el panorama muestra el vacío. Eso no se disfraza de gestión completa.

## TGT-MILK-001 — Economía de la leche, condicional

- Horizonte: futuro / condicional. Fuera del flujo operativo inicial.
- Disparador: se decide retomar la ordeña. Ese disparador no está activo.
- Actores: `ACT-OWNER`, `ACT-WORKER`, y `ACT-DAIRY` solo como destino comercial si la relación volviera. Sin acceso supuesto.
- Pasos deseados, únicamente bajo esa condición:
  1. Registrar producción del periodo a un nivel que todavía no está elegido: grupo, u otro nivel si entonces se decide (`OQ-MILK-002`).
  2. Registrar costos e ingreso de esa leche, separados de la engorda.
  3. No usar el máximo recordado de aproximadamente 150 litros ni las 22 vacas como producción del periodo (`BR-MILK-001`).
  4. Con esas cifras, poder decidir si la actividad conviene. La decisión no está tomada.
- Información que produce, si se activara: producción del periodo, costo, ingreso, lectura de si alcanza para comparar.
- Evidencia que produce: la que en ese momento se defina. No se define aquí el medidor ni el tanque como requisito.
- Dolores: `PP-MILK-001`
- Capacidades: `CAP-MILK-001`
- Excepciones y preguntas: `OQ-MILK-001`, `OQ-MILK-002`. La infraestructura requiere mantenimiento; este proceso no ordena repararla. En el AS-IS, `PP-MILK-001` sigue sin proceso vigente, y aquí tampoco entra al flujo inicial.

## Procesos que no se crean

- No hay proceso de arquitectura ni de sincronización.
- No hay proceso de ordeña vigente.
- No hay proceso de muerte o de reposición. Falta el hecho de campo (`DQ-HERD-001`, `OQ-OWN-002`).
- No hay proceso de fuego. Sigue como pregunta de terreno, `OQ-FIRE-001`, en el pastoreo actual.
- No hay proceso de mapa o de GIS.

## Estado del documento

- Versión: 0.1
- Estado: Diseño de dominio, no alcance aprobado
- Última actualización: 2026-10-03
- Fuente: `docs/domain` v0.1 y AS-IS v0.2
- Validación: Pendiente de validación iterativa con el propietario del rancho
