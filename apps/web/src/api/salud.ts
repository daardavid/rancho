import { useQuery } from '@tanstack/react-query'
import { healthResponseSchema, type HealthResponse } from '@rancho/api-contracts'

/**
 * Consulta del estado de la API.
 *
 * La respuesta se valida con el contrato compartido: si la API cambia de forma,
 * la web lo nota aquí y no en una pantalla que enseña un campo vacío. La ruta es
 * relativa porque el proxy de desarrollo (y el despliegue de un solo origen)
 * mandan `/api` a la API.
 */
async function consultarSalud(senal: AbortSignal): Promise<HealthResponse> {
  const respuesta = await fetch('/api/health', {
    signal: senal,
    headers: { accept: 'application/json' },
  })

  if (!respuesta.ok) {
    throw new Error(`La API contestó ${respuesta.status}`)
  }

  return healthResponseSchema.parse(await respuesta.json())
}

export function useSaludDeLaApi() {
  return useQuery({
    queryKey: ['salud'],
    queryFn: ({ signal }) => consultarSalud(signal),
  })
}
