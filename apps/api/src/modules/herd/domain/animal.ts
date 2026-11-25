import type { RecordedBy } from '../../../shared-kernel/actores'
import type { AnimalId, RanchId } from '../../../shared-kernel/ids'

import { RechazoDeHerd } from './errores'
import type { Salida } from './salida'
import {
  LARGO_MAXIMO_MOTIVO,
  LARGO_MAXIMO_NOMBRE,
  LARGO_MAXIMO_NOTA,
  type CampoDeFicha,
  type Categoria,
  type ParticipacionEconomica,
  type Sexo,
  type Tenencia,
} from './valores'

/**
 * La ficha vigente. Las marcas no van aquí: son registros hermanos.
 *
 * No hay porcentaje ni parte calculada. La tenencia y la participación se
 * guardan por separado; cualquiera de las dos puede ser desconocida. `activo`
 * nace en verdadero y `salida` en vacío. La salida es otro comando: esta
 * corrección de ficha no la toca.
 */
export type Animal = {
  readonly id: AnimalId
  readonly ranchId: RanchId
  readonly nombre: string | null
  readonly sexo: Sexo
  readonly categoria: Categoria
  readonly detalleCategoria: string | null
  readonly tenencia: Tenencia
  readonly participacionEconomica: ParticipacionEconomica
  readonly notaDelArreglo: string | null
  readonly nota: string | null
  readonly activo: boolean
  /**
   * La salida vigente. Vacía si sigue activo. No guarda precio ni reposición.
   * Una corrección anterior vive en la historia, no aquí.
   */
  readonly salida: Salida | null
  readonly version: number
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

export type RegistroDeAnimal = {
  readonly id: AnimalId
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
  readonly nombre?: string
  readonly sexo?: Sexo
  readonly categoria?: Categoria
  readonly detalleCategoria?: string
  readonly tenencia?: Tenencia
  readonly participacionEconomica?: ParticipacionEconomica
  readonly notaDelArreglo?: string
  readonly nota?: string
}

/** Cada clave presente es un cambio. `null` borra el texto. Omitir es no tocarlo. */
export type CambiosDeFicha = {
  readonly nombre?: string | null
  readonly sexo?: Sexo
  readonly categoria?: Categoria
  readonly detalleCategoria?: string | null
  readonly tenencia?: Tenencia
  readonly participacionEconomica?: ParticipacionEconomica
  readonly notaDelArreglo?: string | null
  readonly nota?: string | null
}

export type ValorAnterior = {
  readonly campo: CampoDeFicha
  readonly valorAnterior: string | null
}

export type FichaCorregida = {
  readonly animal: Animal
  readonly anteriores: readonly ValorAnterior[]
  readonly motivo: string
}

const VERSION_INICIAL = 1

/**
 * Abre la ficha. Lo único obligatorio ya llegó en el id: todo lo demás puede
 * quedar desconocido.
 */
export function registrarAnimal(entrada: RegistroDeAnimal): Animal {
  const categoria = entrada.categoria ?? 'unknown'
  const detalleCategoria = textoOpcional(entrada.detalleCategoria, LARGO_MAXIMO_NOMBRE)
  if (detalleCategoria !== null && categoria !== 'other') {
    throw new RechazoDeHerd('categoria_incoherente')
  }

  return {
    id: entrada.id,
    ranchId: entrada.ranchId,
    nombre: textoOpcional(entrada.nombre, LARGO_MAXIMO_NOMBRE),
    sexo: entrada.sexo ?? 'unknown',
    categoria,
    detalleCategoria,
    tenencia: entrada.tenencia ?? 'unknown',
    participacionEconomica: entrada.participacionEconomica ?? 'unknown',
    notaDelArreglo: textoOpcional(entrada.notaDelArreglo, LARGO_MAXIMO_NOTA),
    nota: textoOpcional(entrada.nota, LARGO_MAXIMO_NOTA),
    activo: true,
    salida: null,
    version: VERSION_INICIAL,
    recordedBy: entrada.recordedBy,
    recordedAt: entrada.recordedAt,
  }
}

/**
 * Corrige la ficha que ya está. El id no se toca: un dato equivocado no es
 * otro animal. Solo entran a la historia los campos que de verdad cambian.
 * Si la categoría deja de ser `other`, el texto libre se vacía con ella.
 */
export function corregirFicha(animal: Animal, cambios: CambiosDeFicha, motivo: string): FichaCorregida {
  const motivoLimpio = motivoDe(motivo)
  const pedidos = normalizarCambios(cambios)
  const categoriaResultante = pedidos.categoria ?? animal.categoria

  if (
    pedidos.detalleCategoria !== undefined &&
    pedidos.detalleCategoria !== null &&
    categoriaResultante !== 'other'
  ) {
    throw new RechazoDeHerd('categoria_incoherente')
  }

  let siguiente = animal
  const anteriores: ValorAnterior[] = []

  const cambiar = (campo: CampoDeFicha, valor: string | null): void => {
    if (leer(siguiente, campo) === valor) {
      return
    }
    anteriores.push({ campo, valorAnterior: leer(animal, campo) })
    siguiente = escribir(siguiente, campo, valor)
  }

  if (pedidos.nombre !== undefined) {
    cambiar('nombre', pedidos.nombre)
  }
  if (pedidos.sexo !== undefined) {
    cambiar('sexo', pedidos.sexo)
  }
  if (pedidos.categoria !== undefined) {
    cambiar('categoria', pedidos.categoria)
  }
  if (pedidos.tenencia !== undefined) {
    cambiar('tenencia', pedidos.tenencia)
  }
  if (pedidos.participacionEconomica !== undefined) {
    cambiar('participacionEconomica', pedidos.participacionEconomica)
  }
  if (pedidos.notaDelArreglo !== undefined) {
    cambiar('notaDelArreglo', pedidos.notaDelArreglo)
  }
  if (pedidos.nota !== undefined) {
    cambiar('nota', pedidos.nota)
  }
  if (pedidos.detalleCategoria !== undefined) {
    cambiar('detalleCategoria', pedidos.detalleCategoria)
  }
  if (siguiente.categoria !== 'other' && siguiente.detalleCategoria !== null) {
    cambiar('detalleCategoria', null)
  }

  if (anteriores.length === 0) {
    throw new RechazoDeHerd('correccion_vacia')
  }

  return {
    animal: {
      ...siguiente,
      id: animal.id,
      ranchId: animal.ranchId,
      activo: animal.activo,
      salida: animal.salida,
      recordedBy: animal.recordedBy,
      recordedAt: animal.recordedAt,
      version: animal.version + 1,
    },
    anteriores,
    motivo: motivoLimpio,
  }
}

function normalizarCambios(cambios: CambiosDeFicha): CambiosDeFicha {
  const pedidos: {
    -readonly [K in keyof CambiosDeFicha]?: CambiosDeFicha[K]
  } = {}

  if ('nombre' in cambios && cambios.nombre !== undefined) {
    pedidos.nombre = textoOpcional(cambios.nombre, LARGO_MAXIMO_NOMBRE)
  }
  if ('sexo' in cambios && cambios.sexo !== undefined) {
    pedidos.sexo = cambios.sexo
  }
  if ('categoria' in cambios && cambios.categoria !== undefined) {
    pedidos.categoria = cambios.categoria
  }
  if ('detalleCategoria' in cambios && cambios.detalleCategoria !== undefined) {
    pedidos.detalleCategoria = textoOpcional(cambios.detalleCategoria, LARGO_MAXIMO_NOMBRE)
  }
  if ('tenencia' in cambios && cambios.tenencia !== undefined) {
    pedidos.tenencia = cambios.tenencia
  }
  if ('participacionEconomica' in cambios && cambios.participacionEconomica !== undefined) {
    pedidos.participacionEconomica = cambios.participacionEconomica
  }
  if ('notaDelArreglo' in cambios && cambios.notaDelArreglo !== undefined) {
    pedidos.notaDelArreglo = textoOpcional(cambios.notaDelArreglo, LARGO_MAXIMO_NOTA)
  }
  if ('nota' in cambios && cambios.nota !== undefined) {
    pedidos.nota = textoOpcional(cambios.nota, LARGO_MAXIMO_NOTA)
  }

  return pedidos
}

function motivoDe(motivo: string): string {
  const limpio = motivo.trim()
  if (limpio === '') {
    throw new RechazoDeHerd('motivo_vacio')
  }
  if (limpio.length > LARGO_MAXIMO_MOTIVO) {
    throw new RechazoDeHerd('texto_invalido')
  }
  return limpio
}

function textoOpcional(valor: string | null | undefined, maximo: number): string | null {
  if (valor === undefined || valor === null) {
    return null
  }
  const limpio = valor.trim()
  if (limpio === '' || limpio.length > maximo) {
    throw new RechazoDeHerd('texto_invalido')
  }
  return limpio
}

function leer(animal: Animal, campo: CampoDeFicha): string | null {
  switch (campo) {
    case 'nombre':
      return animal.nombre
    case 'sexo':
      return animal.sexo
    case 'categoria':
      return animal.categoria
    case 'detalleCategoria':
      return animal.detalleCategoria
    case 'tenencia':
      return animal.tenencia
    case 'participacionEconomica':
      return animal.participacionEconomica
    case 'notaDelArreglo':
      return animal.notaDelArreglo
    case 'nota':
      return animal.nota
  }
}

function escribir(animal: Animal, campo: CampoDeFicha, valor: string | null): Animal {
  switch (campo) {
    case 'nombre':
      return { ...animal, nombre: valor }
    case 'sexo':
      return { ...animal, sexo: exigirSexo(valor) }
    case 'categoria':
      return { ...animal, categoria: exigirCategoria(valor) }
    case 'detalleCategoria':
      return { ...animal, detalleCategoria: valor }
    case 'tenencia':
      return { ...animal, tenencia: exigirTenencia(valor) }
    case 'participacionEconomica':
      return { ...animal, participacionEconomica: exigirParticipacion(valor) }
    case 'notaDelArreglo':
      return { ...animal, notaDelArreglo: valor }
    case 'nota':
      return { ...animal, nota: valor }
  }
}

function exigirSexo(valor: string | null): Sexo {
  if (valor === 'female' || valor === 'male' || valor === 'unknown') {
    return valor
  }
  throw new RechazoDeHerd('texto_invalido')
}

function exigirCategoria(valor: string | null): Categoria {
  if (
    valor === 'calf' ||
    valor === 'cow' ||
    valor === 'bull' ||
    valor === 'other' ||
    valor === 'unknown'
  ) {
    return valor
  }
  throw new RechazoDeHerd('texto_invalido')
}

function exigirTenencia(valor: string | null): Tenencia {
  if (valor === 'ranch' || valor === 'a_la_parte' || valor === 'third_party' || valor === 'unknown') {
    return valor
  }
  throw new RechazoDeHerd('texto_invalido')
}

function exigirParticipacion(valor: string | null): ParticipacionEconomica {
  if (valor === 'known' || valor === 'partially_known' || valor === 'unknown') {
    return valor
  }
  throw new RechazoDeHerd('texto_invalido')
}
