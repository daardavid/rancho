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
 * 1. se esperaba en la última vuelta y no se pesó (hueco, no baja);
 * 2. su último intervalo descansa en un peso que no se midió en la báscula;
 * 3. perdió kilos, o su ganancia por día bajó contra su propio intervalo
 *    anterior;
 * 4. todo lo demás va bien y se muestra la ganancia por día.
 *
 * El intervalo anterior no viene en el resumen del hato: llega como segundo
 * argumento el día que el contrato lo traiga (R-21). Sin él, la comparación
 * simplemente no se hace; no se sustituye por la media del hato ni por una meta.
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

  if (fila.ultimoPeso === null) {
    // Sin ningún peso no es un mal resultado: es un dato que falta.
    return { tono: 'sinDatos', texto: 'Sin pesajes' }
  }
  if (intervalo === null) {
    // Un solo peso: todavía no hay intervalo con qué comparar.
    return { tono: 'sinDatos', texto: 'Falta otro pesaje' }
  }
  if (fila.fueHuecoEnLaUltimaSesion) {
    return { tono: 'revisar', texto: 'No se pesó' }
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
