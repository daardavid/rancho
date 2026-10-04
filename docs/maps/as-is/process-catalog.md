# Catálogo de procesos AS-IS

Procesos de la operación actual. Ninguna ficha propone una solución. Las cantidades y los arreglos incompletos se dejan como están.

Estados: `current` (vigente) y `current_informal` (vigente, sin formalizar).

## Ciclo del becerro / engorda

La engorda no es un proceso aparte. Es la sección donde viven estas actividades.

### PROC-PUR-001 — Compra de ganado

- Estado: `current`
- Para qué sirve hoy: entrar animales al rancho para la engorda.
- Cómo funciona hoy: se compra por kilogramo o, en grupos más grandes, por bulto. En el bulto no necesariamente se pesa cada animal. Qué significa «bulto» en dinero y en peso no está cerrado. El flete lo paga el comprador. Hay cabezas del propietario y cabezas «a la parte»; el arreglo no se redefine aquí.
- Actores: ACT-OWNER, ACT-SELLER, ACT-PARTNER cuando el animal entra en ese arreglo.
- Entradas: animales ofrecidos, precio por kilogramo o por bulto.
- Salidas: ganado comprado, un costo de compra y de flete. No hay un dictamen de si la compra resultó bien.
- Fuentes: trato con el vendedor, tickets cuando se guardan.
- Dolores: PP-FIN-001
- Preguntas: OQ-TRADE-001, OQ-OWN-004

### PROC-TRANS-001 — Transporte

- Estado: `current`
- Para qué sirve hoy: llevar al rancho el ganado comprado.
- Cómo funciona hoy: el comprador paga el flete. El ganado llega estresado por el viaje. No se describió transportista, ruta ni duración.
- Actores: ACT-OWNER como quien paga el flete. El transportista no fue nombrado.
- Entradas: ganado comprado.
- Salidas: ganado en el rancho, estresado por el transporte.
- Fuentes: no hay un registro descrito.
- Dolores: ninguno ligado. El estrés se anota en la llegada, no como un dolor con ID propio.
- Preguntas: ninguna adicional.

### PROC-REC-001 — Llegada y descanso

- Estado: `current_informal`
- Para qué sirve hoy: recibir el ganado después del viaje.
- Cómo funciona hoy: puede dejarse descansar antes de pesarlo. Pesar la entrada en el rancho es una preferencia dicha en la entrevista, no una rutina confirmada. No hay plazo de descanso ni se sabe si el peso de compra y el de llegada son el mismo dato. No se inventan otros pasos de recepción.
- Actores: ACT-WORKER, ACT-OWNER
- Entradas: ganado recién transportado.
- Salidas: ganado en el rancho. Un peso de llegada solo si en ese caso se tomó; no es un registro descrito.
- Fuentes: observación de los trabajadores. Sin formato.
- Dolores: ninguno con ID. La falta de historial de peso está en el pesaje.
- Preguntas: OQ-TRADE-001, en la medida en que el peso de compra y el de llegada no están definidos.

### PROC-ID-001 — Identificación

- Estado: `current_informal`
- Para qué sirve hoy: saber de qué animal se habla en el trabajo diario.
- Cómo funciona hoy: arete SINIIGA, nombre o reconocimiento visual de los trabajadores. Un becerro puede no tener arete ni nombre. No hay arete secundario del rancho. El arete puede caerse o retirarse. La preferencia relatada es esperar alrededor de un mes para aretar, porque se percibe traumático; el plazo no está medido. No hay ficha individual del hato de aproximadamente 21 cabezas.
- Actores: ACT-WORKER, ACT-OWNER
- Entradas: animal presente, nacido en el rancho o comprado.
- Salidas: un reconocimiento informal, no un identificador interno ni un archivo.
- Fuentes: arete físico cuando está puesto, memoria del trabajador.
- Dolores: PP-ID-001, PP-DATA-001
- Preguntas: OQ-OWN-003, OQ-ID-001

### PROC-FEED-001 — Alimentación

