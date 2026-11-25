/**
 * Contra qué peso se compara una captura, según la fecha de la sesión.
 *
 * El anterior es el último peso con fecha estrictamente anterior. El mismo día
 * no es «antes»: no se resta contra él. El posterior, si hay, es el más cercano
 * después de esa fecha y se enseña como dato, nunca como una pérdida.
 *
 * Si dos pesos caen el mismo día, manda el último del arreglo. Quien llama pasa
 * la serie en orden de fecha y, en empate, de cuándo se registró.
 */

export type PesoFechado = {
  readonly fecha: string
  readonly kilos: string
}

export type ReferenciaDePeso = {
  readonly anterior: PesoFechado | null
  readonly posterior: PesoFechado | null
}

const DIA = /^\d{4}-\d{2}-\d{2}$/

export function referenciaDePeso(
  pesos: readonly PesoFechado[],
  fecha: string,
): ReferenciaDePeso {
  if (!DIA.test(fecha)) {
    return { anterior: null, posterior: null }
  }

  let anterior: PesoFechado | null = null
  let posterior: PesoFechado | null = null

  for (const peso of pesos) {
    if (!DIA.test(peso.fecha)) {
      continue
    }
    if (peso.fecha < fecha) {
      // La fecha mayor gana. En empate gana el que viene después en la serie.
      if (anterior === null || peso.fecha >= anterior.fecha) {
        anterior = peso
      }
    } else if (peso.fecha > fecha) {
      // El más cercano. En empate se queda el primero de la serie.
      if (posterior === null || peso.fecha < posterior.fecha) {
        posterior = peso
      }
    }
  }

  return { anterior, posterior }
}
