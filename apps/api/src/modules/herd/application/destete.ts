import { z } from 'zod'

import type { RecordedBy } from '../../../shared-kernel/actores'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../../shared-kernel/conflictos'
import { animalIdSchema, ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'
import {
  ejecutarComandoIdempotente,
  huellaDeContenido,
  type AlmacenDeIdempotencia,
  type ReciboGuardado,
} from '../../../shared-kernel/idempotencia'

import {
  abrirDestete,
  corregirDestete,
  type CambiosDeDestete,
  type EleccionDeFecha,
} from '../domain/destete'
import { RechazoDeHerd } from '../domain/errores'
import {
  publicarCorreccionDeDestete,
  publicarDestete,
  type DesteteConHistoria,
} from './publicar-destete'
import type { RepositorioDeAnimales } from './repositorio'
import type { RepositorioDeDestete } from './repositorio-destete'

/** Una cría de la captura y el id que el cliente acuñó para su destete. */
export type AnimalDelDestete = {
  readonly animalId: string
  readonly desteteId: string
  /** Id del peso, si esta cría se pesó en el mismo comando. `null` es sin peso. */
  readonly pesoId: string | null
}

/**
 * Asienta destetes ya validados. No abre transacción ni guarda el recibo: el
 * orquestador lo hace, porque el peso —cuando lo hay— va en la misma.
 */
export type EntradaAsentarDestetes = {
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
  readonly cuando: EleccionDeFecha
  readonly nota?: string | null
  readonly reportedBy?: string | null
  readonly animales: readonly AnimalDelDestete[]
}

export type EntradaCorregirDestete = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly desteteId: string
  readonly version: number
  readonly motivo: string
  readonly cambios: CambiosDeDestete
}

export type DepsDeDestete = {
  readonly animales: RepositorioDeAnimales
  readonly destete: RepositorioDeDestete
  readonly idempotencia: AlmacenDeIdempotencia
}

export type AlcanceDeDestete = {
  readonly leerRecibo: (commandId: string) => Promise<ReciboGuardado | null>
  readonly escribir: <T>(trabajo: (deps: DepsDeDestete) => Promise<T>) => Promise<T>
}

/**
 * Escribe un destete por cría. No es una salida y no mira el peso: quien llama
 * ya decidió el `pesoId`, o `null` si no se pesó.
 */
export async function asentarDestetes(
  deps: Pick<DepsDeDestete, 'animales' | 'destete'>,
  entrada: EntradaAsentarDestetes,
): Promise<DesteteConHistoria[]> {
  const animales = ordenarSinRepetir(entrada.animales)
  if (animales.length === 0) {
    throw new RechazoDeHerd('destete_vacio')
  }
  const ranchId = ranchIdSchema.parse(entrada.ranchId)
  await exigirAnimalesDelRancho(deps, ranchId, animales)

  const notas: DesteteConHistoria[] = []
  for (const animal of animales) {
    const destete = abrirDestete({
      id: exigirId(animal.desteteId),
      ranchId,
      animalId: animalIdSchema.parse(animal.animalId),
      cuando: entrada.cuando,
      nota: entrada.nota ?? null,
      reportedBy: entrada.reportedBy ?? null,
      pesoId: animal.pesoId,
      recordedBy: entrada.recordedBy,
      recordedAt: entrada.recordedAt,
    })
    await deps.destete.insertar(destete)
    notas.push({ ...publicarDestete(destete), correcciones: [] })
  }
  return notas
}

/**
 * Corrige un destete ya asentado. La anterior queda en la historia. El peso
 * no se toca: corregir kilos es corregir el peso.
 */
export async function corregirDesteteDe(
  alcance: AlcanceDeDestete,
  entrada: EntradaCorregirDestete,
): Promise<DesteteConHistoria> {
  const contenido = {
    comando: 'corregir_destete',
    ranchId: entrada.ranchId,
    recordedBy: entrada.recordedBy,
    desteteId: entrada.desteteId,
    version: entrada.version,
    motivo: entrada.motivo,
    cuando: entrada.cambios.cuando ?? null,
    nota: entrada.cambios.nota === undefined ? null : entrada.cambios.nota,
    reportedBy: entrada.cambios.reportedBy === undefined ? null : entrada.cambios.reportedBy,
    notaPresente: entrada.cambios.nota !== undefined,
    quienPresente: entrada.cambios.reportedBy !== undefined,
  }

  const previo = await alcance.leerRecibo(entrada.commandId)
  if (previo !== null) {
    if (previo.huella !== huellaDeContenido(contenido)) {
      throw new ConflictoDeIdempotencia(entrada.commandId)
    }
    return JSON.parse(previo.resultado) as DesteteConHistoria
  }

  const ranchId = ranchIdSchema.parse(entrada.ranchId)
  const id = exigirId(entrada.desteteId)

  return alcance.escribir((deps) =>
    ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
      const actual = await deps.destete.obtener(ranchId, id, true)
      if (actual === null) {
        throw new RechazoDeHerd('no_encontrado')
      }
      if (actual.version !== entrada.version) {
        throw new ConflictoDeVersion()
      }

      const corregido = corregirDestete(actual, entrada.cambios, entrada.motivo)
      await deps.destete.guardarCorreccion({
        destete: corregido.destete,
        versionLeida: entrada.version,
        anteriores: corregido.anteriores,
        motivo: corregido.motivo,
        correctedBy: entrada.recordedBy,
        correctedAt: new Date(),
      })

      const correcciones = await deps.destete.correcciones(ranchId, corregido.destete.id)
      return {
        ...publicarDestete(corregido.destete),
        correcciones: correcciones.map(publicarCorreccionDeDestete),
      }
    }),
  )
}

async function exigirAnimalesDelRancho(
  deps: Pick<DepsDeDestete, 'animales'>,
  ranchId: RanchId,
  animales: readonly AnimalDelDestete[],
): Promise<void> {
  for (const animal of animales) {
    const ficha = await deps.animales.obtener(ranchId, animalIdSchema.parse(animal.animalId), false)
    if (ficha === null) {
      throw new RechazoDeHerd('no_encontrado')
    }
  }
}

function ordenarSinRepetir(animales: readonly AnimalDelDestete[]): AnimalDelDestete[] {
  const vistos = new Set<string>()
  const ids = new Set<string>()
  const ordenados = [...animales].sort((uno, otro) => (uno.animalId < otro.animalId ? -1 : 1))
  for (const animal of ordenados) {
    if (vistos.has(animal.animalId)) {
      throw new RechazoDeHerd('animal_repetido')
    }
    if (ids.has(animal.desteteId)) {
      throw new RechazoDeHerd('destete_ya_existe')
    }
    vistos.add(animal.animalId)
    ids.add(animal.desteteId)
  }
  return ordenados
}

function exigirId(valor: string): string {
  const leido = z.uuid().safeParse(valor)
  if (!leido.success) {
    throw new RechazoDeHerd('no_encontrado')
  }
  return leido.data
}
