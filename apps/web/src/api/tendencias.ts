import { tendenciasSchema } from '@rancho/api-contracts'
import { useQuery } from '@tanstack/react-query'

import { pedir } from './http'

export const LLAVE_DE_TENDENCIAS = ['tendencias'] as const

/** La lectura de tendencias. No escribe nada: la pantalla la pide y la dibuja. */
export function useTendencias() {
  return useQuery({
    queryKey: LLAVE_DE_TENDENCIAS,
    queryFn: () => pedir(tendenciasSchema, '/api/read-models/tendencias'),
  })
}
