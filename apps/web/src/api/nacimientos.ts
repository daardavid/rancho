import {
  familiaSchema,
  filiacionConHistoriaSchema,
  nacimientoSchema,
  type CorregirFiliacion,
  type RegistrarNacimiento,
} from '@rancho/api-contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { LLAVE_DEL_HATO, LLAVE_DEL_RESUMEN } from './hato'
import { pedir } from './http'

export function useFamilia(animalId: string) {
  return useQuery({
    queryKey: ['familia', animalId],
    queryFn: () => pedir(familiaSchema, `/api/animals/${animalId}/family`),
  })
}

export function useRegistrarNacimiento() {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (cuerpo: RegistrarNacimiento) =>
      pedir(nacimientoSchema, '/api/births', { metodo: 'POST', cuerpo }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: LLAVE_DEL_HATO })
      void cache.invalidateQueries({ queryKey: LLAVE_DEL_RESUMEN })
      void cache.invalidateQueries({ queryKey: ['familia'] })
    },
  })
}

export function useCorregirFiliacion(animalId: string) {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (cuerpo: CorregirFiliacion) =>
      pedir(filiacionConHistoriaSchema, `/api/animals/${animalId}/parentage/corrections`, {
        metodo: 'POST',
        cuerpo,
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['familia'] })
    },
  })
}
