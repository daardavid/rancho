/**
 * Los kilos como texto, de principio a fin.
 *
 * Un peso se captura como texto, viaja como texto y se guarda como texto. Aquí
 * no hay ningún `parseFloat` ni ningún `Number` sobre un peso: revisar, recortar
 * y rellenar decimales son operaciones sobre la cadena. La API vuelve a revisar
 * lo mismo con aritmética entera; esto solo evita que el dueño mande algo que
 * ya sabemos que va a ser rechazado, y le dice qué escribir.
 */

export type RevisionDeKilos =
  | { readonly ok: true }
  | { readonly ok: false; readonly motivo: string }

/** Dígitos, punto y hasta tres decimales. Ni coma, ni signo, ni notación científica. */
const PATRON_DE_KILOS = /^(\d+)(?:\.(\d{1,3}))?$/

/** Todo en ceros: tiene forma de peso y no es un peso anotable. */
const SOLO_CEROS = /^0+(?:\.0{1,3})?$/

export function revisarKilos(texto: string): RevisionDeKilos {
  const limpio = texto.trim()
  if (limpio === '') {
    return { ok: false, motivo: 'Escribe los kilos.' }
  }
  if (PATRON_DE_KILOS.exec(limpio) === null) {
    return {
      ok: false,
      motivo: 'Kilos con punto y hasta 3 decimales. Por ejemplo 351.5',
    }
  }
  if (SOLO_CEROS.exec(limpio) !== null) {
    return { ok: false, motivo: 'El peso tiene que ser mayor que cero.' }
  }
  return { ok: true }
}

/**
 * `"210.500"` → `210500`. Gramos enteros sacados de la cadena, sin `parseFloat`:
 * el texto es la forma autoritativa y aquí solo se reacomoda para dibujar.
 *
 * No sirve para guardar nada. Una coordenada de una gráfica es un píxel, no un
 * peso; el peso que se lee y se guarda sigue siendo el texto.
 */
export function gramosDe(kilos: string): number {
  const limpio = kilos.trim()
  const partes = PATRON_DE_KILOS.exec(limpio)
  if (partes === null) {
    return 0
  }
  const enteros = Number(partes[1] ?? '0')
  const decimales = Number((partes[2] ?? '').padEnd(3, '0'))
  return enteros * 1000 + decimales
}

/** Gramos enteros al texto de tres decimales que entiende `kilosLegibles`. */
export function textoDeGramos(gramos: number): string {
  const enteros = Math.trunc(gramos / 1000)
  const decimales = String(gramos % 1000).padStart(3, '0')
  return `${String(enteros)}.${decimales}`
}

/**
 * `"180.000"` → `"180"`. Para enseñar el peso en un campo que se va a editar,
 * sin los ceros que solo están porque la columna tiene tres decimales.
 */
export function kilosParaEditar(kilos: string): string {
  const limpio = kilos.trim()
  if (!limpio.includes('.')) {
    return limpio
  }
  return limpio.replace(/0+$/, '').replace(/\.$/, '')
}

/**
 * `"210.5"` → `"210.500"`. La misma forma de tres decimales que devuelve la API,
 * para comparar dos pesos como texto y no mandar una corrección que no cambia
 * nada. Si el texto no tiene forma de peso, se devuelve tal cual para que
 * `revisarKilos` lo rechace con su motivo.
 */
export function kilosNormales(texto: string): string {
  const limpio = texto.trim()
  const partes = PATRON_DE_KILOS.exec(limpio)
  if (partes === null) {
    return limpio
  }
  return `${partes[1] ?? ''}.${(partes[2] ?? '').padEnd(3, '0')}`
}

const GRAMOS_POR_KILO = 1000n

/**
 * Lo que se le enseña al dueño mientras escribe, comparado con el peso anterior.
 *
 * `gramos` es la diferencia exacta. `diferencia` y `porDia` son texto para la
 * tarjeta: no se guardan. Los kg/día se redondean a centésimas con aritmética
 * entera (mitad se aleja de cero), y no se calculan si el intervalo no tiene
 * días: no se divide entre cero.
 */
export type ComparacionDePeso = {
  readonly gramos: bigint
  readonly diferencia: string
  readonly porDia: string | null
}

/**
 * Diferencia contra el peso anterior, en gramos enteros.
 *
 * `"8.2" − "8.02"` son 180 gramos. Con `Number` esa resta da
 * `0.17999999999999972`, que no es 0.18 kg. Aquí los dos textos se parten en
 * enteros y decimales y se restan como `bigint`: el resultado no pasa por coma
 * flotante. `null` si alguno de los dos no es un peso mayor que cero.
 */
export function compararConElAnterior(
  actual: string,
  anterior: string,
  dias: number,
): ComparacionDePeso | null {
  const gramosActuales = gramosExactos(actual)
  const gramosAnteriores = gramosExactos(anterior)
  if (gramosActuales === null || gramosAnteriores === null) {
    return null
  }
  const gramos = gramosActuales - gramosAnteriores
  return {
    gramos,
    diferencia: textoDeDiferencia(gramos),
    porDia: porDiaDe(gramos, dias),
  }
}

/** Gramos enteros del texto, o `null` si no es un peso mayor que cero. */
function gramosExactos(kilos: string): bigint | null {
  const partes = PATRON_DE_KILOS.exec(kilos.trim())
  if (partes === null) {
    return null
  }
  const gramos = BigInt(partes[1] ?? '0') * GRAMOS_POR_KILO + BigInt((partes[2] ?? '').padEnd(3, '0'))
  if (gramos <= 0n) {
    return null
  }
  return gramos
}

function textoDeDiferencia(gramos: bigint): string {
  if (gramos === 0n) {
    return '0 kg'
  }
  const negativo = gramos < 0n
  return `${negativo ? '-' : '+'}${kilosDeGramos(negativo ? -gramos : gramos, 3)} kg`
}

/**
 * Kilos por día a centésimas, o `null` si no hay días que dividir.
 *
 * `round(gramos / (1000 × días) × 100)` = `round(gramos / (10 × días))`, hecho
 * con división entera. La mitad se aleja de cero, como el `round` de un
 * decimal.
 */
function porDiaDe(gramos: bigint, dias: number): string | null {
  if (!Number.isInteger(dias) || dias <= 0) {
    return null
  }
  const divisor = 10n * BigInt(dias)
  const negativo = gramos < 0n
  const absoluto = negativo ? -gramos : gramos
  const cociente = absoluto / divisor
  const resto = absoluto % divisor
  const redondeado = resto * 2n >= divisor ? cociente + 1n : cociente
  const centesimas = negativo ? -redondeado : redondeado
  const signo = centesimas < 0n ? '-' : ''
  const cuerpo = kilosDeGramos(centesimas < 0n ? -centesimas : centesimas, 2)
  return `${signo}${cuerpo} kg/día`
}

/** `180` gramos con 3 decimales → `"0.18"`. `33` centésimas con 2 → `"0.33"`. */
function kilosDeGramos(absoluto: bigint, decimales: 2 | 3): string {
  const escala = decimales === 3 ? 1000n : 100n
  const enteros = absoluto / escala
  const fraccion = (absoluto % escala).toString().padStart(decimales, '0')
  return `${enteros}.${fraccion}`.replace(/0+$/, '').replace(/\.$/, '')
}
