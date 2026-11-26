import type { RecordedBy } from '../../../shared-kernel/actores'
import type { RanchId } from '../../../shared-kernel/ids'

import { diaDeCalendario } from './dia'
import { RechazoDeJournal } from './errores'
import { LARGO_MAXIMO_MOTIVO, LARGO_MAXIMO_TEXTO } from './valores'

/**
 * Pendiente que el dueño se pone a sí mismo. No es un aviso que la app
 * invente, ni un hecho del animal: marcarlo hecho no anota la vacuna.
 *
 * El sujeto es opcional y, si viene, es uno solo: un animal, un grupo de
 * animales o un potrero. No hay un tipo «grupo» en el hato: el grupo es la
 * lista que el dueño pegó a este pendiente. Un grupo de uno es un animal;
 * no se guarda con el otro nombre.
 *
 * El estado empieza en pendiente. Cambiarlo guarda quién y cuándo. Corregir
 * el texto, el día o el sujeto es otra cosa: lo anterior queda, con motivo.
 */

export const ESTADOS_DE_PENDIENTE = ['pendiente', 'hecho', 'ya_no_aplica'] as const
export type EstadoDePendiente = (typeof ESTADOS_DE_PENDIENTE)[number]

export function esEstadoDePendiente(valor: string): valor is EstadoDePendiente {
  return (ESTADOS_DE_PENDIENTE as readonly string[]).includes(valor)
}

export type SujetoDePendiente =
  | { readonly clase: 'ninguno' }
  | { readonly clase: 'animal'; readonly animalId: string }
  | { readonly clase: 'grupo'; readonly animalIds: readonly string[] }
  | { readonly clase: 'potrero'; readonly potreroId: string }

