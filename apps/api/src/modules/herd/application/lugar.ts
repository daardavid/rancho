import { reportedBySchema, type RecordedBy, type ReportedBy } from '../../../shared-kernel/actores'
import { ejecutarComandoIdempotente, type AlmacenDeIdempotencia } from '../../../shared-kernel/idempotencia'
import { animalIdSchema, ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'
import { ConflictoDeVersion } from '../../../shared-kernel/conflictos'
import { z } from 'zod'

import { RechazoDeHerd } from '../domain/errores'
import { asignarLugar, vigentesPorAnimal, type AsignacionDeLugar } from '../domain/lugar'
import { LARGO_MAXIMO_REPORTED_BY } from '../domain/valores'
import {
  abrirPotrero,
  corregirPotrero,
  type CambiosDePotrero,
  type Potrero,
} from '../domain/potrero'
import type { RepositorioDeAnimales } from './repositorio'
import type { RepositorioDeLugar } from './repositorio-lugar'
import {
  publicarAsignacion,
  publicarCorreccionDePotrero,
  publicarPotrero,
  type AsignacionPublica,
  type LugarDelAnimal,
  type LugaresDelHato,
  type PotreroConHistoria,
  type PotreroEnLaLista,
  type PotrerosDelRancho,
} from './publicar'

export type EntradaRegistrarPotrero = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly id: string
  readonly nombre?: string
  readonly nota?: string
}

export type EntradaCorregirPotrero = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly potreroId: string
  readonly version: number
  readonly motivo: string
  readonly cambios: CambiosDePotrero
}

/** Un animal del grupo y el id que el cliente acuñó para su asignación. */
export type AnimalDelMovimiento = {
  readonly animalId: string
  readonly asignacionId: string
}

export type EntradaAsignarLugar = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  /** `null` es «no sé»: el rancho no sabe dónde se le espera. */
  readonly potreroId: string | null
  readonly desde: string
  readonly nota?: string | null
  /** Quién lo dijo, en palabras del rancho. Distinto de `recordedBy`. */
  readonly reportedBy?: string | null
  readonly animales: readonly AnimalDelMovimiento[]
}

export type DepsDeLugar = {
  readonly animales: RepositorioDeAnimales
  readonly lugar: RepositorioDeLugar
  readonly idempotencia: AlmacenDeIdempotencia
}

/** Crea el potrero. El mismo comando devuelve el potrero ya guardado. */
export async function registrarPotrero(
  deps: DepsDeLugar,
  entrada: EntradaRegistrarPotrero,
): Promise<PotreroConHistoria> {
  return ejecutarComandoIdempotente(
    deps.idempotencia,
    entrada.commandId,
    {
      comando: 'registrar_potrero',
      ranchId: entrada.ranchId,
      recordedBy: entrada.recordedBy,
      id: entrada.id,
      nombre: entrada.nombre ?? null,
      nota: entrada.nota ?? null,
    },
    async () => {
      const potrero = abrirPotrero({
        id: exigirUuid(entrada.id, 'potrero_ya_existe'),
        ranchId: ranchIdSchema.parse(entrada.ranchId),
        recordedBy: entrada.recordedBy,
        recordedAt: new Date(),
        ...(entrada.nombre !== undefined ? { nombre: entrada.nombre } : {}),
        ...(entrada.nota !== undefined ? { nota: entrada.nota } : {}),
      })
      await deps.lugar.insertarPotrero(potrero)
      return { ...publicarPotrero(potrero), correcciones: [] }
    },
  )
}

/**
 * Renombra o vuelve a anotar. Es el mismo potrero: el valor anterior queda en
 * la historia con quién, cuándo y por qué, y una versión vieja no cambia nada.
 */
