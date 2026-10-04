# Mapa de arquitectura v0.1

Explicación interactiva de la arquitectura ya aceptada. No es un alcance de producto y no sustituye los documentos de `docs/architecture`.

La pestaña ARCHITECTURE de `apps/domain-map` muestra este mapa. AS-IS y TO-BE siguen siendo las otras dos pestañas. Sus datos no cambian aquí.

Líneas de base: TO-BE v1 `13c4ef2`, arquitectura lógica v1 `762739b`, arquitectura física v1 `4a262c9`. El plan de esta vista es [../../plans/012-architecture-map-v0.1.md](../../plans/012-architecture-map-v0.1.md).

## Cuatro vistas

| Vista | Pregunta |
| --- | --- |
| Contexto | Quién se relaciona con RANCHO y qué queda fuera |
| Despliegue | Qué proceso y qué recursos correrían |
| Módulos | Quién guarda cada verdad de negocio. Es la vista inicial |
| Flujos | Cómo cooperan los módulos en una captura |

Cada vista tiene su propio diagrama. No hay un lienzo único con toda la arquitectura.

## Aristas

| Trazo | Significado |
| --- | --- |
| Continuo | Llamada síncrona de la aplicación |
| Discontinuo | Lectura, canal humano, o un límite futuro que no está integrado |
| Azul | Persistencia u otro recurso técnico externo |

No hay una arista de bus de eventos. Una flecha que no cambia la lectura del mapa no se dibuja.

## Módulos

Núcleo: Hato (Herd) y Alimentación (Feeding).

Apoyo: Crecimiento (Growth), Inventario (Inventory) y Finanzas (Finance).

La capa de aplicación queda arriba. Los orquestadores llaman la interfaz pública de cada módulo dentro de una transacción local. Un módulo no escribe las filas de otro.

Salud, reproducción, presencia, tierra, reportes, evidencia, identidad, seguridad, leche y analítica no son módulos. Evidencia, identidad, el núcleo compartido, la persistencia y los adaptadores se dibujan como asuntos transversales.

Los modelos de lectura consultan. No escriben. La ausencia sospechada no es la afirmación de ausencia confirmada ni la salida. La rentabilidad provisional no es el libro de Finanzas.

## Flujos

Venta de ganado, compra de ganado, compra de alimento, preparar lote de alimento, pesaje de ganado y nacimiento. El matiz que no cabe en el dibujo —venta sin animales identificados, «bulto» sin definir, entrega declarada sin salida de inventario, parentesco desconocido— está en el panel.

## Congelado y abierto

La franja superior separa la base congelada de lo que se decide al implementar. Lo abierto no bloquea el mapa. La biblioteca de autenticación y el proveedor de hospedaje no aparecen como tecnología elegida. Better Auth es una candidata, no una selección.

## ADRs

El panel cita el identificador. No copia el ADR.

| Id | Tema en el mapa |
| --- | --- |
| ADR-002 | Monolito modular |
| ADR-003 | Orquestación |
| ADR-004 | Sin bus entre módulos |
| ADR-005 | Node y Fastify |
| ADR-006 | React y Vite |
| ADR-007 | PostgreSQL y la regla estrecha de claves foráneas |
| ADR-008 | Drizzle dentro de la persistencia |
| ADR-009 | REST y Zod |
| ADR-010 | Sesiones por cookie. Biblioteca abierta |
| ADR-011 | Puerto de evidencia |
| ADR-012 | Índice público del módulo |
| ADR-013 | RanchId como alcance, no como producto multi-rancho |

Los procesos y capacidades TO-BE se citan por su id. El título sale del catálogo existente. Esos ids no son nodos del diagrama.

## Qué no es este mapa

No es el backend, ni un esquema, ni un catálogo de rutas, ni una decisión de hospedaje. Los nombres de registros son conceptos de arquitectura, no clases ni tablas. `RanchId` es el alcance de los datos de un rancho sembrado. No es una arquitectura SaaS.
