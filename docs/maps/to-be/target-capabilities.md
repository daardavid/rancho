# Capacidades objetivo

Qué necesita poder hacer el rancho. Una capacidad no es un proceso, no es una opción y no es una decisión de construir.

Los puntos de dolor conservan el ID de [../../domain/pain-points.md](../../domain/pain-points.md). No se crean dolores nuevos.

`CAP-COMM-001`, `CAP-DATA-002` y `CAP-CONN-001` son transversales: calidad del dato, canal y tolerancia a la señal. Acompañan a los eventos. No son operaciones del rancho al mismo nivel que el pesaje o la venta, y un mapa futuro no tiene que dibujarlas como nodos hermanos. `CAP-FEED-002` permanece y está bloqueada como capacidad analítica futura. `CAP-MILK-001` sigue siendo futura y condicional.

En v0.2 se añaden `CAP-OWN-001`, `CAP-LIFE-001` y `CAP-LAND-001`.

Los indicadores de éxito son de negocio. La evaluación de si hoy se pueden cumplir sigue abierta donde hay una pregunta sin cerrar. Desconocido es un estado válido.

## Identidad

### CAP-ID-001 — Reconocer cada animal gestionado por una identidad estable

- Para qué hace falta: el arete, el nombre o la memoria no sostienen el hilo de un animal, sobre todo al nacer. Sin una identidad que sobreviva al arete, el peso, la cría y el costo no tienen a quién colgarse.
- Dolores: `PP-ID-001`
- Resultado de negocio deseado: cada animal que el rancho gestiona se puede seguir aunque todavía no tenga arete, aunque el arete se caiga o se retire, y aunque el SINIIGA llegue después.
- Indicadores de éxito:
  - Cada animal gestionado tiene una identidad que no depende de una sola marca física.
  - Un becerro puede existir en el registro antes del arete, y el arete posterior queda en la misma identidad.
  - El SINIIGA sigue siendo útil y no es la única forma de nombrar al animal.
- Restricciones conocidas: `CON-ID-001`, `BR-ID-001`, `BR-ID-002`, `BR-ID-003`. No se elige tecnología de arete.
- Preguntas abiertas: `OQ-OWN-003`, `OQ-ID-001`. La disposición a mejorar la identificación no fija el método.

### CAP-OWN-001 — Decir cómo se tiene un animal sin cerrar el contrato

- Para qué hace falta: parte del hato es del propietario y parte está «a la parte». Puede haber ganado de terceros. Propiedad y participación no son el mismo dato, y el arreglo verbal no alcanza para calcular la parte del ranchero.
- Dolores: `PP-FIN-001`, `PP-DATA-001`
- Resultado de negocio deseado: de cada animal gestionado se puede decir la tenencia, y por separado qué se sabe de la participación económica del rancho. Las dos pueden quedar desconocidas.
- Indicadores de éxito:
  - La tenencia es del rancho, «a la parte», de un tercero, o desconocida.
  - La participación económica es conocida, conocida en parte, o desconocida.
  - El relato verbal puede quedar como nota. No se convierte en una regla de mitades.
  - Mientras `OQ-OWN-001` siga abierta, la parte final del ranchero no se calcula.
  - El ganado de un tercero puede constar sin ficha individual si el rancho no lo maneja cabeza por cabeza. El uso de la tierra queda en `CAP-LAND-001` cuando haga falta.
- Restricciones conocidas: `BR-OWN-001`, `BR-OWN-002`, `BR-OWN-003`, `BR-PART-001`.
- Preguntas abiertas: `OQ-OWN-001`, `OQ-OWN-002`, `OQ-OWN-004`. Esta capacidad no las responde.

## Historial y evidencia

### CAP-DATA-001 — Conservar un historial trazable de los eventos que importan

- Para qué hace falta: partos, pesos, sanidad y filiación viven en cuadernos o en la memoria. El propietario ya hace preguntas que ese archivo no puede contestar.
- Dolores: `PP-DATA-001`
- Resultado de negocio deseado: un evento importante queda ligado a un animal, con quién lo registró, cuándo, de dónde salió y qué evidencia lo acompaña, si la hay.
- Indicadores de éxito:
  - Un parto, un peso de becerro o un tratamiento se puede volver a encontrar en el animal correspondiente.
  - Se puede decir quién aportó el dato y en qué fecha quedó asentado.
  - La falta de registro deja de ser el estado normal de esos eventos.
