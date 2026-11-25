import type { AlmacenDeIdempotencia, ReciboGuardado } from '../../../shared-kernel/idempotencia'
import { ejecutarComandoIdempotente, huellaDeContenido } from '../../../shared-kernel/idempotencia'
import { animalIdSchema, ranchIdSchema, type AnimalId, type RanchId } from '../../../shared-kernel/ids'
import type { RecordedBy } from '../../../shared-kernel/actores'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../../shared-kernel/conflictos'
import { z } from 'zod'

import { corregirFicha, registrarAnimal, type Animal, type CambiosDeFicha } from '../domain/animal'
import { crearMarca, perderMarca, reemplazarMarca, type Marca } from '../domain/marca'
import { RechazoDeHerd } from '../domain/errores'
import { corregirSalida, registrarSalida, type CambiosDeSalida } from '../domain/salida'
import type {
  Categoria,
  MotivoDeSalida,
  ParticipacionEconomica,
  Sexo,
  Tenencia,
  TipoDeMarca,
} from '../domain/valores'
import type { RepositorioDeFiliacion } from './repositorio-filiacion'
import type { RepositorioDeLugar } from './repositorio-lugar'
import type { RepositorioDeAnimales } from './repositorio'
import {
  publicarAnimal,
  publicarCorreccion,
  publicarCorreccionDeSalida,
  publicarMarca,
  type CorreccionPublica,
  type FichaAnimal,
  type FichaConHistoria,
  type MarcaPublica,
} from './publicar'

/**
 * Herd no escribe la tabla de evidencia. Solo pregunta si el id es de este
 * rancho antes de guardarlo en la salida.
 */
export type ConsultaDeEvidencia = {
  perteneceAlRancho(ranchId: RanchId, evidenciaId: string): Promise<boolean>
}

export type DepsDeHerd = {
  readonly animales: RepositorioDeAnimales
  readonly filiacion: RepositorioDeFiliacion
  readonly lugar: RepositorioDeLugar
  readonly idempotencia: AlmacenDeIdempotencia
  readonly evidencia: ConsultaDeEvidencia | null
}

/**
 * La salida consulta el recibo y la foto antes de escribir.
 *
 * El puerto de evidencia usa el cliente de afuera. Si se le pregunta con la
 * transacción de la ficha abierta, en la base embebida (y con un solo cliente
 * en el pool) las dos se esperan y no vuelven.
 */
export type AlcanceDeSalida = {
  readonly leerRecibo: (commandId: string) => Promise<ReciboGuardado | null>
  readonly leerAnimal: (ranchId: RanchId, animalId: AnimalId) => Promise<Animal | null>
  readonly escribir: <T>(trabajo: (deps: DepsDeHerd) => Promise<T>) => Promise<T>
  readonly evidencia: ConsultaDeEvidencia | null
}

export type EntradaRegistrar = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly id: string
  readonly nombre?: string
  readonly sexo?: Sexo
  readonly categoria?: Categoria
  readonly detalleCategoria?: string
  readonly tenencia?: Tenencia
  readonly participacionEconomica?: ParticipacionEconomica
  readonly notaDelArreglo?: string
  readonly nota?: string
}

export type EntradaCorregir = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly animalId: string
  readonly version: number
  readonly motivo: string
  readonly cambios: CambiosDeFicha
}

export type EntradaAgregarMarca = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly animalId: string
  readonly marcaId: string
  readonly tipo: TipoDeMarca
  readonly valor: string
  readonly desde?: string | null
}

export type EntradaReemplazarMarca = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly animalId: string
  readonly marcaAnteriorId: string
  readonly marcaId: string
  readonly tipo: TipoDeMarca
  readonly valor: string
  readonly desde?: string | null
  readonly cambiadaEl?: string | null
}

export type EntradaRegistrarSalida = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly animalId: string
  readonly version: number
  readonly motivo: MotivoDeSalida
  readonly fecha: string
  readonly nota?: string
  readonly evidenciaId?: string | null
}

export type EntradaCorregirSalida = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly animalId: string
  readonly version: number
  readonly motivo: string
  readonly cambios: CambiosDeSalida
}

