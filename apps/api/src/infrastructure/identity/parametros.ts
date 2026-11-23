/** Mínimo al crear la cuenta. Entrar no publica esta regla: una corta simplemente no coincide. */
export const LARGO_MINIMO_CONTRASENA = 8

/** Cinco fallos seguidos en esta ventana y el siguiente intento se rechaza. */
export const MAX_INTENTOS_FALLIDOS = 5
export const VENTANA_DE_INTENTOS_MS = 15 * 60 * 1000

/** La cookie y la fila vencen juntas. Supuesto técnico, no una regla del rancho. */
export const DURACION_DE_SESION_MS = 30 * 24 * 60 * 60 * 1000