- Restricciones conocidas: `CON-ENTRY-001`, `CON-SITE-001`. La captura inicial recae en el propietario a partir de lo que los trabajadores informan.
- Preguntas abiertas: `OQ-OWN-003`. Qué eventos bastan al inicio, fuera de peso, alimento, gasto, nacimiento y presencia, no está cerrado como lista rígida.

### CAP-DATA-002 — Distinguir un dato declarado de uno observado, y guardar su evidencia

- Para qué hace falta: teléfono, WhatsApp, foto, audio y memoria llegan mezclados. Un valor afirmado puede quedar como si se hubiera medido.
- Dolores: `PP-DATA-002`
- Resultado de negocio deseado: al usar un dato se sabe si alguien lo afirmó o si salió de una medición o de una observación directa, y qué respaldo tiene.
- Indicadores de éxito:
  - Un peso dicho por mensaje no se presenta como peso leído en la báscula.
  - Una foto, un audio o un ticket quedan ligados al evento que respaldan, cuando se usaron.
  - Un cálculo posterior puede mostrar que descansa en datos declarados, observados o incompletos.
- Restricciones conocidas: `BR-EVID-001` es principio deseado, no control actual. `CON-DEV-001` dice que hay teléfonos Android; no dice que la primera captura ocurra en ellos.
- Preguntas abiertas: ninguna pregunta de descubrimiento se cierra al distinguir las clases de dato. La cobertura celular sigue en `OQ-CONN-001`.
- Papel en el mapa: transversal. La calidad acompaña a un peso, una cantidad o un gasto. No es un proceso de rancho aparte.
- Calidades de negocio usadas también en el alimento: declarado, observado, medido.

## Crecimiento

### CAP-GROW-001 — Tener un historial de peso de becerros y leer el crecimiento

- Para qué hace falta: los becerros se pesan y el dato no queda utilizable. Sin esa serie no hay ganancia entre pesajes, comparación ni hueco visible.
- Dolores: `PP-GROW-001`
- Resultado de negocio deseado: cada pesaje de becerro entra a una serie, se puede ver la ganancia entre fechas y se nota cuándo un becerro esperado no se pesó o cuándo la serie se ve anormal.
- Indicadores de éxito:
  - Cada becerro de la rutina tiene una historia de pesos, no una nota suelta.
  - Entre dos pesos del mismo animal se puede ver cuánto ganó y en cuántos días.
  - Un becerro que debía pesarse y no pasó queda visible.
  - Las vacas adultas no quedan metidas por fuerza en la misma rutina.
- Restricciones conocidas: `BR-WEIGH-001`, `BR-WEIGH-002`, `BR-WEIGH-003`, `CON-WEIGH-001`, `CON-SCALE-001`. El pesaje diario no es práctico. No se asume integración con la báscula IBN ARGON.
- Preguntas abiertas: `OQ-SCALE-001`, `OQ-OWN-003`. No se sabe cuántas de las aproximadamente 21 cabezas entran a la rutina.

## Alimentación

### CAP-FEED-001 — Conocer el alimento comprado, preparado, declarado, medido y remanente

- Para qué hace falta: el propietario no puede saber con fiabilidad cuánto se compró, cuánto se preparó, cuánto se dijo que se entregó, cuánto se midió al entregar ni cuánto quedó. El ejemplo de riesgo es una entrega menor que la meta. Eso es un riesgo de merma, no una acusación.
- Dolores: `PP-FEED-001`
- Resultado de negocio deseado: cada cantidad lleva dicho de qué cantidad se trata y de qué calidad es. Una declaración no se presenta como entrega verificada.
- Cantidades, y qué son:
  - Comprada: lo que entró, a menudo con ticket.
  - Preparada: lo que se mezcló en un lote o tambo.
  - Entregada declarada: lo que alguien afirma que se ofreció al grupo.
  - Entregada medida: lo que se pesó o se midió al ofrecerla. Hoy no está en el paquete de ahora.
  - Remanente físico: lo que se contó en la bodega.
- Calidad de cada cantidad, a nivel de negocio: declarado, observado o medido. Una foto que no muestra un peso no convierte un dicho en medición.
- Indicadores de éxito:
  - Se puede decir cuál de esas cinco cantidades existe y cuál falta.
  - La compra puede registrarse sin afirmar que la entrega quedó comprobada.
  - El consumo individual no se presenta como medido.
  - Las cifras de alrededor de MXN $8/kg, alrededor de 1.5 kg por animal por día y alrededor de 270 kg en alrededor de 15 días siguen sin cuadrarse.
