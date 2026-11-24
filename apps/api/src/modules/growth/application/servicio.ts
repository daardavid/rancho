import { z } from 'zod'

import { reportedBySchema, type RecordedBy } from '../../../shared-kernel/actores'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../../shared-kernel/conflictos'
import { animalIdSchema, evidenceIdSchema, ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'
import {
  ejecutarComandoIdempotente,
  huellaDeContenido,
  type AlmacenDeIdempotencia,
  type ReciboGuardado,
} from '../../../shared-kernel/idempotencia'
import { formatearGramosATexto, interpretarKilos, type Gramos } from '../../../shared-kernel/kilos'
import type { SourceQuality } from '../../../shared-kernel/source-quality'

import { corregirPeso, type CambiosDePeso } from '../domain/correccion'
import { RechazoDeGrowth } from '../domain/errores'
import { registrarSesion, type EntradaDeFila } from '../domain/sesion'
import type { RepositorioDePesajes } from './repositorio'
import {
  publicarPeso,
  publicarSesion,
  type PesoPublico,
  type PesosDelAnimal,
  type SesionPublica,
} from './publicar'

export type DepsDeGrowth = {
  readonly sesiones: RepositorioDePesajes
  readonly idempotencia: AlmacenDeIdempotencia
}

export type EstadoDeAnimal = {
  readonly id: string
  readonly existe: boolean
  readonly activo: boolean
}

/** La consulta pública de Herd. Growth no escribe en ese módulo. */
export type ConsultaDeAnimales = {
  existenEnElRancho(ranchId: RanchId, ids: readonly string[]): Promise<readonly EstadoDeAnimal[]>
}

/**
 * Growth no escribe la tabla de evidencia. Solo pregunta si el id es de
 * este rancho antes de guardarlo junto al peso.
 */
export type ConsultaDeEvidencia = {
  perteneceAlRancho(ranchId: RanchId, evidenciaId: string): Promise<boolean>
}

export type AlcanceDeGrowth = {
  readonly leerRecibo: (commandId: string) => Promise<ReciboGuardado | null>
  readonly escribir: <T>(trabajo: (deps: DepsDeGrowth) => Promise<T>) => Promise<T>
  readonly animales: ConsultaDeAnimales
  readonly evidencia: ConsultaDeEvidencia | null
}

export type FilaDeComando =
  | {
      readonly id: string
      readonly animalId: string
      readonly resultado: 'pesado'
      readonly kilos: string
      readonly calidad?: SourceQuality
      readonly evidenciaId?: string
    }
  | {
      readonly id: string
      readonly animalId: string
      readonly resultado: 'hueco'
    }

export type EntradaRegistrar = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly id: string
  readonly fecha: string
  readonly nota?: string
  readonly reportedBy?: string
  readonly filas: readonly FilaDeComando[]
}

export type EntradaCorregir = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly pesoId: string
  readonly version: number
  readonly motivo: string
  readonly kilos?: string
  readonly calidad?: SourceQuality
  /** `null` quita la foto. Omitirlo no la toca. */
  readonly evidenciaId?: string | null
}

export type { PesoPublico, PesosDelAnimal, SesionPublica }

/**
 * Registra la sesión. El mismo comando con el mismo contenido devuelve la
 * sesión ya guardada. La consulta a Herd ocurre solo en el primer intento:
 * un reintento no vuelve a preguntar si los animales siguen activos.
 *
 * Herd abre su propia transacción. La escritura de la sesión —todas las filas
 * y el recibo— va en otra, una sola. Growth no cambia filas de Herd.
 */
export async function registrar(alcance: AlcanceDeGrowth, entrada: EntradaRegistrar): Promise<SesionPublica> {
  const contenido = contenidoDeRegistro(entrada)
  const previo = await alcance.leerRecibo(entrada.commandId)
  if (previo !== null) {
    if (previo.huella !== huellaDeContenido(contenido)) {
      throw new ConflictoDeIdempotencia(entrada.commandId)
    }
    return JSON.parse(previo.resultado) as SesionPublica
  }

  const borrador = armar(entrada, new Date())
  await exigirActivos(
    alcance.animales,
    borrador.ranchId,
    borrador.filas.map((fila) => fila.animalId),
  )
  await exigirEvidenciaDelRancho(alcance.evidencia, borrador.ranchId, idsDeEvidencia(borrador.filas))

  return alcance.escribir((deps) =>
    ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
      const sesion = armar(entrada, new Date())
      await deps.sesiones.insertar(sesion)
      return publicarSesion(sesion)
    }),
  )
}

