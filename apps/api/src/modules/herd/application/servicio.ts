import type { AlmacenDeIdempotencia } from '../../../shared-kernel/idempotencia'
import { ejecutarComandoIdempotente } from '../../../shared-kernel/idempotencia'
import { animalIdSchema, ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'
import type { RecordedBy } from '../../../shared-kernel/actores'
import { ConflictoDeVersion } from '../../../shared-kernel/conflictos'

import { corregirFicha, registrarAnimal, type Animal, type CambiosDeFicha } from '../domain/animal'
import { crearMarca, perderMarca, reemplazarMarca, type Marca } from '../domain/marca'
import { RechazoDeHerd } from '../domain/errores'
import type {
  Categoria,
  ParticipacionEconomica,
  Sexo,
  Tenencia,
  TipoDeMarca,
} from '../domain/valores'
import type { RepositorioDeAnimales } from './repositorio'
import {
  publicarAnimal,
  publicarCorreccion,
  publicarMarca,
  type CorreccionPublica,
  type FichaAnimal,
  type FichaConHistoria,
  type MarcaPublica,
} from './publicar'

export type DepsDeHerd = {
  readonly animales: RepositorioDeAnimales
  readonly idempotencia: AlmacenDeIdempotencia
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
 */
export async function registrar(deps: DepsDeHerd, entrada: EntradaRegistrar): Promise<FichaAnimal> {
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
      return publicarAnimal(animal, [])
    },
  )
}

export async function corregir(deps: DepsDeHerd, entrada: EntradaCorregir): Promise<FichaAnimal> {
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
      return publicarAnimal(corregida.animal, marcas)
    },
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
      const animal = await deps.animales.obtener(ranchId, animalId, false)
      if (animal === null) {
        throw new RechazoDeHerd('no_encontrado')
      }

      const marca = crearMarca({
        id: entrada.marcaId,
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
      const anterior = await deps.animales.obtenerMarca(ranchId, animalId, entrada.marcaAnteriorId, true)
      if (anterior === null) {
        throw new RechazoDeHerd('no_encontrado')
      }
      if (entrada.marcaId === anterior.id) {
        throw new RechazoDeHerd('marca_ya_existe')
      }

      const cerrada = reemplazarMarca(anterior, entrada.cambiadaEl)
      const nueva = crearMarca({
        id: entrada.marcaId,
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
      const marca = await deps.animales.obtenerMarca(ranchId, animalId, entrada.marcaId, true)
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
  return {
    ...publicarAnimal(animal, marcas),
    correcciones: correcciones.map(publicarCorreccion),
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