- Restricciones conocidas: `BR-FEED-001`, `BR-FEED-002`, `CON-FEED-001`. Los animales comen juntos y compiten.
- Preguntas abiertas: `OQ-FEED-001`, `OQ-FEED-002`, `OQ-FEED-003`. Ninguna opción elige el supuesto que haría cuadrar esas cifras. Con el paquete de ahora, este dolor mejora la visibilidad y no queda controlado.

### CAP-FEED-002 — Relacionar la estrategia de alimento con el crecimiento y el costo

- Estado: bloqueada / capacidad analítica futura. No está activa ni lograda.
- Para qué hace falta: saber si una dieta conviene depende de cantidad, grupo, tiempo y crecimiento. Hoy esas piezas no se pueden unir con fiabilidad.
- Dolores: `PP-FEED-001`, `PP-FIN-001`
- Resultado de negocio deseado, solo cuando deje de estar bloqueada: comparar estrategias sin rellenar huecos.
- Indicadores de éxito, todavía no exigibles:
  - Hay cantidad de alimento con calidad medida u observada, un grupo, un periodo y una ganancia de esos animales.
  - Si una de esas piezas falta, la comparación no se muestra.
- Restricciones conocidas: las de `CAP-FEED-001` y `CAP-GROW-001`. No es dosificación individual.
- Preguntas abiertas: `OQ-FEED-002`, `OQ-FEED-003`, `OQ-FIN-001`. Permanece en el modelo para no perder el objetivo. No se dibuja como capacidad en uso.

## Economía

### CAP-FIN-001 — Ver una rentabilidad administrativa provisional, con lo que falta a la vista

- Para qué hace falta: no se puede decidir qué actividad conviene ni si una compra resultó bien. Es uno de los objetivos más importantes del descubrimiento. Una cifra cerrada, con las reglas aún abiertas, sería peor que un hueco.
- Dolores: `PP-FIN-001`
- Resultado de negocio deseado: una rentabilidad administrativa provisional. No es utilidad contable ni fiscal. Usa ingreso de venta conocido, costo de compra, flete, gastos directos conocidos, costos asignados de forma explícita y una bolsa de costos no asignados.
- Indicadores de éxito:
  - Se ve un margen provisional a partir de lo asignado, junto con la bolsa no asignada.
  - Se ve la completitud de la estimación y la calidad de los datos que la sostienen: declarado, observado o medido.
  - La parte personal o económica del ranchero permanece desconocida y no calculable mientras las reglas de tenencia sigan abiertas.
  - No se calcula utilidad fiscal, finiquito del socio, ni costo por kilogramo ganado cuando la cantidad de alimento no es confiable.
  - El ingreso de una venta se puede registrar aunque esta lectura todavía no se haga.
- Restricciones conocidas: `BR-OWN-003`, `BR-SALE-001`, `BR-BUY-001`, `BR-BUY-002`, `CON-ACC-001`, `CAP-OWN-001`.
- Preguntas abiertas: `OQ-OWN-001`, `OQ-OWN-002`, `OQ-OWN-004`, `OQ-TRADE-001`, `OQ-FEED-002`, `OQ-PEOPLE-001`. El prorrateo no está diseñado y esta capacidad no lo inventa.

### CAP-FIN-002 — Separar gasto operativo e inversión, con comprobante

- Para qué hace falta: una mejora del rancho puede mezclarse con el costo de producir un kilo.
- Dolores: `PP-FIN-002`
- Resultado de negocio deseado: un egreso de gestión queda como gasto de operación o como inversión, y el ticket o la nota de efectivo siguen asociados.
- Indicadores de éxito:
  - La mayoría de los tickets que ya se guardan pueden quedar ligados a un egreso clasificado.
  - Una nómina pagada en efectivo puede anotarse aunque no haya ticket de tarjeta.
  - Sigue siendo visible que el criterio contable exacto no está definido.
- Restricciones conocidas: `BR-FIN-001`, `BR-PAY-001`, `CON-ACC-001`.
- Preguntas abiertas: `OQ-FIN-001`, `OQ-PEOPLE-001`.

## Bodega

### CAP-INV-001 — Contrastar lo que debería haber en bodega con lo que hay

