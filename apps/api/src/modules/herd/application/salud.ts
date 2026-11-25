import {
  ejecutarComandoIdempotente,
  huellaDeContenido,
  type AlmacenDeIdempotencia,
  type ReciboGuardado,
} from '../../../shared-kernel/idempotencia'
import { animalIdSchema, ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'
import type { RecordedBy } from '../../../shared-kernel/actores'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../../shared-kernel/conflictos'
import { z } from 'zod'

import { RechazoDeHerd } from '../domain/errores'
import {
  abrirNotaDeSalud,
  corregirNotaDeSalud,
  type CambiosDeNota,
  type TipoDeNotaDeSalud,
} from '../domain/salud'
import {
  publicarCorreccionDeNota,
  publicarNota,
  type NotaDeSaludConHistoria,
  type NotasAnotadasPublicas,
  type NotasDelAnimalPublicas,
} from './publicar-salud'
import type { RepositorioDeAnimales } from './repositorio'
import type { RepositorioDeSalud } from './repositorio-salud'
import type { ConsultaDeEvidencia } from './servicio'

/** Un animal de la captura y el id que el cliente acuñó para su nota. */
export type AnimalDeLaNota = {
  readonly animalId: string
  readonly notaId: string
}

export type EntradaAnotarSalud = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly tipo: TipoDeNotaDeSalud
  /** Qué se hizo o se vio. */
  readonly detalle: string
  readonly fecha: string
  readonly producto?: string | null
  readonly evidenciaId?: string | null
  /** Explícito. Si no viene, la nota no dice que el animal se vio. */
  readonly vioAlAnimal?: boolean
  readonly animales: readonly AnimalDeLaNota[]
}

export type EntradaCorregirNota = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly notaId: string
  readonly version: number
  readonly motivo: string
  readonly cambios: CambiosDeNota
}

export type DepsDeSalud = {
  readonly animales: RepositorioDeAnimales
  readonly salud: RepositorioDeSalud
  readonly idempotencia: AlmacenDeIdempotencia
}

/**
 * La nota y su foto fuera de la escritura.
 *
 * El puerto de evidencia usa el cliente de afuera: con la transacción de la
 * nota abierta, en la base embebida las dos consultas se esperan y no vuelven.
 * Por eso el recibo y la foto se leen antes de abrir la transacción, igual que
 * en la salida.
 */
export type AlcanceDeSalud = {
  readonly leerRecibo: (commandId: string) => Promise<ReciboGuardado | null>
  readonly escribir: <T>(trabajo: (deps: DepsDeSalud) => Promise<T>) => Promise<T>
  readonly evidencia: ConsultaDeEvidencia | null
}

/**
 * Anota sanidad a uno o a varios animales.
 *
 * Todo va en una sola transacción: o quedan todas las notas del grupo o
 * ninguna. Cada animal recibe su propia fila, así que corregir la nota de uno
 * no toca la de los demás. No escribe fuera de `herd` y no toca identidad ni
 * tenencia. Una nota no es una observación salvo que diga que se vio al animal:
 * el defecto es falso.
 *
 * El id de cada nota lo acuña el cliente, igual que el de una asignación de
 * lugar: reintentar el mismo comando devuelve lo guardado y no duplica.
 */
export async function anotarSalud(
  alcance: AlcanceDeSalud,
  entrada: EntradaAnotarSalud,
): Promise<NotasAnotadasPublicas> {
  const animales = ordenarSinRepetir(entrada.animales)
  const contenido = contenidoDeAnotar(entrada, animales)

  const previo = await alcance.leerRecibo(entrada.commandId)
  if (previo !== null) {
    if (previo.huella !== huellaDeContenido(contenido)) {
      throw new ConflictoDeIdempotencia(entrada.commandId)
    }
    return JSON.parse(previo.resultado) as NotasAnotadasPublicas
  }

  const ranchId = ranchIdSchema.parse(entrada.ranchId)
  const evidenciaId = idDeFoto(entrada.evidenciaId)
  await exigirEvidenciaDeLaNota(alcance.evidencia, ranchId, evidenciaId)

  return alcance.escribir((deps) =>
    ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
      if (animales.length === 0) {
        throw new RechazoDeHerd('nota_vacia')
      }
      await exigirAnimalesDelRancho(deps, ranchId, animales)

      const cuando = new Date()
      const notas: NotaDeSaludConHistoria[] = []
      for (const animal of animales) {
        const nota = abrirNotaDeSalud({
          id: exigirId(animal.notaId, 'nota_ya_existe'),
          ranchId,
          animalId: animalIdSchema.parse(animal.animalId),
          tipo: entrada.tipo,
          detalle: entrada.detalle,
          fecha: entrada.fecha,
          producto: entrada.producto ?? null,
          evidenciaId,
          vioAlAnimal: entrada.vioAlAnimal === true,
          recordedBy: entrada.recordedBy,
          recordedAt: cuando,
        })
        await deps.salud.insertarNota(nota)
        notas.push({ ...publicarNota(nota), correcciones: [] })
      }

      return { notas }
    }),
  )
}

