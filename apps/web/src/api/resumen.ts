import { resumenSemanalSchema, type ResumenSemanal } from '@rancho/api-contracts'
import { useQuery } from '@tanstack/react-query'

import { pedir } from './http'

/** Prefijo: cada periodo (`desde`) es una consulta distinta. */
export const LLAVE_DEL_RESUMEN_DE_LA_SEMANA = ['resumen'] as const

export function useResumenSemanal(desde: string | null) {
  const consulta = desde === null ? '' : `?desde=${desde}`
  return useQuery({
    queryKey: [...LLAVE_DEL_RESUMEN_DE_LA_SEMANA, desde],
    queryFn: (): Promise<ResumenSemanal> => pedir(resumenSemanalSchema, `/api/read-models/resumen${consulta}`),
  })
}