- Para qué hace falta: hay bodega cerrada y no hay conciliación. La merma de alimento y el costo de otros insumos quedan sin contraste.
- Dolores: `PP-INV-001`
- Resultado de negocio deseado: de los insumos que se decida llevar, se sabe qué entró, qué salió, qué debería quedar y qué diferencia hubo en un conteo físico.
- Indicadores de éxito:
  - Un ingrediente de la dieta tiene entradas, salidas y un saldo teórico.
  - Un conteo físico deja anotada la diferencia, sin convertirla en acusación.
  - El alcance inicial puede ser chico. No se exige un almacén de herramientas el primer día.
- Restricciones conocidas: el hato es de aproximadamente 21 cabezas. El control tiene que ser proporcional a eso.
- Preguntas abiertas: `OQ-FEED-001`, `OQ-FEED-003`, y `DQ-INV-001` en [decision-framework.md](decision-framework.md). No está decidido si el primer contraste incluye medicamento y herramienta o solo alimento.

## Seguridad del hato

### CAP-SEC-001 — Saber qué animales deberían estar y notar antes un faltante

- Para qué hace falta: un faltante puede tardar días, y en un robo alrededor de una o dos semanas. No hay una verificación frecuente y confiable. Saber que falta un animal no es saber que alguien entró.
- Dolores: `PP-SEC-001`, `PP-SEC-002`
- Resultado de negocio deseado: saber quién debería estar, dónde se espera al grupo, cuándo se le vio por última vez en un evento, y si alguna vez se verificó el grupo entero. El método y la cadencia de esa verificación siguen sin elegir. Este dolor no se da por controlado.
- Indicadores de éxito:
  - Se distingue la última observación durante un evento de una verificación del grupo o del hato.
  - Un animal activo tiene lugar esperado o lugar desconocido (`CAP-LAND-001`).
  - Un animal que salió deja de contarse como activo y conserva su historia (`CAP-LIFE-001`).
  - Un faltante y una baja del activo no son el mismo hecho.
  - No se promete un plazo menor que el de hoy mientras método y cadencia sigan pendientes.
- Restricciones conocidas: `CON-LAND-001`, `CON-SEC-001`. El predio es grande. Reunir ganado toma tiempo.
- Preguntas abiertas: `OQ-COUNT-001`, `OQ-LAND-002`, `DQ-SEC-003`. `OQ-OWN-002` no se interpreta como regla de reposición.

### CAP-SEC-002 — Dejar evidencia de una entrada o una salida no autorizada

- Para qué hace falta: cortar el cerco o sacar ganado no genera aviso. No hay cámaras. Las cámaras solo se están considerando.
- Dolores: `PP-SEC-003`
- Resultado de negocio deseado: el control deseado existe como problema distinto del faltante. La implementación no está elegida. Hasta que una opción se adopte, el dolor no está abordado.
- Indicadores de éxito:
  - Se puede distinguir un faltante de hato de un evento de acceso o de cerco.
  - Si se adopta un medio físico, queda dicho qué punto cubre y qué punto no cubre.
  - No se toma una cámara, por sí sola, como cobertura del predio.
- Restricciones conocidas: `CON-SEC-001`, `CON-NET-001`, `CON-NET-002`. Alrededor de 5 accesos y aproximadamente 3 caminos son el entendimiento actual, no un plano.
- Preguntas abiertas: `OQ-SEC-001`, `OQ-CONN-001`. Ninguna opción de hardware queda recomendada para ahora.

## Sanidad

### CAP-HEALTH-001 — Conservar una historia sanitaria básica

- Para qué hace falta: vacunas, medicamentos y tratamientos dependen de la memoria. La entrevista no pone este tema por encima de rentabilidad, peso, alimento y seguridad.
- Dolores: `PP-HEALTH-001`
- Resultado de negocio deseado: cuando ocurre un tratamiento, un baño o un problema observado, queda una nota en el animal o en el grupo, sin convertir eso en un programa sanitario completo.
- Indicadores de éxito:
  - Un tratamiento deja de vivir solo en la memoria.
  - Se puede ver después qué se hizo, a quién y cuándo, con el producto si se conocía.
  - No se exige un calendario que la entrevista no dio.
- Restricciones conocidas: `CON-HAND-001`. La manga es el manejo ideal. Lazar es más peligroso y no es un paso de registro.
- Preguntas abiertas: `OQ-HEALTH-001`. Un recordatorio futuro no forma parte del cumplimiento inicial de esta capacidad.

## Reproducción

