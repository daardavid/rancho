import type { RecordedBy } from '../shared-kernel/actores'
import { ConflictoDeIdempotencia } from '../shared-kernel/conflictos'
import { ranchIdSchema, type RanchId } from '../shared-kernel/ids'
import { ejecutarComandoIdempotente, huellaDeContenido } from '../shared-kernel/idempotencia'
import { formatearGramosATexto, interpretarKilos } from '../shared-kernel/kilos'
import {
  asentarDestetes,
  repositoriosDeHerd,
  RechazoDeHerd,
  type ClienteDeHerd,
  type DepsDeDestete,
  type DesteteConHistoria,
} from '../modules/herd'
import {
  insertarPesosDeDestete,
  repositoriosDeGrowth,
  RechazoDeGrowth,
  type DepsDeGrowth,
  type PesoDeDestetePublico,
} from '../modules/growth'

/**
 * Destete con peso: un comando, una transacción, los dos hechos o ninguno.
 *
 * Herd guarda el destete. Growth guarda el peso, que es un peso como cualquier
 * otro. Este archivo no abre reglas de edad ni de ajuste: solo llama a los
 * dos módulos. Sin peso, igual hay una sola transacción y un solo recibo, y
 * Growth no escribe.
 *
 * El recibo se lee antes de abrir la transacción de la escritura. Con la base
 * embebida, un SELECT aparte con esa transacción abierta no vuelve.
 */

export type PesoEnElDestete = {
  readonly id: string
  readonly kilos: string
  readonly calidad: string
  readonly evidenciaId?: string | null
}

export type AnimalEnElDestete = {
  readonly animalId: string
  readonly desteteId: string
  readonly peso?: PesoEnElDestete
}

export type EntradaDeDestete = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly precisionFecha: 'exact' | 'approximate' | 'no_se'
  readonly fecha: string | null
  readonly nota?: string | null
  readonly reportedBy?: string | null
  /** Día del peso cuando el destete es «No sé» y aun así se pesó. */
  readonly fechaDelPeso?: string | null
  readonly animales: readonly AnimalEnElDestete[]
}

export type DesteteAnotado = {
  readonly destetes: readonly DesteteConHistoria[]
  readonly pesos: readonly PesoDeDestetePublico[]
}

export type DepsDeCaptura = {
  readonly animales: DepsDeDestete['animales']
  readonly destete: DepsDeDestete['destete']
  readonly sesiones: DepsDeGrowth['sesiones']
  readonly idempotencia: DepsDeDestete['idempotencia']
}

type ConsultaDeEvidencia = {
  perteneceAlRancho(ranchId: RanchId, evidenciaId: string): Promise<boolean>
}

export type CapturaDeDestete = {
  registrar(entrada: EntradaDeDestete): Promise<DesteteAnotado>
}

export function crearCapturaDeDestete(
  db: ClienteDeHerd,
  evidencia: ConsultaDeEvidencia | null = null,
): CapturaDeDestete {
  return {
    async registrar(entrada) {
      const contenido = contenidoDe(entrada)
      // El recibo va antes del día y de la foto: un reintento con el mismo id
      // y otro cuerpo es conflicto, aunque al cuerpo nuevo le falte la fecha
      // del peso. Un reintento idéntico no vuelve a consultar la evidencia.
      const previo = await db.transaction(async (tx) =>
        repositoriosDeHerd(tx, null).idempotencia.buscar(entrada.commandId),
      )
      if (previo !== null) {
        if (previo.huella !== huellaDeContenido(contenido)) {
          throw new ConflictoDeIdempotencia(entrada.commandId)
        }
        return JSON.parse(previo.resultado) as DesteteAnotado
      }

      diaDelPeso(entrada)
      await exigirEvidencia(evidencia, entrada)

      return db.transaction(async (tx) => {
        const herd = repositoriosDeHerd(tx, null)
        const growth = repositoriosDeGrowth(tx)
        return escribirDestete(
          {
            animales: herd.animales,
            destete: herd.destete,
            sesiones: growth.sesiones,
            idempotencia: herd.idempotencia,
          },
          entrada,
        )
      })
    },
  }
}

/**
 * Escribe dentro de la transacción que ya abrió quien llama. Si el peso falla,
 * el destete se revierte con él: no hay recibo a medias.
 */
