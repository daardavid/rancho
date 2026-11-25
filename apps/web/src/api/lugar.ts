import {
  asignacionesDeLugarSchema,
  corregirPotreroSchema,
  lugarDelAnimalSchema,
  lugaresDelHatoSchema,
  potreroConHistoriaSchema,
  potrerosDelRanchoSchema,
  registrarPotreroSchema,
  type AsignarLugar,
  type CorregirPotrero,
  type RegistrarPotrero,
} from '@rancho/api-contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { pedir } from './http'

export const LLAVE_DE_POTREROS = ['potreros'] as const
export const LLAVE_DE_LUGARES = ['lugares'] as const

/**
 * Los potreros con cuántos animales se esperan en cada uno, y cuántos activos
 * están sin lugar o con lugar desconocido. Es una consulta: el conteo no se
 * guarda en ningún lado.
 */
export function usePotreros() {
  return useQuery({
    queryKey: LLAVE_DE_POTREROS,
    queryFn: () => pedir(potrerosDelRanchoSchema, '/api/paddocks'),
  })
}

/**
 * El lugar vigente de cada animal activo que tenga alguno. Los que nunca se
 * movieron no vienen: no se les inventa un lugar.
 */
export function useLugares() {
  return useQuery({
    queryKey: LLAVE_DE_LUGARES,
    queryFn: () => pedir(lugaresDelHatoSchema, '/api/locations'),
  })
}

/** El lugar vigente de un animal y su historia. */
export function useLugar(animalId: string) {
  return useQuery({
    queryKey: ['lugar', animalId],
    queryFn: () => pedir(lugarDelAnimalSchema, `/api/animals/${animalId}/location`),
  })
}

export function useRegistrarPotrero() {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (cuerpo: RegistrarPotrero) =>
      pedir(potreroConHistoriaSchema, '/api/paddocks', { metodo: 'POST', cuerpo }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: LLAVE_DE_POTREROS })
    },
  })
}

export function useCorregirPotrero(potreroId: string) {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (cuerpo: CorregirPotrero) =>
      pedir(potreroConHistoriaSchema, `/api/paddocks/${potreroId}/corrections`, {
        metodo: 'POST',
        cuerpo,
      }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: LLAVE_DE_POTREROS })
    },
  })
}

/**
 * Asignar el lugar esperado a uno o a varios animales.
 *
 * El servidor escribe todas las asignaciones del grupo en una sola transacción
 * y no toca ninguna observación: mover no es ver.
 */
export function useAsignarLugar() {
  const cache = useQueryClient()

  return useMutation({
    mutationFn: (cuerpo: AsignarLugar) =>
      pedir(asignacionesDeLugarSchema, '/api/locations', { metodo: 'POST', cuerpo }),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: LLAVE_DE_LUGARES })
      void cache.invalidateQueries({ queryKey: LLAVE_DE_POTREROS })
      // La ficha muestra el lugar vigente y su historia.
      void cache.invalidateQueries({ queryKey: ['lugar'] })
    },
  })
}

export { corregirPotreroSchema, registrarPotreroSchema }