### CAP-REPRO-001 — Registrar el nacimiento, la filiación y una genealogía usable más adelante

- Para qué hace falta: los partos no se anotan y la filiación es informal. Con un solo toro la paternidad es simple y aun así no hay registro. El interés de comparar líneas es de largo plazo.
- Dolores: `PP-REPRO-001`
- Resultado de negocio deseado: un nacimiento queda anotado. Madre y padre tienen certeza: observado, inferido o desconocido. Si es inferido, queda el motivo.
- Indicadores de éxito:
  - Se puede responder con registro cuántos nacimientos quedaron anotados, no cuántos ocurrieron si nadie los vio.
  - La madre es observada, inferida o desconocida. El padre también.
  - El único toro puede ser el motivo de una inferencia. No aparece como paternidad confirmada.
  - Motivos de inferencia posibles: parto visto, dicho de un trabajador, único toro presente, u otro que se nombre. Desconocido también cabe.
  - Comparar líneas queda para cuando exista historia. No es resultado de esta versión. No hay flujo de laboratorio.
- Restricciones conocidas: `BR-REPRO-001`, `BR-BIRTH-001`, `BR-ID-003`, `CON-ID-001`. El corral de parto y el calostro son meta de manejo (`BR-COLOSTRUM-001`), no un paso impuesto aquí.
- Preguntas abiertas: `OQ-ID-001`, `OQ-REPRO-001`, `OQ-GEN-001`, `OQ-OWN-001` para el reparto de crías.

## Comunicación

### CAP-COMM-001 — Recibir evidencia de la operación sin volver usuarios de una aplicación a los trabajadores al inicio

- Para qué hace falta: el propietario no está de tiempo completo. Los trabajadores viven en el rancho y concentran el conocimiento. La dirección actual es que la captura inicial la haga el propietario con lo que ellos le mandan.
- Dolores: `PP-GOV-001`, `PP-DATA-002`
- Resultado de negocio deseado: una foto, un audio o un mensaje que ya circula por teléfono puede quedar ligado a un evento, sin exigir una aplicación a los trabajadores en la primera etapa y sin exigir una integración con WhatsApp.
- Indicadores de éxito:
  - El propietario puede asentar un evento a partir de un mensaje, una foto o un audio que ya recibió.
  - El trabajador no necesita una cuenta para que ese evento exista.
  - El canal original no se convierte, por sí solo, en un archivo ordenado.
- Restricciones conocidas: `CON-ENTRY-001`, `CON-SITE-001`, `CON-DEV-001`, `BR-ENTRY-001`.
- Preguntas abiertas: `OQ-CONN-001`, `DQ-HABIT-001`. Si el propietario no puede sostener ese paso, el paquete inicial no se sostiene.
- Papel en el mapa: transversal. Es la forma de hacer llegar un evento, no una operación junto a la engorda.

## Conectividad

### CAP-CONN-001 — Completar los flujos operativos críticos aunque la conectividad falle

- Para qué hace falta: no hay Wi-Fi y la cobertura celular no se puede dar por buena. Un flujo que exija red en el potrero no encaja con el campo.
- Dolores: `PP-CONN-001`
- Resultado de negocio deseado: un pesaje, una entrega de alimento, un gasto o un nacimiento pueden quedar registrados aunque en el momento del hecho no hubiera señal utilizable.
- Indicadores de éxito:
  - El dato crítico no se pierde solo porque el potrero no tenía señal en ese instante.
  - No se exige internet de sitio para empezar.
  - No se diseña aquí la sincronización de una aplicación de campo.
- Restricciones conocidas: `CON-NET-001`, `CON-NET-002`, `CON-NET-003`. La operación sin conexión está nombrada como necesidad posible, no como arquitectura.
- Preguntas abiertas: `OQ-CONN-001`, `OQ-NET-001`. Starlink sigue siendo un ejemplo, no una decisión.
- Papel en el mapa: transversal. Es una restricción de los eventos, no un proceso de red.

## Gestión

### CAP-GOV-001 — Ver la operación cada semana y recibir aviso solo de lo crítico

- Para qué hace falta: la decisión semanal puede apoyarse en un relato incompleto. Al mismo tiempo, un aviso por cada mensaje saturaría.
- Dolores: `PP-GOV-001`
- Resultado de negocio deseado: aproximadamente cada semana el propietario ve un panorama de identidad, pesos, alimento, gastos, bodega y presencia. Un aviso inmediato queda reservado a un faltante confirmado, un problema grave de un animal u otra situación que él marque como crítica.
- Indicadores de éxito:
  - Hay una revisión de periodo, no una corriente de avisos de cada pesaje o cada ticket.
  - Un faltante confirmado no espera a esa revisión.
  - La revisión muestra huecos de información en lugar de rellenarlos.
