import {
  notaDeBitacoraConHistoriaSchema,
  notasDeBitacoraSchema,
  pendienteConHistoriaSchema,
  pendientesSchema,
  type AnotarBitacora,
  type AnotarPendiente,
  type CambiarEstadoDePendiente,
  type CorreccionDeNotaDeBitacora,
  type CorreccionDePendiente,
} from '@rancho/api-contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { LLAVE_DE_INICIO } from './inicio'
import { pedir } from './http'

export const LLAVE_DE_BITACORA = ['bitacora'] as const
export const LLAVE_DE_PENDIENTES = ['pendientes'] as const

export function useNotasDeBitacora() {
  return useQuery({
    queryKey: LLAVE_DE_BITACORA,
    queryFn: () => pedir(notasDeBitacoraSchema, '/api/journal-notes'),
  })
}

export function useAnotarBitacora() {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: AnotarBitacora) =>
      pedir(notaDeBitacoraConHistoriaSchema, '/api/journal-notes', { metodo: 'POST', cuerpo }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: LLAVE_DE_BITACORA })
      await cache.invalidateQueries({ queryKey: LLAVE_DE_INICIO })
    },
  })
}

export function useCorregirBitacora(notaId: string) {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: CorreccionDeNotaDeBitacora) =>
      pedir(notaDeBitacoraConHistoriaSchema, `/api/journal-notes/${notaId}/corrections`, {
        metodo: 'POST',
        cuerpo,
      }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: LLAVE_DE_BITACORA })
      await cache.invalidateQueries({ queryKey: LLAVE_DE_INICIO })
    },
  })
}

export function usePendientes() {
  return useQuery({
    queryKey: LLAVE_DE_PENDIENTES,
    queryFn: () => pedir(pendientesSchema, '/api/reminders'),
  })
}

export function useAnotarPendiente() {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: AnotarPendiente) =>
      pedir(pendienteConHistoriaSchema, '/api/reminders', { metodo: 'POST', cuerpo }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: LLAVE_DE_PENDIENTES })
      await cache.invalidateQueries({ queryKey: LLAVE_DE_INICIO })
    },
  })
}

export function useCorregirPendiente(pendienteId: string) {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: CorreccionDePendiente) =>
      pedir(pendienteConHistoriaSchema, `/api/reminders/${pendienteId}/corrections`, {
        metodo: 'POST',
        cuerpo,
      }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: LLAVE_DE_PENDIENTES })
      await cache.invalidateQueries({ queryKey: LLAVE_DE_INICIO })
    },
  })
}

export function useCambiarEstadoDePendiente(pendienteId: string) {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: CambiarEstadoDePendiente) =>
      pedir(pendienteConHistoriaSchema, `/api/reminders/${pendienteId}/status`, {
        metodo: 'POST',
        cuerpo,
      }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: LLAVE_DE_PENDIENTES })
      await cache.invalidateQueries({ queryKey: LLAVE_DE_INICIO })
    },
  })
}