/**
 * Corrige una nota ya asentada. La anterior queda en la historia con quién,
 * cuándo y por qué, y una versión vieja no cambia nada. El animal de la nota no
 * cambia: una nota equivocada no es otro animal.
 */
export async function corregirNota(
  alcance: AlcanceDeSalud,
  entrada: EntradaCorregirNota,
): Promise<NotaDeSaludConHistoria> {
  const contenido = contenidoDeCorreccion(entrada)

  const previo = await alcance.leerRecibo(entrada.commandId)
  if (previo !== null) {
    if (previo.huella !== huellaDeContenido(contenido)) {
      throw new ConflictoDeIdempotencia(entrada.commandId)
    }
    return JSON.parse(previo.resultado) as NotaDeSaludConHistoria
  }

  const ranchId = ranchIdSchema.parse(entrada.ranchId)
  const idDeLaNota = exigirId(entrada.notaId, 'no_encontrado')
  const evidenciaNueva = idDeFoto(entrada.cambios.evidenciaId)
  await exigirEvidenciaDeLaNota(alcance.evidencia, ranchId, evidenciaNueva)

  return alcance.escribir((deps) =>
    ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
      const actual = await deps.salud.obtenerNota(ranchId, idDeLaNota, true)
      if (actual === null) {
        throw new RechazoDeHerd('no_encontrado')
      }
      if (actual.version !== entrada.version) {
        throw new ConflictoDeVersion()
      }

      const corregida = corregirNotaDeSalud(actual, entrada.cambios, entrada.motivo)
      await deps.salud.guardarCorreccionDeNota({
        nota: corregida.nota,
        versionLeida: entrada.version,
        anteriores: corregida.anteriores,
        motivo: corregida.motivo,
        correctedBy: entrada.recordedBy,
        correctedAt: new Date(),
      })

      return conHistoria(deps.salud, ranchId, corregida.nota)
    }),
  )
}

/** Las notas de un animal, de la más vieja a la más nueva. `null` si no existe aquí. */
export async function notasDeAnimal(
  deps: DepsDeSalud,
  ranchId: RanchId,
  animalId: string,
): Promise<NotasDelAnimalPublicas | null> {
  const id = animalIdSchema.parse(animalId)
  const animal = await deps.animales.obtener(ranchId, id, false)
  if (animal === null) {
    return null
  }

  const notas = await deps.salud.notasDeAnimal(ranchId, animal.id)
  const publicadas: NotaDeSaludConHistoria[] = []
  for (const nota of notas) {
    publicadas.push(await conHistoria(deps.salud, ranchId, nota))
  }
  return { animalId: animal.id, notas: publicadas }
}

/**
 * Las notas de varios animales, incluidas las de los que ya salieron: la nota es
 * historia y no depende de que el animal siga activo. Es una consulta.
 */
export async function notasDeAnimales(
  deps: DepsDeSalud,
  ranchId: RanchId,
  animalIds: readonly string[],
): Promise<readonly NotasDelAnimalPublicas[]> {
  const validos: string[] = []
  for (const pedido of animalIds) {
    const leido = animalIdSchema.safeParse(pedido)
    if (leido.success && !validos.includes(leido.data)) {
      validos.push(leido.data)
    }
  }
  if (validos.length === 0) {
    return []
  }

  const notas = await deps.salud.notasDeAnimales(ranchId, validos)
  const porAnimal = new Map<string, NotaDeSaludConHistoria[]>()
  for (const nota of notas) {
    const publicada = await conHistoria(deps.salud, ranchId, nota)
    const grupo = porAnimal.get(nota.animalId)
    if (grupo === undefined) {
      porAnimal.set(nota.animalId, [publicada])
    } else {
      grupo.push(publicada)
    }
  }

  return validos.map((animalId) => ({ animalId, notas: porAnimal.get(animalId) ?? [] }))
}

