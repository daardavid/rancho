import { QueryClient } from '@tanstack/react-query'

/**
 * Un solo cliente para toda la aplicación.
 *
 * Vive en su propio módulo para que `main.tsx` y las pruebas usen la misma
 * configuración y para no repetirla en cada archivo.
 */
export function crearCliente(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // La API del rancho no cambia sola en segundo plano. Un reintento corto
        // basta para un celular con mala señal; más reintentos solo alargan la
        // espera del dueño frente a un mensaje de error.
        retry: 1,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  })
}
