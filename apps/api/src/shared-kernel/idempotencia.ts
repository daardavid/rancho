import { createHash } from 'node:crypto'

import { ConflictoDeIdempotencia } from './conflictos'
import { commandIdSchema } from './ids'

export type ReciboGuardado = {
  readonly huella: string
  readonly resultado: string
}

/** Lo que la persistencia implementa. El comando no recibe la transacción. */
export type AlmacenDeIdempotencia = {
  buscar(commandId: string): Promise<ReciboGuardado | null>
  guardar(commandId: string, huella: string, resultado: string): Promise<void>
}

/**
 * Huella del contenido significativo.
 *
 * El orden de las claves no cambia la huella: el mismo contenido es el mismo
 * comando. Quién arma ese contenido (qué campos cuentan) es del comando; aquí
 * solo se resume lo que le pasen.
 */
export function huellaDeContenido(contenido: unknown): string {
  const canonico = JSON.stringify(canonizar(contenido))
  if (canonico === undefined) {
    throw new Error('El contenido del comando no se puede resumir a JSON.')
  }
  return createHash('sha256').update(canonico).digest('hex')
}

/**
 * Mismo id y misma huella devuelve el resultado guardado, sin volver a ejecutar.
 * Mismo id y otra huella lanza `idempotency_mismatch` y no toca el resultado.
 */
export async function ejecutarComandoIdempotente<T>(
  almacen: AlmacenDeIdempotencia,
  commandId: string,
  contenido: unknown,
  ejecutar: () => Promise<T>,
): Promise<T> {
  const id = commandIdSchema.parse(commandId)
  const huella = huellaDeContenido(contenido)
  const previo = await almacen.buscar(id)

  if (previo !== null) {
    if (previo.huella !== huella) {
      throw new ConflictoDeIdempotencia(id)
    }
    return JSON.parse(previo.resultado) as T
  }

  const resultado = await ejecutar()
  const texto = JSON.stringify(resultado)
  if (texto === undefined) {
    throw new Error('El resultado del comando no se puede guardar como JSON.')
  }
  await almacen.guardar(id, huella, texto)
  return resultado
}

function canonizar(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map((item) => canonizar(item))
  }

  if (valor instanceof Date) {
    return valor.toISOString()
  }

  if (valor !== null && typeof valor === 'object') {
    const objeto = valor as Record<string, unknown>
    const ordenado: Record<string, unknown> = {}
    for (const clave of Object.keys(objeto).sort()) {
      const item = objeto[clave]
      if (item === undefined) {
        continue
      }
      ordenado[clave] = canonizar(item)
    }
    return ordenado
  }

  return valor
}
