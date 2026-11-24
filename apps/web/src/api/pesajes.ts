import {
  pesoSchema,
  pesosDeAnimalSchema,
  sesionDePesajeSchema,
  type CorregirPeso,
  type PesosDeAnimal,
  type RegistrarSesion,
  type SesionDePesaje,
} from '@rancho/api-contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ErrorDeApi, pedir } from './http'

/**
 * Las consultas y los comandos del pesaje.
 *
 * Todo lo que escribe pasa por `POST` con id de comando: el mismo id con el
 * mismo contenido devuelve lo que ya se guardó, así que un reintento por mala
 * señal no duplica una sesión ni una corrección.
 */

export const LLAVE_DE_ULTIMA_SESION = ['sesiones', 'ultima'] as const

/**
 * La última sesión del rancho, o `null` si todavía no hay ninguna.
 *
 * `habilitada` deja pedirla solo cuando hace falta. El hato la usa para la
 * fecha del aviso de huecos: sin huecos no se pide nada.
 */
export function useUltimaSesion(opciones: { readonly habilitada?: boolean } = {}) {
  return useQuery({
    queryKey: LLAVE_DE_ULTIMA_SESION,
    enabled: opciones.habilitada ?? true,
    queryFn: async (): Promise<SesionDePesaje | null> => {
      try {
        return await pedir(sesionDePesajeSchema, '/api/weighing-sessions/latest')
      } catch (error) {
        // Sin sesiones todavía no es un error: es un rancho que no ha pesado.
        if (error instanceof ErrorDeApi && error.estado === 404) {
          return null
        }
        throw error
      }
    },
  })
}

export function useSesion(sesionId: string) {
  return useQuery({
    queryKey: ['sesion', sesionId],
    queryFn: () => pedir(sesionDePesajeSchema, `/api/weighing-sessions/${sesionId}`),
  })
}

/**
 * Los pesos de un animal con la historia de sus correcciones.
 *
 * Es la lectura que trae el `version` para corregir y el valor anterior de cada
 * corrección, para que la pantalla pueda enseñar qué se cambió y por qué
 * ([UX-05](../../../../../docs/product/ux-principles.md)). La serie con la
 * ganancia del intervalo viene de la vista de crecimiento: son dos lecturas de
 * los mismos hechos, no dos hechos.
 */
export function usePesosConHistoria(animalId: string) {
  return useQuery({
    queryKey: ['pesos', animalId],
    queryFn: (): Promise<PesosDeAnimal> =>
      pedir(pesosDeAnimalSchema, `/api/animals/${animalId}/weights`),
  })
}

export function useRegistrarPesaje() {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (cuerpo: RegistrarSesion) =>
      pedir(sesionDePesajeSchema, '/api/weighing-sessions', { metodo: 'POST', cuerpo }),
    onSuccess: () => {
      invalidarDespuesDePesar(cache)
    },
  })
}

export function useCorregirPeso(pesoId: string) {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (cuerpo: CorregirPeso) =>
      pedir(pesoSchema, `/api/weights/${pesoId}/corrections`, { metodo: 'POST', cuerpo }),
    onSuccess: () => {
      invalidarDespuesDePesar(cache)
    },
  })
}

/**
 * Todo lo que un peso mueve: la serie del animal, el resumen del hato, el
 * último peso que enseña el hato y la última sesión que propone la siguiente.
 */
function invalidarDespuesDePesar(cache: ReturnType<typeof useQueryClient>): void {
  void cache.invalidateQueries({ queryKey: ['ficha'] })
  void cache.invalidateQueries({ queryKey: ['pesos'] })
  void cache.invalidateQueries({ queryKey: ['sesion'] })
  void cache.invalidateQueries({ queryKey: LLAVE_DE_ULTIMA_SESION })
  void cache.invalidateQueries({ queryKey: ['hato'] })
}
