# Catálogo de procesos objetivo

Cómo debería operar el rancho en términos de negocio. Un proceso objetivo no es una pantalla, una tabla, un módulo ni un contrato de software. Versión 0.2.

## Un evento, varios hechos

Un evento operativo se captura una sola vez y puede producir múltiples hechos. Es una regla de trabajo del rancho, no un diseño técnico.

Ejemplos que este catálogo usa:

- En la manga, un becerro deja peso, confirmación de identidad y última observación.
- Una compra de alimento deja el gasto, la entrada a bodega y la cantidad comprada, con su calidad.
- Un nacimiento deja la ficha, el parto, la madre con su certeza, el padre inferido o desconocido, y la evidencia si la hay.
- Una venta deja el ingreso conocido y la salida con motivo venta.

No se abre otro proceso para capturar otra vez el hecho derivado.

## Qué puede quedar desconocido

El modelo tiene que poder contestar, o decir que no se sabe:

1. Qué animal es.
2. Con qué tenencia y qué participación económica se maneja.
3. Dónde se espera que esté.
4. Qué eventos operativos importan y ya ocurrieron.
5. Cuánto pesó.
6. Qué alimento se asoció a su grupo, y de qué calidad es esa cantidad.
7. Qué costos e ingresos se conocen.
8. Si sigue activo.
9. Si no, por qué salió.
10. Cuándo y dónde se le observó por última vez con alguna fiabilidad.
11. Cuál es el resultado provisional de gestión, con su completitud.
12. Qué sigue desconocido.

La conectividad no es un proceso. Es una condición: el hecho puede ocurrir sin señal y el propietario lo asienta después. `CAP-DATA-002`, `CAP-COMM-001` y `CAP-CONN-001` son atributos de esos eventos. Un mapa futuro no tiene que dibujarlos como operaciones.

Ningún paso cierra una pregunta abierta. Los actores usan los ID de [../../domain/actors.md](../../domain/actors.md). Participar no implica una cuenta.

## TGT-ANIMAL-001 — Ficha con identidad, tenencia y participación

- Disparador: el rancho pasa a gestionar un animal. Puede ser del hato actual, de una compra o de un nacimiento. El nacimiento no se captura otra vez aquí: `TGT-BIRTH-001` produce esta ficha.
- Actores: `ACT-OWNER` registra. `ACT-WORKER` puede reconocer al animal. `ACT-PARTNER` importa si el animal entra en «a la parte»; no se asume que use el registro.
- Pasos deseados:
  1. Abrir una identidad propia del rancho. El arete puede no existir todavía.
  2. Anotar sexo y categoría aproximada si se conocen.
  3. Anotar la tenencia: del rancho, «a la parte», de un tercero, o desconocida.
  4. Anotar la participación económica del rancho: conocida, conocida en parte, o desconocida. Si solo hay relato verbal, guardarlo como nota. No convertirlo en porcentaje.
  5. Colgar las marcas que existan. Si una marca cambia, sigue siendo el mismo animal.
  6. Dejar lugar esperado o desconocido. El movimiento posterior es `TGT-MOVE-001`.
  7. Dejar el estado en activo. Una salida posterior es `TGT-ANIMAL-EXIT-001`.
- Información que produce: ficha, tenencia, participación o su hueco, marcas, lugar o desconocido, activo.
- Evidencia que produce: la nota del arreglo, si se guardó. La foto, si se tomó, no es obligatoria para abrir la ficha.
- Dolores: `PP-ID-001`, `PP-DATA-001`, `PP-FIN-001`
- Capacidades: `CAP-ID-001`, `CAP-OWN-001`, `CAP-LIFE-001`, `CAP-LAND-001`, `CAP-DATA-001`
- Excepciones y preguntas: `OQ-OWN-003` impide dar por hecha la ficha de las aproximadamente 21 cabezas. `OQ-OWN-001` y `OQ-OWN-004` impiden cerrar la participación. No se elige arete ni RFID.

## TGT-BIRTH-001 — Nacimiento, una sola captura

- Disparador: se detecta un parto o un becerro recién nacido.
- Actores: `ACT-WORKER` lo observa. `ACT-OWNER` lo asienta. El toro y la madre son datos, no usuarios.
- Pasos deseados, en un solo evento:
  1. Avisar con lo que se sepa. El mismo día no es una regla medida (`OQ-ID-001`).
  2. Crear la ficha del becerro, aunque no tenga arete ni nombre. Queda activa.
  3. Anotar sexo y fecha u hora, o fecha aproximada.
  4. Anotar la madre como observada, inferida o desconocida. Si es inferida, decir el motivo: parto visto, dicho de un trabajador, u otro.
  5. Anotar el padre como inferido o desconocido. Con un solo toro, el motivo de la inferencia es «único toro presente». Eso no es paternidad confirmada. Corregirlo después es `TGT-REPRO-001`, no un alta nueva.
  6. La tenencia de la cría queda desconocida si el reparto «a la parte» no está definido.
  7. La evidencia, si llegó, queda en el mismo evento.
