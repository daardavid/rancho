import {
  desteteAnotadoPublicoSchema,
  desteteDelAnimalSchema,
  destetesAnotadosSchema,
  listaDeKilosDestetadosSchema,
  type AnotarDestete,
  type CorreccionDeDesteteComando,
} from '@rancho/api-contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { LLAVE_DE_CRIA } from './cria'
import { pedir } from './http'
import { LLAVE_DE_INICIO } from './inicio'
import { LLAVE_DE_PESOS_CONOCIDOS, LLAVE_DE_ULTIMA_SESION } from './pesajes'

export const LLAVE_DE_DESTETE = ['destete'] as const
export const LLAVE_DE_KILOS_DESTETADOS = ['kilos-destetados'] as const

/** El destete de un animal. `destete` null es que todavía no se anotó. */
export function useDestete(animalId: string) {
  return useQuery({
    queryKey: [...LLAVE_DE_DESTETE, animalId],
    queryFn: () => pedir(desteteDelAnimalSchema, `/api/read-models/destete/${animalId}`),
  })
}

/** Vacas con al menos una cría destetada con peso, de mayor promedio a menor. */
export function useKilosDestetados() {
  return useQuery({
    queryKey: LLAVE_DE_KILOS_DESTETADOS,
    queryFn: () => pedir(listaDeKilosDestetadosSchema, '/api/read-models/kilos-destetados'),
  })
}

/**
 * Anota el destete de una cría o de varias. El mismo comando se reintenta con
 * el mismo id. Si trae peso, el servidor escribe los dos hechos o ninguno.
 */
export function useAnotarDestete() {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: AnotarDestete) =>
      pedir(destetesAnotadosSchema, '/api/weanings', { metodo: 'POST', cuerpo }),
    onSuccess: (anotado) => {
      for (const fila of anotado.destetes) {
        void cache.invalidateQueries({ queryKey: [...LLAVE_DE_DESTETE, fila.animalId] })
      }
      invalidarLecturas(cache, anotado.pesos.length > 0)
    },
  })
}

/** Corrige el día, la nota o quién lo dijo. El peso se corrige como peso. */
export function useCorregirDestete(desteteId: string, animalId: string) {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (cuerpo: CorreccionDeDesteteComando) =>
      pedir(desteteAnotadoPublicoSchema, `/api/weanings/${desteteId}/corrections`, {
        metodo: 'POST',
        cuerpo,
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: [...LLAVE_DE_DESTETE, animalId] })
      invalidarLecturas(cache, false)
    },
  })
}

function invalidarLecturas(cache: ReturnType<typeof useQueryClient>, peso: boolean): void {
  void cache.invalidateQueries({ queryKey: LLAVE_DE_CRIA })
  void cache.invalidateQueries({ queryKey: LLAVE_DE_KILOS_DESTETADOS })
  void cache.invalidateQueries({ queryKey: LLAVE_DE_INICIO })
  if (!peso) {
    return
  }
  void cache.invalidateQueries({ queryKey: ['ficha'] })
  void cache.invalidateQueries({ queryKey: ['pesos'] })
  void cache.invalidateQueries({ queryKey: LLAVE_DE_PESOS_CONOCIDOS })
  void cache.invalidateQueries({ queryKey: LLAVE_DE_ULTIMA_SESION })
  void cache.invalidateQueries({ queryKey: ['hato'] })
  void cache.invalidateQueries({ queryKey: ['observacion'] })
}
