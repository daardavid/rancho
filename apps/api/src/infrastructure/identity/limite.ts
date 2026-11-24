import {
  ESPERA_BASE_MS,
  ESPERA_MAXIMA_MS,
  INTENTOS_LIBRES_POR_IP,
  INTENTOS_LIBRES_POR_USUARIO_E_IP,
} from './parametros'

/**
 * Los fallos recientes que importan para decidir si hay que esperar.
 *
 * Son dos señales y se miran juntas a propósito:
 *
 * - `delUsuarioEnEstaDireccion`: alguien tecleando la contraseña de este
 *   usuario desde esta IP. Es el caso normal de un dedo torpe.
 * - `deEstaDireccion`: todo lo fallado desde esta IP, con el usuario que sea.
 *   Es lo que frena a quien prueba una lista de nombres desde un solo lugar.
 *
 * No hay una señal «de este usuario en todas partes». Contar por cuenta sola
 * dejaría que cualquiera, desde cualquier aparato, dejara al propietario fuera
 * con cinco contraseñas malas: exactamente lo que este límite tiene que evitar.
 */
export type Fallos = {
  readonly delUsuarioEnEstaDireccion: number
  readonly deEstaDireccion: number
  readonly ultimoFallo: Date | null
}

/**
 * Hasta cuándo hay que esperar después de estos fallos, o `null` si se puede
 * intentar ya.
 *
 * La espera no es un bloqueo fijo: empieza en treinta segundos y se duplica con
 * cada fallo de más, hasta cinco minutos. Al que se equivocó con su contraseña
 * lo frena medio minuto; al que está adivinando, casi todo el ritmo. Y como los
 * fallos viejos dejan de contar a los quince minutos, la puerta se abre sola:
 * nadie queda fuera para siempre.
 */
export function esperarHasta(fallos: Fallos): Date | null {
  const exceso = Math.max(
    fallos.delUsuarioEnEstaDireccion - INTENTOS_LIBRES_POR_USUARIO_E_IP,
    fallos.deEstaDireccion - INTENTOS_LIBRES_POR_IP,
  )
  if (exceso < 0 || fallos.ultimoFallo === null) {
    return null
  }

  // 2^16 ya rebasa el techo; el tope evita una potencia absurda con miles de filas.
  const espera = Math.min(ESPERA_BASE_MS * 2 ** Math.min(exceso, 16), ESPERA_MAXIMA_MS)
  return new Date(fallos.ultimoFallo.getTime() + espera)
}

/** Los segundos que faltan, redondeados hacia arriba: para `Retry-After`, nunca cero. */
export function segundosDeEspera(hasta: Date, ahora: Date): number {
  return Math.max(1, Math.ceil((hasta.getTime() - ahora.getTime()) / 1000))
}