export type EntradaMarcarPerdida = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly animalId: string
  readonly marcaId: string
  readonly cambiadaEl?: string | null
}

export type EstadoEnRancho = {
  readonly id: string
  readonly existe: boolean
  readonly activo: boolean
}

export type { CorreccionPublica, FichaAnimal, FichaConHistoria, MarcaPublica }

/**
 * Registra la ficha. El mismo comando con el mismo contenido devuelve la ficha
 * ya guardada; otro contenido con ese id es `idempotency_mismatch`.
 *
 * Devuelve la ficha **con su historia**, igual que `GET /api/animals/:id`: es el
 * mismo recurso y quien acaba de crearlo puede pintarlo sin una segunda
 * lectura. Al nacer no hay correcciones, y esa lista vacía es un hecho, no un
 * hueco.
 */
export async function registrar(deps: DepsDeHerd, entrada: EntradaRegistrar): Promise<FichaConHistoria> {
  return ejecutarComandoIdempotente(
    deps.idempotencia,
    entrada.commandId,
    {
      comando: 'registrar_animal',
      ranchId: entrada.ranchId,
      recordedBy: entrada.recordedBy,
      id: entrada.id,
      nombre: entrada.nombre ?? null,
      sexo: entrada.sexo ?? 'unknown',
      categoria: entrada.categoria ?? 'unknown',
      detalleCategoria: entrada.detalleCategoria ?? null,
      tenencia: entrada.tenencia ?? 'unknown',
      participacionEconomica: entrada.participacionEconomica ?? 'unknown',
      notaDelArreglo: entrada.notaDelArreglo ?? null,
      nota: entrada.nota ?? null,
    },
    async () => {
      const animal = registrarAnimal({
        id: animalIdSchema.parse(entrada.id),
        ranchId: ranchIdSchema.parse(entrada.ranchId),
        recordedBy: entrada.recordedBy,
        recordedAt: new Date(),
        ...(entrada.nombre !== undefined ? { nombre: entrada.nombre } : {}),
        ...(entrada.sexo !== undefined ? { sexo: entrada.sexo } : {}),
        ...(entrada.categoria !== undefined ? { categoria: entrada.categoria } : {}),
        ...(entrada.detalleCategoria !== undefined ? { detalleCategoria: entrada.detalleCategoria } : {}),
        ...(entrada.tenencia !== undefined ? { tenencia: entrada.tenencia } : {}),
        ...(entrada.participacionEconomica !== undefined
          ? { participacionEconomica: entrada.participacionEconomica }
          : {}),
        ...(entrada.notaDelArreglo !== undefined ? { notaDelArreglo: entrada.notaDelArreglo } : {}),
        ...(entrada.nota !== undefined ? { nota: entrada.nota } : {}),
      })
      await deps.animales.insertar(animal)
      return { ...publicarAnimal(animal, []), correcciones: [], correccionesDeSalida: [] }
    },
  )
}

/**
 * Corrige la ficha y devuelve la ficha con su historia ya actualizada, igual
 * que `GET /api/animals/:id`. La corrección que se acaba de guardar aparece en
 * la lista: quien corrigió ve el valor anterior sin volver a pedir la ficha.
 */
export async function corregir(deps: DepsDeHerd, entrada: EntradaCorregir): Promise<FichaConHistoria> {
  return ejecutarComandoIdempotente(
    deps.idempotencia,
    entrada.commandId,
    {
      comando: 'corregir_ficha',
      ranchId: entrada.ranchId,
      recordedBy: entrada.recordedBy,
      animalId: entrada.animalId,
      version: entrada.version,
      motivo: entrada.motivo,
      cambios: entrada.cambios,
    },
    async () => {
      const ranchId = ranchIdSchema.parse(entrada.ranchId)
      const animalId = animalIdSchema.parse(entrada.animalId)
      const actual = await deps.animales.obtener(ranchId, animalId, true)
      if (actual === null) {
        throw new RechazoDeHerd('no_encontrado')
      }
      if (actual.version !== entrada.version) {
        throw new ConflictoDeVersion()
      }

      const corregida = corregirFicha(actual, entrada.cambios, entrada.motivo)
      await deps.animales.guardarCorreccion({
        animal: corregida.animal,
        versionLeida: entrada.version,
        anteriores: corregida.anteriores,
        motivo: corregida.motivo,
        correctedBy: entrada.recordedBy,
        correctedAt: new Date(),
      })
      const marcas = await deps.animales.marcasDe(ranchId, [animalId])
      const correcciones = await deps.animales.correccionesDe(ranchId, animalId)
      const correccionesDeSalida = await deps.animales.correccionesDeSalida(ranchId, animalId)
      return {
        ...publicarAnimal(corregida.animal, marcas),
        correcciones: correcciones.map(publicarCorreccion),
        correccionesDeSalida: correccionesDeSalida.map(publicarCorreccionDeSalida),
      }
    },
  )
}

