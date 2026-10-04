# Mapa AS-IS

AS-IS es la operación actual del rancho, hasta donde la sostienen las entrevistas en [../../domain/README.md](../../domain/README.md).

No es el rancho deseado. No es una propuesta de software. Las soluciones futuras, la ordeña como meta y la arquitectura se quedan fuera de este mapa.

## Qué entra

Actividades y situaciones que hoy ocurren, aunque sean informales: compra, transporte, llegada, identificación, alimentación, pesaje de becerros, salud, venta, monta, parto, bodega, dinero, perímetro, potreros y comunicación con el propietario.

El estado `current` marca una práctica descrita como habitual. El estado `current_informal` marca algo vigente sin registro o sin procedimiento cerrado. No hay estado `future`.

## Qué no entra

- Registro formal de nacimientos. El parto sí ocurre; el registro no.
- Seguimiento de ganancia diaria, curvas o comparación de animales. El pesaje sí ocurre; ese análisis no.
- Ordeña y venta de leche. Son historia y una intención. Dibujarlas aquí las haría parecer vigentes.
- Cámaras, internet de sitio, arete interno, captura por los trabajadores y transmisión de la báscula.
- Respuestas a las preguntas abiertas. El panel las muestra; no las cierra.

`PP-MILK-001` está en los datos de puntos de dolor y no cuelga de ningún proceso, precisamente para no dibujar la leche como operación actual.

## Trazabilidad

Cada proceso tiene un ID estable (`PROC-…`) en [process-catalog.md](process-catalog.md). Cada punto de dolor conserva el ID de [../../domain/pain-points.md](../../domain/pain-points.md). El nodo guarda solo los IDs. El texto del dolor vive una vez y el panel lo une al proceso.

La cadena prevista sigue siendo proceso → punto de dolor → opción → requerimiento → decisión. Esta versión cubre los dos primeros tramos.

La severidad del dolor es una evaluación inicial del proyecto, no una medición del rancho.

## Aplicación

La vista AS-IS de `apps/domain-map` dibuja este catálogo. TO-BE y ARCHITECTURE siguen vacías. Arrastrar un nodo no se guarda.

## Estado del documento

- Versión: 0.1
- Estado: Descubrimiento
- Última actualización: 2026-10-03
- Fuente: `docs/domain` v0.1
- Validación: Pendiente de validación iterativa con el propietario del rancho
