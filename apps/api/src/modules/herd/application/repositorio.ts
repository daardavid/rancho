import type { RecordedBy } from '../../../shared-kernel/actores'
import type { AnimalId, RanchId } from '../../../shared-kernel/ids'

import type { Animal, ValorAnterior } from '../domain/animal'
import type { Correccion } from '../domain/correccion'
import type { Marca } from '../domain/marca'
import type { CorreccionDeSalida, Salida } from '../domain/salida'

export type { Correccion }

export type GuardarCorreccion = {
  readonly animal: Animal
  readonly versionLeida: number
  readonly anteriores: readonly ValorAnterior[]
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

/**
 * La salida vigente ya está en `animal`. `anterior` solo viene cuando esto es
 * una corrección: entonces se guarda la salida que estaba, con su motivo.
 */
export type GuardarSalida = {
  readonly animal: Animal
  readonly versionLeida: number
  readonly anterior: Salida | null
  readonly motivo: string | null
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}

export type EstadoGuardado = {
  readonly id: string
  readonly activo: boolean
}

/**
 * Lo que la aplicación pide. No recibe la transacción de Drizzle: quien abre
 * el comando ata esta interfaz a una transacción antes de llamarla.
 */
export type RepositorioDeAnimales = {
  insertar(animal: Animal): Promise<void>
  obtener(ranchId: RanchId, id: AnimalId, bloquear: boolean): Promise<Animal | null>
  guardarCorreccion(entrada: GuardarCorreccion): Promise<void>
  guardarSalida(entrada: GuardarSalida): Promise<void>
  insertarMarca(marca: Marca): Promise<void>
  obtenerMarca(
    ranchId: RanchId,
    animalId: AnimalId,
    marcaId: string,
    bloquear: boolean,
  ): Promise<Marca | null>
  cerrarMarca(marca: Marca): Promise<void>
  siniigaActiva(ranchId: RanchId, valor: string, exceptoMarcaId: string | null): Promise<boolean>
  listarActivos(ranchId: RanchId): Promise<Animal[]>
  listarInactivos(ranchId: RanchId): Promise<Animal[]>
  obtenerVarios(ranchId: RanchId, ids: readonly AnimalId[]): Promise<Animal[]>
  marcasDe(ranchId: RanchId, animalIds: readonly string[]): Promise<Marca[]>
  correccionesDe(ranchId: RanchId, animalId: AnimalId): Promise<Correccion[]>
  correccionesDeSalida(ranchId: RanchId, animalId: AnimalId): Promise<CorreccionDeSalida[]>
  idsPorMarca(ranchId: RanchId, valor: string): Promise<string[]>
  estados(ranchId: RanchId, ids: readonly string[]): Promise<EstadoGuardado[]>
}