/**
 * Da de baja. El mismo comando con el mismo contenido devuelve la ficha ya
 * guardada. Una versión vieja no cambia nada. La ficha, los aretes y las
 * correcciones se quedan.
 *
 * El recibo se lee primero: un reintento no vuelve a preguntar por la foto.
 * La foto se valida antes de abrir la transacción que bloquea la fila.
 */
export async function registrarSalidaDe(
  alcance: AlcanceDeSalida,
  entrada: EntradaRegistrarSalida,
): Promise<FichaConHistoria> {
  const contenido = contenidoDeRegistrarSalida(entrada)
  const previo = await alcance.leerRecibo(entrada.commandId)
  if (previo !== null) {
    if (previo.huella !== huellaDeContenido(contenido)) {
      throw new ConflictoDeIdempotencia(entrada.commandId)
    }
    return JSON.parse(previo.resultado) as FichaConHistoria
  }

  const evidenciaId = idParaConsultar(entrada.evidenciaId)
  if (evidenciaId !== null) {
    await exigirEvidencia(alcance.evidencia, ranchIdSchema.parse(entrada.ranchId), evidenciaId)
  }

  return alcance.escribir((deps) =>
    ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
      const ranchId = ranchIdSchema.parse(entrada.ranchId)
      const animalId = animalIdSchema.parse(entrada.animalId)
      const actual = await deps.animales.obtener(ranchId, animalId, true)
      if (actual === null) {
        throw new RechazoDeHerd('no_encontrado')
      }
      if (actual.version !== entrada.version) {
        throw new ConflictoDeVersion()
      }

      const siguiente = registrarSalida(actual, {
        motivo: entrada.motivo,
        fecha: entrada.fecha,
        ...(entrada.nota !== undefined ? { nota: entrada.nota } : {}),
        ...(entrada.evidenciaId !== undefined ? { evidenciaId: entrada.evidenciaId } : {}),
      })
      await deps.animales.guardarSalida({
        animal: siguiente,
        versionLeida: entrada.version,
        anterior: null,
        motivo: null,
        correctedBy: entrada.recordedBy,
        correctedAt: new Date(),
      })
      return await fichaDe(deps, siguiente)
    }),
  )
}

/**
 * Corrige la salida, o la deshace y el animal vuelve a activo. Lo que estaba
 * queda en la historia. No se anota precio ni reposición.
 *
 * La foto nueva se consulta solo si es distinta a la vigente, y esa lectura
 * de la ficha no bloquea la fila: ocurre antes de la transacción de escritura.
 */
