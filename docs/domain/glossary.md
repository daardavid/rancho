# Glosario

Definiciones de trabajo para el descubrimiento. Si el uso local no está cerrado, se dice explícitamente. No sustituye un diccionario zootécnico ni un contrato.

| Término | Definición de trabajo |
| --- | --- |
| Animal | Cabeza de ganado del hato que el rancho necesita reconocer. Puede estar bajo regímenes económicos distintos. Véase [actors.md](actors.md) y [business-rules.md](business-rules.md). |
| Becerro | Animal joven en engorda. En la práctica actual es el grupo que se pesa de forma recurrente y el que se vende, sobre todo, por kilogramo de peso vivo. La edad exacta en que deja de llamarse becerro no quedó definida. |
| Vaca | Hembra adulta. No se pesa de rutina. Puede pesarse al venderla o cuando sea útil para la operación. |
| Toro | Macho adulto usado en la monta. Hoy se conoce un solo toro. |
| Hembra | Sexo femenino. El registro futuro debe poder distinguir al menos hembra y macho. |
| Macho | Sexo masculino. Misma exigencia de distinción que en hembra. |
| SINIIGA | Sistema nacional de identificación asociado a los aretes que el rancho usa hoy. En este proyecto el término señala ese arete oficial, no un diseño de integración. |
| Arete | Identificador físico en la oreja. Hoy es el arete SINIIGA. Puede caerse o, potencialmente, retirarse. No hay un arete secundario propio del rancho. Un becerro puede no llevarlo al nacer. |
| A la parte | Arreglo con otra persona sobre parte del ganado. Entendimiento actual, sin reinterpretación legal ni económica: el ranchero suele pagar los gastos de operación; los medicamentos a veces se comparten; las crías se reparten aproximadamente 50/50; hay una compensación verbal si muere el animal original. El significado exacto requiere validación. Véase `BR-PART-001` y `OQ-OWN-001`. |
| Bulto | Forma de comprar, y quizá en el futuro de vender, un grupo sin que cada animal se pese de forma individual en esa transacción. La economía local de «por bulto» no está definida. Véase `OQ-TRADE-001`. |
| Potrero | Área cercada de pastoreo. Hay aproximadamente 8 identificados; algunos rondan 20 hectáreas. No se afirma que cubran toda la propiedad. |
| Manga | Instalación por la que el ganado pasa en fila. Se usa en el pesaje y, de forma ideal, en la vacunación. El animal puede identificarse al pasar. |
| Corral parendero | Área dedicada al parto. Es un concepto de manejo futuro, no una práctica actual documentada. |
| Dieta | Alimento preparado que el ganado recibe además del pasto. Cifras aproximadas de costo y cantidad están en [business-rules.md](business-rules.md) y no cuadran entre sí sin supuestos. |
| GDP / Ganancia diaria de peso | Indicador deseado de crecimiento a partir del historial de peso. No es un cálculo que el rancho produzca hoy de forma sistemática. En inglés de trabajo: average daily gain. |
| Pesaje | Medición de peso. La práctica recurrente actual es sobre becerros, aproximadamente cada 15 días, con báscula electrónica IBN ARGON. No significa que todo el ganado se pese en ese intervalo. |
| Parto | Nacimiento. Hoy no se registra de forma formal. La captura de foto, madre, sexo y fecha aproximada es disposición futura, no proceso vigente. |
| Diagnóstico de preñez | Lo que alguien dijo de una hembra: Preñada, Vacía o No sé. No afirma que en el rancho haya palpación o ultrasonido. Véase `OQ-REPRO-003`. |
| Destete | Lo que alguien dijo de una cría: el día exacto, un día aproximado, o que no se sabe. No la saca del hato. Si hay peso, es un peso con su calidad. Los kilos por vaca se calculan al consultar. Cómo y cuándo se desteta no está cerrado. Véase `OQ-WEAN-001`. |
| Días entre partos | Cuenta entre dos partos con fecha de la misma vaca. Se calcula al consultar; no es un dato que se anote. Un parto sin fecha no entra. |
| Ordeña | Extracción de leche. Hubo un esquema histórico. La infraestructura existe y requiere mantenimiento. No se documenta como producción activa actual. |
| Activo fijo | Inversión de capital, por ejemplo una mejora del rancho, distinta de un gasto de operación. Separarlos es un objetivo de visibilidad gerencial. El criterio contable exacto no está definido. |
| Gasto operativo | Costo de operar, por ejemplo nómina, alimento, combustible o medicamento. Distinto, en la intención del propietario, de la inversión en activos fijos. Esta documentación no afirma que el sistema vaya a sustituir la contabilidad fiscal. |
| Evidencia | Respaldo de un evento: fotografía, marca de tiempo, quién lo registró, origen del dato y, cuando exista, dato generado por un aparato. Es un principio deseado, no un sistema implementado. Véase [data-and-evidence.md](data-and-evidence.md). |
| Dato declarado | Valor que alguien afirma. Ejemplo de trabajo: «el trabajador dice que el animal pesa 340 kg». |
| Dato observado | Valor medido o visto de forma directa. Ejemplo de trabajo: «la báscula reportó 340 kg asociados a este animal». El ejemplo es ilustrativo; 340 kg no es un peso real del hato. |
| Inventario teórico | Existencia que debería haber según registros de entradas, salidas y usos. Concepto de control deseado. |
| Inventario físico | Existencia contada o vista en la bodega, el potrero o el hato. Concepto de control deseado. Hoy el conteo frecuente de ganado no es una práctica confiable. |

## Términos que no se cierran en esta versión

- «A la parte». Incluye la frase verbal sobre la muerte del animal, citada sin glosar en `BR-PART-001`.
- «Bulto». No se traduce a un precio por cabeza ni a un peso promedio.
- «De vieja», dentro de la regla de muerte. Se conserva como palabra de la entrevista. No se define aquí como edad, causa o categoría comercial.

## Estado del documento

- Versión: 0.3
- Estado: Descubrimiento
- Última actualización: 2026-11-26
- Fuente: Entrevistas iniciales de descubrimiento del rancho. La v0.3 agrega «Destete» sin cerrar `OQ-WEAN-001`.
- Validación: Pendiente de validación iterativa con el propietario del rancho