export async function corregirPotreroDe(
  deps: DepsDeLugar,
  entrada: EntradaCorregirPotrero,
): Promise<PotreroConHistoria> {
  return ejecutarComandoIdempotente(
    deps.idempotencia,
    entrada.commandId,
    {
      comando: 'corregir_potrero',
      ranchId: entrada.ranchId,
      recordedBy: entrada.recordedBy,
      potreroId: entrada.potreroId,
      version: entrada.version,
      motivo: entrada.motivo,
      cambios: entrada.cambios,
    },
    async () => {
      const ranchId = ranchIdSchema.parse(entrada.ranchId)
      const actual = await deps.lugar.obtenerPotrero(ranchId, entrada.potreroId, true)
      if (actual === null) {
        throw new RechazoDeHerd('no_encontrado')
      }
      if (actual.version !== entrada.version) {
        throw new ConflictoDeVersion()
      }

      const corregido = corregirPotrero(actual, entrada.cambios, entrada.motivo)
      await deps.lugar.guardarCorreccionDePotrero({
        potrero: corregido.potrero,
        versionLeida: entrada.version,
        anteriores: corregido.anteriores,
        motivo: corregido.motivo,
        correctedBy: entrada.recordedBy,
        correctedAt: new Date(),
      })

      const correcciones = await deps.lugar.correccionesDePotrero(ranchId, actual.id)
      return {
        ...publicarPotrero(corregido.potrero),
        correcciones: correcciones.map(publicarCorreccionDePotrero),
      }
    },
  )
}

/**
 * Asigna el lugar esperado a uno o a varios animales.
 *
 * Todo va en una sola transacción: o quedan todas las asignaciones del grupo o
 * ninguna. No borra la anterior de cada animal —el lugar vigente es la última—
 * y no escribe nada fuera de `herd`. Asignar no es observar: la última
 * observación no se toca.
 *
 * La existencia de cada animal y la del potrero se comprueban antes de
 * escribir; el id de la asignación lo acuña el cliente, así que un reintento con
 * el mismo comando devuelve lo mismo y no duplica renglones.
 */
export async function asignarLugarAGrupo(
  deps: DepsDeLugar,
  entrada: EntradaAsignarLugar,
): Promise<{ asignaciones: readonly AsignacionPublica[] }> {
  const animales = ordenarSinRepetir(entrada.animales)

  return ejecutarComandoIdempotente(
    deps.idempotencia,
    entrada.commandId,
    {
      comando: 'asignar_lugar',
      ranchId: entrada.ranchId,
      recordedBy: entrada.recordedBy,
      potreroId: entrada.potreroId,
      desde: entrada.desde,
      nota: entrada.nota ?? null,
      reportedBy: entrada.reportedBy ?? null,
      animales,
    },
    async () => {
      if (animales.length === 0) {
        throw new RechazoDeHerd('asignacion_vacia')
      }

      const ranchId = ranchIdSchema.parse(entrada.ranchId)
      const reportedBy = quienLoDijo(entrada.reportedBy)
      const potreroId =
        entrada.potreroId === null
          ? null
          : await exigirPotreroDelRancho(deps, ranchId, entrada.potreroId)
      await exigirAnimalesDelRancho(deps, ranchId, animales)

      const cuando = new Date()
      const asignaciones: AsignacionPublica[] = []
      for (const animal of animales) {
        const asignacion = asignarLugar({
          id: exigirUuid(animal.asignacionId, 'asignacion_ya_existe'),
          ranchId,
          animalId: animalIdSchema.parse(animal.animalId),
          potreroId,
          desde: entrada.desde,
          nota: entrada.nota ?? null,
          reportedBy,
          recordedBy: entrada.recordedBy,
          recordedAt: cuando,
        })
        await deps.lugar.insertarAsignacion(asignacion)
        asignaciones.push(publicarAsignacion(asignacion))
      }

      return { asignaciones }
    },
  )
}

/** El potrero con su historia de nombres. `null` si no es de este rancho. */
export async function potreroDe(
  lugar: RepositorioDeLugar,
  ranchId: RanchId,
  potreroId: string,
): Promise<PotreroConHistoria | null> {
  const potrero = await lugar.obtenerPotrero(ranchId, potreroId, false)
  if (potrero === null) {
    return null
  }
  return conHistoria(lugar, potrero)
}

