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
    // El resumen es un documento que se manda fuera de la app: al abrirlo hay
    // que contar otra vez. Con los 30 s del cliente, quien anota un dato
    // faltante y vuelve antes comparte conteos viejos. No se acopla cada
    // mutación a esta llave: basta con no dar la respuesta por fresca.
    staleTime: 0,
  })
}
