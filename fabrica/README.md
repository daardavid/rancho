# La fábrica de RANCHO

Es la misma fábrica de `accounting_visualization`, adaptada a este repo. Cursor programa: DeepSeek v4.1 Flash en lo normal y Grok 4.7 high en las tareas críticas. Gemini 4 Neon High (Antigravity) es el orquestador: revisa cada entrega y le da las instrucciones a Cursor. Claude Opus 5.5 (esfuerzo high) solo entra cuando Gemini tiene una duda clara. ChatGPT no participa. `correr.py` los coordina con reglas fijas y deja todo en el PR. Tú solo revisas el producto final.

Las tareas dicen qué lograr y cuándo está terminado; cómo hacerlo queda a criterio de los agentes, dentro de la verdad del rancho y la arquitectura aceptada ("Libertad creativa" en `AGENTS.md`).

```
Cursor programa → pruebas → Gemini revisa
        → ¿duda clara? → debate con Claude (máx. 2 rondas)
        → ¿aprobado y pruebas en verde? sí → merge a integracion → siguiente tarea
                                         no → instrucciones a Cursor (máx. 4 ciclos)
```

Diferencias con la fábrica de Homie:

| | Homie | RANCHO |
| --- | --- | --- |
| Cuenta de GitHub | `davidabreu-homie` | `daardavid` |
| Orquestador / revisor | ChatGPT (respaldo Gemini) | Gemini 4 Neon High; ChatGPT apagado |
| Ejecutor | Grok 4.7 high/xhigh fast | DeepSeek v4.1 Flash medium; Grok 4.7 high en críticas |
| Cuándo entra Claude | dudas, P0, tareas críticas, rojos, desacuerdo | solo dudas claras (esfuerzo high) |
| Tareas críticas | T-02, T-03, T-05, F-03, F-09 | R-02, R-03, R-04, R-05 (solo eligen el modelo de Cursor) |
| Pausa | después de T-03 | después de R-05: revisas el modelo de Herd y Growth |
| Base de datos | `lector_app` en Supabase | ninguna para las pruebas (PostgreSQL embebido, ADR-014) |
| Reglas | contables (`AGENTS.md` de allá) | del dominio del rancho (`AGENTS.md` de aquí y `docs/`) |

## Preparación (una vez)

1. Deja las dos cuentas separadas: [docs/development/dos-cuentas.md](../docs/development/dos-cuentas.md).
2. Las mismas herramientas que la fábrica de Homie, menos Codex: Cursor CLI (`agent`), Antigravity (`agy`), Claude Code (`claude`), GitHub CLI (`gh`), Python 3.11 o mayor, Node 20.19 o mayor y git. Confirma los ids exactos de los modelos con `agent --list-models` y corrígelos en `config.toml` si cambian; `--verificar` te avisa.
3. En una terminal `personal`:

```powershell
personal
git clone https://github.com/daardavid/rancho
cd rancho
python fabrica/correr.py --verificar
```

Todo debe salir `OK`. La revisión incluye la cuenta de `gh` (`daardavid`) y el correo con el que firma git. Si alguno no corresponde, la fábrica no arranca.

## Correr

| Qué | Comando |
| --- | --- |
| Piloto con una tarea | `python fabrica/correr.py R-01` |
| La fila completa | `python fabrica/correr.py --hito` |
| Solo revisar lo que ya hay en una rama | `python fabrica/correr.py --revisar R-01` |
| Detener con calma | crea el archivo `.fabrica/ALTO` (bórralo para volver a correr) |

La primera corrida crea la rama `integracion` desde `main`. La fila se detiene sola después de R-05, o si una tarea queda atorada después de 4 ciclos.

## Dónde ver qué pasó

- En GitHub: cada tarea abre un PR contra `integracion`, con un comentario por ciclo.
- En tu laptop: `.fabrica/trabajo/<tarea>/` guarda las instrucciones, la nota de Cursor, el diff, las pruebas, cada revisión en JSON y la bitácora. Esa carpeta no se sube.

## Ajustes

Todo lo que puede cambiar está en `config.toml`: la cuenta, el orden de revisores, los modelos, los límites, las tareas críticas y las pausas. Las reglas del debate están en `correr.py` y sus pruebas en `test_correr.py` (`python -m unittest discover -s fabrica -p "test_*.py"`).

Si mejoras la fábrica de un lado, lleva el cambio al otro. `correr.py` es casi igual en los dos repos. Las diferencias son la revisión de identidad y la de variables, el orden de revisores y el mensaje de pausa, y todas se leen de `config.toml`.
