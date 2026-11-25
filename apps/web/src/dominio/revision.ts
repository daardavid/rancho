import type { FilaDeCrecimiento, IntervaloDeCrecimiento } from '@rancho/api-contracts'

import { compararDecimales } from './crecimiento'
import { numeroLegible } from './fechas'

/**
 * La etiqueta de ganancia de una fila del hato: verde si va bien, ámbar si hay
 * que revisarlo, gris si todavía no hay con qué.
 *
 * La regla es la de «Revisar primero» ([INC-003](../../../../../docs/product/increments/INC-003-rediseno.md)):
 * no hay meta de ganancia del rancho y no se inventa una. Un animal se revisa
 * solo por lo que dicen sus propios datos:
 *
 * 1. se esperaba en la última vuelta y no se pesó (hueco, no baja). Manda
 *    sobre todo lo demás: también sobre «Sin pesajes» y «Falta otro pesaje»,
 * 2. su último intervalo descansa en un peso que no se midió en la báscula;
 * 3. perdió kilos, o su ganancia por día bajó contra su propio intervalo
 *    anterior;
 * 4. todo lo demás va bien y se muestra la ganancia por día.
 *
 * El intervalo anterior llega en la fila (`intervaloAnterior`) y quien llama
 * lo pasa como segundo argumento. Sin él, la comparación simplemente no se
 * hace; no se sustituye por la media del hato ni por una meta. No hay un número
 * fijo de kilos por día a partir del cual «haya que revisar».
 *
 * Los tonos son los tres de `Etiqueta`: verde, ámbar y gris. El color nunca va
 * solo: el texto siempre dice qué pasa.
 */

export type TonoDeGanancia = 'bien' | 'revisar' | 'sinDatos'

export type EtiquetaDeGanancia = {
  readonly tono: TonoDeGanancia
  readonly texto: string
}

export function etiquetaDeGanancia(
  fila: FilaDeCrecimiento,
  intervaloPrevio: IntervaloDeCrecimiento | null = null,
): EtiquetaDeGanancia {
  const intervalo = fila.ultimoIntervalo

  // Ser hueco manda sobre cualquier otra lectura: el animal se esperaba en la
  // última vuelta y no se pesó, y eso es lo primero que el dueño debe ver, tenga
  // los pesos previos que tenga (incluso ninguno). Es un hueco, no una baja y no
  // un dato que falta.
  if (fila.fueHuecoEnLaUltimaSesion) {
    return { tono: 'revisar', texto: 'No se pesó' }
  }
  if (fila.ultimoPeso === null) {
    // Sin ningún peso no es un mal resultado: es un dato que falta.
    return { tono: 'sinDatos', texto: 'Sin pesajes' }
  }
  if (intervalo === null) {
    // Un solo peso: todavía no hay intervalo con qué comparar.
    return { tono: 'sinDatos', texto: 'Falta otro pesaje' }
  }
  if (intervalo.incluyeCalidadNoMedida) {
    return { tono: 'revisar', texto: 'Revisar' }
  }
  if (vaAtras(intervalo, intervaloPrevio)) {
    return { tono: 'revisar', texto: 'Revisar' }
  }
  return { tono: 'bien', texto: textoDeGanancia(intervalo) }
}

/**
 * Si el animal quedó atrás. Un intervalo que pierde kilos nunca es «va bien»,
 * aunque todavía no haya con qué compararlo. La comparación con el intervalo
 * anterior solo se hace cuando los dos tienen kilos por día: si a alguno le
 * faltan (dos pesajes el mismo día), no se afirma que bajó.
 */
function vaAtras(
  intervalo: IntervaloDeCrecimiento,
  intervaloPrevio: IntervaloDeCrecimiento | null,
): boolean {
  if (compararDecimales(intervalo.kilosGanados, '0.000') < 0) {
    return true
  }
  if (intervaloPrevio === null) {
    return false
  }
  const ahora = intervalo.kilosPorDia
  const antes = intervaloPrevio.kilosPorDia
  if (ahora === null || antes === null) {
    return false
  }
  return compararDecimales(ahora, antes) < 0
}

