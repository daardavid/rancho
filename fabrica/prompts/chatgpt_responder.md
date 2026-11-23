Escalaste a Claude la revisión de la tarea $tarea_id y ya respondió. Ahora te toca contestar sus puntos para llegar a un consenso.

Lee (no modifiques nada):

- Tu revisión: `$trabajo/$archivo_revision`.
- La respuesta de Claude: `$trabajo/$archivo_claude`.
- Si lo necesitas: `AGENTS.md`, `fabrica/tareas/$tarea_id.md`, `$trabajo/diff.patch` y `$trabajo/pruebas.txt`.

En `respuestas` incluye una entrada por cada punto que lo requiera:

- Por cada hallazgo tuyo en el que Claude dijo "desacuerdo": "acepta" (retiras tu hallazgo) o "sostiene" (lo mantienes), con tu razón.
- Por cada hallazgo nuevo de Claude (ids C1, C2…): "acepta" (es válido) o "rechaza", con tu razón.

Sostén o rechaza solo si de verdad tienes un argumento; si Claude tiene razón, acéptalo. Da tu `veredicto` final ("aprobar" o "cambios") y un `resumen` breve. Responde solo con el JSON del esquema.
