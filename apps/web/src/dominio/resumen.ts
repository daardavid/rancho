import type { CrecimientoDelHato, ResumenSemanal } from '@rancho/api-contracts'

import { ordenarCrecimiento } from './crecimiento'
import { categoria } from './etiquetas'
import { diaLegible, numeroLegible } from './fechas'
import { haceCuantosDias } from './observacion'
import { lecturaDeCrecimiento } from './revision'

/**
 * El texto que se manda por WhatsApp.
 *
 * Es corto y de renglón por dato, sin tablas: en WhatsApp una tabla ancha se
 * rompe. Nada de esto se inventa. Los conteos vienen del resumen de la semana y
 * lo que hay que revisar, de las mismas reglas que Inicio y Crecimiento
 * ([`revision.ts`](./revision.ts)): un animal va atrás solo por lo que dicen sus
 * propios pesos, sin meta del rancho.
 *
 * Lo que no se sabe se dice en su propia sección. Un cero no se escribe como si
 * fuera un dato: «1 nacimiento sin fecha» es distinto de «1 nacimiento».
 */

/** Cuántos animales se nombran en «Días sin verse» antes de resumir el resto. */
export const DIAS_SIN_VERSE_EN_EL_TEXTO = 5

/** Cuántos animales se nombran en «Van atrás» antes de resumir el resto. */
export const VAN_ATRAS_EN_EL_TEXTO = 5

/** Un animal que va atrás por sus propios pesos, ya en palabras. */
export type AnimalQueVaAtras = {
  readonly nombre: string
  readonly motivo: string
}

export function animalesQueVanAtras(
  crecimiento: CrecimientoDelHato | null,
): readonly AnimalQueVaAtras[] {
  if (crecimiento === null) {
    return []
  }
  return ordenarCrecimiento(crecimiento.animales)
    .filter((fila) => !fila.fueHuecoEnLaUltimaSesion)
    .map((fila) => ({ fila, lectura: lecturaDeCrecimiento(fila) }))
    .filter(({ lectura }) => lectura.lugar === 'revisar')
    .map(({ fila, lectura }) => ({
      nombre: fila.nombre ?? 'Sin nombre o seña',
      motivo: lectura.nota ?? lectura.valor,
    }))
}

export function textoDelResumen(
  datos: ResumenSemanal,
  crecimiento: CrecimientoDelHato | null,
): string {
  const lineas: string[] = [datos.rancho, `Del ${diaLegible(datos.desde)} al ${diaLegible(datos.hoy)}`]

  lineas.push('', activos(datos))
  lineas.push('', periodo(datos))
  lineas.push('', ultimaVuelta(crecimiento))
  lineas.push('', vanAtras(crecimiento))
  lineas.push('', diasSinVerse(datos))
  lineas.push('', loQueNoSeSabe(datos))

  return lineas.filter((linea, indice, todas) => !(linea === '' && todas[indice - 1] === '')).join('\n')
}

function activos(datos: ResumenSemanal): string {
  if (datos.activos.total === 0) {
    return 'Animales activos: ninguno.'
  }
  const porCategoria = datos.activos.porCategoria
    .map((fila) => `${categoria(fila.categoria)} ${String(fila.cantidad)}`)
    .join(' · ')
  return `Animales activos: ${String(datos.activos.total)}\n${porCategoria}`
}

function periodo(datos: ResumenSemanal): string {
  const salidas =
    datos.salidas.porMotivo.length === 0
      ? 'Salidas: ninguna.'
      : `Salidas: ${String(datos.salidas.total)} (${datos.salidas.porMotivo
          .map((fila) => `${motivoDeSalida(fila.motivo)} ${String(fila.cantidad)}`)
          .join(', ')})`
  const prenez =
    datos.prenez.porResultado.length === 0
      ? 'Diagnósticos de preñez: ninguno.'
      : `Diagnósticos de preñez: ${String(datos.prenez.total)} (${datos.prenez.porResultado
          .map((fila) => `${resultadoDePrenez(fila.resultado)} ${String(fila.cantidad)}`)
          .join(', ')})`
  const destetes =
    datos.destetes.total === 0 && datos.destetes.sinFecha === 0
      ? 'Destetes: ninguno.'
      : `Destetes: ${String(datos.destetes.total)}${
          datos.destetes.conPeso === 0 ? '' : `, ${String(datos.destetes.conPeso)} con peso`
        }`

  return [
    `Nacimientos: ${String(datos.nacimientos.total)}`,
    salidas,
    destetes,
    prenez,
  ].join('\n')
}

function ultimaVuelta(crecimiento: CrecimientoDelHato | null): string {
  if (crecimiento === null || crecimiento.fechaDeLaUltimaVuelta === null) {
    return 'Última vuelta de pesaje: todavía no hay.'
  }
  const ganancia =
    crecimiento.gananciaMediaKilosPorDia === null
      ? 'Ganancia media: sin dos pesos que comparar.'
      : `Ganancia media: ${conSigno(crecimiento.gananciaMediaKilosPorDia)} kg/día`
  return [
    `Última vuelta (${diaLegible(crecimiento.fechaDeLaUltimaVuelta)}): ${String(
      crecimiento.pesadosEnLaUltimaVuelta,
    )} de ${String(crecimiento.esperadosEnLaUltimaVuelta)} pesados`,
    ganancia,
  ].join('\n')
}

