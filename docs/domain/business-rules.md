# Reglas de negocio

Solo se anota lo que la entrevista sostiene. «Confirmada» significa que el relato la presenta como práctica o intención clara. No significa aprobación jurídica ni validación posterior con el propietario. «Requiere validación» significa que la formulación aún no se puede usar como regla operable.

El contexto general está en [ranch-context.md](ranch-context.md). Los huecos están en [open-questions.md](open-questions.md).

## Confirmadas como entendimiento actual

| ID | Regla |
| --- | --- |
| BR-OWN-001 | El ganado puede estar en regímenes económicos distintos: cabezas del propietario, cabezas «a la parte» y, como posibilidad descrita, ganado de terceros sobre tierra del rancho. |
| BR-OWN-002 | El ganado de un tercero en arrendamiento no tiene que manejarse animal por animal en el sistema del rancho. El uso de la tierra y la economía del arrendamiento sí pueden importar. |
| BR-OWN-003 | Propiedad y participación económica no se modelan, con lo que se sabe, como un simple identificador de dueño. La rentabilidad puede tener que separar la economía del animal y la parte que corresponde al ranchero. |
| BR-WEIGH-001 | El pesaje recurrente actual es de becerros, aproximadamente cada 15 días. Las vacas adultas no se pesan de rutina; pueden pesarse al venderlas o cuando la operación lo haga útil. |
| BR-WEIGH-002 | Pesar todos los días no se considera práctico. |
| BR-ID-001 | Un animal puede conocerse por arete SINIIGA, por nombre o por reconocimiento visual. Un becerro puede no tener arete ni nombre. El arete SINIIGA puede llegar después del nacimiento. |
| BR-ID-002 | No hay aretes secundarios propios del rancho. |
| BR-SEX-001 | Hace falta distinguir al menos macho y hembra. |
| BR-REPRO-001 | La reproducción actual es por monta natural. Hay un solo toro; por eso la paternidad es hoy relativamente simple. No hay un registro genealógico formal. |
| BR-BIRTH-001 | Los partos no se registran de forma formal. |
| BR-FEED-001 | Además del pasto, el ganado recibe dieta preparada. El consumo individual no se mide. Los animales comen juntos y pueden competir por el alimento. El seguimiento por grupo se considera viable: una cantidad suministrada a un grupo de aproximadamente N animales. |
| BR-BUY-001 | El ganado puede comprarse por kilogramo o, en grupos más grandes, por bulto, sin pesar necesariamente cada animal en la compra. |
| BR-BUY-002 | El flete de una compra de ganado lo paga el comprador. |
| BR-SALE-001 | La venta principal actual es de becerros por kilogramo de peso vivo. |
| BR-ENTRY-001 | La captura inicial de un sistema futuro se espera sobre todo del propietario, a partir de lo que los trabajadores le informan o le muestran. No se asume una aplicación de captura para los trabajadores en esa primera etapa. |
| BR-CADENCE-001 | La revisión de gestión preferida es aproximadamente semanal. Robo, problemas graves de un animal u otras situaciones críticas pueden justificar un aviso inmediato o diario. Hay que evitar el exceso de notificaciones. |
| BR-FIN-001 | El propietario quiere separar gastos operativos e inversión en activos fijos. El objetivo inicial es visibilidad de gestión. No se afirma que esto reemplace la contabilidad fiscal o estatutaria. |
| BR-PAY-001 | La mayoría de las compras se paga comúnmente con tarjeta. La nómina se paga comúnmente en efectivo. «Comúnmente» no cierra una regla sin excepciones. Se conserva la mayoría de los tickets o recibos. |

## Requieren validación