export async function corregirSalidaDe(
  alcance: AlcanceDeSalida,
  entrada: EntradaCorregirSalida,
): Promise<FichaConHistoria> {
  const contenido = contenidoDeCorregirSalida(entrada)
  const previo = await alcance.leerRecibo(entrada.commandId)
  if (previo !== null) {
    if (previo.huella !== huellaDeContenido(contenido)) {
      throw new ConflictoDeIdempotencia(entrada.commandId)
    }
    return JSON.parse(previo.resultado) as FichaConHistoria
  }

  const evidenciaId = idParaConsultar(entrada.cambios.evidenciaId)
  if (entrada.cambios.activo !== true && evidenciaId !== null) {
    const ranchId = ranchIdSchema.parse(entrada.ranchId)
    const animalId = animalIdSchema.parse(entrada.animalId)
    const actual = await alcance.leerAnimal(ranchId, animalId)
    const vigente = actual?.salida?.evidenciaId ?? null
    if (actual !== null && evidenciaId !== vigente) {
      await exigirEvidencia(alcance.evidencia, ranchId, evidenciaId)
    }
  }

  return alcance.escribir((deps) =>
    ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
      const ranchId = ranchIdSchema.parse(entrada.ranchId)
      const animalId = animalIdSchema.parse(entrada.animalId)
      const actual = await deps.animales.obtener(ranchId, animalId, true)
      if (actual === null) {
        throw new RechazoDeHerd('no_encontrado')
      }
      if (actual.version !== entrada.version) {
        throw new ConflictoDeVersion()
      }

      const corregida = corregirSalida(actual, entrada.cambios, entrada.motivo)
      await deps.animales.guardarSalida({
        animal: corregida.animal,
        versionLeida: entrada.version,
        anterior: corregida.anterior,
        motivo: corregida.motivo,
        correctedBy: entrada.recordedBy,
        correctedAt: new Date(),
      })
      return await fichaDe(deps, corregida.animal)
    }),
  )
}

export async function agregarMarca(
  deps: DepsDeHerd,
  entrada: EntradaAgregarMarca,
): Promise<MarcaPublica> {
  return ejecutarComandoIdempotente(
    deps.idempotencia,
    entrada.commandId,
    {
      comando: 'agregar_marca',
      ranchId: entrada.ranchId,
      recordedBy: entrada.recordedBy,
      animalId: entrada.animalId,
      marcaId: entrada.marcaId,
      tipo: entrada.tipo,
      valor: entrada.valor,
      desde: entrada.desde ?? null,
    },
    async () => {
      const ranchId = ranchIdSchema.parse(entrada.ranchId)
      const animalId = animalIdSchema.parse(entrada.animalId)
      const marcaId = exigirMarcaId(entrada.marcaId)
      const animal = await deps.animales.obtener(ranchId, animalId, false)
      if (animal === null) {
        throw new RechazoDeHerd('no_encontrado')
      }

      const marca = crearMarca({
        id: marcaId,
        ranchId,
        animalId,
        tipo: entrada.tipo,
        valor: entrada.valor,
        ...(entrada.desde !== undefined ? { desde: entrada.desde } : {}),
        recordedBy: entrada.recordedBy,
        recordedAt: new Date(),
      })
      if (marca.tipo === 'siniiga') {
        const ocupada = await deps.animales.siniigaActiva(ranchId, marca.valor, null)
        if (ocupada) {
          throw new RechazoDeHerd('marca_siniiga_duplicada')
        }
      }
      await deps.animales.insertarMarca(marca)
      return publicarMarca(marca)
    },
  )
}

export async function reemplazar(
  deps: DepsDeHerd,
  entrada: EntradaReemplazarMarca,
): Promise<{ anterior: MarcaPublica; nueva: MarcaPublica }> {
  return ejecutarComandoIdempotente(
    deps.idempotencia,
    entrada.commandId,
    {
      comando: 'reemplazar_marca',
      ranchId: entrada.ranchId,
      recordedBy: entrada.recordedBy,
      animalId: entrada.animalId,
      marcaAnteriorId: entrada.marcaAnteriorId,
      marcaId: entrada.marcaId,
      tipo: entrada.tipo,
      valor: entrada.valor,
      desde: entrada.desde ?? null,
      cambiadaEl: entrada.cambiadaEl ?? null,
    },
    async () => {
      const ranchId = ranchIdSchema.parse(entrada.ranchId)
      const animalId = animalIdSchema.parse(entrada.animalId)
      const anteriorId = exigirMarcaId(entrada.marcaAnteriorId)
      const nuevaId = exigirMarcaId(entrada.marcaId)
      const anterior = await deps.animales.obtenerMarca(ranchId, animalId, anteriorId, true)
      if (anterior === null) {
        throw new RechazoDeHerd('no_encontrado')
      }
      if (nuevaId === anterior.id) {
        throw new RechazoDeHerd('marca_ya_existe')
      }

      const cerrada = reemplazarMarca(anterior, entrada.cambiadaEl)
      const nueva = crearMarca({
        id: nuevaId,
        ranchId,
        animalId,
        tipo: entrada.tipo,
        valor: entrada.valor,
        ...(entrada.desde !== undefined ? { desde: entrada.desde } : {}),
        recordedBy: entrada.recordedBy,
        recordedAt: new Date(),
      })
      if (nueva.tipo === 'siniiga') {
        const ocupada = await deps.animales.siniigaActiva(ranchId, nueva.valor, anterior.id)
        if (ocupada) {
          throw new RechazoDeHerd('marca_siniiga_duplicada')
        }
      }

      // Primero se cierra la anterior: si el arete nuevo repite el valor, el
      // índice de SINIIGA vigente ya no la ve.
      await deps.animales.cerrarMarca(cerrada)
      await deps.animales.insertarMarca(nueva)
      return { anterior: publicarMarca(cerrada), nueva: publicarMarca(nueva) }
    },
  )
}