export async function corregir(alcance: AlcanceDeGrowth, entrada: EntradaCorregir): Promise<PesoPublico> {
  const contenido = contenidoDeCorreccion(entrada)
  const previo = await alcance.leerRecibo(entrada.commandId)
  if (previo !== null) {
    if (previo.huella !== huellaDeContenido(contenido)) {
      throw new ConflictoDeIdempotencia(entrada.commandId)
    }
    return JSON.parse(previo.resultado) as PesoPublico
  }

  // Fuera de la transacción del peso. En la base embebida una consulta aparte,
  // con esa transacción abierta, no vuelve: las dos se esperan.
  if (entrada.evidenciaId !== undefined && entrada.evidenciaId !== null) {
    await exigirEvidenciaDelRancho(alcance.evidencia, ranchIdSchema.parse(entrada.ranchId), [
      entrada.evidenciaId,
    ])
  }

  return alcance.escribir((deps) =>
    ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
      const ranchId = ranchIdSchema.parse(entrada.ranchId)
      const linea = await deps.sesiones.obtenerLinea(ranchId, z.uuid().parse(entrada.pesoId), true)
      if (linea === null) {
        throw new RechazoDeGrowth('no_encontrado')
      }
      if (linea.resultado !== 'pesado') {
        throw new RechazoDeGrowth('no_es_peso')
      }
      if (linea.fila.version !== entrada.version) {
        throw new ConflictoDeVersion()
      }

      const cambios: CambiosDePeso = {
        ...(entrada.kilos !== undefined ? { kilos: parsearORechazar(entrada.kilos) } : {}),
        ...(entrada.calidad !== undefined ? { calidad: entrada.calidad } : {}),
        ...(entrada.evidenciaId !== undefined
          ? {
              evidenciaId:
                entrada.evidenciaId === null ? null : evidenceIdSchema.parse(entrada.evidenciaId),
            }
          : {}),
      }
      const corregido = corregirPeso(linea.fila, cambios, entrada.motivo)
      await deps.sesiones.guardarCorreccion({
        ranchId,
        fila: corregido.fila,
        versionLeida: entrada.version,
        anteriores: corregido.anteriores,
        motivo: corregido.motivo,
        correctedBy: entrada.recordedBy,
        correctedAt: new Date(),
      })

      const guardada = await deps.sesiones.obtenerLinea(ranchId, corregido.fila.id, false)
      if (guardada === null || guardada.resultado !== 'pesado') {
        throw new Error('El peso corregido no se pudo leer.')
      }
      return publicarPeso(guardada)
    }),
  )
}

export async function obtener(
  deps: DepsDeGrowth,
  ranchId: RanchId,
  id: string,
): Promise<SesionPublica | null> {
  const sesion = await deps.sesiones.obtener(ranchId, id)
  return sesion === null ? null : publicarSesion(sesion)
}

export async function ultima(deps: DepsDeGrowth, ranchId: RanchId): Promise<SesionPublica | null> {
  const sesion = await deps.sesiones.ultima(ranchId)
  return sesion === null ? null : publicarSesion(sesion)
}

export async function pesosDe(
  deps: DepsDeGrowth,
  ranchId: RanchId,
  animalId: string,
): Promise<PesosDelAnimal> {
  const id = animalIdSchema.parse(animalId)
  const pesos = await deps.sesiones.pesosDe(ranchId, id)
  return { animalId: id, pesos: pesos.map(publicarPeso) }
}

async function exigirActivos(
  consulta: ConsultaDeAnimales,
  ranchId: RanchId,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) {
    return
  }

  const estados = await consulta.existenEnElRancho(ranchId, ids)
  for (const estado of estados) {
    if (!estado.existe) {
      throw new RechazoDeGrowth('animal_ausente')
    }
  }
  for (const estado of estados) {
    if (!estado.activo) {
      throw new RechazoDeGrowth('animal_inactivo')
    }
  }
}

