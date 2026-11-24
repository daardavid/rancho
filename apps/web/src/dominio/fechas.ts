/**
 * Cómo se leen una fecha, un instante y unos kilos en la pantalla.
 *
 * Nada de esto es el valor autoritativo: los kilos siguen siendo el texto que
 * guardó PostgreSQL y una fecha sigue siendo `YYYY-MM-DD`. Aquí solo se
 * recortan para que quepan en un renglón de celular.
 */

const ZONA_DEL_RANCHO = 'America/Mexico_City'

const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const

/**
 * `"2026-11-22"` → `"22 nov 2026"`.
 *
 * Se parte el texto en vez de construir un `Date`: un `Date` a medianoche UTC
 * se lee como el día anterior en Tabasco, y la fecha de un pesaje es un día del
 * rancho, no un instante.
 */
export function diaLegible(dia: string | null): string {
  if (dia === null) {
    return 'Sin fecha'
  }
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia)
  if (partes === null) {
    return dia
  }
  const mes = MESES[Number(partes[2]) - 1]
  if (mes === undefined) {
    return dia
  }
  return `${Number(partes[3])} ${mes} ${partes[1]}`
}

/** Un instante guardado (`ISO`) en la hora del rancho. */
export function instanteLegible(instante: string): string {
  const fecha = new Date(instante)
  if (Number.isNaN(fecha.getTime())) {
    return instante
  }
  const formato = new Intl.DateTimeFormat('es-MX', {
    timeZone: ZONA_DEL_RANCHO,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return formato.format(fecha)
}

/**
 * `"351.500"` → `"351.5"`. `"1200.000"` → `"1200"`.
 *
 * Es un recorte de texto: nunca se convierte a `number`, para no perder
 * exactitud ni cambiar el valor guardado.
 */
export function numeroLegible(valor: string): string {
  return valor.includes('.') ? valor.replace(/0+$/, '').replace(/\.$/, '') : valor
}

/** Un peso con su unidad. `null` es «no hay peso», no un cero. */
export function kilosLegibles(kilos: string | null): string {
  if (kilos === null) {
    return 'Sin peso'
  }
  return `${numeroLegible(kilos)} kg`
}

/**
 * El día de hoy en el rancho, como `"2026-11-22"`.
 *
 * Es el valor por omisión de la fecha de un pesaje. Se lee con la zona del
 * rancho y no con la del celular: un celular mal configurado no debe hacer que
 * el pesaje quede anotado en otro día. La fecha la puede cambiar el dueño en
 * cualquier momento; esto solo es el renglón que ya viene contestado
 * ([UX-06](../../../../../docs/product/ux-principles.md)).
 */
export function hoyEnElRancho(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_DEL_RANCHO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ahora)

  const valor = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((parte) => parte.type === tipo)?.value ?? ''

  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

/** Días: `0` es «hoy», `1` es «ayer». */
export function diasLegibles(dias: number | null): string {
  if (dias === null) {
    return ''
  }
  if (dias === 0) {
    return 'hoy'
  }
  if (dias === 1) {
    return 'ayer'
  }
  return `hace ${dias} días`
}