- Estado: `current`
- Para qué sirve hoy: mantener y engordar el ganado, además del pasto.
- Cómo funciona hoy: el ganado pasta en los potreros y recibe dieta preparada. El propietario compra la materia prima y la transporta. Se vacía en un tambo y se mezcla. Los animales comen juntos y pueden competir. No se mide lo que come cada uno. Se mencionaron alrededor de MXN $8 por kilogramo, alrededor de 1.5 kg por animal por día y alrededor de 270 kg de una fórmula que duran alrededor de 15 días. Esas cifras no cierran entre sí. La dieta puede cambiar, y la caja puede cambiar cuál se usa. Las cantidades conocidas de alimentación requieren validación.
- Actores: ACT-OWNER, ACT-WORKER, ACT-FEED
- Entradas: pasto, materia prima, mano de obra.
- Salidas: alimento ofrecido al grupo. No hay consumo individual ni remanente comprobado.
- Fuentes: tickets de compra de materia prima, memoria de lo preparado y de lo repartido.
- Dolores: PP-FEED-001
- Preguntas: OQ-FEED-001, OQ-FEED-002, OQ-FEED-003

### PROC-GROW-001 — Pesaje de becerros

- Estado: `current`
- Para qué sirve hoy: conocer el peso de los becerros.
- Cómo funciona hoy: se pesan aproximadamente cada 15 días con báscula electrónica IBN ARGON. La sesión dura aproximadamente una hora y el animal puede identificarse en la manga. El indicador no deja el dato en el sistema deseado. El peso se ha anotado a mano, por ejemplo en cuadernos. Las vacas adultas no entran en esa rutina; pueden pesarse al vender o cuando sirva. El modelo y la conexión de la báscula no están confirmados. Este proceso no calcula ganancia diaria ni curvas.
- Actores: ACT-WORKER, ACT-OWNER
- Entradas: becerros reunidos en la manga.
- Salidas: pesos anotados en papel. No un historial utilizable para comparar animales.
- Fuentes: báscula IBN ARGON, cuaderno.
- Dolores: PP-GROW-001, PP-DATA-001
- Preguntas: OQ-SCALE-001, OQ-OWN-003

### PROC-HEALTH-001 — Salud

- Estado: `current_informal`
- Para qué sirve hoy: vacunar, medicar, tratar y bañar cuando hace falta.
- Cómo funciona hoy: el control es limitado y depende de la memoria y del conocimiento informal. Lo ideal es pasar uno por uno por la manga. Si hace falta, se laza, y eso es más peligroso. El baño puede hacerse con bombas. No hay calendario documentado ni un veterinario nombrado. No es, en la entrevista, la prioridad frente a rentabilidad, peso, alimento y seguridad.
- Actores: ACT-WORKER. ACT-VET no tiene interacción documentada.
- Entradas: animales reunidos, medicamentos de la bodega si los hay.
- Salidas: un tratamiento hecho. No queda un registro sanitario.
- Fuentes: memoria del trabajador.
- Dolores: PP-HEALTH-001, PP-DATA-001
- Preguntas: OQ-HEALTH-001

### PROC-SALE-001 — Venta de becerros

- Estado: `current`
- Para qué sirve hoy: vender el producto principal actual.
- Cómo funciona hoy: los becerros se venden por kilogramo de peso vivo. Vender por bulto es una posibilidad futura, no el modelo descrito como vigente. No hay un cálculo de margen ni de costo por kilogramo ganado.
- Actores: ACT-OWNER, ACT-BUYER
- Entradas: becerros, un peso vivo de la venta cuando así se comercializa.
- Salidas: ingreso por la venta. Sin rentabilidad calculada.
- Fuentes: la transacción y los comprobantes, si se guardaron.
- Dolores: PP-FIN-001
- Preguntas: OQ-TRADE-001

## Reproducción

### PROC-REP-001 — Monta natural

- Estado: `current`
- Para qué sirve hoy: preñar las hembras.
- Cómo funciona hoy: monta natural con un solo toro. Por eso la paternidad es hoy relativamente simple. No hay registro genealógico. Las razas no se nombraron. No se afirmó inseminación.
- Actores: ACT-WORKER en el manejo. El toro no es un usuario.
- Entradas: hembras y el toro en el rancho.
- Salidas: gestaciones conocidas de manera informal.
- Fuentes: conocimiento informal.
- Dolores: PP-REPRO-001, PP-DATA-001
- Preguntas: OQ-GEN-001, OQ-REPRO-001

