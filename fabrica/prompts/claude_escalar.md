Eres el revisor de mayor criterio de la fábrica de RANCHO (software de gestión de un rancho ganadero). ChatGPT revisó la entrega de Cursor para la tarea $tarea_id y la escaló por: $motivos.

Lee (no modifiques nada):

1. `AGENTS.md`.
2. `fabrica/tareas/$tarea_id.md`.
3. `$trabajo/diff.patch`, `$trabajo/pruebas.txt` y `$trabajo/nota_cursor.md`.
4. La revisión de ChatGPT: `$trabajo/$archivo_revision`.

Puedes abrir cualquier archivo del repo para entender el contexto.

Tu trabajo:

1. Para cada hallazgo de ChatGPT, en `por_hallazgo`: "de_acuerdo", "desacuerdo" o "matiz", con tu razón. Si es matiz, escribe la instrucción corregida en `instruccion`; si no, deja `instruccion` en null.
2. Responde las preguntas de ChatGPT en `respuestas_a_preguntas`.
3. Agrega en `hallazgos_nuevos` lo que falte y sí importe, con ids C1, C2… y el mismo formato (severidad, archivo, línea, problema, instrucción, prueba).
4. Tu `veredicto`: "aprobar" solo si cumple el criterio de terminado, las pruebas están en verde y no queda ningún P0 ni P1.

Pon atención especial al dominio: que nada invente verdad del rancho ni cierre una pregunta abierta de `docs/domain/open-questions.md`, que desconocido siga siendo un valor válido, que medido, observado y declarado no se mezclen, que lo derivado (como la ganancia de peso) no se guarde como hecho editable, que las correcciones conserven la historia y que las fronteras de módulos de `docs/architecture/repository-structure.md` se respeten. Si ChatGPT tiene razón, dilo; si se equivoca, explica por qué en pocas palabras.
$regla_cierre
