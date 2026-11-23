"""Pruebas de las reglas de decisión del orquestador (no llaman a Cursor, ChatGPT ni Claude).

Correr:  python -m unittest discover -s fabrica -p "test_*.py"
"""
import json
import sys
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import correr as c  # noqa: E402


def hallazgo(id_, sev="P1"):
    return {"id": id_, "severidad": sev, "archivo": "a.ts", "linea": 1, "problema": "x", "instruccion": "y", "prueba": "z"}


class Escalamiento(unittest.TestCase):
    def test_sin_motivos(self):
        rev = {"duda": False, "hallazgos": [hallazgo("H1", "P2")], "desacuerdo_con_cursor": False}
        self.assertEqual(c.motivos_escalamiento(rev, False, 0, 2), [])

    def test_cada_motivo(self):
        rev = {"duda": True, "preguntas_para_claude": ["¿El saldo heredado cuenta como inicial?"],
               "hallazgos": [hallazgo("H1", "P0")], "desacuerdo_con_cursor": True}
        motivos = c.motivos_escalamiento({**rev, "veredicto": "aprobar"}, True, 2, 2)
        self.assertEqual(len(motivos), 5)

    def test_critica_escala_solo_al_aprobar(self):
        rev = {"veredicto": "cambios", "preguntas_para_claude": [], "hallazgos": [hallazgo("H1", "P1")],
               "desacuerdo_con_cursor": False}
        self.assertEqual(c.motivos_escalamiento(rev, True, 0, 2), [])
        rev["veredicto"] = "aprobar"
        rev["hallazgos"] = []
        self.assertEqual(len(c.motivos_escalamiento(rev, True, 0, 2)), 1)
        self.assertEqual(c.motivos_escalamiento(rev, False, 0, 2), [])

    def test_duda_sin_pregunta_no_escala(self):
        rev = {"duda": True, "preguntas_para_claude": [], "hallazgos": [], "desacuerdo_con_cursor": False}
        self.assertEqual(c.motivos_escalamiento(rev, False, 0, 2), [])
        rev["preguntas_para_claude"] = ["   "]
        self.assertEqual(c.motivos_escalamiento(rev, False, 0, 2), [])

    def test_pregunta_concreta_escala(self):
        rev = {"duda": True, "preguntas_para_claude": ["¿Se agrupa por RFC o por cuenta?"], "hallazgos": [],
               "desacuerdo_con_cursor": False}
        self.assertEqual(c.motivos_escalamiento(rev, False, 0, 2), ["el revisor tiene 1 pregunta(s) para Claude"])

    def test_pruebas_en_rojo_un_ciclo_no_escala(self):
        rev = {"duda": False, "hallazgos": [], "desacuerdo_con_cursor": False}
        self.assertEqual(c.motivos_escalamiento(rev, False, 1, 2), [])