### PROC-BIRTH-001 — Parto

- Estado: `current_informal`
- Para qué sirve hoy: nacer el becerro que luego puede entrar a la engorda.
- Cómo funciona hoy: los partos ocurren y no se registran de forma formal. No existe en este mapa un proceso de «registro de nacimiento». La madre se conoce de manera informal. Cómo se detecta el parto en el campo no está descrito. Un recién nacido puede pasar un tiempo sin arete y sin nombre.
- Actores: ACT-WORKER
- Entradas: hembra próxima al parto. No hay corral de parto documentado como práctica actual.
- Salidas: un becerro presente, sin ficha.
- Fuentes: memoria. No hay registro sistemático.
- Dolores: PP-REPRO-001, PP-ID-001, PP-DATA-001
- Preguntas: OQ-ID-001, OQ-OWN-003

## Inventario / insumos

### PROC-INV-001 — Bodega de insumos

- Estado: `current_informal`
- Para qué sirve hoy: guardar insumos del rancho.
- Cómo funciona hoy: hay una bodega cerrada. Puede contener ingredientes de la dieta, medicamentos, insumos, herramientas y otros materiales. El seguimiento formal es limitado. No se contrasta una existencia teórica con una física. Esto no es un control de inventario.
- Actores: ACT-OWNER, ACT-WORKER
- Entradas: compras que el propietario lleva al rancho.
- Salidas: materiales disponibles para alimentación, sanidad y trabajo. Sin saldo confiable.
- Fuentes: la bodega misma. Sin kardex descrito.
- Dolores: PP-INV-001, PP-FEED-001
- Preguntas: OQ-FEED-001, OQ-FEED-003

## Finanzas

### PROC-FIN-001 — Egresos, nómina y comprobantes

- Estado: `current_informal`
- Para qué sirve hoy: pagar la operación y conservar comprobantes.
- Cómo funciona hoy: hay compras, nómina, combustible y mejoras. Las compras se pagan comúnmente con tarjeta y la nómina comúnmente en efectivo. Se guarda la mayoría de los tickets. El combustible se usa sobre todo en camionetas y tractores; no se describió un control de combustible. No hay una vista que separe gasto operativo e inversión, ni un cálculo de rentabilidad. En «a la parte», el entendimiento verbal es que el ranchero suele pagar los gastos, que los medicamentos a veces se comparten y que las crías se dividen aproximadamente 50/50. Si muere el animal original, la frase queda sin reinterpretar: «si el ganado que se dio se muere, si es de vieja se reemplaza y si es por alguna otra cosa la paga el del rancho con un becerro.»
- Actores: ACT-OWNER, ACT-WORKER, ACT-PARTNER, ACT-FEED
- Entradas: tickets, pagos, salarios, compras de ganado y de alimento, combustible, mejoras.
- Salidas: comprobantes guardados y una caja que se mueve. No un margen.
- Fuentes: tickets en papel, estados de cuenta no revisados en el descubrimiento, efectivo de la nómina.
- Dolores: PP-FIN-001, PP-FIN-002
- Preguntas: OQ-OWN-001, OQ-OWN-002, OQ-FIN-001, OQ-PEOPLE-001

## Seguridad

### PROC-SEC-001 — Perímetro y presencia del ganado

- Estado: `current_informal`
- Para qué sirve hoy: el cerco delimita el rancho. No hay un proceso formal de vigilancia.
- Cómo funciona hoy: el perímetro está cercado, con alrededor de 5 entradas o salidas y aproximadamente 3 caminos en partes del entorno. No hay cámaras. No hay un conteo frecuente. Notar que falta un animal puede tardar varios días o más. En un robo, el cerco puede cortarse, a menudo de noche, y el ganado puede faltar aproximadamente 1 o 2 semanas. A veces puede haber participación interna; no es siempre el caso. Saber que falta un animal y saber que alguien entró son problemas distintos. El software no sustituye el cerco. Las cámaras solo se están considerando.
- Actores: ACT-WORKER, ACT-OWNER
- Entradas: el cerco y la presencia física del ganado.
- Salidas: un faltante que se descubre tarde. No una alerta.
- Fuentes: observación tardía. Sin ronda documentada.
- Dolores: PP-SEC-001, PP-SEC-002, PP-SEC-003
- Preguntas: OQ-COUNT-001, OQ-SEC-001, OQ-FIRE-001

