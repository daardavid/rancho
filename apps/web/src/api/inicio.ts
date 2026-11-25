import { inicioSchema, ultimaObservacionSchema, type Inicio, type UltimaObservacion } from '@rancho/api-contracts'
import { useQuery } from '@tanstack/react-query'

import { pedir } from './http'

/** Prefijo: cada periodo (`desde`) es una consulta distinta. */
export const LLAVE_DE_INICIO = ['inicio'] as const

export function useInicio(desde: string) {
  return useQuery({
    queryKey: [...LLAVE_DE_INICIO, desde],
    queryFn: (): Promise<Inicio> => pedir(inicioSchema, `/api/read-models/inicio?desde=${desde}`),
  })
}

export function useUltimaObservacion(animalId: string) {
  return useQuery({
    queryKey: ['observacion', animalId],
    queryFn: (): Promise<UltimaObservacion> =>
      pedir(ultimaObservacionSchema, `/api/read-models/ultima-observacion/${animalId}`),
  })
}
