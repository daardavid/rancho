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

export type HealthResponse = z.infer<typeof healthResponseSchema>
