# Capacidades futuras

Objetivos y conceptos que el rancho está dispuesto a considerar. Estar en esta lista no asigna prioridad ni compromete implementación.

Nada de lo siguiente es práctica actual, salvo donde se remite a un documento que describe el hoy. El hoy está en [ranch-context.md](ranch-context.md) y [business-rules.md](business-rules.md).

## Animales e identidad

- Ficha del animal.
- Identificador interno permanente, independiente del arete SINIIGA.
- Identificación temporal entre el nacimiento y el arete físico.
- Datos que el rancho estaría dispuesto a tomar al nacer: fotografía, madre, sexo y fecha u hora, o fecha aproximada. Después, asociar el SINIIGA a la misma ficha.
- Distinción de macho y hembra.
- Genealogía para, a largo plazo, ver qué líneas producen mejores animales. Hoy la paternidad es simple porque hay un solo toro; eso no es un registro.

## Crecimiento

- Pesaje recurrente, hoy centrado en becerros.
- Historial de peso, ganancia diaria, curvas, comparación entre animales y detección de crecimiento por debajo de lo esperado.
- Investigar si el indicador IBN ARGON puede transmitir el peso. No está confirmado.

## Alimentación e inventario

- Seguimiento de alimento por grupo: X kilogramos a un grupo de aproximadamente Y animales.
- Conciliación entre inventario teórico y físico de ingredientes, medicamentos, insumos, herramientas y otros materiales.
- El consumo individual no forma parte del concepto viable descrito.

## Economía

- Costo de criar un animal, ingreso de venta, margen y costo por kilogramo ganado.
- Rentabilidad por animal, por grupo y de estrategias de alimentación.
- Comparación entre carne, leche y doble propósito.
- Prorrateo de costos indirectos. El método no está diseñado.
- Separar gasto operativo e inversión en activos fijos, como visibilidad de gestión, no como contabilidad fiscal.
- Analizar si una compra de ganado resultó económicamente bien. Incluye el caso por kilogramo y el caso por bulto, este último todavía sin definición local.
- Pesar en el rancho el ganado que entra, después de un descanso si llega estresado. El descanso no tiene plazo definido.

## Reproducción, sanidad y leche

- Mejor seguimiento de reproducción y partos.
- Corral de parto, manejo de calostro e intención de darlo aproximadamente en las primeras 6 horas. Esa cifra es meta de manejo, no regla de software.
- Registro sanitario. La entrevista no lo pone por encima de rentabilidad, peso, alimento y seguridad.
- Volver a producir leche. La infraestructura existe y requiere mantenimiento.
- Saber la economía real de la leche. Medir por vaca puede ser útil después; no está decidido como requisito inicial.
- Ordeña de lunes a sábado: es un calendario mencionado para el futuro y también parte del recuerdo histórico. No es calendario vigente.

## Tierra, seguridad y campo

- Información espacial de potreros, casas, manga, báscula, área de ordeña, bodega, accesos, puntos de agua y cámaras. Sin construir un GIS ahora.
- Saber antes si falta un animal, usando pesajes, fotos, eventos sanitarios, conteos u otras observaciones. La política no está elegida.
- Cámaras u otro hardware, solo como consideración.
- Detectar intrusión es un problema físico distinto de detectar el faltante. El software no lo cubre solo.
- Operación sin conexión, con sincronización que evite duplicados, conflictos y sobrescrituras silenciosas. Depende de validar la cobertura.
- Internet de sitio, por ejemplo Starlink u otra opción. No está decidido.

## Gestión y evidencia

- Revisión aproximadamente semanal para el propietario.
- Avisos inmediatos solo para robo, problemas graves de animales u otras situaciones críticas, sin saturar.
- Rastro de evidencia: foto, tiempo, quién registra, origen y dato de aparato cuando exista.
- Distinguir dato declarado y dato observado.

Las preguntas que el propietario ya hace —partos, ordeña, litros, problemas y ganancia diaria— son evidencia de qué querría consultar. No son un tablero comprometido. Están citadas en [ranch-context.md](ranch-context.md).

## Estado del documento

- Versión: 0.1
- Estado: Descubrimiento
- Última actualización: 2026-10-03
- Fuente: Entrevistas iniciales de descubrimiento del rancho
- Validación: Pendiente de validación iterativa con el propietario del rancho
