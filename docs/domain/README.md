# Dominio RANCHO

Esta carpeta es la fuente de verdad del contexto del rancho mientras dura el descubrimiento. No es el diseño de la aplicación ni un alcance aprobado.

El mapa AS-IS v0.1, descrito en [../maps/as-is/README.md](../maps/as-is/README.md), dibuja la operación actual a partir de este material. TO-BE y arquitectura siguen sin diseñarse. El mapa no es el diseño de la solución.

## Cómo se clasifica el conocimiento

Cada afirmación debe poder ubicarse en una sola categoría. No se convierte una en otra sin evidencia nueva.

| Categoría | Significado |
| --- | --- |
| Hecho conocido | Dato dicho de forma explícita en las entrevistas. |
| Práctica actual | Algo que el rancho hace hoy. |
| Regla de negocio | Regla que afecta propiedad, economía, operación o decisiones. |
| Punto de dolor | Debilidad o riesgo actual. |
| Objetivo futuro | Algo que se quiere y hoy no se hace. |
| Hipótesis | Idea que todavía hay que validar. |
| Pregunta abierta | Información que falta. |

Cuando el dato es aproximado o incompleto se usan fórmulas como «aproximadamente», «entendimiento actual» y «requiere validación». No se inventan cifras precisas.

## Qué es un hecho y qué es una solución propuesta

Un hecho o una práctica actual describe el rancho. Un objetivo futuro describe una intención. Una capacidad listada en [future-capabilities.md](future-capabilities.md) no es un compromiso de implementación.

Ejemplos que no deben mezclarse:

- La engorda de becerros para venta es la actividad ganadera principal actual. La leche y el doble propósito son dirección de largo plazo.
- El pesaje recurrente descrito aplica a becerros, no a todo el ganado.
- Los trabajadores no son, en el entendimiento actual, los usuarios principales de captura.

## Documentos

| Documento | Contenido |
| --- | --- |
| [ranch-context.md](ranch-context.md) | Vista general del rancho y de cómo opera hoy. |
| [glossary.md](glossary.md) | Términos del dominio. |
| [actors.md](actors.md) | Personas y organizaciones. |
| [business-rules.md](business-rules.md) | Reglas respaldadas por la entrevista y reglas que aún hay que validar. |
| [pain-points.md](pain-points.md) | Puntos de dolor, con severidad marcada como juicio inicial del proyecto. |
| [data-and-evidence.md](data-and-evidence.md) | Fuentes actuales y diferencia entre dato declarado y dato observado. |
| [constraints.md](constraints.md) | Restricciones operativas y técnicas. |
| [future-capabilities.md](future-capabilities.md) | Capacidades deseables, sin prioridad ni compromiso. |
| [open-questions.md](open-questions.md) | Preguntas abiertas, por urgencia para el modelo. |

## Mantenimiento

Este material se actualiza cuando una entrevista nueva cambie el entendimiento. Una versión posterior debe decir qué dejó de considerarse cierto. No se da por aprobada formalmente por el propietario: la validación sigue pendiente.

La trazabilidad prevista, todavía no implementada en los mapas, es:

proceso → punto de dolor → opción de solución → requerimiento → decisión de arquitectura

Véase también [ADR-001](../architecture/adr/ADR-001-domain-maps-as-code.md).

## Estado del documento

- Versión: 0.1
- Estado: Descubrimiento
- Última actualización: 2026-10-03
- Fuente: Entrevistas iniciales de descubrimiento del rancho
- Validación: Pendiente de validación iterativa con el propietario del rancho
