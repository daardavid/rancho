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

const MESES_DE_VUELTA = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
] as const

/**
 * `"2026-11-24"` → `"24 NOV"`, como el encabezado de la última vuelta.
 *
 * Se parte el texto, igual que `diaLegible`: la fecha de la vuelta es un día
 * del rancho, no un instante.
 */
export function diaDeVuelta(dia: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia)
  if (partes === null) {
    return dia
  }
  const mes = MESES_DE_VUELTA[Number(partes[2]) - 1]
  if (mes === undefined) {
    return dia
  }
  return `${Number(partes[3])} ${mes}`
}

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

/** `"2026-11-25"` → `"25 nov"`. Sin año: cabe en el renglón de la captura. */
export function diaCorto(dia: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia)
  if (partes === null) {
    return dia
  }
  const mes = MESES[Number(partes[2]) - 1]
  if (mes === undefined) {
    return dia
  }
  return `${Number(partes[3])} ${mes}`
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

/**
 * `"2026-11-24"` → `"Martes 24 de noviembre"`.
 *
 * Se arma el día en UTC a partir del texto, para que el selector del pesaje
 * diga el día del rancho y no el del día anterior por la zona del celular.
 */
export function fechaDelPesaje(dia: string): string {
  const partes = partesDeDia(dia)
  if (partes === null) {
    return dia
  }
  const fecha = new Date(Date.UTC(partes.anio, partes.mes - 1, partes.dia, 12))
  const texto = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(fecha)
    .replace(',', '')
  return texto.charAt(0).toLocaleUpperCase('es-MX') + texto.slice(1)
}

/**
 * Días de calendario entre dos fechas `YYYY-MM-DD`.
 *
 * Negativo si `hasta` es anterior. `null` si alguna no es un día. La cuenta es
 * de fechas civiles (medianoche UTC), no de un peso.
 */
/** Otro día civil, a `dias` de distancia. Negativo cuenta hacia atrás. */
export function diaMas(dia: string, dias: number): string {
  const partes = partesDeDia(dia)
  if (partes === null) {
    return dia
  }
  const fecha = new Date(Date.UTC(partes.anio, partes.mes - 1, partes.dia))
  fecha.setUTCDate(fecha.getUTCDate() + dias)
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  const numero = String(fecha.getUTCDate()).padStart(2, '0')
  return `${fecha.getUTCFullYear()}-${mes}-${numero}`
}

export function diasEntre(desde: string, hasta: string): number | null {
  const inicio = partesDeDia(desde)
  const fin = partesDeDia(hasta)
  if (inicio === null || fin === null) {
    return null
  }
  const msInicio = Date.UTC(inicio.anio, inicio.mes - 1, inicio.dia)
  const msFin = Date.UTC(fin.anio, fin.mes - 1, fin.dia)
  return Math.round((msFin - msInicio) / 86_400_000)
}

function partesDeDia(dia: string): { anio: number; mes: number; dia: number } | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia)
  if (partes === null) {
    return null
  }
  const anio = Number(partes[1])
  const mes = Number(partes[2])
  const numero = Number(partes[3])
  if (mes < 1 || mes > 12 || numero < 1 || numero > 31) {
    return null
  }
  return { anio, mes, dia: numero }
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