class Consenso(unittest.TestCase):
    def test_claude_de_acuerdo_incluye_y_respeta_matiz(self):
        rev = {"veredicto": "cambios", "hallazgos": [hallazgo("H1"), hallazgo("H2", "P2")]}
        claude = {"veredicto": "cambios", "hallazgos_nuevos": [], "por_hallazgo": [
            {"id": "H1", "postura": "de_acuerdo", "razon": "", "instruccion": None},
            {"id": "H2", "postura": "matiz", "razon": "", "instruccion": "otra forma"}]}
        d = c.resolver_consenso(rev, claude)
        self.assertEqual([h["id"] for h in d["incluidos"]], ["H1", "H2"])
        self.assertEqual(d["incluidos"][1]["instruccion"], "otra forma")
        self.assertEqual(d["veredicto"], "cambios")

    def test_chatgpt_acepta_objecion_retira(self):
        rev = {"veredicto": "cambios", "hallazgos": [hallazgo("H1")]}
        claude = {"veredicto": "aprobar", "hallazgos_nuevos": [], "por_hallazgo": [
            {"id": "H1", "postura": "desacuerdo", "razon": "no aplica", "instruccion": None}]}
        resp = {"veredicto": "aprobar", "respuestas": [{"id": "H1", "postura": "acepta", "razon": "ok"}]}
        d = c.resolver_consenso(rev, claude, resp)
        self.assertEqual(d["incluidos"], [])
        self.assertEqual(d["veredicto"], "aprobar")

    def test_disputa_p1_gana_conservador(self):
        rev = {"veredicto": "cambios", "hallazgos": [hallazgo("H1", "P1")]}
        claude = {"veredicto": "aprobar", "hallazgos_nuevos": [], "por_hallazgo": [
            {"id": "H1", "postura": "desacuerdo", "razon": "no", "instruccion": None}]}
        resp = {"veredicto": "cambios", "respuestas": [{"id": "H1", "postura": "sostiene", "razon": "sí"}]}
        d = c.resolver_consenso(rev, claude, resp)
        self.assertEqual(d["incluidos"][0]["desempate"], "conservador")
        self.assertEqual(d["veredicto"], "cambios")
        self.assertEqual(len(d["disputas"]), 1)

    def test_disputa_p3_se_descarta_y_se_anota(self):
        rev = {"veredicto": "aprobar", "hallazgos": [hallazgo("H1", "P3")]}
        claude = {"veredicto": "aprobar", "hallazgos_nuevos": [], "por_hallazgo": [
            {"id": "H1", "postura": "desacuerdo", "razon": "estilo", "instruccion": None}]}
        resp = {"veredicto": "aprobar", "respuestas": [{"id": "H1", "postura": "sostiene", "razon": "me gusta"}]}
        d = c.resolver_consenso(rev, claude, resp)
        self.assertEqual(d["incluidos"], [])
        self.assertEqual(d["disputas"][0]["resultado"], "se descarta")
        self.assertEqual(d["veredicto"], "aprobar")

    def test_hallazgo_nuevo_de_claude_rechazado_p0_se_incluye(self):
        rev = {"veredicto": "aprobar", "hallazgos": []}
        claude = {"veredicto": "cambios", "por_hallazgo": [], "hallazgos_nuevos": [hallazgo("C1", "P0")]}
        resp = {"veredicto": "aprobar", "respuestas": [{"id": "C1", "postura": "rechaza", "razon": "no veo"}]}
        d = c.resolver_consenso(rev, claude, resp)
        self.assertEqual(d["incluidos"][0]["id"], "C1")
        self.assertEqual(d["veredicto"], "cambios")

    def test_no_aprueba_si_uno_no_aprueba(self):
        rev = {"veredicto": "aprobar", "hallazgos": []}
        claude = {"veredicto": "cambios", "por_hallazgo": [], "hallazgos_nuevos": []}
        self.assertEqual(c.resolver_consenso(rev, claude)["veredicto"], "cambios")


class PruebasMandan(unittest.TestCase):
    def test_pruebas_en_rojo_nunca_aprueban(self):
        d = c.decision_sin_escalar({"veredicto": "aprobar", "hallazgos": []})
        self.assertEqual(d["veredicto"], "aprobar")
        d2 = c.aplicar_pruebas(d, False, "F-01")
        self.assertEqual(d2["veredicto"], "cambios")
        self.assertEqual(d2["incluidos"][0]["id"], "PRUEBAS")

    def test_sin_escalar_con_p1_no_aprueba(self):
        d = c.decision_sin_escalar({"veredicto": "aprobar", "hallazgos": [hallazgo("H1", "P1")]})
        self.assertEqual(d["veredicto"], "cambios")


class Entorno(unittest.TestCase):
    def test_solo_cuenta_con_pruebas_en_rojo(self):
        self.assertTrue(c.es_falla_de_entorno({"falla_de_entorno": True}, pruebas_ok=False))
        self.assertFalse(c.es_falla_de_entorno({"falla_de_entorno": True}, pruebas_ok=True))
        self.assertFalse(c.es_falla_de_entorno({"falla_de_entorno": False}, pruebas_ok=False))
        self.assertFalse(c.es_falla_de_entorno({}, pruebas_ok=False))

    def test_usuario_de_conexion(self):
        self.assertEqual(c.usuario_de_conexion(
            "postgresql://lector_app.abcdef:s3cr%40to@aws-0-us-east-1.pooler.supabase.com:6543/postgres"), "lector_app")
        self.assertEqual(c.usuario_de_conexion("postgres://lector_app:x@db.abcdef.supabase.co:5432/postgres"),
                         "lector_app")
        self.assertEqual(c.usuario_de_conexion(
            "postgresql://auditor_lector.abcdef:x@aws-0-us-east-1.pooler.supabase.com:6543/postgres"), "auditor_lector")
        self.assertEqual(c.usuario_de_conexion(""), "")

    def test_modelo_listado_con_caracteres_invisibles(self):
        # Así viene la lista real de `agent --list-models` (con espacios de ancho cero al final del nombre).
        salida = "grok-4.7-high - Grok 4.7  High\ngrok-4.7-high-fast - Grok 4.7  High Fast\u200b\u200b\n" \
                 "grok-4.7-xhigh-fast - Grok 4.7  Extra High Fast\u200b\u200b\n"
        self.assertTrue(c.modelo_listado("grok-4.7-high-fast", salida))
        self.assertTrue(c.modelo_listado("grok-4.7-xhigh-fast", salida))
        self.assertFalse(c.modelo_listado("grok-4.7-medium-fast", salida))

    def test_modelo_listado_exacto(self):
        salida = "Available models\n\ngrok-4.7 - Grok 4.7\ngrok-4.7-xhigh - Grok 4.7 Extra High (current)\n"
        self.assertTrue(c.modelo_listado("grok-4.7-xhigh", salida))
        self.assertTrue(c.modelo_listado("grok-4.7", salida))
        self.assertFalse(c.modelo_listado("grok-4.7-xhigh", "grok-4.7 - Grok 4.7\n"))
        self.assertFalse(c.modelo_listado("grok-4", salida))


