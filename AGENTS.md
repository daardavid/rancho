# Reglas para los agentes de la fábrica (Cursor, Gemini y Claude)

Lee este archivo completo antes de tocar o revisar cualquier cosa. Luego lee [docs/START-HERE.md](docs/START-HERE.md) y carga solo las fuentes que gobiernan tu tarea.

Este archivo resume cómo trabaja la fábrica. **No reemplaza** a la [Constitución](docs/product/constitution.md), al [protocolo de incertidumbre](docs/product/uncertainty-protocol.md), al dominio (`docs/domain/`) ni a la arquitectura aceptada (`docs/architecture/`). Si algo de aquí o de una tarea choca con esas fuentes, mandan ellas: dilo en tu nota o en tu revisión y no lo resuelvas por conveniencia.

## Qué es este repo

RANCHO es el software de gestión y decisión de un rancho ganadero en Balancán, Tabasco. El incremento en curso es [INC-006 — Ligera en el celular, sin mensajes falsos y con tendencias](docs/product/increments/INC-006-ligera-y-sin-falsos.md). INC-001 a INC-005 ya están en `main`. Las tareas de la fábrica están en `fabrica/tareas/` y su orden en `fabrica/tareas/orden.txt`.

`apps/domain-map` es el mapa de diseño. No es la app del rancho y no se toca en estas tareas.

## Quién hace qué

| Rol | Hace | No hace |
| --- | --- | --- |
| Cursor | Escribe el código de cada tarea en su rama `fabrica/<tarea>`. Corre las pruebas. Deja su nota al terminar. | Cambiar de rama, hacer push, hacer merge, revisar su propio trabajo. |
| Gemini (Antigravity), orquestador y revisor | Revisa cada entrega, le da las instrucciones a Cursor y decide qué sigue. Solo cuando tiene una duda clara le pregunta a Claude. | Escribir o modificar archivos. |
| Claude | Contesta las dudas claras de Gemini: debate con él y redacta la regla para Cursor. | Escribir o modificar archivos. |
| Orquestador (`fabrica/correr.py`) | Decide el siguiente paso con reglas fijas, lleva la bitácora, abre el PR y hace merge a `integracion`. | Opinar sobre el código: no es IA. |
| David | Revisa el producto final (`integracion → main`), atiende tareas atoradas y decide lo que es suyo. | |

## Libertad creativa

Las tareas dicen **qué** se quiere lograr y **cuándo está terminado**. La sección "Qué hacer" de cada tarea es una guía, no una receta.

- Si encuentras una manera mejor de lograr el objetivo, úsala y explica en tu nota por qué es mejor. Un camino distinto que cumple el objetivo, el criterio de terminado, la verdad del rancho y las ADR aceptadas no es un error.
- Puedes proponer mejoras al producto, a la experiencia del propietario o tareas nuevas en una sección "Propuestas" de tu nota. David decide si entran.
- La libertad no alcanza a dos cosas: la verdad del rancho (abajo) y las decisiones de arquitectura aceptadas. Si crees que una ADR está mal para este caso, propón el cambio en tu nota y sigue la ADR mientras David decide.

## Verdad del rancho (no negociable)

- **Nunca inventes verdad del rancho.** Lo desconocido que no bloquea se guarda como desconocido. Lo desconocido que bloquea se pregunta: escríbelo en tu nota y no lo decidas en el código.
- No cierres en el código ninguna pregunta de [open-questions.md](docs/domain/open-questions.md). «a la parte», «por bulto» y SINIIGA se quedan con esos nombres. «a la parte» es un valor de tenencia con nota verbal opcional; no se calcula ningún porcentaje.
- Desconocido es un valor válido en cualquier campo que el dominio no exija.
- Declarado, observado y medido son distintos y se guardan en cada peso. Una foto no convierte un dato en medido.
- Lo derivado no se guarda como hecho editable. La ganancia de peso del intervalo se calcula de dos pesos; no es una columna editable. La "última observación" es una consulta, no una columna de `Animal`.
- Un hecho equivocado se corrige y la corrección guarda el valor anterior, quién corrigió, cuándo y por qué. Un hecho nuevo (otro pesaje) es un registro nuevo. Los hechos del rancho no se borran para editarlos.
- Un hueco de pesaje (becerro esperado que no pasó) no da de baja al animal ni es una verificación del hato.
- Los trabajadores no son usuarios de la app. `ReportedBy` no es un id de usuario.

## Arquitectura (resumen de lo aceptado)