/** Todos los potreros con su historia, en el orden en que los lista el rancho. */
export async function listarPotreros(
  lugar: RepositorioDeLugar,
  ranchId: RanchId,
): Promise<readonly PotreroConHistoria[]> {
  const potreros = await lugar.listarPotreros(ranchId)
  const conHistorias: PotreroConHistoria[] = []
  for (const potrero of potreros) {
    conHistorias.push(await conHistoria(lugar, potrero))
  }
  return conHistorias
}

/**
 * Los potreros con cuántos animales activos se esperan en cada uno, y cuántos
 * activos están sin lugar o con lugar desconocido.
 *
 * Es una consulta: se calcula con la última asignación de cada animal y no se
 * guarda ningún contador. Un potrero no «contiene» animales; se esperan ahí.
 */
export async function potrerosDelRancho(
  deps: DepsDeLugar,
  ranchId: RanchId,
): Promise<PotrerosDelRancho> {
  const potreros = await deps.lugar.listarPotreros(ranchId)
  const activos = await deps.animales.listarActivos(ranchId)
  const asignaciones = await deps.lugar.asignacionesDelRancho(ranchId)
  const vigentes = vigentesPorAnimal(asignaciones)

  let sinAsignacion = 0
  let desconocidos = 0
  const esperados = new Map<string, number>()
  for (const animal of activos) {
    const vigente = vigentes.get(animal.id)
    if (vigente === undefined) {
      sinAsignacion += 1
      continue
    }
    if (vigente.potreroId === null) {
      desconocidos += 1
      continue
    }
    esperados.set(vigente.potreroId, (esperados.get(vigente.potreroId) ?? 0) + 1)
  }

  const conEsperados: PotreroEnLaLista[] = []
  for (const potrero of potreros) {
    conEsperados.push({
      ...(await conHistoria(deps.lugar, potrero)),
      esperados: esperados.get(potrero.id) ?? 0,
    })
  }

  return { potreros: conEsperados, sinAsignacion, desconocidos }
}

/** El lugar vigente de un animal y toda su historia. `null` si el animal no existe aquí. */
export async function lugarDeAnimal(
  deps: DepsDeLugar,
  ranchId: RanchId,
  animalId: string,
): Promise<LugarDelAnimal | null> {
  const animal = await deps.animales.obtener(ranchId, animalIdSchema.parse(animalId), false)
  if (animal === null) {
    return null
  }
  return lugarDe(deps.lugar, ranchId, animal.id)
}

/**
 * El lugar vigente de cada animal activo que tenga alguno. Los que nunca se
 * movieron no aparecen: no se les inventa un lugar.
 */
export async function lugaresDelHato(
  deps: DepsDeLugar,
  ranchId: RanchId,
): Promise<LugaresDelHato> {
  const activos = await deps.animales.listarActivos(ranchId)
  if (activos.length === 0) {
    return { animales: [] }
  }
  const asignaciones = await deps.lugar.asignacionesDeAnimales(
    ranchId,
    activos.map((animal) => animal.id),
  )
  const vigentes = vigentesPorAnimal(asignaciones)

  const filas: LugaresDelHato['animales'][number][] = []
  for (const animal of activos) {
    const vigente = vigentes.get(animal.id)
    if (vigente === undefined) {
      continue
    }
    filas.push({
      animalId: animal.id,
      potreroId: vigente.potreroId,
      desde: vigente.desde,
    })
  }
  return { animales: filas }
}

async function lugarDe(
  lugar: RepositorioDeLugar,
  ranchId: RanchId,
  animalId: string,
): Promise<LugarDelAnimal> {
  const asignaciones = await lugar.asignacionesDeAnimal(ranchId, animalId)
  const vigente = vigentesPorAnimal(asignaciones).get(animalId) ?? null
  return {
    vigente: vigente === null ? null : publicarAsignacion(vigente),
    historia: asignaciones.map(publicarAsignacion),
  }
}

