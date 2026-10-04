# Mapa AS-IS

AS-IS es la operación actual del rancho, hasta donde la sostienen las entrevistas en [../../domain/README.md](../../domain/README.md).

No es el rancho deseado. No es una propuesta de software. Las soluciones futuras, la ordeña como meta y la arquitectura se quedan fuera de este mapa.

## Qué entra

Actividades y situaciones que hoy ocurren, aunque sean informales: compra, transporte, llegada, identificación, alimentación, pesaje de becerros, vacunas y baños, venta, monta, parto, bodega, dinero, faltante de ganado, cerco, potreros y comunicación con el propietario.

El estado `current` se lee en el mapa como «Se hace»: una práctica descrita como habitual. El estado `current_informal` se lee como «Se hace, sin registro»: algo vigente sin registro o sin procedimiento cerrado. No hay estado `future`.

## Qué no entra

- Registro formal de nacimientos. El parto sí ocurre; el registro no.
- Seguimiento de ganancia diaria, curvas o comparación de animales. El pesaje sí ocurre; ese análisis no.
- Ordeña y venta de leche. Son historia y una intención. Dibujarlas aquí las haría parecer vigentes.
- Cámaras, sensores, internet de sitio, arete interno, captura por los trabajadores y transmisión de la báscula.
- Un control formal de existencias. Hay bodega; ese control no.
- Respuestas a las preguntas abiertas. El panel las muestra; no las cierra.

`PP-MILK-001` está en los datos de puntos de dolor y no cuelga de ningún proceso, precisamente para no dibujar la leche como operación actual.

## Convenciones visuales

La engorda no es una fila de trámites. Solo hay secuencia donde las entrevistas sostienen un orden.

| Dibujo | Significado |
| --- | --- |
| Línea continua con flecha | Secuencia. Lo que sigue ocurre después, según las entrevistas. |
| Línea punteada, sin flecha | Asociación. Hay relación. No se afirma orden ni causa. |

Secuencias de esta versión: compra → transporte → llegada, y monta → parto.

Identificación, alimentación, pesaje de becerros, vacunas y baños, y pastoreo están en el mismo recuadro porque ocurren durante la engorda, a la par. No hay flecha entre ellos ni desde ellos hacia la venta. La venta permanece en ese recuadro como salida comercial.

La severidad que muestra una tarjeta es la evaluación inicial más alta entre los dolores ligados a ese proceso. No es una medición del rancho. Si no hay dolor ligado, la tarjeta no muestra un conteo.

## Trazabilidad

Cada proceso tiene un ID estable (`PROC-…`) en [process-catalog.md](process-catalog.md). Cada punto de dolor conserva el ID de [../../domain/pain-points.md](../../domain/pain-points.md). El nodo guarda solo los IDs. El texto del dolor vive una vez y el panel lo une al proceso.

En v0.2, `PROC-SEC-001` dejó de mezclar el faltante de ganado con la intrusión. El faltante sigue en `PROC-SEC-001`. El cerco pasó a `PROC-SEC-002`.

La cadena prevista sigue siendo proceso → punto de dolor → opción → requerimiento → decisión. Esta versión cubre los dos primeros tramos.

## Aplicación

La vista AS-IS de `apps/domain-map` dibuja este catálogo. La pestaña TO-BE de la aplicación y ARCHITECTURE siguen vacías. El diseño de dominio TO-BE v0.2, sin interfaz, está en [../to-be/README.md](../to-be/README.md). Arrastrar un nodo no se guarda.

## Estado del documento

- Versión: 0.2
- Estado: Descubrimiento
- Última actualización: 2026-10-03
- Fuente: `docs/domain` v0.1
- Validación: Pendiente de validación iterativa con el propietario del rancho
