# Restricciones

Condiciones que cualquier proceso o sistema futuro tiene que respetar. No son decisiones de arquitectura.

| ID | Restricción | Base |
| --- | --- | --- |
| CON-NET-001 | No hay Wi-Fi en el rancho. | Hecho de la entrevista. |
| CON-NET-002 | La cobertura celular es limitada y poco confiable. Las descripciones no coinciden del todo, así que el detalle requiere validación. No se elige aquí una compañía ni una zona con señal. | Relatos no consistentes. Véase `OQ-CONN-001` y `PP-CONN-001`. |
| CON-NET-003 | Una aplicación de campo puede tener que funcionar sin conexión. Si eso ocurre, la sincronización tendría que tratar duplicados, cambios en conflicto y escrituras que no se pisen en silencio. Es una restricción prevista, no un diseño. | Nombrada en la entrevista como necesidad posible. No está diseñada ni confirmada como alcance. |
| CON-DEV-001 | Los trabajadores tienen teléfonos Android. | Hecho de la entrevista. No implica que la primera captura sea en esos teléfonos. |
| CON-ENTRY-001 | La captura inicial no tiene a los trabajadores como usuarios principales. Entra sobre todo el propietario, con lo que ellos le mandan. | Dirección de producto explícita. Véase `BR-ENTRY-001`. |
| CON-SITE-001 | Los trabajadores viven en el rancho. El propietario no está de tiempo completo. La información operativa nace lejos de quien decidiría sobre los datos. | Hecho de la entrevista. Véase `PP-GOV-001`. |
| CON-LAND-001 | La propiedad es grande: aproximadamente 530 hectáreas, con potreros amplios. Recorrer, reunir ganado o notar una falta no es inmediato. | Hecho aproximado. El arreglo interno de la tierra sigue abierto (`OQ-LAND-001`). |
| CON-HAND-001 | Manejar animales toma tiempo y tiene riesgo. Vacunar por la manga es el camino ideal; lazar es más peligroso. | Práctica descrita. |
| CON-WEIGH-001 | Pesar es caro en tiempo de campo frente a llenar un formulario. La sesión de becerros dura aproximadamente una hora. El pesaje diario no es práctico. | `BR-WEIGH-002`, `BR-WEIGH-003`. |
| CON-FEED-001 | Confirmar qué animales exactos están en un grupo de alimentación puede volverse difícil si el hato crece. El consumo individual no se mide. | Límite dicho en la entrevista. |
| CON-SEC-001 | La seguridad física no se resuelve solo con software. Saber que falta un animal no es lo mismo que saber que alguien entró, cortó el cerco o se llevó ganado. | Distinción explícita de la entrevista. Véase `PP-SEC-001` y `PP-SEC-003`. |
| CON-ID-001 | El arete oficial no está desde el nacimiento. Hace falta contemplar un lapso sin SINIIGA. El plazo de alrededor de un mes es preferencia aproximada, no una norma ya medida. | `BR-ID-001`, `BR-ID-003`. |
| CON-SCALE-001 | No se puede asumir integración con la báscula IBN ARGON. Marca conocida; modelo, puertos y protocolo sin confirmar. | Entrevista. `OQ-SCALE-001`. |
| CON-ACC-001 | La contabilidad de gestión deseada no se presenta como reemplazo de la contabilidad fiscal. | Límite explícito del objetivo financiero. |

## Estado del documento

- Versión: 0.1
- Estado: Descubrimiento
- Última actualización: 2026-10-03
- Fuente: Entrevistas iniciales de descubrimiento del rancho
- Validación: Pendiente de validación iterativa con el propietario del rancho
