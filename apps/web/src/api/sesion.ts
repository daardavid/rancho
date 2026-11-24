import { sesionActualSchema, type SesionActual } from '@rancho/api-contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { borrarBorrador } from '../dominio/borrador'
import { ErrorDeApi, pedir, pedirSinContenido } from './http'

/** La llave de la caché de la sesión. Un 401 la deja en `null`. */
export const LLAVE_DE_SESION = ['sesion'] as const

/** `null` es «no hay sesión»; no es un error ni un fallo de red. */
export function useSesion() {
  return useQuery({
    queryKey: LLAVE_DE_SESION,
    queryFn: async (): Promise<SesionActual | null> => {
      try {
        return await pedir(sesionActualSchema, '/api/session')
      } catch (error) {
        if (error instanceof ErrorDeApi && error.estado === 401) {
          return null
        }
        throw error
      }
    },
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useEntrar() {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: async (credenciales: { usuario: string; contrasena: string }) =>
      pedir(sesionActualSchema, '/api/session', { metodo: 'POST', cuerpo: credenciales }),
    onSuccess: (sesion) => {
      cache.setQueryData(LLAVE_DE_SESION, sesion)
    },
  })
}

export function useSalir() {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: () => pedirSinContenido('/api/session', { metodo: 'DELETE' }),
    onSettled: () => {
      // Salir con o sin red deja la pantalla en el inicio de sesión. Si el
      // servidor no se enteró, la cookie se vence sola.
      cache.setQueryData(LLAVE_DE_SESION, null)
      cache.removeQueries({ queryKey: ['hato'] })
      cache.removeQueries({ queryKey: ['ficha'] })
      // Lo capturado a medias se queda en este celular, pero ya no es de nadie:
      // la próxima captura empieza limpia y con su propio id de comando.
      borrarBorrador()
    },
  })
}
