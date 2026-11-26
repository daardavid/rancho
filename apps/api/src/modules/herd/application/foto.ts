import type { RecordedBy } from '../../../shared-kernel/actores'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../../shared-kernel/conflictos'
import { animalIdSchema, nuevoId, ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'
import {
  ejecutarComandoIdempotente,
  huellaDeContenido,
  type ReciboGuardado,
} from '../../../shared-kernel/idempotencia'

import { siguienteFoto, type FotoDeIdentificacion } from '../domain/foto'
import { RechazoDeHerd } from '../domain/errores'
import type { ConsultaDeEvidencia, DepsDeHerd } from './servicio'

/**
 * Pone o cambia la foto con la que se reconoce al animal.
 *
 * La foto se comprueba fuera de la transacción: el almacén no usa la misma
 * conexión y, con la base embebida, las dos se esperarían. La fila del animal
 * no se reescribe: la foto no es un dato de la ficha.
 */
export type AlcanceDeFoto = {
  readonly leerRecibo: (commandId: string) => Promise<ReciboGuardado | null>
  readonly escribir: <T>(trabajo: (deps: DepsDeHerd) => Promise<T>) => Promise<T>
  readonly evidencia: ConsultaDeEvidencia | null
}

export type EntradaPonerFoto = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly animalId: string
  /** Versión de la foto vigente. Cero si todavía no hay. */
  readonly version: number
  readonly evidenciaId: string
  readonly miniaturaId: string
}

export type FotoPuesta = {
  readonly animalId: string
  readonly foto: FotoDeIdentificacion
  readonly anterior: FotoDeIdentificacion | null
}

export async function ponerFotoDe(alcance: AlcanceDeFoto, entrada: EntradaPonerFoto): Promise<FotoPuesta> {
  const contenido = {
    comando: 'poner_foto',
    ranchId: entrada.ranchId,
    recordedBy: entrada.recordedBy,
    animalId: entrada.animalId,
    version: entrada.version,
    evidenciaId: entrada.evidenciaId,
    miniaturaId: entrada.miniaturaId,
  }

  const previo = await alcance.leerRecibo(entrada.commandId)
  if (previo !== null) {
    if (previo.huella !== huellaDeContenido(contenido)) {
      throw new ConflictoDeIdempotencia(entrada.commandId)
    }
    return JSON.parse(previo.resultado) as FotoPuesta
  }

  const ranchId = ranchIdSchema.parse(entrada.ranchId)
  await exigirDelRancho(alcance.evidencia, ranchId, entrada.evidenciaId)
  if (entrada.miniaturaId !== entrada.evidenciaId) {
    await exigirDelRancho(alcance.evidencia, ranchId, entrada.miniaturaId)
  }

  return alcance.escribir((deps) =>
    ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
      const animalId = animalIdSchema.parse(entrada.animalId)
      const animal = await deps.animales.obtener(ranchId, animalId, true)
      if (animal === null) {
        throw new RechazoDeHerd('no_encontrado')
      }

      const actual = await deps.animales.fotoVigente(ranchId, animalId)
      if ((actual?.version ?? 0) !== entrada.version) {
        throw new ConflictoDeVersion()
      }

      const puesta = siguienteFoto(actual, {
        evidenciaId: entrada.evidenciaId,
        miniaturaId: entrada.miniaturaId,
      })
      await deps.animales.insertarFoto({
        id: nuevoId(),
        ranchId,
        animalId,
        foto: puesta.vigente,
        recordedBy: entrada.recordedBy,
        recordedAt: new Date(),
      })

      return { animalId, foto: puesta.vigente, anterior: puesta.anterior }
    }),
  )
}

async function exigirDelRancho(
  evidencia: ConsultaDeEvidencia | null,
  ranchId: RanchId,
  evidenciaId: string,
): Promise<void> {
  if (evidencia === null || !(await evidencia.perteneceAlRancho(ranchId, evidenciaId))) {
    throw new RechazoDeHerd('evidencia_ajena')
  }
}
