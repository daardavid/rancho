import type { RecordedBy } from '../../../shared-kernel/actores'
import type { AnimalId, RanchId } from '../../../shared-kernel/ids'

import { diaDeCalendario } from './dia'
import { RechazoDeHerd } from './errores'
import { LARGO_MAXIMO_NOMBRE, LARGO_MAXIMO_NOTA } from './valores'

/**
 * Una nota de sanidad: la vacuna, el medicamento, el baño o el problema que se
 * anotó para un animal, con el día en que se hizo o se vio.
 *
 * Es un registro hermano de la ficha, no una columna de `Animal`
 * ([domain-boundaries](../../../../../../docs/architecture/domain-boundaries.md),
 * «Health, inside Herd»). Existe para que la memoria de los trabajadores no sea
 * el único archivo (`CAP-HEALTH-001`). No crea calendario, dosis, retiro ni
 * flujo de veterinario (`OQ-HEALTH-001`): nada de eso se guarda aquí.
 *
 * Una nota a un grupo es una nota por animal, escritas en la misma captura:
 * no hay un tipo «grupo» en Herd. Cada animal tiene su renglón y se corrige
 * por separado, igual que una asignación de lugar a varios animales.
 *
 * `vioAlAnimal` es explícito y por omisión es falso: una nota de sanidad no es
 * una observación salvo que diga que el animal se vio. Así la proyección de la
 * última observación no convierte cualquier nota en un avistamiento
 * (`TGT-SEC-001`).
 */

export const TIPOS_DE_NOTA_DE_SALUD = ['vacuna', 'medicamento', 'bano', 'problema', 'otro'] as const
export type TipoDeNotaDeSalud = (typeof TIPOS_DE_NOTA_DE_SALUD)[number]

export function esTipoDeNotaDeSalud(valor: string): valor is TipoDeNotaDeSalud {
  return (TIPOS_DE_NOTA_DE_SALUD as readonly string[]).includes(valor)
}