export async function escribirDestete(
  deps: DepsDeCaptura,
  entrada: EntradaDeDestete,
): Promise<DesteteAnotado> {
  const contenido = contenidoDe(entrada)
  return ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
    const dia = diaDelPeso(entrada)
    const cuando = new Date()
    const destetes = await asentarDestetes(
      { animales: deps.animales, destete: deps.destete },
      {
        ranchId: entrada.ranchId,
        recordedBy: entrada.recordedBy,
        recordedAt: cuando,
        cuando: { precision: entrada.precisionFecha, fecha: entrada.fecha },
        nota: entrada.nota ?? null,
        reportedBy: entrada.reportedBy ?? null,
        animales: entrada.animales.map((animal) => ({
          animalId: animal.animalId,
          desteteId: animal.desteteId,
          pesoId: animal.peso?.id ?? null,
        })),
      },
    )

    const conPeso = entrada.animales.filter((animal) => animal.peso !== undefined)
    if (conPeso.length === 0 || dia === null) {
      return { destetes, pesos: [] }
    }

    const nota = notaDelPeso(entrada.nota)
    const pesos = await insertarPesosDeDestete(
      { sesiones: deps.sesiones, idempotencia: deps.idempotencia },
      {
        id: crypto.randomUUID(),
        commandId: entrada.commandId,
        ranchId: entrada.ranchId,
        recordedBy: entrada.recordedBy,
        recordedAt: cuando,
        fecha: dia,
        ...(nota === null ? {} : { nota }),
        ...(entrada.reportedBy !== undefined && entrada.reportedBy !== null
          ? { reportedBy: entrada.reportedBy }
          : {}),
        filas: conPeso.flatMap((animal) => {
          const peso = animal.peso
          if (peso === undefined) {
            return []
          }
          return [
            {
              id: peso.id,
              animalId: animal.animalId,
              kilos: peso.kilos,
              calidad: peso.calidad,
              ...(peso.evidenciaId !== undefined ? { evidenciaId: peso.evidenciaId } : {}),
            },
          ]
        }),
      },
    )

    return { destetes, pesos }
  })
}

function diaDelPeso(entrada: EntradaDeDestete): string | null {
  const hayPeso = entrada.animales.some((animal) => animal.peso !== undefined)
  if (!hayPeso) {
    return null
  }
  if (entrada.precisionFecha === 'no_se') {
    if (entrada.fechaDelPeso === undefined || entrada.fechaDelPeso === null) {
      throw new RechazoDeHerd('peso_sin_fecha')
    }
    return entrada.fechaDelPeso
  }
  if (entrada.fecha === null) {
    throw new RechazoDeHerd('fecha_incoherente')
  }
  return entrada.fecha
}

function notaDelPeso(nota: string | null | undefined): string | null {
  if (nota === undefined || nota === null) {
    return 'Al destete'
  }
  const limpio = nota.trim()
  return limpio === '' ? 'Al destete' : limpio
}

function contenidoDe(entrada: EntradaDeDestete): unknown {
  return {
    comando: 'destete',
    ranchId: entrada.ranchId,
    recordedBy: entrada.recordedBy,
    precisionFecha: entrada.precisionFecha,
    fecha: entrada.fecha,
    nota: entrada.nota ?? null,
    reportedBy: entrada.reportedBy ?? null,
    fechaDelPeso: entrada.fechaDelPeso ?? null,
    animales: [...entrada.animales]
      .map((animal) => ({
        animalId: animal.animalId,
        desteteId: animal.desteteId,
        peso:
          animal.peso === undefined
            ? null
            : {
                id: animal.peso.id,
                kilos: kilosCanonicos(animal.peso.kilos),
                calidad: animal.peso.calidad,
                evidenciaId: animal.peso.evidenciaId ?? null,
              },
      }))
      .sort((uno, otro) => (uno.animalId < otro.animalId ? -1 : uno.animalId > otro.animalId ? 1 : 0)),
  }
}

function kilosCanonicos(texto: string): string {
  const lectura = interpretarKilos(texto)
  if (!lectura.ok) {
    throw new RechazoDeGrowth('peso_invalido')
  }
  return formatearGramosATexto(lectura.gramos)
}

async function exigirEvidencia(
  evidencia: ConsultaDeEvidencia | null,
  entrada: EntradaDeDestete,
): Promise<void> {
  const ids: string[] = []
  for (const animal of entrada.animales) {
    const id = animal.peso?.evidenciaId
    if (id !== undefined && id !== null && id !== '') {
      ids.push(id)
    }
  }
  if (ids.length === 0) {
    return
  }
  if (evidencia === null) {
    throw new RechazoDeGrowth('evidencia_ajena')
  }
  const ranchId = ranchIdSchema.parse(entrada.ranchId)
  for (const id of ids) {
    const pertenece = await evidencia.perteneceAlRancho(ranchId, id)
    if (!pertenece) {
      throw new RechazoDeGrowth('evidencia_ajena')
    }
  }
}
