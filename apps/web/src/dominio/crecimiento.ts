import type { FilaDeCrecimiento } from '@rancho/api-contracts'

/**
 * El orden de la tabla de crecimiento.
 *
 * Lo que el dueño necesita ver primero es a quién le está yendo mal, no a quién
 * le va bien: primero los que no se pesaron en la última vuelta, después la
 * menor ganancia por día, y al final los que todavía no tienen con qué
 * compararse. El animal sin ningún peso va al final: no es un mal resultado, es
 * un dato que falta.
 *
 * La comparación de kilos es de texto, no de `number`: un peso no se convierte a
 * coma flotante ni para ordenar. Se compara el signo, el largo de la parte entera
 * y, si hace falta, los dígitos.
 */
export function ordenarCrecimiento(
  filas: readonly FilaDeCrecimiento[],
): readonly FilaDeCrecimiento[] {
  return [...filas].sort((a, b) => {
    const porHueco = Number(b.fueHuecoEnLaUltimaSesion) - Number(a.fueHuecoEnLaUltimaSesion)
    if (porHueco !== 0) {
      return porHueco
    }

    const gananciaA = gananciaComparable(a)
    const gananciaB = gananciaComparable(b)
    if (gananciaA === null && gananciaB !== null) {
      return 1
    }
    if (gananciaA !== null && gananciaB === null) {
      return -1
    }
    if (gananciaA !== null && gananciaB !== null) {
      const porGanancia = compararDecimales(gananciaA, gananciaB)
      if (porGanancia !== 0) {
        return porGanancia
      }
    }

    return a.animalId < b.animalId ? -1 : a.animalId > b.animalId ? 1 : 0
  })
}

/**
 * La ganancia con la que se ordena: kilos por día si el intervalo tiene días, y
 * si no (dos pesajes el mismo día) los kilos ganados. `null` es «no hay con qué
 * comparar».
 */
function gananciaComparable(fila: FilaDeCrecimiento): string | null {
  const intervalo = fila.ultimoIntervalo
  if (intervalo === null) {
    return null
  }
  return intervalo.kilosPorDia ?? intervalo.kilosGanados
}

/**
 * Compara dos decimales escritos como texto (`"-14.500"`, `"1.969"`).
 *
 * No pasa por `Number`: se compara el signo, el largo de la parte entera y luego
 * los dígitos. Devuelve negativo si `a` es menor, positivo si es mayor y 0 si
 * son el mismo número escrito distinto.
 */
export function compararDecimales(a: string, b: string): number {
  const signoA = a.trim().startsWith('-') ? -1 : 1
  const signoB = b.trim().startsWith('-') ? -1 : 1
  if (signoA !== signoB) {
    return signoA - signoB
  }

  const absoluto = compararAbsolutos(a.trim().replace(/^-/, ''), b.trim().replace(/^-/, ''))
  return signoA === -1 ? -absoluto : absoluto
}

function compararAbsolutos(a: string, b: string): number {
  const [enteraA = '0', decimalA = ''] = a.split('.')
  const [enteraB = '0', decimalB = ''] = b.split('.')

  const enteraLimpiaA = enteraA.replace(/^0+(?=\d)/, '')
  const enteraLimpiaB = enteraB.replace(/^0+(?=\d)/, '')

  if (enteraLimpiaA.length !== enteraLimpiaB.length) {
    return enteraLimpiaA.length < enteraLimpiaB.length ? -1 : 1
  }
  if (enteraLimpiaA !== enteraLimpiaB) {
    return enteraLimpiaA < enteraLimpiaB ? -1 : 1
  }

  // Las partes decimales se rellenan a la derecha: "5" y "500" son lo mismo.
  const largo = Math.max(decimalA.length, decimalB.length)
  const decimalRellenoA = decimalA.padEnd(largo, '0')
  const decimalRellenoB = decimalB.padEnd(largo, '0')
  if (decimalRellenoA === decimalRellenoB) {
    return 0
  }
  return decimalRellenoA < decimalRellenoB ? -1 : 1
}
