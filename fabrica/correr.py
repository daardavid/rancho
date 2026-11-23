#!/usr/bin/env python3
"""Orquestador de la fábrica de RANCHO (portada de la fábrica de accounting_visualization).

Cursor programa; el primer revisor (Gemini con Antigravity o ChatGPT con Codex, según
`[revisor] primero` en config.toml) revisa; el otro es respaldo; Claude (Claude Code) entra
solo en los escalamientos. Este script no es IA: decide con reglas fijas.

Uso (desde la raíz del repo):
    python fabrica/correr.py --verificar        revisa que todo esté listo
    python fabrica/correr.py F-01               corre una tarea
    python fabrica/correr.py --hito             corre la fila de fabrica/tareas/orden.txt
    python fabrica/correr.py --revisar F-01     solo revisa lo que ya hay en la rama (sin Cursor)

Para detenerla con calma: crea el archivo .fabrica/ALTO (se detiene al terminar el paso en curso).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import tomllib
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from string import Template
from urllib.parse import unquote, urlparse

RAIZ = Path(__file__).resolve().parent.parent
FABRICA = RAIZ / "fabrica"
TRABAJO = RAIZ / ".fabrica" / "trabajo"
ARCHIVO_ALTO = RAIZ / ".fabrica" / "ALTO"
SEVERIDADES = ("P0", "P1", "P2", "P3")
BLOQUEANTES = ("P0", "P1")
PATRONES_PROHIBIDOS = (".csv", ".xlsx", ".xls", ".parquet", ".env")
SONDEO_S = 15  # cada cuánto revisa un proceso largo (tiempo límite, ALTO, nota de Cursor)


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

class RevisorNoDisponible(RuntimeError):
    """ChatGPT o Claude no respondieron con JSON válido después de reintentar."""


def log(mensaje: str) -> None:
    print(f"[{datetime.now():%H:%M:%S}] {mensaje}", flush=True)


def cargar_config() -> dict:
    with open(FABRICA / "config.toml", "rb") as f:
        return tomllib.load(f)


def cargar_env() -> None:
    """Carga .env en el entorno de los procesos hijos (sin dependencias externas)."""
    archivo = RAIZ / ".env"
    if not archivo.exists():
        return
    for linea in archivo.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, valor = linea.split("=", 1)
        os.environ.setdefault(clave.strip(), valor.strip().strip('"').strip("'"))


def resolver(cmd: list[str]) -> list[str]:
    ejecutable = shutil.which(cmd[0])
    if not ejecutable:
        raise FileNotFoundError(f"No encuentro '{cmd[0]}' en el PATH.")
    return [ejecutable, *cmd[1:]]


def matar_arbol(p: subprocess.Popen) -> None:
    """Detiene el proceso y todos sus hijos (en Windows, `agent`/`codex` arrancan con un lanzador .cmd)."""
    if p.poll() is not None:
        return
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/T", "/F", "/PID", str(p.pid)], capture_output=True, timeout=60)
        else:
            os.killpg(p.pid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError, subprocess.TimeoutExpired, OSError):
        p.kill()


def correr(cmd: list[str], *, entrada: str | None = None, timeout_min: float = 30,
           check: bool = False, listo=None) -> subprocess.CompletedProcess:
    """Corre un comando sin quedarse colgado.

    - La salida va a archivos temporales, no a tuberías: si un nieto del proceso sigue vivo,
      ya no puede dejar a la fábrica esperando para siempre.
    - Al agotarse el tiempo detiene el árbol completo y regresa código 124 (no lanza excepción).
    - `listo()`, si se da, se consulta cada SONDEO_S segundos: si devuelve True, el trabajo ya
      terminó aunque el proceso no haya salido; se detiene y se regresa código 0.
    """
    completo = resolver(cmd)
    visible = " ".join([cmd[0], *cmd[1:]])
    log(f"$ {visible[:200]}")
    grupo = ({"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == "nt"
             else {"start_new_session": True})
    motivo = None
    with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
        p = subprocess.Popen(completo, stdin=subprocess.PIPE if entrada is not None else subprocess.DEVNULL,
                             stdout=out, stderr=err, cwd=RAIZ, **grupo)
        if entrada is not None:
            def escribir() -> None:
                try:
                    p.stdin.write(entrada.encode("utf-8"))
                    p.stdin.close()
                except OSError:
                    pass
            threading.Thread(target=escribir, daemon=True).start()
        limite = time.monotonic() + timeout_min * 60
        try:
            while True:
                try:
                    p.wait(timeout=SONDEO_S)
                    break
                except subprocess.TimeoutExpired:
                    pass
                if listo is not None and listo():
                    motivo = "listo"
                    break
                if time.monotonic() > limite:
                    motivo = "tiempo"
                    break
        except KeyboardInterrupt:
            matar_arbol(p)
            raise
        if motivo:
            matar_arbol(p)
            try:
                p.wait(timeout=30)
            except subprocess.TimeoutExpired:
                pass
        out.seek(0)
        err.seek(0)
        stdout = out.read().decode("utf-8", errors="replace")
        stderr = err.read().decode("utf-8", errors="replace")
    if motivo == "tiempo":
        codigo = 124
        stderr += f"\n[fábrica] Se agotó el tiempo ({timeout_min:g} min): detuve el proceso y sus hijos."
        log(f"Se agotó el tiempo de {cmd[0]} ({timeout_min:g} min): lo detuve con todo y sus hijos.")
    elif motivo == "listo":
        codigo = 0
    else:
        codigo = p.returncode
    r = subprocess.CompletedProcess(completo, codigo, stdout, stderr)
    if check and codigo != 0:
        raise RuntimeError(f"Falló: {visible}\n{stderr[-3000:]}")
    return r


class SinDormir:
    """En Windows, evita que la laptop se duerma por inactividad mientras corre la fábrica.

    No evita que se duerma al cerrar la tapa o con el botón de suspender.
    """
    ES_CONTINUOUS, ES_SYSTEM_REQUIRED = 0x80000000, 0x00000001

    def __enter__(self):
        if os.name == "nt":
            try:
                import ctypes
                ctypes.windll.kernel32.SetThreadExecutionState(self.ES_CONTINUOUS | self.ES_SYSTEM_REQUIRED)
                log("Mientras corra la fábrica, Windows no se dormirá por inactividad (cerrar la tapa sí la duerme).")
            except Exception as e:  # noqa: BLE001
                log(f"No pude evitar que Windows se duerma ({e}); configúralo en Energía si vas a dejarla sola.")
        return self

    def __exit__(self, *_):
        if os.name == "nt":
            try:
                import ctypes
                ctypes.windll.kernel32.SetThreadExecutionState(self.ES_CONTINUOUS)
            except Exception:  # noqa: BLE001
                pass
        return False


def es_limite_de_uso(texto: str) -> bool:
    return bool(re.search(r"usage limit|rate limit|quota|límite de uso|too many requests|\b429\b", texto or "", re.I))


def leer_respuesta_agy(stdout: str) -> dict:
    """Saca el JSON de la respuesta de `agy -p --output-format json` (sobre con status, response y structured_output)."""
    sobre = extraer_json(stdout)
    if "status" in sobre and ("response" in sobre or "structured_output" in sobre):
        if sobre.get("status") != "SUCCESS":
            raise ValueError(f"agy terminó con status {sobre.get('status')}")
        if isinstance(sobre.get("structured_output"), dict):
            return sobre["structured_output"]
        return extraer_json(sobre.get("response", ""))
    return sobre


def ultimas_lineas(texto: str, n: int = 3, largo: int = 400) -> str:
    lineas = [x.strip() for x in (texto or "").strip().splitlines() if x.strip()]
    return " | ".join(lineas[-n:])[-largo:]


def git(*args: str, check: bool = True) -> str:
    return correr(["git", *args], check=check).stdout.strip()


def gh(*args: str, check: bool = True, entrada: str | None = None) -> str:
    return correr(["gh", *args], check=check, entrada=entrada).stdout.strip()


def extraer_json(texto: str) -> dict:
    """Saca el primer objeto JSON de un texto (los modelos a veces lo envuelven en prosa o ```)."""
    inicio = texto.find("{")
    fin = texto.rfind("}")
    if inicio == -1 or fin <= inicio:
        raise ValueError("La respuesta no trae un objeto JSON.")
    return json.loads(texto[inicio:fin + 1])


def render(nombre_plantilla: str, **valores: str) -> str:
    texto = (FABRICA / "prompts" / nombre_plantilla).read_text(encoding="utf-8")
    return Template(texto).safe_substitute(**valores)


def alto_pedido() -> bool:
    return ARCHIVO_ALTO.exists()


# ---------------------------------------------------------------------------
# Reglas de decisión (funciones puras: se prueban en test_correr.py)
# ---------------------------------------------------------------------------

def chatgpt_activo(cfg: dict) -> bool:
    """False si `[chatgpt] activo = false`: entonces Antigravity es el único revisor."""
    return bool(cfg.get("chatgpt", {}).get("activo", True))


def respaldo_va_primero(cfg: dict) -> bool:
    """True si `[revisor] primero = "respaldo"` y hay modelos de respaldo configurados."""
    if not cfg.get("respaldo", {}).get("modelos"):
        return False
    return cfg.get("revisor", {}).get("primero", "chatgpt") == "respaldo" or not chatgpt_activo(cfg)


def identidad_correcta(cuenta: str, correo: str, cuenta_esperada: str, correo_contiene: str) -> tuple[bool, bool]:
    """(cuenta de gh correcta, correo de git correcto). Lo vacío en la configuración no se exige."""
    ok_cuenta = (not cuenta_esperada) or cuenta.lower() == cuenta_esperada.lower()
    ok_correo = (not correo_contiene) or (correo_contiene.lower() in correo.lower())
    return ok_cuenta, ok_correo


MOTIVOS_ESCALAMIENTO = ("preguntas", "p0", "critica", "rojos", "desacuerdo")


def motivos_escalamiento(revision: dict, tarea_critica: bool, ciclos_rojos: int,
                         ciclos_rojos_para_escalar: int, activos=MOTIVOS_ESCALAMIENTO) -> list[str]:
    """Devuelve por qué hay que escalar a Claude (lista vacía = no se escala).

    Una duda solo escala si viene con al menos una pregunta concreta para Claude:
    `duda: true` sin preguntas es ruido y no gasta una ronda de debate.
    `activos` (de `[escalamiento] motivos` en config.toml) limita qué motivos cuentan.
    """
    motivos = []
    preguntas = [p for p in revision.get("preguntas_para_claude", []) if str(p).strip()]
    if "preguntas" in activos and preguntas:
        motivos.append(f"el revisor tiene {len(preguntas)} pregunta(s) para Claude")
    if "p0" in activos and any(h.get("severidad") == "P0" for h in revision.get("hallazgos", [])):
        motivos.append("el revisor encontró un P0")
    if "critica" in activos and tarea_critica and revision.get("veredicto") == "aprobar":
        # En tareas críticas Claude confirma antes de aprobar; en los ciclos de cambios entra solo por los otros motivos.
        motivos.append("la tarea es crítica y el revisor la aprueba: Claude confirma")
    if "rojos" in activos and ciclos_rojos >= ciclos_rojos_para_escalar:
        motivos.append(f"van {ciclos_rojos} ciclos seguidos con pruebas en rojo")
    if "desacuerdo" in activos and revision.get("desacuerdo_con_cursor"):
        motivos.append("el revisor y Cursor no coinciden")
    return motivos


def resolver_consenso(rev_chatgpt: dict, claude: dict, resp_chatgpt: dict | None = None) -> dict:
    """Aplica el desempate de forma determinista.

    - Hallazgo de ChatGPT con el que Claude coincide (o matiza): se incluye (con la instrucción de Claude si la reescribió).
    - Hallazgo de ChatGPT que Claude objeta: si ChatGPT acepta la objeción, se retira; si la sostiene, hay disputa.
    - Hallazgo nuevo de Claude: se incluye salvo que ChatGPT lo rechace; si lo rechaza, hay disputa.
    - Disputa en P0/P1: gana lo conservador (se incluye). Disputa en P2/P3: se descarta y se anota.
    - Se aprueba solo si los dos aprueban y no queda ningún P0/P1 incluido.
    `claude` es la última postura de Claude (ronda final si la hubo).
    """
    posturas = {p["id"]: p for p in claude.get("por_hallazgo", [])}
    respuestas = {r["id"]: r for r in (resp_chatgpt or {}).get("respuestas", [])}
    incluidos, descartados, disputas = [], [], []

    def disputa(h: dict, detalle: str) -> None:
        if h["severidad"] in BLOQUEANTES:
            incluidos.append({**h, "desempate": "conservador"})
            disputas.append({"id": h["id"], "severidad": h["severidad"], "resultado": "se incluye (conservador)", "detalle": detalle})
        else:
            descartados.append({**h, "motivo": "disputa en P2/P3: se descarta y se anota"})
            disputas.append({"id": h["id"], "severidad": h["severidad"], "resultado": "se descarta", "detalle": detalle})

    for h in rev_chatgpt.get("hallazgos", []):
        h = {**h, "origen": "chatgpt"}
        p = posturas.get(h["id"], {"postura": "de_acuerdo"})
        if p["postura"] in ("de_acuerdo", "matiz"):
            if p.get("instruccion"):
                h["instruccion"] = p["instruccion"]
            incluidos.append(h)
            continue
        r = respuestas.get(h["id"])
        if r and r["postura"] == "acepta":
            descartados.append({**h, "motivo": "ChatGPT aceptó la objeción de Claude"})
        else:
            disputa(h, f"Claude: {p.get('razon', '')} | ChatGPT: {(r or {}).get('razon', 'sin respuesta')}")

    for h in claude.get("hallazgos_nuevos", []):
        h = {**h, "origen": "claude"}
        r = respuestas.get(h["id"])
        if r is None or r["postura"] == "acepta":
            incluidos.append(h)
        else:
            disputa(h, f"ChatGPT: {r.get('razon', '')}")

    veredicto_chatgpt = (resp_chatgpt or rev_chatgpt).get("veredicto", "cambios")
    hay_bloqueante = any(h["severidad"] in BLOQUEANTES for h in incluidos)
    aprobado = claude.get("veredicto") == "aprobar" and veredicto_chatgpt == "aprobar" and not hay_bloqueante
    return {
        "veredicto": "aprobar" if aprobado else "cambios",
        "incluidos": ordenar(incluidos),
        "descartados": descartados,
        "disputas": disputas,
    }


def decision_sin_escalar(rev_chatgpt: dict) -> dict:
    hallazgos = [{**h, "origen": "chatgpt"} for h in rev_chatgpt.get("hallazgos", [])]
    hay_bloqueante = any(h["severidad"] in BLOQUEANTES for h in hallazgos)
    aprobado = rev_chatgpt.get("veredicto") == "aprobar" and not hay_bloqueante
    return {"veredicto": "aprobar" if aprobado else "cambios", "incluidos": ordenar(hallazgos),
            "descartados": [], "disputas": []}


def usuario_de_conexion(url: str) -> str:
    """Rol con el que conecta una cadena postgres. En el pooler de Supabase viene como `rol.<proyecto>`."""
    try:
        usuario = urlparse(url).username or ""
    except ValueError:
        return ""
    return unquote(usuario).split(".", 1)[0]


def modelo_listado(modelo: str, salida_list_models: str) -> bool:
    """El id exacto del modelo aparece en `agent --list-models` (no basta con que sea parte de otro id)."""
    ids = {t.rstrip("._-") for t in re.findall(r"[A-Za-z0-9][A-Za-z0-9._\-]*", salida_list_models)}
    return modelo in ids


def es_falla_de_entorno(rev_chatgpt: dict, pruebas_ok: bool) -> bool:
    """Pruebas en rojo por algo que el código no controla (credencial, permisos, servicio caído).

    Solo cuenta con las pruebas en rojo: en verde la marca no tiene sentido y se ignora.
    """
    return (not pruebas_ok) and bool(rev_chatgpt.get("falla_de_entorno"))


def aplicar_pruebas(decision: dict, pruebas_ok: bool, tarea_id: str) -> dict:
    """Las pruebas mandan: en rojo nunca se aprueba, aunque los revisores digan que sí."""
    if pruebas_ok:
        return decision
    pendiente = {
        "id": "PRUEBAS", "severidad": "P1", "archivo": f".fabrica/trabajo/{tarea_id}/pruebas.txt", "linea": None,
        "problema": "Las pruebas no pasan.", "instruccion": "Haz que pasen lint, typecheck y test sin desactivar pruebas.",
        "prueba": "npm run lint && npm run typecheck && npm test en verde", "origen": "orquestador",
    }
    return {**decision, "veredicto": "cambios", "incluidos": ordenar([pendiente, *decision["incluidos"]])}


def ordenar(hallazgos: list[dict]) -> list[dict]:
    return sorted(hallazgos, key=lambda h: SEVERIDADES.index(h.get("severidad", "P3")))


def validar(datos: dict, requeridos: tuple[str, ...]) -> dict:
    faltan = [k for k in requeridos if k not in datos]
    if faltan:
        raise ValueError(f"La respuesta no trae: {', '.join(faltan)}")
    for h in datos.get("hallazgos", []) + datos.get("hallazgos_nuevos", []):
        if h.get("severidad") not in SEVERIDADES:
            raise ValueError(f"Severidad inválida en {h.get('id')}: {h.get('severidad')}")
    return datos


# ---------------------------------------------------------------------------
# La fábrica
# ---------------------------------------------------------------------------

@dataclass
class Tarea:
    id: str
    titulo: str
    critica: bool
    prefijo_rama: str

    @property
    def rama(self) -> str:
        return f"{self.prefijo_rama}{self.id}"

    @property
    def dir(self) -> Path:
        d = TRABAJO / self.id
        d.mkdir(parents=True, exist_ok=True)
        return d

    @property
    def rel(self) -> str:
        return f".fabrica/trabajo/{self.id}"


class Fabrica:
    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.base = cfg["repo"]["rama_base"]
        self.error_cursor = ""
        self.ultimo_revisor = "ChatGPT"
        self.avisos: list[str] = []
        self.ciclos_previos: dict[str, int] = {}

    # --- tareas y ramas -----------------------------------------------------

    def tarea(self, tarea_id: str) -> Tarea:
        archivo = FABRICA / "tareas" / f"{tarea_id}.md"
        if not archivo.exists():
            raise FileNotFoundError(f"No existe {archivo.relative_to(RAIZ)}")
        titulo = archivo.read_text(encoding="utf-8").splitlines()[0].lstrip("# ").strip()
        return Tarea(tarea_id, titulo, tarea_id in self.cfg["escalamiento"]["tareas_criticas"],
                     self.cfg["repo"]["prefijo_rama"])

    def remota_existe(self, rama: str) -> bool:
        return bool(git("ls-remote", "--heads", "origin", rama, check=False))

    def preparar_rama(self, t: Tarea) -> None:
        actual = git("rev-parse", "--abbrev-ref", "HEAD", check=False)
        if git("status", "--porcelain"):
            if actual != t.rama:
                raise RuntimeError("Hay cambios sin guardar en tu copia. Guárdalos o descártalos antes de correr la fábrica.")
            # Una corrida de esta misma tarea se interrumpió (Ctrl+C, la laptop se durmió…): se guarda lo que dejó Cursor.
            log(f"Hay cambios sin guardar en {t.rama} de una corrida interrumpida: los guardo antes de seguir.")
            self.guardar_cambios(t, "trabajo de una corrida interrumpida")
        git("fetch", "origin")
        self.subir_commits_locales(t)
        if not self.remota_existe(self.base):
            log(f"Creo la rama {self.base} desde {self.cfg['repo']['rama_final']}")
            git("push", "origin", f"origin/{self.cfg['repo']['rama_final']}:refs/heads/{self.base}")
            git("fetch", "origin")
        if not self.remota_existe(t.rama):
            git("checkout", "-B", t.rama, f"origin/{self.base}")
            return
        # Se retoma una tarea que ya tenía rama: se pone al día con la base para que use
        # las reglas, prompts y esquemas vigentes (se leen del disco después del checkout).
        git("checkout", "-B", t.rama, f"origin/{t.rama}")
        if correr(["git", "merge", "--no-edit", f"origin/{self.base}"]).returncode != 0:
            git("merge", "--abort", check=False)
            raise RuntimeError(f"La rama {t.rama} choca con {self.base} al ponerla al día. "
                               "Resuelve el conflicto a mano (o pide ayuda) antes de volver a correrla.")
        log(f"Rama {t.rama} retomada y puesta al día con {self.base}.")

    def ya_terminada(self, tarea_id: str) -> bool:
        salida = gh("pr", "list", "--head", f"{self.cfg['repo']['prefijo_rama']}{tarea_id}", "--state", "merged",
                    "--json", "number", check=False)
        return bool(json.loads(salida or "[]"))

    # --- pasos del ciclo ----------------------------------------------------

    def correr_cursor(self, t: Tarea, instrucciones: str, ciclo: int) -> bool:
        """Corre a Cursor. Regresa False si dos veces seguidas no pudo ni arrancar (sin tocar nada)."""
        limite = self.cfg["cursor"]["timeout_min"]
        instrucciones += (f"\n## Tiempo\n\nTienes como máximo {limite} minutos en este ciclo; después el orquestador te detiene "
                          "y revisa lo que haya. Haz commits pequeños mientras avanzas y escribe tu nota antes de terminar. "
                          "Si no alcanzas todo, entrega lo esencial y di en la nota qué falta.\n")
        (t.dir / "instrucciones.md").write_text(instrucciones, encoding="utf-8")
        (t.dir / "nota_cursor.md").unlink(missing_ok=True)  # la nota debe ser de este ciclo
        # Sin comillas ni símbolos: el lanzador de Cursor en Windows los altera.
        prompt = (f"Lee y ejecuta las instrucciones del archivo {t.rel}/instrucciones.md siguiendo AGENTS.md. "
                  f"Al terminar escribe tu nota en {t.rel}/nota_cursor.md")
        cfg = self.cfg["cursor"]
        modelo = cfg.get("modelo_critica", cfg["modelo"]) if t.critica else cfg["modelo"]
        log(f"Cursor trabaja con {modelo}{' (tarea crítica)' if t.critica else ''}.")
        cmd = [c.format(modelo=modelo) for c in cfg["comando"]] + [prompt]
        nota = t.dir / "nota_cursor.md"
        espera = cfg.get("espera_tras_nota_min", 5) * 60

        def termino() -> bool:
            # A veces `agent -p` deja su nota y su proceso no sale: si la nota lleva un rato quieta, ya acabó.
            if nota.exists() and time.time() - nota.stat().st_mtime > espera:
                log(f"Cursor dejó su nota hace más de {espera / 60:g} min y su proceso no ha salido: lo detengo y sigo.")
                return True
            return False

        for intento in (1, 2):
            cabeza = git("rev-parse", "HEAD", check=False)
            inicio = time.monotonic()
            r = correr(cmd, timeout_min=cfg["timeout_min"], listo=termino)
            with open(t.dir / f"cursor_ciclo{ciclo}.txt", "a", encoding="utf-8") as f:
                f.write(f"=== intento {intento}\n{r.stdout}\n--- stderr ---\n{r.stderr}\n")
            if r.returncode == 0:
                return True
            fallo_al_arrancar = (time.monotonic() - inicio < 120
                                 and git("rev-parse", "HEAD", check=False) == cabeza
                                 and not git("status", "--porcelain", check=False))
            if not fallo_al_arrancar:
                log(f"Cursor terminó con código {r.returncode}; sigo con la revisión de lo que haya.")
                return True
            detalle = (r.stderr.strip() or r.stdout.strip())[-300:]
            if intento == 1:
                # Pasa, por ejemplo, si Cursor se actualizó mientras arrancaba: un reintento lo resuelve.
                pausa = cfg.get("espera_reintento_s", 30)
                log(f"Cursor falló al arrancar sin hacer cambios ({detalle!r}); lo reintento en {pausa} s.")
                time.sleep(pausa)
        self.error_cursor = detalle
        return False

    def guardar_cambios(self, t: Tarea, que: str) -> None:
        if not git("status", "--porcelain"):
            return
        git("add", "-A")
        prohibidos = [f for f in git("diff", "--cached", "--name-only").splitlines()
                      if f.lower().endswith(PATRONES_PROHIBIDOS) and not f.startswith("pruebas/referencia/")]
        if prohibidos:
            git("reset", "-q", "HEAD", "--", *prohibidos)
            log(f"No subo archivos de datos o secretos: {', '.join(prohibidos)}")
        if git("diff", "--cached", "--name-only"):
            git("commit", "-m", f"{t.id}: {que}")

    def subir_commits_locales(self, t: Tarea) -> None:
        """Si la rama local de la tarea tiene commits que no están en GitHub, los sube antes de seguir.

        Sin esto, retomar una corrida interrumpida reiniciaría la rama desde integracion y
        dejaría fuera lo que Cursor ya había hecho.
        """
        if not git("branch", "--list", t.rama, check=False):
            return
        remota = self.remota_existe(t.rama)
        referencia = f"origin/{t.rama}" if remota else f"origin/{self.base}"
        adelante = int(git("rev-list", "--count", f"{referencia}..{t.rama}", check=False) or 0)
        if not adelante:
            return
        if remota and int(git("rev-list", "--count", f"{t.rama}..origin/{t.rama}", check=False) or 0):
            raise RuntimeError(f"La rama local {t.rama} y la de GitHub tienen commits distintos. Revísala a mano antes de seguir.")
        log(f"La rama local {t.rama} tiene {adelante} commit(s) sin subir: los subo antes de seguir.")
        git("push", "-u", "origin", t.rama)
        git("fetch", "origin")

    def guardar_y_subir(self, t: Tarea, ciclo: int) -> None:
        self.guardar_cambios(t, f"cambios del ciclo {ciclo}")
        git("push", "-u", "origin", t.rama)

    def correr_pruebas(self, t: Tarea) -> tuple[bool, str]:
        if not (RAIZ / "package.json").exists():
            texto = "No existe package.json todavía: no hay pruebas que correr."
            (t.dir / "pruebas.txt").write_text(texto, encoding="utf-8")
            return False, texto
        cfg = self.cfg["pruebas"]
        salidas, ok = [], True
        instalar = cfg["instalar_con_lock"] if (RAIZ / "package-lock.json").exists() else cfg["instalar_sin_lock"]
        for cmd in [instalar, *cfg["comandos"]]:
            try:
                r = correr(cmd, timeout_min=cfg["timeout_min"])
                salidas.append(f"$ {' '.join(cmd)}  (código {r.returncode})\n{r.stdout[-6000:]}\n{r.stderr[-4000:]}")
                ok = ok and r.returncode == 0
            except Exception as e:  # noqa: BLE001
                salidas.append(f"$ {' '.join(cmd)}\nERROR: {e}")
                ok = False
        texto = "\n\n".join(salidas)
        (t.dir / "pruebas.txt").write_text(texto, encoding="utf-8")
        return ok, texto

    def preparar_contexto(self, t: Tarea) -> None:
        base = f"origin/{self.base}"
        diff = git("diff", f"{base}...HEAD", check=False)
        limite = self.cfg["limites"]["diff_max_kb"] * 1024
        if len(diff.encode("utf-8")) > limite:
            diff = diff[:limite] + "\n\n[diff recortado: es más grande que el límite; pide dividir la tarea]\n"
        (t.dir / "diff.patch").write_text(diff, encoding="utf-8")
        (t.dir / "diff_resumen.txt").write_text(git("diff", "--stat", f"{base}...HEAD", check=False), encoding="utf-8")
        if not (t.dir / "nota_cursor.md").exists():
            (t.dir / "nota_cursor.md").write_text("(Cursor no dejó nota)", encoding="utf-8")

    # --- revisores ----------------------------------------------------------

    def pedir_chatgpt(self, t: Tarea, plantilla: str, esquema: str, nombre: str, **valores: str) -> dict:
        """Pide la revisión de primera línea. El orden de revisores sale de `[revisor] primero`."""
        prompt = render(plantilla, tarea_id=t.id, trabajo=t.rel, **valores)
        (t.dir / f"{nombre}.prompt.md").write_text(prompt, encoding="utf-8")
        salida = t.dir / f"{nombre}.json"
        salida.unlink(missing_ok=True)
        respaldo_primero = respaldo_va_primero(self.cfg)
        if respaldo_primero:
            datos = self.pedir_respaldo(t, esquema, nombre, primero=True)
            if datos is not None:
                return datos
            if not chatgpt_activo(self.cfg):
                raise RevisorNoDisponible(f"Antigravity no respondió en {nombre} y ChatGPT está desactivado "
                                          f"([chatgpt] activo = false). Salida en {t.rel}/{nombre}.respaldo.txt")
            log("El revisor primero (Antigravity) no respondió; paso a ChatGPT.")
        cfg = self.cfg["chatgpt"]
        cmd = [c.format(esquema=str(FABRICA / "esquemas" / esquema), salida=str(salida)) for c in cfg["comando"]] + ["-"]
        detalle = ""
        self.ultimo_revisor = "ChatGPT"
        for intento in (1, 2):
            r = self.vigilado(t, "ChatGPT", lambda: correr(cmd, entrada=prompt, timeout_min=cfg["timeout_min"]))
            with open(t.dir / f"{nombre}.salida.txt", "a", encoding="utf-8") as f:
                f.write(f"=== intento {intento} (código {r.returncode})\n{r.stdout}\n--- stderr ---\n{r.stderr}\n")
            texto = salida.read_text(encoding="utf-8") if salida.exists() else r.stdout
            try:
                return extraer_json(texto)
            except (ValueError, json.JSONDecodeError) as e:
                detalle = ultimas_lineas(r.stderr or r.stdout)
                log(f"ChatGPT no devolvió JSON válido (intento {intento}, código {r.returncode}): {e}")
                if detalle:
                    log(f"  Lo último que dijo codex: {detalle}")
                if es_limite_de_uso(detalle):
                    log("  Parece límite de uso: no lo reintento.")
                    break
                if intento == 1:
                    time.sleep(cfg.get("espera_reintento_s", 60))
        if not respaldo_primero:
            datos = self.pedir_respaldo(t, esquema, nombre)
            if datos is not None:
                return datos
        raise RevisorNoDisponible(f"ChatGPT (codex) no respondió en {nombre}. {detalle} "
                                  f"Salida completa en {t.rel}/{nombre}.salida.txt")

    def pedir_respaldo(self, t: Tarea, esquema: str, nombre: str, primero: bool = False) -> dict | None:
        """Revisor de respaldo (Antigravity CLI) para cuando codex no responde. Prueba cada modelo en orden."""
        cfg = self.cfg.get("respaldo", {})
        if not cfg.get("modelos"):
            return None
        # El prompt ya está en disco: agy lo lee de ahí (no acepta el prompt por la entrada estándar).
        indicacion = (f"Lee y sigue al pie de la letra las instrucciones del archivo {t.rel}/{nombre}.prompt.md. "
                      "Eres revisor: solo lees; no crees, modifiques ni borres archivos, y no corras comandos que cambien "
                      "algo. Responde únicamente con el JSON del esquema.")
        for modelo in cfg["modelos"]:
            log(f"Pido la revisión {'a Antigravity (revisor primero)' if primero else 'al respaldo: Antigravity'} con {modelo}.")
            cmd = [c.format(modelo=modelo, esquema=str(FABRICA / "esquemas" / esquema), prompt=indicacion)
                   for c in cfg["comando"]]
            r = self.vigilado(t, f"Antigravity ({modelo})", lambda: correr(cmd, timeout_min=cfg.get("timeout_min", 30)))
            with open(t.dir / f"{nombre}.respaldo.txt", "a", encoding="utf-8") as f:
                f.write(f"=== {modelo} (código {r.returncode})\n{r.stdout}\n--- stderr ---\n{r.stderr}\n")
            try:
                datos = leer_respuesta_agy(r.stdout)
            except (ValueError, json.JSONDecodeError) as e:
                log(f"  {modelo} no devolvió JSON válido: {e}. {ultimas_lineas(r.stderr or r.stdout)}")
                continue
            (t.dir / f"{nombre}.json").write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
            self.ultimo_revisor = f"Antigravity ({modelo})" + ("" if primero else ", respaldo de ChatGPT")
            return datos
        return None

    def vigilado(self, t: Tarea, quien: str, llamar):
        """Corre a un revisor y comprueba que no haya cambiado nada del repo. Si cambió algo, lo aparta."""
        cabeza = git("rev-parse", "HEAD", check=False)
        antes = git("status", "--porcelain", check=False)
        r = llamar()
        despues = git("status", "--porcelain", check=False)
        if git("rev-parse", "HEAD", check=False) != cabeza:
            git("reset", "--soft", cabeza, check=False)
            log(f"¡Ojo! {quien} hizo un commit durante la revisión; lo deshice (los cambios quedan aparte).")
            despues = git("status", "--porcelain", check=False)
        if despues != antes:
            git("stash", "push", "--include-untracked", "-m", f"fábrica: cambios de {quien} descartados", check=False)
            log(f"¡Ojo! {quien} modificó archivos durante la revisión. Los aparté con `git stash` "
                f"(revísalos con `git stash list`) y sigo.")
            self.avisos.append(f"{quien} intentó modificar archivos durante la revisión; los cambios se apartaron con git stash.")
        return r

    def pedir_claude(self, t: Tarea, plantilla: str, esquema: str, nombre: str, **valores: str) -> dict:
        texto_esquema = (FABRICA / "esquemas" / esquema).read_text(encoding="utf-8")
        prompt = render(plantilla, tarea_id=t.id, trabajo=t.rel, **valores)
        prompt += f"\n\nResponde SOLO con un objeto JSON que cumpla este esquema:\n{texto_esquema}\n"
        (t.dir / f"{nombre}.prompt.md").write_text(prompt, encoding="utf-8")
        cfg = self.cfg["claude"]
        cmd = list(cfg["comando"]) + (["--model", cfg["modelo"]] if cfg.get("modelo") else [])
        detalle = ""
        for intento in (1, 2):
            r = self.vigilado(t, "Claude", lambda: correr(cmd, entrada=prompt, timeout_min=cfg["timeout_min"]))
            try:
                envoltura = json.loads(r.stdout)
                texto = envoltura.get("result", r.stdout) if isinstance(envoltura, dict) else r.stdout
            except json.JSONDecodeError:
                texto = r.stdout
            (t.dir / f"{nombre}.txt").write_text(texto + ("\n--- stderr ---\n" + r.stderr if r.stderr else ""), encoding="utf-8")
            try:
                datos = extraer_json(texto)
                (t.dir / f"{nombre}.json").write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
                return datos
            except (ValueError, json.JSONDecodeError) as e:
                detalle = ultimas_lineas(r.stderr or texto)
                log(f"Claude no devolvió JSON válido (intento {intento}, código {r.returncode}): {e}")
                if detalle:
                    log(f"  Lo último que dijo claude: {detalle}")
                if intento == 1:
                    time.sleep(cfg.get("espera_reintento_s", 60))
        raise RevisorNoDisponible(f"Claude no respondió en {nombre}. {detalle} Salida en {t.rel}/{nombre}.txt")

    def regla_de_cierre(self, t: Tarea, ciclo: int) -> str:
        """A partir del ciclo `ciclo_cierre` (contando corridas anteriores), solo bloquea lo que afecta datos reales."""
        previos = self.ciclos_previos.get(t.id, 0)
        if previos + ciclo < self.cfg["limites"].get("ciclo_cierre", 3):
            return ""
        return (f"\n## Regla de cierre (esta tarea ya lleva {previos + ciclo} ciclos de revisión)\n\n"
                "Desde este ciclo, solo son P0 o P1 los errores que hoy dan un resultado equivocado con los datos "
                "reales, rompen el criterio de terminado de la especificación o rompen una regla de AGENTS.md. "
                "Un caso límite que solo aparece con datos inventados (o que la muestra real no contiene) es P2 y su "
                "problema empieza con «Para la siguiente tarea:». No repitas como bloqueante algo que ya se marcó en "
                "un ciclo anterior y Cursor atendió de forma razonable.\n")

    def revisar(self, t: Tarea, ciclo: int, pruebas_ok: bool, ciclos_rojos: int) -> dict:
        nombre_rev = f"revision_chatgpt_c{ciclo}"
        cierre = self.regla_de_cierre(t, ciclo)
        rev = validar(self.pedir_chatgpt(
            t, "chatgpt_revisar.md", "revision.json", nombre_rev,
            pruebas_estado="en verde" if pruebas_ok else "EN ROJO", ciclo=str(ciclo), regla_cierre=cierre,
        ), ("veredicto", "duda", "hallazgos"))
        revisor = self.ultimo_revisor
        entorno = es_falla_de_entorno(rev, pruebas_ok)
        motivos = [] if entorno else motivos_escalamiento(
            rev, t.critica, ciclos_rojos, self.cfg["escalamiento"]["ciclos_rojos_para_escalar"],
            tuple(self.cfg["escalamiento"].get("motivos", MOTIVOS_ESCALAMIENTO)))
        registro = {"ciclo": ciclo, "pruebas_ok": pruebas_ok, "revision_chatgpt": rev, "escalamiento": motivos}

        if entorno:
            # Credenciales, permisos o servicios caídos: Cursor no lo puede arreglar y Claude no tiene nada que debatir.
            decision = {**decision_sin_escalar(rev), "veredicto": "entorno"}
            registro["origen"] = f"{revisor} (falla del entorno)"
        elif not motivos:
            decision = decision_sin_escalar(rev)
            registro["origen"] = revisor
        else:
            log(f"Escalo a Claude: {'; '.join(motivos)}")
            claude = validar(self.pedir_claude(
                t, "claude_escalar.md", "escalamiento.json", f"claude_c{ciclo}_r1",
                motivos="; ".join(motivos), archivo_revision=f"{nombre_rev}.json", regla_cierre=cierre,
            ), ("veredicto", "por_hallazgo", "hallazgos_nuevos"))
            resp, claude_final = None, claude
            objeta = [p for p in claude["por_hallazgo"] if p["postura"] == "desacuerdo"]
            if objeta or claude["hallazgos_nuevos"]:
                try:
                    resp = validar(self.pedir_chatgpt(
                        t, "chatgpt_responder.md", "respuesta.json", f"respuesta_chatgpt_c{ciclo}",
                        archivo_revision=f"{nombre_rev}.json", archivo_claude=f"claude_c{ciclo}_r1.json",
                    ), ("respuestas", "veredicto"))
                except RevisorNoDisponible as e:
                    # Sin respuesta de ChatGPT, cada objeción de Claude a un P0/P1 cuenta como disputa
                    # y se incluye (desempate conservador); los nuevos de Claude entran.
                    log(f"ChatGPT no respondió a Claude; decido con el desempate conservador. ({e})")
                    registro["nota"] = f"ChatGPT no respondió a Claude: {e}"
                    resp = None
                sostiene = [r for r in (resp or {}).get("respuestas", []) if r["postura"] in ("sostiene", "rechaza")]
                if sostiene:
                    claude_final = validar(self.pedir_claude(
                        t, "claude_final.md", "escalamiento.json", f"claude_c{ciclo}_r2",
                        archivo_revision=f"{nombre_rev}.json", archivo_claude=f"claude_c{ciclo}_r1.json",
                        archivo_respuesta=f"respuesta_chatgpt_c{ciclo}.json", regla_cierre=cierre,
                    ), ("veredicto", "por_hallazgo", "hallazgos_nuevos"))
                    # En la ronda final, los hallazgos nuevos que Claude ya no repite se consideran retirados.
            decision = resolver_consenso(rev, claude_final, resp)
            registro.update({"origen": "consenso ChatGPT + Claude", "claude": claude_final, "respuesta_chatgpt": resp})

        if not entorno:
            decision = aplicar_pruebas(decision, pruebas_ok, t.id)
        registro["decision"] = decision
        with open(t.dir / "bitacora.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(registro, ensure_ascii=False) + "\n")
        (t.dir / "decision_previa.json").write_text(json.dumps(decision, ensure_ascii=False, indent=2), encoding="utf-8")
        if revisor != "ChatGPT":
            registro["origen"] = registro["origen"].replace("ChatGPT", revisor, 1)
        avisos, self.avisos = self.avisos, []
        return {**decision, "origen": registro["origen"], "motivos": motivos, "resumen_chatgpt": rev.get("resumen", ""),
                "avisos": avisos}

    # --- PR -----------------------------------------------------------------

    def asegurar_pr(self, t: Tarea) -> str | None:
        abiertos = json.loads(gh("pr", "list", "--head", t.rama, "--state", "open", "--json", "number", check=False) or "[]")
        if abiertos:
            return str(abiertos[0]["number"])
        cuerpo = (f"Tarea **{t.id}**: {t.titulo}\n\nAbierto por la fábrica. Especificación: `fabrica/tareas/{t.id}.md`.\n"
                  "Cada ciclo deja aquí la revisión de ChatGPT y, si hubo escalamiento, el debate con Claude.")
        url = gh("pr", "create", "--base", self.base, "--head", t.rama, "--title", f"{t.id}: {t.titulo}",
                 "--body", cuerpo, check=False)
        if not url.startswith("http"):
            log("Todavía no hay cambios para abrir el PR (o gh falló); lo intento en el siguiente ciclo.")
            return None
        return url.rstrip("/").rsplit("/", 1)[-1]

    def comentar(self, pr: str | None, texto: str) -> None:
        if pr:
            gh("pr", "comment", pr, "--body-file", "-", entrada=texto, check=False)

    # --- ciclo completo -----------------------------------------------------

    def correr_tarea(self, tarea_id: str, solo_revisar: bool = False) -> str:
        t = self.tarea(tarea_id)
        if self.ya_terminada(t.id):
            log(f"{t.id} ya está en {self.base}: no hay nada que correr.")
            return "aprobada"
        bitacora = t.dir / "bitacora.jsonl"
        self.ciclos_previos[t.id] = len(bitacora.read_text(encoding="utf-8").splitlines()) if bitacora.exists() else 0
        log(f"=== {t.id}: {t.titulo} {'(crítica)' if t.critica else ''}")
        self.preparar_rama(t)
        instrucciones = instrucciones_iniciales(t)
        ciclos_rojos = 0
        pr = None
        for ciclo in range(1, self.cfg["limites"]["ciclos_max"] + 1):
            if alto_pedido():
                log("Encontré .fabrica/ALTO: me detengo.")
                return "detenida"
            log(f"--- {t.id} ciclo {ciclo}")
            if not (solo_revisar and ciclo == 1) and not self.correr_cursor(t, instrucciones, ciclo):
                pr = pr or self.asegurar_pr(t)
                if pr:
                    gh("label", "create", "fabrica:entorno", "--color", "FBCA04", "--force", check=False)
                    gh("pr", "edit", pr, "--add-label", "fabrica:entorno", check=False)
                self.comentar(pr, f"La tarea {t.id} se detuvo en el ciclo {ciclo}: Cursor no pudo arrancar dos veces "
                                  f"seguidas y no hizo cambios.\n\n```\n{self.error_cursor}\n```\n\nDavid: revisa que "
                                  f"`agent` funcione (sesión, límite de uso) y vuelve a correr `python fabrica/correr.py --revisar {t.id}`.")
                log(f"{t.id} detenida: Cursor no pudo arrancar dos veces seguidas. Último error: {self.error_cursor}")
                return "entorno"
            self.guardar_y_subir(t, ciclo)
            pr = pr or self.asegurar_pr(t)
            pruebas_ok, _ = self.correr_pruebas(t)
            ciclos_rojos = 0 if pruebas_ok else ciclos_rojos + 1
            self.preparar_contexto(t)
            try:
                decision = self.revisar(t, ciclo, pruebas_ok, ciclos_rojos)
            except RevisorNoDisponible as e:
                pr = pr or self.asegurar_pr(t)
                if pr:
                    gh("label", "create", "fabrica:entorno", "--color", "FBCA04", "--force", check=False)
                    gh("pr", "edit", pr, "--add-label", "fabrica:entorno", check=False)
                self.comentar(pr, f"La tarea {t.id} se detuvo en el ciclo {ciclo}: un revisor no respondió.\n\n```\n{e}\n```\n\n"
                                  f"El trabajo de Cursor ya está guardado en la rama. David: revisa que `codex` y `claude` "
                                  f"respondan (sesión o límite de uso) y vuelve a correr `python fabrica/correr.py --revisar {t.id}`.")
                log(f"{t.id} detenida: {e}")
                return "entorno"
            self.comentar(pr, comentario(t, ciclo, pruebas_ok, decision))
            if decision["veredicto"] == "aprobar" and pr:
                log(f"{t.id} aprobada: hago merge a {self.base}")
                gh("pr", "merge", pr, "--squash", "--delete-branch")
                git("checkout", self.base, check=False)
                git("pull", "--ff-only", check=False)
                return "aprobada"
            if decision["veredicto"] == "entorno":
                if pr:
                    gh("label", "create", "fabrica:entorno", "--color", "FBCA04", "--force", check=False)
                    gh("pr", "edit", pr, "--add-label", "fabrica:entorno", check=False)
                self.comentar(pr, f"La tarea {t.id} se detuvo en el ciclo {ciclo}: las pruebas fallan por el entorno "
                                  "(credenciales, permisos o un servicio), no por el código. David: corrígelo y vuelve "
                                  f"a correr `python fabrica/correr.py --revisar {t.id}`.")
                log(f"{t.id} detenida por una falla del entorno. Detalle en {t.rel}/pruebas.txt y en el PR.")
                return "entorno"
            instrucciones = instrucciones_correccion(t, ciclo, decision, self.cfg["limites"]["max_instrucciones"])
        if pr:
            gh("label", "create", "fabrica:atorado", "--color", "B60205", "--force", check=False)
            gh("pr", "edit", pr, "--add-label", "fabrica:atorado", check=False)
        self.comentar(pr, f"La tarea {t.id} quedó **atorada** después de {self.cfg['limites']['ciclos_max']} ciclos. David: revisa el PR y decide.")
        log(f"{t.id} atorada. Te dejé el aviso en el PR #{pr}." if pr else f"{t.id} atorada (sin PR abierto).")
        return "atorada"

    def correr_hito(self) -> None:
        orden = [l.strip() for l in (RAIZ / self.cfg["fila"]["archivo_orden"]).read_text(encoding="utf-8").splitlines()
                 if l.strip() and not l.strip().startswith("#")]
        for tarea_id in orden:
            if self.ya_terminada(tarea_id):
                log(f"{tarea_id} ya está en {self.base}.")
                continue
            resultado = self.correr_tarea(tarea_id)
            if resultado != "aprobada":
                log(f"Me detengo: {tarea_id} quedó {resultado}.")
                return
            if tarea_id in self.cfg["fila"]["pausas_despues_de"]:
                motivo = self.cfg["fila"].get("motivo_pausa", "David revisa lo hecho hasta aquí.")
                log(f"Pausa después de {tarea_id}: {motivo} Cuando esté listo, vuelve a correr --hito.")
                return
        log("Terminé la fila. Falta abrir el PR final a main (revisión de David).")

    # --- verificación -------------------------------------------------------

    def revisar_identidad(self) -> bool:
        """Comprueba que gh y el autor de git sean la cuenta de este repo (ver docs/development/dos-cuentas.md)."""
        repo = self.cfg["repo"]
        esperada = repo.get("cuenta_gh", "")
        cuenta = correr(["gh", "api", "user", "--jq", ".login"]).stdout.strip() if shutil.which("gh") else ""
        correo = git("config", "user.email", check=False)
        ok_cuenta, ok_correo = identidad_correcta(cuenta, correo, esperada, repo.get("correo_contiene", ""))
        log(f"{'OK ' if ok_cuenta else 'OJO'}  gh está usando la cuenta: {cuenta or '(sin sesión)'}"
            f"{'' if ok_cuenta else f' (esperaba {esperada}; revisa GH_CONFIG_DIR de esta terminal)'}")
        log(f"{'OK ' if ok_correo else 'OJO'}  git firma los commits como: {correo or '(sin correo)'}"
            f"{'' if ok_correo else ' (no corresponde a esta cuenta; revisa el includeIf de tu .gitconfig)'}")
        return ok_cuenta and ok_correo

    def revisar_variables(self) -> bool:
        """Variables de .env que la fábrica necesita. Sin valor se marca FALTA; nunca se imprime el valor."""
        ok = True
        for nombre in self.cfg.get("verificar", {}).get("variables_requeridas", []):
            presente = bool(os.environ.get(nombre))
            log(f"{'OK ' if presente else 'FALTA'}  {nombre} en .env")
            ok = ok and presente
        rol = self.cfg.get("verificar", {}).get("rol_db")
        if rol:
            nombre_url = self.cfg["verificar"].get("variable_db", "DATABASE_URL")
            usuario = usuario_de_conexion(os.environ.get(nombre_url, ""))
            log(f"{'OK ' if usuario == rol else 'OJO'}  {nombre_url} conecta como '{usuario or '(no se pudo leer)'}'")
            ok = ok and usuario == rol
        return ok

    def verificar(self) -> bool:
        ok = True
        herramientas = ["git", "gh", "node", "npm", self.cfg["cursor"]["comando"][0], self.cfg["claude"]["comando"][0]]
        if chatgpt_activo(self.cfg):
            herramientas.append(self.cfg["chatgpt"]["comando"][0])
        if self.cfg.get("respaldo", {}).get("modelos"):
            herramientas.append(self.cfg["respaldo"]["comando"][0])
        for herramienta in herramientas:
            encontrado = shutil.which(herramienta)
            log(f"{'OK ' if encontrado else 'FALTA'}  {herramienta}  {encontrado or ''}")
            ok = ok and bool(encontrado)
        ok = self.revisar_identidad() and ok
        ok = self.revisar_variables() and ok
        if shutil.which(self.cfg["cursor"]["comando"][0]):
            modelos = correr([self.cfg["cursor"]["comando"][0], "--list-models"]).stdout
            for clave in ("modelo", "modelo_critica"):
                if clave not in self.cfg["cursor"]:
                    continue
                nombre = self.cfg["cursor"][clave]
                tiene = modelo_listado(nombre, modelos)
                log(f"{'OK ' if tiene else 'OJO'}  {clave} de Cursor '{nombre}' "
                    f"{'disponible' if tiene else 'no aparece en agent --list-models: corrige fabrica/config.toml'}")
                ok = ok and tiene
        return ok


# ---------------------------------------------------------------------------
# Textos para Cursor y para el PR
# ---------------------------------------------------------------------------

def instrucciones_iniciales(t: Tarea) -> str:
    especificacion = (FABRICA / "tareas" / f"{t.id}.md").read_text(encoding="utf-8")
    return f"""# Tarea {t.id}: {t.titulo}

Lee AGENTS.md antes de empezar. Estás en la rama `{t.rama}`.

## Especificación

{especificacion}

## Cómo trabajar

- No cambies de rama, no hagas push ni merge: de eso se encarga el orquestador.
- Commits pequeños con el formato `{t.id}: <qué cambió>`.
- Antes de terminar corre `npm run lint`, `npm run typecheck` y `npm test`.
- Escribe tu nota en `{t.rel}/nota_cursor.md`: qué hiciste, cómo lo probaste y si no estás de acuerdo con algo, por qué.
- "Qué hacer" es una guía: si ves una manera mejor de lograr el objetivo y el criterio de terminado, úsala y explícala en tu nota.
  Ideas para mejorar el producto van en una sección "Propuestas" de la nota (ver "Libertad creativa" en AGENTS.md).
"""


def instrucciones_correccion(t: Tarea, ciclo: int, decision: dict, maximo: int) -> str:
    puntos = []
    for i, h in enumerate(decision["incluidos"][:maximo], 1):
        donde = f"{h.get('archivo', '')}:{h['linea']}" if h.get("linea") else h.get("archivo", "")
        puntos.append(f"{i}. [{h['severidad']}] {donde}\n   - Problema: {h.get('problema', '')}\n"
                      f"   - Qué hacer: {h.get('instruccion', '')}\n   - Cómo se comprueba: {h.get('prueba', '')}")
    return f"""# Correcciones para {t.id} (después del ciclo {ciclo})

Origen: {decision['origen']}. Atiende estos puntos en orden.

{chr(10).join(puntos) if puntos else '(sin puntos: revisa las pruebas)'}

Resultado de las últimas pruebas: `{t.rel}/pruebas.txt`.
La especificación sigue siendo `fabrica/tareas/{t.id}.md`.
Si no estás de acuerdo con un punto, no lo ignores: explícalo en `{t.rel}/nota_cursor.md`.
No cambies de rama, no hagas push ni merge.
"""


def comentario(t: Tarea, ciclo: int, pruebas_ok: bool, d: dict) -> str:
    lineas = [f"### Fábrica · {t.id} · ciclo {ciclo}",
              f"- Pruebas: {'en verde' if pruebas_ok else 'EN ROJO'}",
              f"- Decide: {d['origen']}" + (f" (escalado porque {'; '.join(d['motivos'])})" if d["motivos"] else ""),
              f"- Veredicto: **{d['veredicto']}**", ""]
    if d.get("resumen_chatgpt"):
        lineas += [f"> {d['resumen_chatgpt']}", ""]
    for aviso in d.get("avisos", []):
        lineas += [f"> ⚠️ {aviso}", ""]
    if d["incluidos"]:
        lineas.append("**Hallazgos**")
        lineas += [f"- [{h['severidad']}] {h.get('archivo', '')} — {h.get('problema', '')}"
                   f"{' (desempate conservador)' if h.get('desempate') else ''}" for h in d["incluidos"]]
    if d["disputas"]:
        lineas += ["", "**Desacuerdos resueltos por regla** (para la revisión final de David)"]
        lineas += [f"- {x['id']} [{x['severidad']}]: {x['resultado']}. {x['detalle']}" for x in d["disputas"]]
    lineas += ["", f"Detalle completo en `{t.rel}/` de la laptop que corrió la fábrica."]
    return "\n".join(lineas)


# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Orquestador de la fábrica")
    parser.add_argument("tarea", nargs="?", help="id de la tarea, por ejemplo F-01")
    parser.add_argument("--hito", action="store_true", help="corre la fila completa")
    parser.add_argument("--revisar", metavar="TAREA", help="solo revisa lo que ya hay en la rama, sin llamar a Cursor")
    parser.add_argument("--verificar", action="store_true", help="revisa herramientas, cuenta de gh y .env")
    args = parser.parse_args()

    cargar_env()
    fabrica = Fabrica(cargar_config())
    if args.verificar:
        return 0 if fabrica.verificar() else 1
    if (args.hito or args.revisar or args.tarea) and not fabrica.revisar_identidad():
        log("Me detengo antes de empezar: la cuenta de gh o el autor de git no son los de este repo.")
        return 1
    if args.hito:
        with SinDormir():
            fabrica.correr_hito()
        return 0
    if args.revisar:
        with SinDormir():
            print(fabrica.correr_tarea(args.revisar, solo_revisar=True))
        return 0
    if args.tarea:
        with SinDormir():
            print(fabrica.correr_tarea(args.tarea))
        return 0
    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
