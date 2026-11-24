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