class ProcesosQueNoCuelgan(unittest.TestCase):
    """correr() no debe quedarse esperando para siempre (lo que pasó con T-01 la noche del 21-nov)."""
    PY = sys.executable
    NIETO = "import subprocess, sys; subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(120)'])"

    def setUp(self):
        self._sondeo = c.SONDEO_S
        c.SONDEO_S = 0.2

    def tearDown(self):
        c.SONDEO_S = self._sondeo

    def test_nieto_vivo_no_bloquea(self):
        inicio = time.monotonic()
        r = c.correr([self.PY, "-c", self.NIETO + "; print('hola')"], timeout_min=1)
        self.assertEqual(r.returncode, 0)
        self.assertIn("hola", r.stdout)
        self.assertLess(time.monotonic() - inicio, 20)

    def test_tiempo_agotado_detiene_el_arbol(self):
        inicio = time.monotonic()
        r = c.correr([self.PY, "-c", self.NIETO + "; import time; time.sleep(120)"], timeout_min=0.05)
        self.assertEqual(r.returncode, 124)
        self.assertIn("Se agotó el tiempo", r.stderr)
        self.assertLess(time.monotonic() - inicio, 30)

    def test_listo_detiene_y_regresa_cero(self):
        r = c.correr([self.PY, "-c", "import time; time.sleep(120)"], timeout_min=1, listo=lambda: True)
        self.assertEqual(r.returncode, 0)

    def test_entrada_por_stdin(self):
        r = c.correr([self.PY, "-c", "import sys; print(sys.stdin.read().upper())"], entrada="abc", timeout_min=1)
        self.assertEqual(r.stdout.strip(), "ABC")


class Respaldo(unittest.TestCase):
    def test_lee_structured_output(self):
        sobre = json.dumps({"status": "SUCCESS", "response": "texto", "structured_output": {"veredicto": "aprobar"}})
        self.assertEqual(c.leer_respuesta_agy(sobre), {"veredicto": "aprobar"})

    def test_lee_json_dentro_de_response(self):
        sobre = json.dumps({"status": "SUCCESS", "response": "Listo:\n{\"veredicto\": \"cambios\"}"})
        self.assertEqual(c.leer_respuesta_agy(sobre), {"veredicto": "cambios"})

    def test_status_distinto_de_success_falla(self):
        with self.assertRaises(ValueError):
            c.leer_respuesta_agy(json.dumps({"status": "ERROR", "response": "{}"}))

    def test_detecta_limite_de_uso(self):
        self.assertTrue(c.es_limite_de_uso("ERROR: You've hit your usage limit. Try again at 1:30 PM."))
        self.assertTrue(c.es_limite_de_uso("429 Too Many Requests"))
        self.assertFalse(c.es_limite_de_uso("La respuesta no trae un objeto JSON."))