export type NotaDeSalud = {
  readonly id: string
  readonly ranchId: RanchId
  readonly animalId: AnimalId
  readonly tipo: TipoDeNotaDeSalud
  /** Qué se hizo o se vio, en palabras del rancho. */
  readonly detalle: string
  /** El día en que se hizo o se vio, no el día en que se anotó. */
  readonly fecha: string
  /** El producto, si se sabe. `null` es «no se anotó». */
  readonly producto: string | null
  /** Foto del frasco, del animal o de lo que se vio. `null` es sin foto. */
  readonly evidenciaId: string | null
  /** La nota dice que el animal se vio. Por omisión, no lo dice. */
  readonly vioAlAnimal: boolean
  readonly version: number
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

export type RegistroDeNotaDeSalud = {
  readonly id: string
  readonly ranchId: RanchId
  readonly animalId: AnimalId
  readonly tipo: TipoDeNotaDeSalud
  readonly detalle: string
  readonly fecha: string
  readonly producto?: string | null
  readonly evidenciaId?: string | null
  readonly vioAlAnimal?: boolean
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

/** Campos que una corrección puede cambiar. El animal no: la nota es de ese animal. */
export const CAMPOS_DE_NOTA = [
  'tipo',
  'detalle',
  'fecha',
  'producto',
  'evidencia',
  'vioAlAnimal',
] as const
export type CampoDeNota = (typeof CAMPOS_DE_NOTA)[number]

/** Cada clave presente es un cambio. `null` borra el producto o la foto. */
export type CambiosDeNota = {
  readonly tipo?: TipoDeNotaDeSalud
  readonly detalle?: string
  readonly fecha?: string
  readonly producto?: string | null
  readonly evidenciaId?: string | null
  readonly vioAlAnimal?: boolean
}

/**
 * El valor que estaba, como texto, para que la historia se lea sin adivinar.
 * `null` es «no había»: ni producto ni foto.
 */
export type ValorAnteriorDeNota = {
  readonly campo: CampoDeNota
  readonly valorAnterior: string | null
}

export type NotaCorregida = {
  readonly nota: NotaDeSalud
  readonly anteriores: readonly ValorAnteriorDeNota[]
  readonly motivo: string
}

const VERSION_INICIAL = 1

/** Abre la nota. El tipo y qué se hizo o se vio son obligatorios. */
export function abrirNotaDeSalud(entrada: RegistroDeNotaDeSalud): NotaDeSalud {
  return {
    id: entrada.id,
    ranchId: entrada.ranchId,
    animalId: entrada.animalId,
    tipo: tipoDe(entrada.tipo),
    detalle: textoObligatorio(entrada.detalle, LARGO_MAXIMO_NOTA),
    fecha: diaDeCalendario(entrada.fecha),
    producto: textoOpcional(entrada.producto, LARGO_MAXIMO_NOMBRE),
    evidenciaId: fotoDe(entrada.evidenciaId),
    vioAlAnimal: entrada.vioAlAnimal === true,
    version: VERSION_INICIAL,
    recordedBy: entrada.recordedBy,
    recordedAt: entrada.recordedAt,
  }
}

/**
 * Corrige la nota que ya está. La anterior queda en la historia con quién,
 * cuándo y por qué; si nada cambió, no hay corrección. No toca la identidad ni
 * la tenencia: el animal de la nota se queda.
 */
export function corregirNotaDeSalud(
  actual: NotaDeSalud,
  cambios: CambiosDeNota,
  motivo: string,
): NotaCorregida {
  const motivoLimpio = motivoDe(motivo)
  const anteriores: ValorAnteriorDeNota[] = []

  let tipo = actual.tipo
  if (cambios.tipo !== undefined && cambios.tipo !== actual.tipo) {
    anteriores.push({ campo: 'tipo', valorAnterior: actual.tipo })
    tipo = tipoDe(cambios.tipo)
  }

  let detalle = actual.detalle
  if (cambios.detalle !== undefined) {
    const nuevo = textoObligatorio(cambios.detalle, LARGO_MAXIMO_NOTA)
    if (nuevo !== actual.detalle) {
      anteriores.push({ campo: 'detalle', valorAnterior: actual.detalle })
      detalle = nuevo
    }
  }

  let fecha = actual.fecha
  if (cambios.fecha !== undefined) {
    const nueva = diaDeCalendario(cambios.fecha)
    if (nueva !== actual.fecha) {
      anteriores.push({ campo: 'fecha', valorAnterior: actual.fecha })
      fecha = nueva
    }
  }

  let producto = actual.producto
  if (cambios.producto !== undefined) {
    const nuevo = textoOpcional(cambios.producto, LARGO_MAXIMO_NOMBRE)
    if (nuevo !== actual.producto) {
      anteriores.push({ campo: 'producto', valorAnterior: actual.producto })
      producto = nuevo
    }
  }

  let evidenciaId = actual.evidenciaId
  if (cambios.evidenciaId !== undefined) {
    const nueva = fotoDe(cambios.evidenciaId)
    if (nueva !== actual.evidenciaId) {
      anteriores.push({ campo: 'evidencia', valorAnterior: actual.evidenciaId })
      evidenciaId = nueva
    }
  }

  let vioAlAnimal = actual.vioAlAnimal
  if (cambios.vioAlAnimal !== undefined && cambios.vioAlAnimal !== actual.vioAlAnimal) {
    anteriores.push({ campo: 'vioAlAnimal', valorAnterior: actual.vioAlAnimal ? 'si' : 'no' })
    vioAlAnimal = cambios.vioAlAnimal
  }

  if (anteriores.length === 0) {
    throw new RechazoDeHerd('correccion_vacia')
  }

  return {
    nota: {
      ...actual,
      tipo,
      detalle,
      fecha,
      producto,
      evidenciaId,
      vioAlAnimal,
      version: actual.version + 1,
    },
    anteriores,
    motivo: motivoLimpio,
  }
}

function tipoDe(valor: string): TipoDeNotaDeSalud {
  if (!esTipoDeNotaDeSalud(valor)) {
    throw new RechazoDeHerd('tipo_invalido')
  }
  return valor
}

function motivoDe(motivo: string): string {
  const limpio = motivo.trim()
  if (limpio === '') {
    throw new RechazoDeHerd('motivo_vacio')
  }
  if (limpio.length > LARGO_MAXIMO_NOTA) {
    throw new RechazoDeHerd('texto_invalido')
  }
  return limpio
}

function textoObligatorio(valor: string, maximo: number): string {
  const limpio = valor.trim()
  if (limpio === '' || limpio.length > maximo) {
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

/** Sin foto es `null`; un texto vacío no es una foto y se rechaza. */
function fotoDe(valor: string | null | undefined): string | null {
  if (valor === undefined || valor === null) {
    return null
  }
  const limpio = valor.trim()
  if (limpio === '') {
    throw new RechazoDeHerd('texto_invalido')
  }
  return limpio
}
