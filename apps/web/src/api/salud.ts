import {
  anotarSaludSchema,
  correccionDeNotaSchema,
  notaConHistoriaSchema,
  notasAnotadasSchema,
  notasDeAnimalesSchema,
  notasDelAnimalSchema,
  type AnotarSalud,
  type CorreccionDeNota,
} from '@rancho/api-contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { pedir } from './http'

export const LLAVE_DE_SANIDAD = ['sanidad'] as const

/** Las notas de un animal, de la más vieja a la más nueva. */
export function useNotasDeSalud(animalId: string) {
  return useQuery({
    queryKey: [...LLAVE_DE_SANIDAD, animalId],
    queryFn: () => pedir(notasDelAnimalSchema, `/api/animals/${animalId}/health-notes`),
  })
}

/** Las notas de varios animales, en una sola consulta. */
export function useNotasDeVarios(animalIds: readonly string[]) {
  return useQuery({
    queryKey: [...LLAVE_DE_SANIDAD, 'varios', [...animalIds].sort().join(',')],
    queryFn: () =>
      pedir(notasDeAnimalesSchema, `/api/health-notes?animales=${animalIds.join(',')}`),
    enabled: animalIds.length > 0,
  })
}

/**
 * Anotar sanidad a uno o a varios animales.
 *
 * El servidor escribe una nota por animal en una sola transacción y no toca
 * ninguna observación: una nota solo cuenta como avistamiento si lo dice.
 */
export function useAnotarSalud() {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (cuerpo: AnotarSalud) =>
      pedir(notasAnotadasSchema, '/api/health-notes', { metodo: 'POST', cuerpo }),
    onSuccess: (anotadas) => {
      for (const fila of anotadas.notas) {
        // La ficha del animal muestra sus notas y su historia.
        void cache.invalidateQueries({ queryKey: [...LLAVE_DE_SANIDAD, fila.animalId] })
      }
      void cache.invalidateQueries({ queryKey: [...LLAVE_DE_SANIDAD, 'varios'] })
    },
  })
}

/**
 * Corregir una nota. La anterior queda en la historia y la lectura del animal
 * se refresca: quien corrigió ve la historia sin volver a pedirla.
 */
export function useCorregirNotaDeSalud(notaId: string, animalId: string) {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (cuerpo: CorreccionDeNota) =>
      pedir(notaConHistoriaSchema, `/api/health-notes/${notaId}/corrections`, {
        metodo: 'POST',
        cuerpo,
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: [...LLAVE_DE_SANIDAD, animalId] })
      void cache.invalidateQueries({ queryKey: [...LLAVE_DE_SANIDAD, 'varios'] })
    },
  })
}

export { anotarSaludSchema, correccionDeNotaSchema }
