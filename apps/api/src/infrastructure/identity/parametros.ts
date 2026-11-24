/** Mínimo al crear la cuenta. Entrar no publica esta regla: una corta simplemente no coincide. */
export const LARGO_MINIMO_CONTRASENA = 8

/**
 * Cuántos fallos seguidos se toleran antes de pedir una espera.
 *
 * Se cuentan por pareja usuario + IP, y aparte por IP sola. Nunca por cuenta
 * sola: si el contador fuera de la cuenta, cualquiera podría dejar al
 * propietario fuera con cinco contraseñas malas desde su casa
 * ([INC-002](../../../../../docs/product/increments/INC-002-todo-en-local.md)).
 */
export const INTENTOS_LIBRES_POR_USUARIO_E_IP = 5

/**
 * Tope para una IP que prueba muchos usuarios distintos.
 *
 * Existe porque la pareja usuario + IP sola deja probar cuatro contraseñas a
 * cada nombre de una lista. Veinte es holgado para el rancho —dos o tres
 * cuentas y dedos torpes— y bajo para una lista de nombres.
 */
export const INTENTOS_LIBRES_POR_IP = 20

/** Los fallos más viejos que esto ya no cuentan. Así una espera no es para siempre. */
export const VENTANA_DE_INTENTOS_MS = 15 * 60 * 1000

/**
 * La espera empieza aquí y se duplica con cada fallo de más.
 *
 * Un bloqueo fijo castiga igual al que se equivocó cinco veces y al que está
 * adivinando; la espera creciente le quita al que adivina casi todo el ritmo
 * (treinta segundos, uno, dos, cuatro, cinco minutos) sin dejar la puerta
 * cerrada para nadie.
 */
export const ESPERA_BASE_MS = 30 * 1000

/** El techo de la espera. Con más, un dedo torpe se vuelve una tarde perdida. */
export const ESPERA_MAXIMA_MS = 5 * 60 * 1000

/** La cookie y la fila vencen juntas. Supuesto técnico, no una regla del rancho. */
export const DURACION_DE_SESION_MS = 30 * 24 * 60 * 60 * 1000