- Información que produce: animal nuevo, nacimiento, certezas de madre y padre, tenencia desconocida si aplica.
- Evidencia que produce: mensaje, foto o audio, con su clase. La foto no es requisito del alta.
- Dolores: `PP-REPRO-001`, `PP-ID-001`, `PP-DATA-001`
- Capacidades: `CAP-REPRO-001`, `CAP-ID-001`, `CAP-OWN-001`, `CAP-LIFE-001`, `CAP-DATA-001`
- Excepciones y preguntas: `OQ-ID-001`, `BR-ID-003`, `BR-COLOSTRUM-001` fuera de este proceso, `OQ-OWN-001`.

## TGT-WEIGH-001 — Pesaje de becerros, una fila por animal

- Disparador: una sesión de pesaje de becerros. Hoy es de aproximadamente cada 15 días. No es diaria.
- Actores: `ACT-WORKER` pasa la manga. `ACT-OWNER` asienta.
- Pasos deseados:
  1. Partir de los becerros que entran a la rutina. Cuáles son sigue abierto (`OQ-OWN-003`).
  2. Por cada becerro que pasa, en una sola captura: confirmar la identidad, asentar el peso con su calidad, y dejar la última observación de ese evento. La foto del indicador, si se toma, es evidencia del mismo hecho, no otro trámite.
  3. Marcar al becerro esperado que no se pesó. Eso es un hueco de peso y también una falta de observación en esa sesión. No es una verificación del hato.
  4. Con dos pesos del mismo animal, poder ver la ganancia del intervalo.
  5. El hueco se ve en la revisión. No genera un aviso por cada kilo.
- Información que produce: peso, identidad confirmada en la manga, última observación, hueco si no pasó, ganancia entre fechas.
- Evidencia que produce: número anotado y, si existe, foto. La calidad del peso es medido cuando viene de la báscula y se transcribe, u observado si solo hay foto de la lectura. Un número dicho sin lectura es declarado.
- Dolores: `PP-GROW-001`, `PP-DATA-001`, `PP-SEC-002`
- Capacidades: `CAP-GROW-001`, `CAP-ID-001`, `CAP-SEC-001`, `CAP-DATA-001`
- Excepciones y preguntas: las vacas adultas no entran (`BR-WEIGH-001`). `OQ-SCALE-001` impide asumir la báscula como fuente electrónica. Esta sesión no verifica al ganado que no estaba citado. El peso de llegada de una compra es `TGT-PUR-001`.

## TGT-FEED-001 — Compra, preparación y entrega, cada una con su calidad

- Disparador: entra materia prima, se prepara una mezcla o se declara una entrega.
- Actores: `ACT-OWNER` compra. `ACT-WORKER` prepara y reparte. `ACT-FEED` no usa el registro.
- Pasos deseados:
  1. Una compra es un solo evento: cantidad comprada, costo, clase de gasto si se conoce, y entrada a bodega. La calidad es observada cuando el ticket trae la cantidad, y declarada cuando alguien la afirma sin comprobante.
  2. Una preparación anota qué se mezcló y cuánto, como cantidad preparada, declarada salvo que se haya medido. Si esa mezcla sale de bodega, la salida es el mismo evento, no otro formulario.
  3. Una entrega anota la cantidad ofrecida a un grupo. Por defecto es entregada declarada. Solo es entregada medida si hubo pesaje o medida del lote (`SOL-FEED-003`, todavía en investigar).
  4. El grupo es el de `CAP-LAND-001` cuando existe. Si no, el grupo queda aproximado o desconocido.
  5. El remanente físico es el conteo de `TGT-INV-001`. No se deduce de una declaración.
  6. No se elige un supuesto para cuadrar las cifras de `OQ-FEED-002`.