## Terreno / potreros

### PROC-LAND-001 — Pastoreo en potreros

- Estado: `current`
- Para qué sirve hoy: el ganado vive y pasta en áreas cercadas.
- Cómo funciona hoy: pasta libre dentro de potreros grandes. Se identificaron aproximadamente 8 potreros; algunos rondan 20 hectáreas. Esas cifras no describen las aproximadamente 530 hectáreas. No hay seguimiento formal de movimientos ni de ubicación. Existe un mapa del rancho, o puede obtenerse; no está en este repositorio.
- Actores: ACT-WORKER
- Entradas: potreros y ganado.
- Salidas: animales distribuidos en el terreno, sin ubicación registrada.
- Fuentes: mapa del rancho, conocimiento de los trabajadores.
- Dolores: PP-SEC-002
- Preguntas: OQ-LAND-001, OQ-LAND-002

## Información / comunicación

### PROC-COMM-001 — Comunicación de campo

- Estado: `current_informal`
- Para qué sirve hoy: hacer llegar al propietario, que no vive en el rancho, lo que los trabajadores ven.
- Cómo funciona hoy: observación y memoria del trabajador, luego llamadas, WhatsApp, fotografías y audios. Los pesajes también han quedado en cuadernos. No hay Wi-Fi. La cobertura celular es limitada y poco confiable, y los relatos no coinciden: queda pendiente de validación. Los trabajadores no son usuarios de una aplicación. Una foto observa algo; un mensaje lo declara. Hoy no se distinguen de forma operativa.
- Actores: ACT-WORKER, ACT-OWNER
- Entradas: lo visto en el campo, cuadernos, el teléfono.
- Salidas: un relato disperso en mensajes, fotos, audios y papel.
- Fuentes: teléfono, WhatsApp, cuadernos, memoria.
- Dolores: PP-DATA-002, PP-GOV-001, PP-CONN-001
- Preguntas: OQ-CONN-001

## Trazabilidad de dolores

| Dolor | Procesos |
| --- | --- |
| PP-ID-001 | PROC-ID-001, PROC-BIRTH-001 |
| PP-DATA-001 | PROC-ID-001, PROC-GROW-001, PROC-HEALTH-001, PROC-REP-001, PROC-BIRTH-001 |
| PP-DATA-002 | PROC-COMM-001 |
| PP-GROW-001 | PROC-GROW-001 |
| PP-FEED-001 | PROC-FEED-001, PROC-INV-001 |
| PP-FIN-001 | PROC-PUR-001, PROC-SALE-001, PROC-FIN-001 |
| PP-FIN-002 | PROC-FIN-001 |
| PP-INV-001 | PROC-INV-001 |
| PP-SEC-001 | PROC-SEC-001 |
| PP-SEC-002 | PROC-SEC-001, PROC-LAND-001 |
| PP-SEC-003 | PROC-SEC-001 |
| PP-HEALTH-001 | PROC-HEALTH-001 |
| PP-REPRO-001 | PROC-REP-001, PROC-BIRTH-001 |
| PP-MILK-001 | Ninguno. La leche no es operación vigente. |
| PP-CONN-001 | PROC-COMM-001 |
| PP-GOV-001 | PROC-COMM-001 |

## Relaciones que siguen abiertas

- No se sabe qué parte de las aproximadamente 21 cabezas pasa por el pesaje de becerros.
- No se sabe si el descanso en la llegada es la regla o solo una posibilidad.
- No se sabe si el ganado de terceros en renta ocurre hoy.
- Compra, alimentación y venta no tienen una secuencia de costos que produzca un margen.

## Estado del documento

- Versión: 0.1
- Estado: Descubrimiento
- Última actualización: 2026-10-03
- Fuente: `docs/domain` v0.1
- Validación: Pendiente de validación iterativa con el propietario del rancho