function armar(entrada: EntradaRegistrar, recordedAt: Date) {
  return registrarSesion({
    id: z.uuid().parse(entrada.id),
    ranchId: ranchIdSchema.parse(entrada.ranchId),
    fecha: entrada.fecha,
    recordedBy: entrada.recordedBy,
    recordedAt,
    commandId: z.uuid().parse(entrada.commandId),
    filas: entrada.filas.map(filaDeEntrada),
    ...(entrada.nota !== undefined ? { nota: entrada.nota } : {}),
    ...(entrada.reportedBy !== undefined
      ? { reportedBy: reportedBySchema.parse(entrada.reportedBy) }
      : {}),
  })
}

function filaDeEntrada(fila: FilaDeComando): EntradaDeFila {
  const id = z.uuid().parse(fila.id)
  const animalId = animalIdSchema.parse(fila.animalId)
  if (fila.resultado === 'hueco') {
    return { id, animalId, resultado: 'hueco' }
  }

  return {
    id,
    animalId,
    resultado: 'pesado',
    kilos: parsearORechazar(fila.kilos),
    ...(fila.calidad !== undefined ? { calidad: fila.calidad } : {}),
    ...(fila.evidenciaId !== undefined
      ? { evidenciaId: evidenceIdSchema.parse(fila.evidenciaId) }
      : {}),
  }
}

function parsearORechazar(texto: string): Gramos {
  const lectura = interpretarKilos(texto)
  if (!lectura.ok) {
    throw new RechazoDeGrowth('peso_invalido')
  }
  return lectura.gramos
}

function contenidoDeRegistro(entrada: EntradaRegistrar): unknown {
  return {
    comando: 'registrar_sesion',
    ranchId: entrada.ranchId,
    recordedBy: entrada.recordedBy,
    id: entrada.id,
    fecha: entrada.fecha,
    nota: entrada.nota ?? null,
    reportedBy: entrada.reportedBy ?? null,
    filas: entrada.filas
      .map((fila) =>
        fila.resultado === 'pesado'
          ? {
              id: fila.id,
              animalId: fila.animalId,
              resultado: fila.resultado,
              kilos: kilosDeHuella(fila.kilos),
              calidad: fila.calidad ?? null,
              evidenciaId: fila.evidenciaId ?? null,
            }
          : {
              id: fila.id,
              animalId: fila.animalId,
              resultado: fila.resultado,
              kilos: null,
              calidad: null,
              evidenciaId: null,
            },
      )
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  }
}

function contenidoDeCorreccion(entrada: EntradaCorregir): unknown {
  return {
    comando: 'corregir_peso',
    ranchId: entrada.ranchId,
    recordedBy: entrada.recordedBy,
    pesoId: entrada.pesoId,
    version: entrada.version,
    motivo: entrada.motivo,
    kilos: entrada.kilos === undefined ? null : kilosDeHuella(entrada.kilos),
    calidad: entrada.calidad ?? null,
    ...(entrada.evidenciaId !== undefined ? { evidenciaId: entrada.evidenciaId } : {}),
  }
}

function idsDeEvidencia(filas: readonly { resultado: string; evidenciaId?: string | null }[]): string[] {
  const ids: string[] = []
  for (const fila of filas) {
    if (fila.resultado === 'pesado' && fila.evidenciaId !== undefined && fila.evidenciaId !== null) {
      ids.push(fila.evidenciaId)
    }
  }
  return ids
}

async function exigirEvidenciaDelRancho(
  consulta: ConsultaDeEvidencia | null,
  ranchId: RanchId,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) {
    return
  }
  if (consulta === null) {
    throw new RechazoDeGrowth('evidencia_ajena')
  }
  for (const id of ids) {
    const pertenece = await consulta.perteneceAlRancho(ranchId, id)
    if (!pertenece) {
      throw new RechazoDeGrowth('evidencia_ajena')
    }
  }
}

function kilosDeHuella(texto: string): string {
  const lectura = interpretarKilos(texto)
  if (!lectura.ok) {
    return texto
  }
  return formatearGramosATexto(lectura.gramos)
}
