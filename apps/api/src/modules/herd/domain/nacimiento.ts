import type { RecordedBy } from '../../../shared-kernel/actores'
import type { AnimalId, RanchId } from '../../../shared-kernel/ids'

import { registrarAnimal, type Animal } from './animal'
import type { Sexo, Tenencia } from './valores'

/**
 * La cría que deja un nacimiento: activa, becerro, y con la tenencia que ya
 * resolvió quien llama. Si la madre está «a la parte», esa tenencia tiene que
 * llegar como `unknown`: aquí no se decide el reparto (`OQ-OWN-001`).
 */
export function animalDeNacimiento(entrada: {
  readonly id: AnimalId
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
  readonly nombre?: string
  readonly sexo?: Sexo
  readonly tenencia: Tenencia
}): Animal {
  return registrarAnimal({
    id: entrada.id,
    ranchId: entrada.ranchId,
    recordedBy: entrada.recordedBy,
    recordedAt: entrada.recordedAt,
    categoria: 'calf',
    tenencia: entrada.tenencia,
    participacionEconomica: 'unknown',
    ...(entrada.nombre !== undefined ? { nombre: entrada.nombre } : {}),
    ...(entrada.sexo !== undefined ? { sexo: entrada.sexo } : {}),
  })
}