class Utilidades(unittest.TestCase):
    def test_extraer_json_con_prosa(self):
        self.assertEqual(c.extraer_json('Aquí va:\n```json\n{"a": 1}\n```'), {"a": 1})

    def test_validar_severidad(self):
        with self.assertRaises(ValueError):
            c.validar({"veredicto": "x", "duda": False, "hallazgos": [hallazgo("H1", "P9")]}, ("veredicto",))

    def test_esquemas_son_json_estricto(self):
        for archivo in (c.FABRICA / "esquemas").glob("*.json"):
            esquema = json.loads(archivo.read_text(encoding="utf-8"))
            self._revisar_estricto(esquema, archivo.name)

    def _revisar_estricto(self, nodo, nombre):
        if isinstance(nodo, dict):
            if nodo.get("type") == "object":
                self.assertFalse(nodo.get("additionalProperties", True), nombre)
                self.assertEqual(set(nodo["required"]), set(nodo["properties"]), nombre)
            for valor in nodo.values():
                self._revisar_estricto(valor, nombre)
        elif isinstance(nodo, list):
            for valor in nodo:
                self._revisar_estricto(valor, nombre)

    def test_config_y_tareas(self):
        cfg = c.cargar_config()
        orden = [l.strip() for l in (c.RAIZ / cfg["fila"]["archivo_orden"]).read_text(encoding="utf-8").splitlines()
                 if l.strip() and not l.startswith("#")]
        self.assertGreater(len(orden), 0)
        self.assertEqual(len(orden), len(set(orden)), "una tarea repetida en orden.txt")
        for tarea_id in orden:
            self.assertTrue((c.FABRICA / "tareas" / f"{tarea_id}.md").exists(), tarea_id)
        for critica in cfg["escalamiento"]["tareas_criticas"]:
            self.assertIn(critica, orden)

    def test_identidad_de_este_repo(self):
        cfg = c.cargar_config()
        self.assertEqual(cfg["repo"]["cuenta_gh"], "daardavid")
        self.assertTrue(cfg["repo"]["correo_contiene"])


class Identidad(unittest.TestCase):
    def test_cuenta_y_correo_correctos(self):
        self.assertEqual(c.identidad_correcta("daardavid", "93949861+daardavid@users.noreply.github.com",
                                              "daardavid", "daardavid"), (True, True))

    def test_cuenta_de_otro_repo(self):
        self.assertEqual(c.identidad_correcta("davidabreu-homie", "x+daardavid@users.noreply.github.com",
                                              "daardavid", "daardavid"), (False, True))

    def test_correo_personal_en_repo_de_trabajo(self):
        # El caso que hizo aparecer a daardavid como contributor en accounting_visualization.
        self.assertEqual(c.identidad_correcta("davidabreu-homie", "davidabreu1110@gmail.com",
                                              "davidabreu-homie", "davidabreu-homie"), (True, False))

    def test_sin_configurar_no_exige(self):
        self.assertEqual(c.identidad_correcta("", "", "", ""), (True, True))

    def test_mayusculas_no_importan(self):
        self.assertEqual(c.identidad_correcta("DaarDavid", "X+DAARDAVID@users.noreply.github.com",
                                              "daardavid", "daardavid"), (True, True))


class SoloDudasClaras(unittest.TestCase):
    """RANCHO: Claude entra solo cuando el revisor trae preguntas concretas."""

    def test_p0_critica_rojos_y_desacuerdo_no_escalan(self):
        rev = {"veredicto": "aprobar", "hallazgos": [hallazgo("H1", "P0")], "desacuerdo_con_cursor": True,
               "preguntas_para_claude": []}
        self.assertEqual(c.motivos_escalamiento(rev, True, 5, 2, ("preguntas",)), [])

    def test_pregunta_concreta_escala(self):
        rev = {"veredicto": "cambios", "hallazgos": [], "preguntas_para_claude": ["¿«a la parte» va en tenencia?"]}
        self.assertEqual(len(c.motivos_escalamiento(rev, False, 0, 2, ("preguntas",))), 1)

    def test_config_de_rancho(self):
        cfg = c.cargar_config()
        self.assertEqual(cfg["escalamiento"]["motivos"], ["preguntas"])
        self.assertFalse(c.chatgpt_activo(cfg))
        self.assertTrue(c.respaldo_va_primero(cfg))


class OrdenDeRevisores(unittest.TestCase):
    def test_chatgpt_apagado_pone_primero_a_antigravity(self):
        self.assertTrue(c.respaldo_va_primero({"chatgpt": {"activo": False}, "respaldo": {"modelos": ["m"]}}))

    def test_respaldo_primero(self):
        self.assertTrue(c.respaldo_va_primero({"revisor": {"primero": "respaldo"}, "respaldo": {"modelos": ["m"]}}))

    def test_respaldo_primero_sin_modelos_cae_a_chatgpt(self):
        self.assertFalse(c.respaldo_va_primero({"revisor": {"primero": "respaldo"}, "respaldo": {"modelos": []}}))

    def test_por_omision_chatgpt(self):
        self.assertFalse(c.respaldo_va_primero({"respaldo": {"modelos": ["m"]}}))


if __name__ == "__main__":
    unittest.main()
