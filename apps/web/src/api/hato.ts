import {
  agregarMarcaSchema,
  animalGrowthViewSchema,
  corregirAnimalSchema,
  crecimientoDelHatoSchema,
  fichaConHistoriaSchema,
  listaDeAnimalesSchema,
  marcaSchema,
  marcarPerdidaSchema,
  registrarAnimalSchema,
  reemplazarMarcaSchema,
  reemplazoDeMarcaSchema,
  type AgregarMarca,
  type CorregirAnimal,
  type MarcarPerdida,
  type RegistrarAnimal,
  type ReemplazarMarca,
} from '@rancho/api-contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { pedir } from './http'

export const LLAVE_DEL_HATO = ['hato'] as const
export const LLAVE_DEL_RESUMEN = ['hato', 'crecimiento'] as const

/** Los animales activos con sus aretes, tal como los devuelve la API. */
export function useHato() {
  return useQuery({
    queryKey: LLAVE_DEL_HATO,
    queryFn: () => pedir(listaDeAnimalesSchema, '/api/animals'),
  })
}

/**
 * El resumen del hato. Trae el último peso y si el animal fue hueco en la
 * última sesión; el hato solo usa esas dos cosas de él.
 */
export function useResumenDelHato() {
  return useQuery({
    queryKey: LLAVE_DEL_RESUMEN,
    queryFn: () => pedir(crecimientoDelHatoSchema, '/api/read-models/growth-overview'),
  })
}

/** La ficha con sus marcas y la historia de correcciones. */
export function useFicha(animalId: string) {
  return useQuery({
    queryKey: ['ficha', animalId],
    queryFn: () => pedir(fichaConHistoriaSchema, `/api/animals/${animalId}`),
  })
}

/** La serie de pesos del animal. Es una consulta: no se escribe nada. */
export function usePesos(animalId: string) {
  return useQuery({
    queryKey: ['ficha', animalId, 'pesos'],
    queryFn: () => pedir(animalGrowthViewSchema, `/api/read-models/animal-growth/${animalId}`),
  })
}

export function useRegistrarAnimal() {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (cuerpo: RegistrarAnimal) =>
      pedir(fichaConHistoriaSchema, '/api/animals', { metodo: 'POST', cuerpo }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: LLAVE_DEL_HATO })
      void cache.invalidateQueries({ queryKey: LLAVE_DEL_RESUMEN })
    },
  })
}

export function useCorregirAnimal(animalId: string) {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (cuerpo: CorregirAnimal) =>
      pedir(fichaConHistoriaSchema, `/api/animals/${animalId}/corrections`, {
        metodo: 'POST',
        cuerpo,
      }),
    onSuccess: () => {
      // La corrección cambia la ficha y puede cambiar el nombre o la categoría
      // que el hato muestra.
      void cache.invalidateQueries({ queryKey: ['ficha', animalId] })
      void cache.invalidateQueries({ queryKey: LLAVE_DEL_HATO })
      void cache.invalidateQueries({ queryKey: LLAVE_DEL_RESUMEN })
    },
  })
}

/** Poner un arete. El valor nuevo no inventa nada: si no se sabe, no se registra. */
export function useAgregarMarca(animalId: string) {
  const poner = usePonerMarca()

  return {
    ...poner,
    mutate: (
      cuerpo: AgregarMarca,
      opciones?: Parameters<typeof poner.mutate>[1],
    ): void => {
      poner.mutate({ animalId, cuerpo }, opciones)
    },
  }
}

/**
 * Poner un arete cuando el id del animal no se conoce al montar la pantalla.
 *
 * Es el mismo comando que `useAgregarMarca`; el alta lo necesita porque el
 * animal todavía no existe cuando se abre el formulario y el arete se guarda
 * justo después, con el id que la API acaba de confirmar.
 */
export function usePonerMarca() {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (entrada: { animalId: string; cuerpo: AgregarMarca }) =>
      pedir(marcaSchema, `/api/animals/${entrada.animalId}/marks`, {
        metodo: 'POST',
        cuerpo: entrada.cuerpo,
      }),
    onSuccess: (_marca, entrada) => {
      void cache.invalidateQueries({ queryKey: ['ficha', entrada.animalId] })
      void cache.invalidateQueries({ queryKey: LLAVE_DEL_HATO })
    },
  })
}

/** Cambiar un arete. El anterior queda en la historia como `replaced`. */
export function useReemplazarMarca(animalId: string) {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (entrada: { marcaAnteriorId: string; cuerpo: ReemplazarMarca }) =>
      pedir(
        reemplazoDeMarcaSchema,
        `/api/animals/${animalId}/marks/${entrada.marcaAnteriorId}/replace`,
        { metodo: 'POST', cuerpo: entrada.cuerpo },
      ),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['ficha', animalId] })
      void cache.invalidateQueries({ queryKey: LLAVE_DEL_HATO })
    },
  })
}

/** Un arete que se cayó. No borra nada: lo deja en la historia como `lost`. */
export function useMarcarPerdida(animalId: string) {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (entrada: { marcaId: string; cuerpo: MarcarPerdida }) =>
      pedir(marcaSchema, `/api/animals/${animalId}/marks/${entrada.marcaId}/lost`, {
        metodo: 'POST',
        cuerpo: entrada.cuerpo,
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['ficha', animalId] })
      void cache.invalidateQueries({ queryKey: LLAVE_DEL_HATO })
    },
  })
}

export { agregarMarcaSchema, corregirAnimalSchema, marcarPerdidaSchema, reemplazarMarcaSchema, registrarAnimalSchema }
