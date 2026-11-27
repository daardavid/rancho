import { reportedBySchema, type RecordedBy } from '../../../shared-kernel/actores'
import { animalIdSchema, evidenceIdSchema, type RanchId } from '../../../shared-kernel/ids'
import { formatearGramosATexto, parsearKilosAGramos } from '../../../shared-kernel/kilos'
import { sourceQualitySchema, type SourceQuality } from '../../../shared-kernel/source-quality'

import { RechazoDeGrowth } from '../domain/errores'
import { registrarSesion } from '../domain/sesion'
import type { DepsDeGrowth } from './servicio'

/**
 * El peso al destete es un peso del animal: un día, una fila pesada por cría,
 * con calidad y foto opcional. Se guarda como peso suelto, no como vuelta del
 * hato. No abre transacción ni guarda el recibo del comando. El orquestador
 * ya los tiene abiertos, y este peso no es un segundo comando.
 */
export type FilaDePesoDeDestete = {
  readonly id: string
  readonly animalId: string
  readonly kilos: string
  readonly calidad: string
  readonly evidenciaId?: string | null
}

export type EntradaDePesosDeDestete = {
  readonly id: string
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
  readonly fecha: string
  readonly nota?: string
  readonly reportedBy?: string
  readonly filas: readonly FilaDePesoDeDestete[]
}

export type PesoDeDestetePublico = {
  readonly id: string
  readonly animalId: string
  readonly kilos: string
  readonly calidad: SourceQuality
  readonly evidenciaId: string | null
}

export async function insertarPesosDeDestete(
  deps: DepsDeGrowth,
  entrada: EntradaDePesosDeDestete,
): Promise<readonly PesoDeDestetePublico[]> {
  if (entrada.filas.length === 0) {
    return []
  }

  const sesion = registrarSesion({
    id: entrada.id,
    ranchId: entrada.ranchId,
    fecha: entrada.fecha,
    ...(entrada.nota !== undefined ? { nota: entrada.nota } : {}),
    ...(entrada.reportedBy !== undefined
      ? { reportedBy: reportedBySchema.parse(entrada.reportedBy) }
      : {}),
    recordedBy: entrada.recordedBy,
    recordedAt: entrada.recordedAt,
    commandId: entrada.commandId,
    clase: 'suelto',
    filas: entrada.filas.map((fila) => ({
      id: fila.id,
      animalId: animalIdSchema.parse(fila.animalId),
      resultado: 'pesado' as const,
      kilos: kilosDe(fila.kilos),
      calidad: calidadDe(fila.calidad),
      ...(fila.evidenciaId !== undefined && fila.evidenciaId !== null
        ? { evidenciaId: evidenceIdSchema.parse(fila.evidenciaId) }
        : {}),
    })),
  })

  await deps.sesiones.insertar(sesion)

  return sesion.filas.flatMap((fila) => {
    if (fila.resultado !== 'pesado') {
      return []
    }
    return [
      {
        id: fila.id,
        animalId: fila.animalId,
        kilos: formatearGramosATexto(fila.kilos),
        calidad: fila.calidad,
        evidenciaId: fila.evidenciaId ?? null,
      },
    ]
  })
}

function kilosDe(texto: string) {
  try {
    return parsearKilosAGramos(texto)
  } catch {
    throw new RechazoDeGrowth('peso_invalido')
  }
}

function calidadDe(valor: string): SourceQuality {
  const leido = sourceQualitySchema.safeParse(valor)
  if (!leido.success) {
    throw new RechazoDeGrowth('peso_sin_calidad')
  }
  return leido.data
}
