import { z } from 'zod'

/**
 * Contrato de `GET /api/health`.
 *
 * Vive aquí y no en la API porque lo consumen el servidor y la web. No describe
 * ninguna verdad del rancho: solo dice si el proceso responde.
 */
export const healthResponseSchema = z.object({
  ok: z.literal(true),
})

/**
 * Contrato de `GET /api/health/ready`.
 *
 * Es la comprobación de que el proceso además puede llegar a PostgreSQL, que es
 * lo que mira un despliegue antes de mandarle tráfico
 * ([deployment-strategy.md](../../../docs/architecture/deployment-strategy.md)).
 * No cuenta cabezas ni lee una tabla de negocio: pregunta si la base contesta.
 *
 * Cuando la base no contesta, `ok` es `false` y `base` dice qué pasó en una
 * frase. Nunca lleva la cadena de conexión, el usuario ni el nombre de la base
 * ([security-baseline.md](../../../docs/architecture/security-baseline.md)).
 */
export const readinessResponseSchema = z.object({
  ok: z.boolean(),
  base: z.enum(['responde', 'no_responde']),
})

export type HealthResponse = z.infer<typeof healthResponseSchema>
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>
