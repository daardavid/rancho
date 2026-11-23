/**
 * El aviso de que la sesión venció.
 *
 * La capa HTTP no conoce a TanStack Query ni a la pantalla: cuando la API
 * contesta 401 avisa aquí. `App` escucha y deja la sesión en `null`, así la
 * pantalla cambia al inicio de sesión sin recargar la página y la URL conserva
 * la pantalla de destino.
 */

type Oyente = () => void

const oyentes = new Set<Oyente>()

/** Se devuelve la función para dejar de escuchar. */
export function alVencerLaSesion(oyente: Oyente): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

export function avisarSesionVencida(): void {
  for (const oyente of oyentes) {
    oyente()
  }
}