- Restricciones conocidas: `BR-CADENCE-001`, `CON-SITE-001`.
- Preguntas abiertas: `DQ-GOV-001`. La lista cerrada de «problema grave» no salió de la entrevista.

## Estado del animal

### CAP-LIFE-001 — Estado operativo del animal y motivo de salida

- Para qué hace falta: si un animal muere, falta de forma confirmada o sale por un motivo distinto de la venta, no puede seguir contando como activo para siempre. Borrar la ficha borraría el historial.
- Dolores: `PP-SEC-001`, `PP-DATA-001`, `PP-FIN-001`
- Resultado de negocio deseado: se sabe si el animal sigue activo. Si no, queda el motivo de salida y la historia.
- Indicadores de éxito:
  - Los motivos posibles son venta, muerte, faltante confirmado, otra salida, o desconocido.
  - Notar que falta y darlo de baja no son el mismo hecho. Un animal puede seguir activo y marcado como no visto.
  - La baja no define reposición ni dinero. `OQ-OWN-002` y «a la parte» no se interpretan.
- Restricciones conocidas: `BR-SALE-001`. La venta es una salida. No es la única.
- Preguntas abiertas: `OQ-OWN-002`, `DQ-HERD-001`. El proceso que la usa es `TGT-ANIMAL-EXIT-001`.

## Lugar esperado

### CAP-LAND-001 — Ubicación esperada por potrero o grupo

- Para qué hace falta: el alimento se ofrece a un grupo, el conteo en un predio grande necesita un lugar, y la última vez visto no dice dónde debía estar el animal. No hace falta un mapa completo ni un aparato por cabeza.
- Dolores: `PP-FEED-001`, `PP-SEC-001`, `PP-SEC-002`, `PP-GOV-001`
- Resultado de negocio deseado: un animal o un grupo tiene un potrero o lugar esperado, con fecha de vigencia, o consta como desconocido.
- Indicadores de éxito:
  - Se pueden usar los aproximadamente 8 potreros ya identificados, sin afirmar que describen las aproximadamente 530 hectáreas.
  - El lugar desconocido es válido.
  - Un movimiento queda fechado. No se exige hectárea, GPS ni un sistema de mapas.
  - El grupo de alimentación, la verificación de presencia y la revisión de gestión pueden apoyarse en ese lugar.
- Restricciones conocidas: `CON-LAND-001`, `OQ-LAND-001`, `OQ-LAND-002`.
- Preguntas abiertas: `OQ-LAND-001`, `OQ-LAND-002`. Identificar un potrero, o asignarle después un identificador interno, no cierra el croquis. No se afirma que hoy tengan nombres formales.

## Leche

### CAP-MILK-001 — Si la leche vuelve, medir su economía lo bastante para decidir si conviene

- Horizonte: futura / condicional. No entra al flujo operativo inicial.
- Para qué hace falta: la infraestructura existe y requiere mantenimiento. El esquema anterior no se consideró lo bastante rentable. No hay producción vigente que evaluar. Usar el máximo histórico como producción de hoy sería un error.
- Dolores: `PP-MILK-001`
- Resultado de negocio deseado: si se retoma la ordeña, el rancho puede ver volumen, costo e ingreso con suficiente claridad para decidir si esa actividad conviene. Medir por vaca no está decidido.
- Indicadores de éxito, solo bajo esa condición:
  - Hay una producción del periodo que no se confunde con el recuerdo de aproximadamente 150 litros o de 22 vacas.
  - Los costos y el ingreso de esa leche se pueden leer juntos.
  - La comparación con la engorda espera a que existan ambas economías.
- Restricciones conocidas: `BR-MILK-001`. El calendario de lunes a sábado es recuerdo y mención de futuro, no calendario vigente.
- Preguntas abiertas: `OQ-MILK-001`, `OQ-MILK-002`.

## Estado del documento

- Versión: 0.2
- Estado: Diseño de dominio, no alcance aprobado
- Última actualización: 2026-10-03
- Fuente: `docs/domain` v0.1 y AS-IS v0.2
- Validación: Pendiente de validación iterativa con el propietario del rancho
