/**
 * El borrador de una sesión de pesaje, guardado en el propio celular.
 *
 * Una vuelta por la báscula puede durar media hora y el dueño puede cerrar la
 * pestaña, recibir una llamada o quedarse sin batería a media captura. Perder
 * diez renglones escritos es un costo real ([UX-12](../../../../../docs/product/ux-principles.md)),
 * así que lo capturado se guarda en `localStorage` a cada cambio y se recupera
 * al volver a abrir la pantalla.
 *
 * El id de la sesión y el id del comando viven aquí con el resto del borrador.
 * Eso es lo que hace que un reintento —incluso después de recargar— mande el
 * mismo comando y no duplique la sesión.
 *
 * El borrador pertenece a una cuenta y a un navegador. Al cerrar sesión se
 * borra ([`App.tsx`](../App.tsx)), y si otra cuenta entra en el mismo
 * celular, lo que quedó de la anterior se descarta al abrir la pantalla: nadie
 * ve ni manda el trabajo de otra sesión.
 *
 * Todo está dentro de `try/catch`: un navegador en modo privado, el
 * almacenamiento lleno o un borrador de otra versión no pueden romper la
 * captura. Si no se puede leer o guardar, la pantalla sigue funcionando sin
 * borrador; solo se pierde la recuperación después de recargar.
 */

export type CalidadBorrador = 'measured' | 'observed' | 'declared'

export type FilaBorrador = {
  readonly id: string
  readonly animalId: string
  readonly resultado: 'pesado' | 'hueco'
  readonly kilos: string
  readonly calidad: CalidadBorrador
  /** Id de la foto ya subida. `null` es no tenerla. El archivo no cabe en el borrador. */
  readonly evidenciaId: string | null
}

export type BorradorDePesaje = {
  readonly version: 2
  /**
   * La cuenta que empezó la captura. El borrador vive en este navegador, pero
   * es de una cuenta: si otra entra en el mismo celular, lo que hay aquí no es
   * suyo y se descarta en vez de aparecer en su pantalla.
   */
  readonly cuentaId: string
  readonly fecha: string
  readonly nota: string
  readonly reportedBy: string
  readonly sesionId: string
  readonly commandId: string
  readonly filas: readonly FilaBorrador[]
}

const CLAVE = 'rancho.pesaje.borrador'
const VERSION_DEL_FORMATO = 2

/**
 * El borrador de esta cuenta, o `null`.
 *
 * Un borrador de otra cuenta —o de una versión vieja del formato— se borra: no
 * hay nada que el dueño pueda hacer con la captura de otra sesión, y dejarla
 * ahí sería guardar en el celular el trabajo de alguien más. El de esta cuenta
 * se devuelve y la pantalla lo recupera como siempre.
 */
export function leerBorrador(cuentaId: string): BorradorDePesaje | null {
  try {
    const guardado = window.localStorage.getItem(CLAVE)
    if (guardado === null) {
      return null
    }
    const borrador = interpretar(JSON.parse(guardado) as unknown)
    if (borrador === null || borrador.cuentaId !== cuentaId) {
      window.localStorage.removeItem(CLAVE)
      return null
    }
    return borrador
  } catch {
    // Sin almacenamiento o con un JSON roto se empieza limpio. Perder un
    // borrador ilegible es mejor que una pantalla que no abre.
    return null
  }
}

export function guardarBorrador(borrador: BorradorDePesaje): void {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(borrador))
  } catch {
    // Sin espacio o sin permiso: la captura sigue en memoria y se guarda al
    // enviar. No se avisa como error porque el camino principal no se rompe.
  }
}

export function borrarBorrador(): void {
  try {
    window.localStorage.removeItem(CLAVE)
  } catch {
    // Si no se puede borrar, al abrir la pantalla se descarta por versión o
    // por contenido; no queda nada que el dueño vea.
  }
}

function interpretar(valor: unknown): BorradorDePesaje | null {
  if (typeof valor !== 'object' || valor === null) {
    return null
  }
  const bruto = valor as Record<string, unknown>

  if (bruto.version !== VERSION_DEL_FORMATO) {
    return null
  }
  const cuentaId = bruto.cuentaId
  const fecha = bruto.fecha
  const nota = bruto.nota
  const reportedBy = bruto.reportedBy
  const sesionId = bruto.sesionId
  const commandId = bruto.commandId
  const filas = bruto.filas
  if (
    typeof cuentaId !== 'string' ||
    typeof fecha !== 'string' ||
    typeof nota !== 'string' ||
    typeof reportedBy !== 'string' ||
    typeof sesionId !== 'string' ||
    typeof commandId !== 'string' ||
    !Array.isArray(filas)
  ) {
    return null
  }

  const interpretadas: FilaBorrador[] = []
  for (const fila of filas as unknown[]) {
    const interpretada = interpretarFila(fila)
    if (interpretada === null) {
      return null
    }
    interpretadas.push(interpretada)
  }

  return {
    version: VERSION_DEL_FORMATO,
    cuentaId,
    fecha,
    nota,
    reportedBy,
    sesionId,
    commandId,
    filas: interpretadas,
  }
}

function interpretarFila(valor: unknown): FilaBorrador | null {
  if (typeof valor !== 'object' || valor === null) {
    return null
  }
  const fila = valor as Record<string, unknown>
  const { id, animalId, resultado, kilos, calidad } = fila

  if (
    typeof id !== 'string' ||
    typeof animalId !== 'string' ||
    (resultado !== 'pesado' && resultado !== 'hueco') ||
    typeof kilos !== 'string' ||
    (calidad !== 'measured' && calidad !== 'observed' && calidad !== 'declared')
  ) {
    return null
  }

  const evidenciaId = evidenciaDelBorrador(fila.evidenciaId)
  if (evidenciaId === undefined) {
    return null
  }

  return { id, animalId, resultado, kilos, calidad, evidenciaId }
}

/** Ausente o `null` es sin foto. Otra cosa que no sea texto tira el borrador. */
function evidenciaDelBorrador(valor: unknown): string | null | undefined {
  if (valor === undefined || valor === null || valor === '') {
    return null
  }
  if (typeof valor !== 'string') {
    return undefined
  }
  return valor
}