- Monolito modular: `apps/api` (Fastify, TypeScript estricto), `apps/web` (React, Vite, TanStack Query), `packages/api-contracts` (Zod). Ver [repository-structure.md](docs/architecture/repository-structure.md).
- En INC-001 solo existen los módulos `herd` y `growth`, más `identity`, `read-models` y `shared-kernel`. No crees `feeding`, `inventory` ni `finance`.
- Cada módulo: `domain/` (sin Fastify, Drizzle, auth ni frontend), `application/` (servicios con interfaces de repositorio, sin transacción de Drizzle), `persistence/` (Drizzle) e `index.ts` (único punto de importación). La prueba de fronteras de importación es obligatoria.
- Un módulo no escribe en otro. Las capturas que escriben en más de un módulo van en un orquestador de `application/` con una sola transacción.
- PostgreSQL con un esquema por módulo (`herd`, `growth`, `identity`). `ranch_id` en toda fila de negocio. Ids UUID v4 con `crypto.randomUUID()`. Una sola secuencia de migraciones SQL generadas por Drizzle y revisadas. El servidor nunca aplica migraciones al arrancar.
- Comandos `POST` con id de comando: mismo id y mismo contenido devuelve el resultado guardado; mismo id con contenido distinto devuelve 409 `idempotency_mismatch`. Las correcciones mandan `version`; versión vieja devuelve 409 `version_conflict` y no cambia nada.
- Kilos `numeric(12,3)`, dinero `numeric(12,2)`. Viajan como texto validado con Zod. JavaScript `number` nunca es el valor autoritativo de un peso o de dinero.
- Fechas: `timestamptz` para instantes, `date` para días; se muestran en `America/Mexico_City`. `occurred_at` (cuándo pasó) y `recorded_at` (cuándo se registró) son distintos.
- Sesiones con cookie guardadas en PostgreSQL ([ADR-010](docs/architecture/adr/ADR-010-authentication.md)). Roles `owner` y `support`. El navegador nunca recibe secretos.
- Pruebas con Vitest. Las de persistencia corren en PostgreSQL embebido (PGlite) o en `TEST_DATABASE_URL` si existe, y nunca se saltan ([ADR-014](docs/architecture/adr/ADR-014-local-test-database.md)).
- `package.json` de la raíz debe tener los scripts `lint`, `typecheck` y `test`, que cubren todos los workspaces de la app.
- No agregues tecnología que la arquitectura no acepte ([technology-stack.md](docs/architecture/technology-stack.md), "Explicit non-choices"). Si crees que hace falta, propónlo en tu nota.

## Datos

- No subas datos reales del rancho al repo: ni nombres de animales reales, ni aretes reales, ni fotos de cuadernos. Las pruebas usan datos sintéticos.
- `.env` nunca se sube. Las cadenas de conexión solo se usan del lado del servidor.

## Interfaz

- En español y con lenguaje del rancho ([UX-09](docs/product/ux-principles.md)). Pensada primero para celular ([UX-13](docs/product/ux-principles.md)).
- «No sé» debe ser fácil de elegir y no verse como error ([UX-04](docs/product/ux-principles.md)).

## Severidades

- **P0:** inventa o corrompe verdad del rancho (mezcla medido con declarado, pierde la historia de una corrección, guarda lo derivado como hecho), rompe una frontera de módulos de forma que un módulo escriba en otro, expone secretos o rompe la seguridad.
- **P1:** falla una prueba, falta una prueba del criterio de terminado, o no se logra el objetivo o el criterio de terminado de la tarea. Apartarse de la guía "Qué hacer" no es P1 por sí mismo.
- **P2:** mantenimiento, rendimiento o claridad.
- **P3:** estilo.

## Cuándo Gemini le pregunta a Claude

Solo cuando tiene una duda clara: una pregunta concreta cuya respuesta cambiaría el veredicto o la severidad de un P0 o un P1, y que no puede resolver leyendo el código, las pruebas, la tarea, este archivo o `docs/`. Cada pregunta va escrita para que se pueda contestar.

Un P0, una tarea crítica, pruebas en rojo o un desacuerdo con Cursor no hacen entrar a Claude por sí solos. Gemini los resuelve con instrucciones a Cursor. Si un P0 le deja una duda real sobre cómo corregirlo, la convierte en pregunta.

## Cómo trabaja Cursor

- Lee la especificación de la tarea en `fabrica/tareas/<tarea>.md` y las instrucciones del ciclo en `.fabrica/trabajo/<tarea>/instrucciones.md`.
- Commits pequeños con el formato `<tarea>: <qué cambió>`, en español.
- Antes de terminar corre `npm run lint`, `npm run typecheck` y `npm test`.
- Al terminar cada ciclo escribe `.fabrica/trabajo/<tarea>/nota_cursor.md` con qué hizo, cómo lo probó y, si no está de acuerdo con alguna instrucción, por qué. No ignores instrucciones en silencio.
- Un PR de más de unas 400 líneas cambiadas (sin contar `package-lock.json` ni migraciones generadas) se divide. Si no se puede, explica por qué en la nota.

## Cómo responden los revisores

- Solo leen; no modifican archivos.
- Responden únicamente el JSON del esquema que se les indique.
- Cada hallazgo trae archivo, línea (o null), problema, instrucción concreta y la prueba que demuestra que quedó.
- Los gustos personales no son P0 ni P1.