/** `"+0.92 kg/día"`, o los kilos del intervalo cuando no hay días que dividir. */
function textoDeGanancia(intervalo: IntervaloDeCrecimiento): string {
  if (intervalo.kilosPorDia !== null) {
    return `${conSigno(intervalo.kilosPorDia)} kg/día`
  }
  return `${conSigno(intervalo.kilosGanados)} kg`
}

/** El signo se escribe para que una ganancia no se lea como un peso suelto. */
function conSigno(valor: string): string {
  const legible = numeroLegible(valor)
  return legible.startsWith('-') ? legible : `+${legible}`
}

export type LugarEnCrecimiento = 'revisar' | 'bien'

/**
 * Cómo se pinta un animal en Crecimiento.
 *
 * El lugar sale de la misma regla que la etiqueta del hato. El texto del motivo
 * es el de la pantalla: «No se pesó», «Peso no medido» o «Bajó de X a Y kg/día
 * respecto a la vuelta anterior». Quien perdió kilos y no tiene un intervalo
 * anterior con qué citar la baja sigue en «Revisar primero»: en el hato ya se
 * lee como revisar, y no es una meta.
 */
export type LecturaDeCrecimiento = {
  readonly lugar: LugarEnCrecimiento
  readonly valor: string
  readonly nota: string | null
  /** Kilos por día para la barra. `null` en un hueco o en un intervalo sin días. */
  readonly kilosPorDia: string | null
  readonly tono: TonoDeGanancia
}

export function lecturaDeCrecimiento(fila: FilaDeCrecimiento): LecturaDeCrecimiento {
  const etiqueta = etiquetaDeGanancia(fila, fila.intervaloAnterior)
  const intervalo = fila.ultimoIntervalo

  if (fila.fueHuecoEnLaUltimaSesion) {
    return {
      lugar: 'revisar',
      valor: 'No se pesó',
      nota: null,
      kilosPorDia: null,
      tono: 'revisar',
    }
  }

  if (etiqueta.tono === 'sinDatos' || intervalo === null) {
    return {
      lugar: 'bien',
      valor: etiqueta.texto,
      nota: null,
      kilosPorDia: null,
      tono: 'sinDatos',
    }
  }

  const valor = textoDelIntervalo(intervalo)
  if (intervalo.incluyeCalidadNoMedida) {
    return {
      lugar: 'revisar',
      valor,
      nota: 'Peso no medido',
      kilosPorDia: intervalo.kilosPorDia,
      tono: 'revisar',
    }
  }

  if (etiqueta.tono === 'revisar') {
    return {
      lugar: 'revisar',
      valor,
      nota: motivoDeBaja(intervalo, fila.intervaloAnterior),
      kilosPorDia: intervalo.kilosPorDia,
      tono: 'revisar',
    }
  }

  return {
    lugar: 'bien',
    valor,
    nota: null,
    kilosPorDia: intervalo.kilosPorDia,
    tono: 'bien',
  }
}

/** `0.33 kg/día`, o los kilos del intervalo cuando no hay días que dividir. */
function textoDelIntervalo(intervalo: IntervaloDeCrecimiento): string {
  if (intervalo.kilosPorDia !== null) {
    return `${numeroLegible(intervalo.kilosPorDia)} kg/día`
  }
  return `${numeroLegible(intervalo.kilosGanados)} kg`
}

function motivoDeBaja(
  intervalo: IntervaloDeCrecimiento,
  previo: IntervaloDeCrecimiento | null,
): string {
  const ahora = intervalo.kilosPorDia
  const antes = previo?.kilosPorDia ?? null
  if (ahora !== null && antes !== null && compararDecimales(ahora, antes) < 0) {
    return `Bajó de ${numeroLegible(antes)} a ${numeroLegible(ahora)} kg/día respecto a la vuelta anterior`
  }
  return 'Perdió kilos en el último intervalo'
}
