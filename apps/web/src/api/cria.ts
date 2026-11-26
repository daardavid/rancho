import {
  diagnosticoConHistoriaSchema,
  diagnosticosAnotadosSchema,
  historialDeCriaSchema,
  listaDeVacasSchema,
  type AnotarDiagnostico,
  type CorreccionDeDiagnosticoComando,
} from '@rancho/api-contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { LLAVE_DE_INICIO } from './inicio'
import { pedir } from './http'

export const LLAVE_DE_CRIA = ['cria'] as const
export const LLAVE_DE_VACAS = ['vacas'] as const

/**
 * Partos, días y diagnósticos de una hembra. Los días vienen calculados.
 * `habilitado` es falso para un macho: su ficha no pide esta consulta.
 */
export function useHistorialDeCria(animalId: string, habilitado: boolean) {
  return useQuery({
    queryKey: [...LLAVE_DE_CRIA, animalId],
    queryFn: () => pedir(historialDeCriaSchema, `/api/read-models/cria/${animalId}`),
    enabled: habilitado,
  })
}

/** Vacas activas por días desde el último parto. */
export function useVacas() {
  return useQuery({
    queryKey: LLAVE_DE_VACAS,
    queryFn: () => pedir(listaDeVacasSchema, '/api/read-models/vacas'),
  })
}

/**
 * Anota un diagnóstico a una hembra o a varias.
 *
 * El mismo comando se reintenta con el mismo id: el servidor devuelve lo
 * guardado y no duplica. Un diagnóstico solo cuenta como que se vio al animal
 * si lo dice.
 */
export function useAnotarDiagnostico() {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: AnotarDiagnostico) =>
      pedir(diagnosticosAnotadosSchema, '/api/pregnancy-checks', { metodo: 'POST', cuerpo }),
    onSuccess: (anotados) => {
      for (const fila of anotados.diagnosticos) {
        void cache.invalidateQueries({ queryKey: [...LLAVE_DE_CRIA, fila.animalId] })
        void cache.invalidateQueries({ queryKey: ['observacion', fila.animalId] })
      }
      void cache.invalidateQueries({ queryKey: LLAVE_DE_VACAS })
      void cache.invalidateQueries({ queryKey: LLAVE_DE_INICIO })
    },
  })
}

/** Corrige un diagnóstico. Lo anterior queda en la historia. */
export function useCorregirDiagnostico(diagnosticoId: string, animalId: string) {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: CorreccionDeDiagnosticoComando) =>
      pedir(diagnosticoConHistoriaSchema, `/api/pregnancy-checks/${diagnosticoId}/corrections`, {
        metodo: 'POST',
        cuerpo,
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: [...LLAVE_DE_CRIA, animalId] })
      void cache.invalidateQueries({ queryKey: ['observacion', animalId] })
      void cache.invalidateQueries({ queryKey: LLAVE_DE_VACAS })
      void cache.invalidateQueries({ queryKey: LLAVE_DE_INICIO })
    },
  })
}