- Información que produce: cantidad comprada, preparada, entregada declarada o medida, cada una con su calidad. El remanente solo si se contó.
- Evidencia que produce: ticket y, si se usó, foto. La foto no convierte la entrega en medición.
- Dolores: `PP-FEED-001`, `PP-INV-001`, `PP-FIN-002`
- Capacidades: `CAP-FEED-001`, `CAP-INV-001`, `CAP-FIN-002`, `CAP-LAND-001`
- Excepciones y preguntas: `OQ-FEED-001`, `OQ-FEED-002`, `OQ-FEED-003`, `DQ-FEED-004`, `BR-FEED-001`. `CAP-FEED-002` no se ejecuta aquí.

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
  3. Atribuir a un animal, a un grupo o a la operación general solo cuando esa atribución se conozca. Lo no atribuido queda en la bolsa no asignada. No se prorratea «a la parte».
  4. Dejar el egreso disponible para `TGT-PROFIT-001`. Esta captura no calcula el margen.
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
  3. Asociar animales a fichas cuando se puedan identificar. En un bulto, el lote puede entrar antes que la ficha de cada cabeza. La tenencia y la participación quedan desconocidas si no se saben.
  4. Si se pesa en el rancho después del viaje, guardar ese peso como medición distinta del precio de compra. No fijar el plazo de descanso (`BR-WEIGH-004`).
  5. El lugar esperado inicial puede quedar desconocido.
- Información que produce: costo de entrada, forma de compra, lote o animales, peso de llegada si se tomó.
- Evidencia que produce: comprobante de compra y de flete, si se guardó. El peso de llegada, si existió, con su origen.
- Dolores: `PP-FIN-001`, `PP-ID-001`
- Capacidades: `CAP-FIN-001`, `CAP-OWN-001`, `CAP-ID-001`, `CAP-LIFE-001`
- Excepciones y preguntas: `OQ-TRADE-001`, `OQ-OWN-004`. Pesar al llegar es preferencia dicha, no rutina confirmada. No hay flecha obligatoria hacia `TGT-WEIGH-001`.

## TGT-SALE-001 — Venta e ingreso conocido

- Disparador: una venta. Hoy la venta principal es de becerros por kilogramo de peso vivo.
- Actores: `ACT-OWNER`, `ACT-BUYER`.
- Pasos deseados, en un solo evento:
  1. Registrar la cantidad o el peso vivo cuando se conozca.
  2. Registrar el precio por unidad cuando la forma de venta lo tenga.
  3. Registrar el ingreso total conocido. Este dato no espera a tener un modelo de rentabilidad completo.
  4. Registrar al comprador cuando se conozca.
  5. Conservar el comprobante si existe. Su ausencia deja el ingreso declarado.
  6. Producir la salida de esos animales con motivo venta, por `TGT-ANIMAL-EXIT-001`, sin borrar el historial y sin capturar la baja en otro formulario.
  7. No calcular aquí margen, costo por kilo ni parte del socio. Eso, si se hace, es `TGT-PROFIT-001`.
  8. No tratar la venta por bulto como paso vigente (`BR-SALE-002`). Si un día ocurre, se anota la forma sin traducirla (`OQ-TRADE-001`).
- Información que produce: ingreso conocido, peso o cantidad si existen, precio unitario si aplica, comprador, animales que salen.
- Evidencia que produce: comprobante, si se guardó.
- Dolores: `PP-FIN-001`
- Capacidades: `CAP-FIN-001`, `CAP-LIFE-001`
- Familia: `FAM-SALE-001`
- Excepciones y preguntas: `OQ-OWN-001`, `OQ-TRADE-001`. El peso de venta y el último peso de la rutina pueden no ser el mismo dato.

## TGT-PROFIT-001 — Revisión económica provisional

- Disparador: el propietario quiere ver cómo va un animal, un grupo o un periodo, con lo ya registrado.
- Actores: `ACT-OWNER`.
- Pasos deseados:
  1. Reunir ingreso de venta conocido, costo de compra, flete y gastos directos conocidos. No volver a capturarlos.
  2. Separar lo asignado de forma explícita a un animal o grupo, y lo que sigue en la bolsa no asignada.
  3. Mostrar un margen provisional solo sobre lo asignado, la completitud y la calidad de cada pieza.
  4. Dejar la parte del ranchero como desconocida y no calculable mientras `OQ-OWN-001` siga abierta.
  5. No mostrar costo por kilogramo ganado si la cantidad de alimento no es medida u observada con fiabilidad.
  6. No producir utilidad fiscal ni finiquito del socio.
- Información que produce: margen provisional, costos asignados, bolsa no asignada, completitud, calidad.
- Evidencia que produce: ninguna nueva. Lee la de los otros eventos.
- Dolores: `PP-FIN-001`
- Capacidades: `CAP-FIN-001`, `CAP-OWN-001`
- Familia: `FAM-PROFIT-001`
- Excepciones y preguntas: `OQ-OWN-001`, `OQ-FEED-002`, `OQ-TRADE-001`, `OQ-PEOPLE-001`, `DQ-FIN-003`. Esta revisión es deseable. No hace falta para empezar a registrar ingresos y gastos.