export type Pendiente = {
  readonly id: string
  readonly ranchId: RanchId
  readonly texto: string
  /** El día en que toca, no el día en que se anotó. */
  readonly fecha: string
  readonly estado: EstadoDePendiente
  readonly sujeto: SujetoDePendiente
  /** Quién dejó el estado como está. En el alta es quien lo anotó. */
  readonly estadoPor: RecordedBy
  readonly estadoEn: Date
  readonly version: number
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

export type RegistroDePendiente = {
  readonly id: string
  readonly ranchId: RanchId
  readonly texto: string
  readonly fecha: string
  readonly sujeto?: SujetoDePendiente
  readonly recordedBy: RecordedBy
  readonly recordedAt: Date
}

export const CAMPOS_DE_PENDIENTE = ['texto', 'fecha', 'sujeto'] as const
export type CampoDePendiente = (typeof CAMPOS_DE_PENDIENTE)[number]

export type CambiosDePendiente = {
  readonly texto?: string
  readonly fecha?: string
  readonly sujeto?: SujetoDePendiente
}

export type ValorAnteriorDePendiente = {
  readonly campo: CampoDePendiente
  readonly valorAnterior: string | null
}

export type PendienteCorregido = {
  readonly pendiente: Pendiente
  readonly anteriores: readonly ValorAnteriorDePendiente[]
  readonly motivo: string
}

export type PendienteConEstadoNuevo = {
  readonly pendiente: Pendiente
  readonly estadoAnterior: EstadoDePendiente
}

const VERSION_INICIAL = 1

/** Abre el pendiente en «pendiente». Nadie más lo marcó: quien lo anota es quien lo dejó así. */
export function abrirPendiente(entrada: RegistroDePendiente): Pendiente {
  return {
    id: entrada.id,
    ranchId: entrada.ranchId,
    texto: textoObligatorio(entrada.texto),
    fecha: diaDeCalendario(entrada.fecha),
    estado: 'pendiente',
    sujeto: sujetoDe(entrada.sujeto ?? { clase: 'ninguno' }),
    estadoPor: entrada.recordedBy,
    estadoEn: entrada.recordedAt,
    version: VERSION_INICIAL,
    recordedBy: entrada.recordedBy,
    recordedAt: entrada.recordedAt,
  }
}

/**
 * Cambia el estado. Es un hecho nuevo del pendiente, no una corrección del
 * texto: no pide motivo. Si ya estaba en ese estado, no se reescribe la hora.
 */
export function cambiarEstado(
  actual: Pendiente,
  estado: string,
  quien: RecordedBy,
  cuando: Date,
): PendienteConEstadoNuevo {
  const nuevo = estadoDe(estado)
  if (nuevo === actual.estado) {
    throw new RechazoDeJournal('estado_sin_cambio')
  }
  return {
    estadoAnterior: actual.estado,
    pendiente: {
      ...actual,
      estado: nuevo,
      estadoPor: quien,
      estadoEn: cuando,
      version: actual.version + 1,
    },
  }
}

/** Corrige texto, día o sujeto. El estado no se corrige por aquí. */
export function corregirPendiente(
  actual: Pendiente,
  cambios: CambiosDePendiente,
  motivo: string,
): PendienteCorregido {
  const motivoLimpio = motivoDe(motivo)
  const anteriores: ValorAnteriorDePendiente[] = []

  let texto = actual.texto
  if (cambios.texto !== undefined) {
    const nuevo = textoObligatorio(cambios.texto)
    if (nuevo !== actual.texto) {
      anteriores.push({ campo: 'texto', valorAnterior: actual.texto })
      texto = nuevo
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

  let sujeto = actual.sujeto
  if (cambios.sujeto !== undefined) {
    const nuevo = sujetoDe(cambios.sujeto)
    if (textoDeSujeto(nuevo) !== textoDeSujeto(actual.sujeto)) {
      anteriores.push({ campo: 'sujeto', valorAnterior: textoDeSujeto(actual.sujeto) })
      sujeto = nuevo
    }
  }

  if (anteriores.length === 0) {
    throw new RechazoDeJournal('correccion_vacia')
  }

  return {
    pendiente: { ...actual, texto, fecha, sujeto, version: actual.version + 1 },
    anteriores,
    motivo: motivoLimpio,
  }
}

/**
 * El sujeto, en una sola cadena, para la historia. `null` es «no era de
 * nadie». Los ids del grupo van ordenados para que el mismo grupo no parezca
 * otro por el orden en que se eligieron.
 */
export function textoDeSujeto(sujeto: SujetoDePendiente): string | null {
  switch (sujeto.clase) {
    case 'ninguno':
      return null
    case 'animal':
      return `animal:${sujeto.animalId}`
    case 'grupo':
      return `grupo:${[...sujeto.animalIds].sort().join(',')}`
    case 'potrero':
      return `potrero:${sujeto.potreroId}`
  }
}

export function sujetoDe(sujeto: SujetoDePendiente): SujetoDePendiente {
  switch (sujeto.clase) {
    case 'ninguno':
      return { clase: 'ninguno' }
    case 'animal':
      return { clase: 'animal', animalId: idObligatorio(sujeto.animalId) }
    case 'potrero':
      return { clase: 'potrero', potreroId: idObligatorio(sujeto.potreroId) }
    case 'grupo': {
      const ids = sujeto.animalIds.map((id) => idObligatorio(id))
      if (new Set(ids).size !== ids.length) {
        throw new RechazoDeJournal('animal_repetido_en_pendiente')
      }
      if (ids.length < 2) {
        throw new RechazoDeJournal('grupo_de_uno')
      }
      return { clase: 'grupo', animalIds: [...ids].sort() }
    }
  }
}

function estadoDe(valor: string): EstadoDePendiente {
  if (!esEstadoDePendiente(valor)) {
    throw new RechazoDeJournal('estado_invalido')
  }
  return valor
}

function motivoDe(motivo: string): string {
  const limpio = motivo.trim()
  if (limpio === '') {
    throw new RechazoDeJournal('motivo_vacio')
  }
  if (limpio.length > LARGO_MAXIMO_MOTIVO) {
    throw new RechazoDeJournal('texto_invalido')
  }
  return limpio
}

function textoObligatorio(valor: string): string {
  const limpio = valor.trim()
  if (limpio === '' || limpio.length > LARGO_MAXIMO_TEXTO) {
    throw new RechazoDeJournal('texto_invalido')
  }
  return limpio
}

function idObligatorio(valor: string): string {
  const limpio = valor.trim()
  if (limpio === '') {
    throw new RechazoDeJournal('texto_invalido')
  }
  return limpio
}