async function conHistoria(
  salud: RepositorioDeSalud,
  ranchId: RanchId,
  nota: Parameters<typeof publicarNota>[0],
): Promise<NotaDeSaludConHistoria> {
  const correcciones = await salud.correccionesDeNota(ranchId, nota.id)
  return { ...publicarNota(nota), correcciones: correcciones.map(publicarCorreccionDeNota) }
}

/**
 * El mismo grupo da la misma huella aunque el celular mande los animales en
 * otro orden: se ordena por id. Un animal repetido es un error del cliente y se
 * dice antes de escribir nada. Un `notaId` repetido también: dentro del grupo
 * haría chocar la segunda fila contra la primera.
 */
function ordenarSinRepetir(animales: readonly AnimalDeLaNota[]): AnimalDeLaNota[] {
  const vistos = new Set<string>()
  const notas = new Set<string>()
  for (const animal of animales) {
    if (vistos.has(animal.animalId)) {
      throw new RechazoDeHerd('animal_repetido')
    }
    vistos.add(animal.animalId)

    if (notas.has(animal.notaId)) {
      throw new RechazoDeHerd('nota_ya_existe')
    }
    notas.add(animal.notaId)
  }
  return [...animales].sort((uno, otro) => (uno.animalId < otro.animalId ? -1 : 1))
}

/**
 * Cada animal tiene que existir en este rancho. Se permite anotar sanidad a un
 * animal que ya salió: la nota es historia y no lo devuelve al hato.
 */
async function exigirAnimalesDelRancho(
  deps: DepsDeSalud,
  ranchId: RanchId,
  animales: readonly AnimalDeLaNota[],
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
  if (estados.length !== animales.length) {
    throw new RechazoDeHerd('no_encontrado')
  }
}

async function exigirEvidenciaDeLaNota(
  consulta: ConsultaDeEvidencia | null,
  ranchId: RanchId,
  evidenciaId: string | null,
): Promise<void> {
  if (evidenciaId === null) {
    return
  }
  if (consulta === null) {
    throw new RechazoDeHerd('evidencia_ajena')
  }
  const pertenece = await consulta.perteneceAlRancho(ranchId, evidenciaId)
  if (!pertenece) {
    throw new RechazoDeHerd('evidencia_ajena')
  }
}

function contenidoDeAnotar(
  entrada: EntradaAnotarSalud,
  animales: readonly AnimalDeLaNota[],
): unknown {
  return {
    comando: 'anotar_salud',
    ranchId: entrada.ranchId,
    recordedBy: entrada.recordedBy,
    tipo: entrada.tipo,
    detalle: entrada.detalle,
    fecha: entrada.fecha,
    producto: entrada.producto ?? null,
    evidenciaId: entrada.evidenciaId ?? null,
    vioAlAnimal: entrada.vioAlAnimal === true,
    animales,
  }
}

function contenidoDeCorreccion(entrada: EntradaCorregirNota): unknown {
  return {
    comando: 'corregir_nota_salud',
    ranchId: entrada.ranchId,
    recordedBy: entrada.recordedBy,
    notaId: entrada.notaId,
    version: entrada.version,
    motivo: entrada.motivo,
    cambios: entrada.cambios,
  }
}

/** Un id vacío no es una foto: se rechaza. La foto se valida como id. */
function idDeFoto(valor: string | null | undefined): string | null {
  if (valor === undefined || valor === null) {
    return null
  }
  const limpio = z.uuid().safeParse(valor)
  if (!limpio.success) {
    throw new RechazoDeHerd('texto_invalido')
  }
  return limpio.data
}

function exigirId(valor: string, codigo: 'no_encontrado' | 'nota_ya_existe'): string {
  const leido = z.uuid().safeParse(valor)
  if (!leido.success) {
    throw new RechazoDeHerd(codigo)
  }
  return leido.data
}