## TGT-SEC-001 — Última observación durante un evento

- Disparador: otro evento ya reunió o vio animales. El caso habitual es `TGT-WEIGH-001`. No se captura aparte.
- Actores: quien ya actuó en ese evento.
- Pasos deseados:
  1. El evento deja, para cada animal visto, la última observación: cuándo, en qué evento y, si se sabe, dónde.
  2. Quien estaba citado y no apareció queda sin observación nueva. Eso no verifica al resto del hato.
  3. No convertir un no visto en robo ni en baja. La baja es `TGT-ANIMAL-EXIT-001`. La verificación del grupo es `TGT-HERD-VERIFY-001`.
- Información que produce: última observación por animal, ligada al evento.
- Evidencia que produce: la del evento de origen.
- Dolores: `PP-SEC-002`, `PP-SEC-001`
- Capacidades: `CAP-SEC-001`
- Excepciones y preguntas: `DQ-SEC-003`. Un pesaje de becerros no demuestra que el resto siga en el predio. Este hecho no controla `PP-SEC-001`.

## TGT-HERD-VERIFY-001 — Verificación de presencia del ganado

- Disparador: una verificación del grupo o del hato que el rancho llegue a adoptar. Hoy no hay método ni cadencia elegidos.
- Actores: `ACT-WORKER` en el campo. `ACT-OWNER` asienta el resultado.
- Método: pendiente de validación.
- Cadencia: pendiente de validación.
- Pasos deseados, cuando exista un método:
  1. Partir de los animales activos que deberían estar en un lugar o grupo esperado (`CAP-LAND-001`). Si el lugar es desconocido, la verificación lo dice.
  2. Registrar a quién se confirmó en esa verificación, distinto de quien solo fue visto de paso en otro evento.
  3. Dejar a quién no se pudo confirmar.
  4. Un faltante confirmado puede ser aviso de `TGT-GOV-001`. Darlo de baja es otro hecho, posterior, si el rancho decide que ya no está activo.
- Información que produce: verificación del grupo, confirmados, no confirmados, lugar usado.
- Evidencia que produce: la del método que se elija. Ningún método está elegido. Conteo manual, verificación en un manejo, verificación por potrero u otra tecnología siguen siendo posibilidades, no una selección.
- Dolores: `PP-SEC-001`, `PP-SEC-002`
- Capacidades: `CAP-SEC-001`, `CAP-LAND-001`
- Familia: `FAM-SEC-001`
- Excepciones y preguntas: `OQ-COUNT-001`, `OQ-LAND-002`, `CON-LAND-001`. No se elige RFID, GPS, cámara ni sensor. Mientras método y cadencia sigan pendientes, `PP-SEC-001` no está controlado.

## TGT-SEC-002 — Evidencia de acceso o de cerco

- Disparador: una revisión de accesos o de cerco, o un hallazgo de corte, acceso abierto o salida no explicada.
- Actores: `ACT-WORKER`, `ACT-OWNER`.
- Pasos deseados:
  1. Tratar el hecho como distinto de un faltante de cabezas.
  2. Dejar constancia de qué se revisó o de qué anomalía se vio.
  3. No describir el predio completo como vigilado porque un punto tenga evidencia.
  4. No elegir aquí cámara, luz, sensor ni ronda. Esas son opciones, y ninguna está adoptada. El control deseado existe. La implementación no está seleccionada.
- Información que produce: revisión hecha o anomalía observada, con lugar aproximado si se conoce.
- Evidencia que produce: nota, foto o registro de aparato, según la opción no elegida.
- Dolores: `PP-SEC-003`
- Capacidades: `CAP-SEC-002`
- Excepciones y preguntas: `OQ-SEC-001`. Alrededor de 5 accesos es una aproximación. `PP-SEC-003` no está abordado mientras no se adopte una opción.

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

- Disparador: se corrige una certeza, o cambia la situación del toro.
- Actores: `ACT-OWNER` asienta. `ACT-WORKER` reconoce. El toro no es usuario.
- Pasos deseados:
  1. No repetir el alta del nacimiento.
  2. Corregir madre o padre a observado, inferido o desconocido.
  3. Si queda inferido, conservar el motivo: parto visto, dicho de un trabajador, único toro presente, u otro. El único toro no se guarda como paternidad confirmada.
  4. Si más adelante hubiera más de un toro o inseminación, la inferencia por toro único deja de servir (`OQ-REPRO-001`).
  5. Conservar la cadena. Comparar líneas no es paso actual.