export async function marcarPerdida(
  deps: DepsDeHerd,
  entrada: EntradaMarcarPerdida,
): Promise<MarcaPublica> {
  return ejecutarComandoIdempotente(
    deps.idempotencia,
    entrada.commandId,
    {
      comando: 'marcar_perdida',
      ranchId: entrada.ranchId,
      recordedBy: entrada.recordedBy,
      animalId: entrada.animalId,
      marcaId: entrada.marcaId,
      cambiadaEl: entrada.cambiadaEl ?? null,
    },
    async () => {
      const ranchId = ranchIdSchema.parse(entrada.ranchId)
      const animalId = animalIdSchema.parse(entrada.animalId)
      const marcaId = exigirMarcaId(entrada.marcaId)
      const marca = await deps.animales.obtenerMarca(ranchId, animalId, marcaId, true)
      if (marca === null) {
        throw new RechazoDeHerd('no_encontrado')
      }
      const cerrada = perderMarca(marca, entrada.cambiadaEl)
      await deps.animales.cerrarMarca(cerrada)
      return publicarMarca(cerrada)
    },
  )
}

export async function listarActivos(
  animales: RepositorioDeAnimales,
  ranchId: RanchId,
): Promise<FichaAnimal[]> {
  const lista = await animales.listarActivos(ranchIdSchema.parse(ranchId))
  return conMarcas(animales, ranchId, lista)
}

export async function listarSalidas(
  animales: RepositorioDeAnimales,
  ranchId: RanchId,
): Promise<FichaAnimal[]> {
  const lista = await animales.listarInactivos(ranchIdSchema.parse(ranchId))
  return conMarcas(animales, ranchId, lista)
}

export async function obtenerFicha(
  animales: RepositorioDeAnimales,
  ranchId: RanchId,
  animalId: string,
): Promise<FichaConHistoria | null> {
  const id = animalIdSchema.parse(animalId)
  const animal = await animales.obtener(ranchIdSchema.parse(ranchId), id, false)
  if (animal === null) {
    return null
  }
  const marcas = await animales.marcasDe(animal.ranchId, [animal.id])
  const correcciones = await animales.correccionesDe(animal.ranchId, animal.id)
  const correccionesDeSalida = await animales.correccionesDeSalida(animal.ranchId, animal.id)
  return {
    ...publicarAnimal(animal, marcas),
    correcciones: correcciones.map(publicarCorreccion),
    correccionesDeSalida: correccionesDeSalida.map(publicarCorreccionDeSalida),
  }
}

async function fichaDe(deps: DepsDeHerd, animal: Animal): Promise<FichaConHistoria> {
  const marcas = await deps.animales.marcasDe(animal.ranchId, [animal.id])
  const correcciones = await deps.animales.correccionesDe(animal.ranchId, animal.id)
  const correccionesDeSalida = await deps.animales.correccionesDeSalida(animal.ranchId, animal.id)
  return {
    ...publicarAnimal(animal, marcas),
    correcciones: correcciones.map(publicarCorreccion),
    correccionesDeSalida: correccionesDeSalida.map(publicarCorreccionDeSalida),
  }
}