| ID | Entendimiento actual, todavía no operable | Por qué no se cierra |
| --- | --- | --- |
| BR-PART-001 | «A la parte»: el ranchero en general paga los gastos de operación del ganado; los medicamentos a veces se comparten; las crías se dividen aproximadamente 50/50. Si muere el animal original, la formulación verbal es: «si el ganado que se dio se muere, si es de vieja se reemplaza y si es por alguna otra cosa la paga el del rancho con un becerro.» | No se reinterpreta en términos legales ni económicos. «De vieja», «se dio» y «la paga el del rancho» quedan como lenguaje de la entrevista. Véase `OQ-OWN-001` y `OQ-OWN-002`. |
| BR-ID-003 | El propietario prefiere esperar alrededor de un mes para poner el arete, porque aretar a un recién nacido se percibe como traumático. | Es preferencia relatada, no un procedimiento medido. El plazo de un mes es aproximado. |
| BR-WEIGH-003 | Pesar los becerros toma aproximadamente una hora. Durante el paso por la manga el animal puede identificarse. | La duración es aproximada y no se dijo para qué tamaño exacto de grupo. |
| BR-WEIGH-004 | Al llegar una compra, se prefiere pesarla en el rancho, pero el ganado viene estresado del transporte y puede dejarse descansar antes. | No hay un plazo de descanso ni una regla de si el peso de compra y el peso de llegada son el mismo dato. |
| BR-FEED-002 | Se mencionó un costo de dieta alrededor de MXN $8 por kilogramo, una meta de alrededor de 1.5 kg por animal por día, y aproximadamente 270 kg de materia prima por fórmula, cantidad que hoy dura aproximadamente 15 días. La dieta puede cambiar y la caja disponible puede cambiar cuál se usa. | Son aproximaciones. Entre sí no cuadran sin supuestos que esta versión no adopta. Véase `OQ-FEED-001` y `OQ-FEED-002`. |
| BR-SALE-002 | En el futuro la venta también podría hacerse por bulto. | Es posibilidad, no la práctica principal actual (`BR-SALE-001`). |
| BR-MILK-001 | Esquema histórico de leche, no operación actual: ordeña de lunes a sábado; máximo recordado de aproximadamente 150 litros con 22 vacas; la leche iba a un tanque de enfriamiento y se transportaba aproximadamente cada 2 o 3 días, con destino que incluía una quesería. La conclusión recordada es que ese modelo no fue lo bastante rentable. | No se usa como producción vigente ni como meta numérica del sistema. La economía detallada está abierta (`OQ-MILK-001`). |
| BR-COLOSTRUM-001 | Un objetivo operativo futuro es procurar calostro, idealmente dentro de aproximadamente las primeras 6 horas, en un corral de parto. | Es meta de manejo dicha en la entrevista. No es una regla veterinaria que el software deba imponer en esta etapa. |
| BR-EVID-001 | A largo plazo se quiere distinguir dato declarado y dato observado, y conservar fotografía, tiempo, persona que registra, origen y dato de aparato cuando exista. | Principio de diseño. No es un control que exista hoy. Véase [data-and-evidence.md](data-and-evidence.md). |

## Registro de la cría

Esto es cómo se anota, no una práctica que el rancho haya confirmado. No se sabe si alguien viene a revisar si las vacas están preñadas (`OQ-REPRO-003`).

Los partos de una vaca se leen de quién es la madre en la filiación. No hay otra lista de partos. Si la madre está vista, se dice vista; si está inferida, se dice inferida. Inferida no es vista.

Los días entre un parto y el siguiente, y los días desde el último parto, se calculan al consultar. No se guardan. Un parto sin fecha se enseña y no entra a esa cuenta; se dice que no entra. No hay una meta de días entre partos ni de días abiertos.

Un diagnóstico de preñez es lo que alguien dijo de una hembra, o de varias en la misma anotación: Preñada, Vacía o No sé, con la fecha, quién lo dijo si se sabe, una nota si hace falta, y si se vio al animal (Sí, No o No sé). Nada de eso viene preelegido. Se corrige y lo anterior queda, con quién, cuándo y por qué. Si dice que se vio al animal, ese día cuenta como que se le vio. Si dice que no, o «No sé», no cuenta.

## Estado del documento

- Versión: 0.2
- Estado: Descubrimiento
- Última actualización: 2026-11-26
- Fuente: Entrevistas iniciales de descubrimiento del rancho. La v0.2 agrega el registro de la cría: cómo se leen los partos y qué es un diagnóstico de preñez, sin cerrar `OQ-REPRO-003`.
- Validación: Pendiente de validación iterativa con el propietario del rancho