- Información que produce: certeza de madre, certeza de padre, motivo de la inferencia, corrección.
- Evidencia que produce: quién aportó el dato y de qué tipo fue.
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
- Papel en el mapa: no es una operación que se dibuje junto al pesaje. Es la vía por la que los otros eventos llegan al propietario.
- Excepciones y preguntas: `OQ-CONN-001`, `DQ-HABIT-001`. No se asume una integración con WhatsApp. El registro puede esperar a que el propietario tenga el mensaje.

## TGT-GOV-001 — Revisión semanal y excepción crítica

- Disparador: la revisión aproximada de cada semana, o un hecho crítico.
- Actores: `ACT-OWNER`.
- Pasos deseados:
  1. Revisar identidad, tenencia o su hueco, lugar esperado o desconocido, pesos, alimento con su calidad, ingresos y gastos conocidos, conteo físico si lo hubo, y qué animales siguen activos.
  2. Ver los huecos. No rellenarlos con las cifras de alimento que no cuadran ni con una parte del socio.
  3. Avisar en el momento solo un faltante confirmado, un problema grave de un animal, u otra situación que el propietario marque como crítica. Una baja ya registrada no se vuelve un aviso repetido.
  4. No avisar cada pesaje, cada ticket, cada mensaje ni cada diferencia pequeña de bodega. El resumen semanal es deseable. El aviso crítico es el que hace falta desde el inicio.
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

## TGT-ANIMAL-EXIT-001 — Salida del activo

- Disparador: se sabe que un animal ya no debe seguir activo. Puede ser la venta, una muerte, un faltante que el rancho da por confirmado, u otra salida.
- Actores: `ACT-OWNER`. `ACT-WORKER` puede ser quien avisa.
- Pasos deseados:
  1. Marcar que deja de estar activo. Conservar la ficha y su historia.
  2. Anotar el motivo: venta, muerte, faltante confirmado, otra salida, o desconocido.
  3. Si el motivo es venta, el evento de origen es `TGT-SALE-001`. No se captura la baja otra vez.
  4. Si solo se dejó de ver, el animal sigue activo. La última observación o la verificación no confirmada no son esta baja.
  5. No anotar reposición, precio de reemplazo ni reparto «a la parte».
- Información que produce: animal inactivo, motivo, fecha en que se supo.
- Evidencia que produce: el dicho o el comprobante que haya, con su calidad.
- Dolores: `PP-SEC-001`, `PP-DATA-001`
- Capacidades: `CAP-LIFE-001`, `CAP-SEC-001`
- Familia: `FAM-LIFE-001`
- Excepciones y preguntas: `OQ-OWN-002`, `DQ-HERD-001`. El motivo desconocido es válido. La regla económica de la frase de la entrevista no se escribe aquí.

## TGT-MOVE-001 — Asignar o mover un animal o un grupo

- Disparador: el rancho fija o cambia dónde espera a un animal o a un grupo.
- Actores: `ACT-OWNER` asienta. `ACT-WORKER` puede decir el movimiento.
- Pasos deseados:
  1. Nombrar el animal o el grupo.
  2. Nombrar el potrero o lugar esperado, o dejarlo desconocido.
  3. Poner la fecha o la hora en que eso empieza a valer.
  4. Usar los potreros ya identificados, cerca de ocho, sin afirmar que cubren las aproximadamente 530 hectáreas y sin pedir sus hectáreas.
- Información que produce: lugar esperado vigente, o desconocido, y desde cuándo.
- Evidencia que produce: quién lo dijo. No hay lectura de aparato.
- Dolores: `PP-SEC-002`, `PP-FEED-001`, `PP-GOV-001`
- Capacidades: `CAP-LAND-001`, `CAP-FEED-001`, `CAP-SEC-001`
- Familia: `FAM-LAND-001`
- Excepciones y preguntas: `OQ-LAND-001`, `OQ-LAND-002`. No hay GPS ni mapa catastral. Este paso es deseable. Se puede empezar con lugar desconocido.

## Procesos que no se crean

- No hay proceso de arquitectura ni de sincronización.
- No hay proceso de ordeña vigente.
- No hay regla de reposición ni de dinero por muerte. La salida sí existe, sin esa regla.
- No hay proceso de fuego. Sigue `OQ-FIRE-001`.
- No hay proceso de GIS ni de tenencia como trámite aparte: la tenencia entra con el animal.

## Estado del documento

- Versión: 0.2
- Estado: Diseño de dominio, no alcance aprobado
- Última actualización: 2026-10-03
- Fuente: `docs/domain` v0.1, TO-BE v0.1 y el plan 005
- Validación: Pendiente de validación iterativa con el propietario del rancho