function contenidoDeRegistrarSalida(entrada: EntradaRegistrarSalida) {
  return {
    comando: 'registrar_salida',
    ranchId: entrada.ranchId,
    recordedBy: entrada.recordedBy,
    animalId: entrada.animalId,
    version: entrada.version,
    motivo: entrada.motivo,
    fecha: entrada.fecha,
    nota: entrada.nota ?? null,
    evidenciaId: entrada.evidenciaId ?? null,
  }
}

function contenidoDeCorregirSalida(entrada: EntradaCorregirSalida) {
  return {
    comando: 'corregir_salida',
    ranchId: entrada.ranchId,
    recordedBy: entrada.recordedBy,
    animalId: entrada.animalId,
    version: entrada.version,
    motivo: entrada.motivo,
    cambios: entrada.cambios,
  }
}

/**
 * Id con texto, para preguntar si la foto es del rancho.
 * Vacío no es una foto ajena: lo rechaza el dominio al guardar.
 */
function idParaConsultar(valor: string | null | undefined): string | null {
  if (valor === undefined || valor === null) {
    return null
  }
  const limpio = valor.trim()
  if (limpio === '') {
    return null
  }
  return limpio
}

async function exigirEvidencia(
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

/** Actual o anterior: una marca reemplazada o perdida sigue encontrando la ficha. */
export async function buscarPorMarca(
  animales: RepositorioDeAnimales,
  ranchId: RanchId,
  valor: string,
): Promise<FichaAnimal[]> {
  const limpio = valor.trim()
  if (limpio === '') {
    throw new RechazoDeHerd('marca_invalida')
  }
  const ids = await animales.idsPorMarca(ranchIdSchema.parse(ranchId), limpio)
  if (ids.length === 0) {
    return []
  }
  const lista = await animales.obtenerVarios(
    ranchId,
    ids.map((id) => animalIdSchema.parse(id)),
  )
  return conMarcas(animales, ranchId, lista)
}

/**
 * La consulta que usará Growth: estos ids, en este rancho, ¿existen y están activos?
 * Un id de otro rancho no existe aquí. El orden de la respuesta sigue al de la pregunta.
 */
export async function existenEnElRancho(
  animales: RepositorioDeAnimales,
  ranchId: RanchId,
  ids: readonly string[],
): Promise<EstadoEnRancho[]> {
  if (ids.length === 0) {
    return []
  }

  const validos: string[] = []
  for (const pedido of ids) {
    const leido = animalIdSchema.safeParse(pedido)
    if (leido.success) {
      validos.push(leido.data)
    }
  }

  const filas =
    validos.length === 0 ? [] : await animales.estados(ranchIdSchema.parse(ranchId), validos)
  const porId = new Map(filas.map((fila) => [fila.id, fila.activo]))

  return ids.map((id) => {
    const activo = porId.get(id)
    if (activo === undefined) {
      return { id, existe: false, activo: false }
    }
    return { id, existe: true, activo }
  })
}

async function conMarcas(
  animales: RepositorioDeAnimales,
  ranchId: RanchId,
  lista: readonly Animal[],
): Promise<FichaAnimal[]> {
  if (lista.length === 0) {
    return []
  }
  const marcas = await animales.marcasDe(
    ranchId,
    lista.map((animal) => animal.id),
  )
  const grupos = new Map<string, Marca[]>()
  for (const marca of marcas) {
    const grupo = grupos.get(marca.animalId)
    if (grupo === undefined) {
      grupos.set(marca.animalId, [marca])
    } else {
      grupo.push(marca)
    }
  }
  return lista.map((animal) => publicarAnimal(animal, grupos.get(animal.id) ?? []))
}

/**
 * El id de la marca lo acuña el cliente, igual que el del animal. Un texto que
 * no es UUID no llega a PostgreSQL: se rechaza como `marca_invalida` en vez de
 * dejar salir un error crudo del motor (`invalid input syntax for type uuid`).
 */
function exigirMarcaId(valor: string): string {
  const leido = z.uuid().safeParse(valor)
  if (!leido.success) {
    throw new RechazoDeHerd('marca_invalida')
  }
  return leido.data
}