function vanAtras(crecimiento: CrecimientoDelHato | null): string {
  const atras = animalesQueVanAtras(crecimiento)
  if (crecimiento === null) {
    return 'Van atrás: no se pudieron traer los pesos.'
  }
  if (atras.length === 0) {
    return 'Van atrás: ninguno con sus propios pesos.'
  }
  const nombrados = atras.slice(0, VAN_ATRAS_EN_EL_TEXTO)
  const resto = atras.length - nombrados.length
  const lineas = nombrados.map((animal) => `· ${animal.nombre}: ${animal.motivo}`)
  if (resto > 0) {
    lineas.push(`· y ${String(resto)} ${resto === 1 ? 'más' : 'más'}`)
  }
  return ['Van atrás (por sus propios pesos):', ...lineas].join('\n')
}

function diasSinVerse(datos: ResumenSemanal): string {
  const lista = datos.revisar.porDiasSinVerse
  if (lista.length === 0) {
    return 'Días sin verse: nadie tiene una observación todavía.'
  }
  const nombrados = lista.slice(0, DIAS_SIN_VERSE_EN_EL_TEXTO)
  const resto = lista.length - nombrados.length
  const lineas = nombrados.map(
    (animal) => `· ${animal.nombre ?? 'Sin nombre o seña'}: ${haceCuantosDias(animal.dias)}`,
  )
  if (resto > 0) {
    lineas.push(`· y ${String(resto)} más`)
  }
  return ['Días sin verse (los que más llevan):', ...lineas].join('\n')
}

/**
 * Todo lo que falta, dicho. Si no falta nada, se dice eso y no se deja el
 * renglón vacío: el silencio también informa.
 */
export function frasesDeLoQueNoSeSabe(datos: ResumenSemanal): readonly string[] {
  const frases: string[] = []
  if (datos.nacimientos.sinFecha > 0) {
    frases.push(
      `${cantidad(datos.nacimientos.sinFecha, 'nacimiento sin fecha', 'nacimientos sin fecha')}. No ${
        datos.nacimientos.sinFecha === 1 ? 'entra' : 'entran'
      } en la cuenta del periodo.`,
    )
  }
  if (datos.destetes.sinFecha > 0) {
    frases.push(
      `${cantidad(datos.destetes.sinFecha, 'destete sin fecha', 'destetes sin fecha')}. No ${
        datos.destetes.sinFecha === 1 ? 'entra' : 'entran'
      } en la cuenta del periodo.`,
    )
  }
  if (datos.destetes.sinPeso > 0) {
    frases.push(
      `${cantidad(datos.destetes.sinPeso, 'destete sin peso', 'destetes sin peso')}. No se ${
        datos.destetes.sinPeso === 1 ? 'rellena' : 'rellenan'
      } con un peso inventado.`,
    )
  }
  if (datos.revisar.huecosDeLaUltimaVuelta > 0) {
    frases.push(
      `${cantidad(
        datos.revisar.huecosDeLaUltimaVuelta,
        'animal se esperaba en la última vuelta y no se pesó',
        'animales se esperaban en la última vuelta y no se pesaron',
      )}. No es una baja.`,
    )
  }
  if (datos.revisar.sinObservacion > 0) {
    frases.push(
      `${cantidad(
        datos.revisar.sinObservacion,
        'animal sin observación',
        'animales sin observación',
      )}.`,
    )
  }
  const sinCategoria = datos.activos.porCategoria.find((fila) => fila.categoria === 'unknown')
  if (sinCategoria !== undefined && sinCategoria.cantidad > 0) {
    frases.push(
      `${cantidad(sinCategoria.cantidad, 'animal sin categoría', 'animales sin categoría')}.`,
    )
  }
  return frases
}

function loQueNoSeSabe(datos: ResumenSemanal): string {
  const frases = frasesDeLoQueNoSeSabe(datos)
  if (frases.length === 0) {
    return 'Lo que no se sabe: no falta ningún dato en este resumen.'
  }
  return ['Lo que no se sabe:', ...frases.map((frase) => `· ${frase}`)].join('\n')
}

export function motivoDeSalida(motivo: string): string {
  switch (motivo) {
    case 'sale':
      return 'Venta'
    case 'death':
      return 'Muerte'
    case 'confirmed_missing':
      return 'Faltante confirmado'
    case 'other':
      return 'Otra'
    default:
      return 'No sé'
  }
}

export function resultadoDePrenez(resultado: string): string {
  switch (resultado) {
    case 'prenada':
      return 'Preñada'
    case 'vacia':
      return 'Vacía'
    default:
      return 'No sé'
  }
}

function cantidad(numero: number, singular: string, plural: string): string {
  return `${String(numero)} ${numero === 1 ? singular : plural}`
}

function conSigno(valor: string): string {
  const legible = numeroLegible(valor)
  return legible.startsWith('-') ? legible : `+${legible}`
}