async function conHistoria(lugar: RepositorioDeLugar, potrero: Potrero): Promise<PotreroConHistoria> {
  const correcciones = await lugar.correccionesDePotrero(potrero.ranchId, potrero.id)
  return {
    ...publicarPotrero(potrero),
    correcciones: correcciones.map(publicarCorreccionDePotrero),
  }
}

/**
 * El mismo grupo da la misma huella aunque el celular mande los animales en
 * otro orden: se ordena por id. Un animal repetido es un error del cliente y se
 * dice antes de escribir nada. Un `asignacionId` repetido también: el id lo
 * acuña el cliente para que el reintento no duplique, y repetirlo dentro del
 * mismo grupo haría chocar la segunda fila contra la primera. Se avisa antes de
 * escribir, en vez de dejar que la base lo traduzca a medias.
 */
function ordenarSinRepetir(animales: readonly AnimalDelMovimiento[]): AnimalDelMovimiento[] {
  const vistos = new Set<string>()
  const asignaciones = new Set<string>()
  for (const animal of animales) {
    if (vistos.has(animal.animalId)) {
      throw new RechazoDeHerd('animal_repetido')
    }
    vistos.add(animal.animalId)

    if (asignaciones.has(animal.asignacionId)) {
      throw new RechazoDeHerd('asignacion_ya_existe')
    }
    asignaciones.add(animal.asignacionId)
  }
  return [...animales].sort((uno, otro) => (uno.animalId < otro.animalId ? -1 : 1))
}

/**
 * Quién lo dijo, ya validado. Se revisa una vez aquí, antes de escribir, para no
 * empezar una transacción que el dominio va a rechazar en la primera fila. Un
 * texto en blanco no es un origen.
 */
function quienLoDijo(valor: string | null | undefined): ReportedBy | null {
  if (valor === undefined || valor === null) {
    return null
  }
  const leido = reportedBySchema.safeParse(valor)
  if (!leido.success || leido.data.length > LARGO_MAXIMO_REPORTED_BY) {
    throw new RechazoDeHerd('texto_invalido')
  }
  return leido.data
}

async function exigirPotreroDelRancho(
  deps: DepsDeLugar,
  ranchId: RanchId,
  potreroId: string,
): Promise<string> {
  const id = exigirUuid(potreroId, 'no_encontrado')
  const potrero = await deps.lugar.obtenerPotrero(ranchId, id, false)
  if (potrero === null) {
    throw new RechazoDeHerd('no_encontrado')
  }
  return potrero.id
}

/**
 * Cada animal tiene que existir en este rancho. Un id de otro rancho no existe
 * aquí y no se le asigna un lugar por error.
 *
 * Se permite asignar a un animal que ya salió: la asignación es historia y no
 * lo devuelve al hato. El hato activo es el que ofrece «Mover a…».
 */
async function exigirAnimalesDelRancho(
  deps: DepsDeLugar,
  ranchId: RanchId,
  animales: readonly AnimalDelMovimiento[],
): Promise<void> {
  for (const animal of animales) {
    const id = animalIdSchema.safeParse(animal.animalId)
    if (!id.success) {
      throw new RechazoDeHerd('no_encontrado')
    }
  }
  const estados = await deps.animales.estados(
    ranchId,
    animales.map((animal) => animal.animalId),
  )
  // `estados` solo trae los que existen en este rancho: si falta uno, el grupo
  // trae un id ajeno y no se escribe nada.
  if (estados.length !== animales.length) {
    throw new RechazoDeHerd('no_encontrado')
  }
}

function exigirUuid(valor: string, codigo: 'potrero_ya_existe' | 'asignacion_ya_existe' | 'no_encontrado'): string {
  const leido = z.uuid().safeParse(valor)
  if (!leido.success) {
    throw new RechazoDeHerd(codigo)
  }
  return leido.data
}

export type { AsignacionDeLugar }
