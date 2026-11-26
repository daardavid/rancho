/**
 * CSV que Excel abre en español: UTF-8 con BOM, comas y saltos de Windows.
 *
 * No hay librería. Un campo con coma, comilla o salto se cita y la comilla se
 * duplica. Los kilos entran ya como texto y salen iguales: esta función no
 * los lee como número.
 */

const BOM = '\uFEFF'

export type PiezaExportada = 'hato' | 'pesos' | 'eventos'

export function aCsv(columnas: readonly string[], filas: readonly (readonly string[])[]): string {
  const lineas = [columnas, ...filas].map((fila) => {
    if (fila.length !== columnas.length) {
      throw new Error('La fila de la exportación no trae todas las columnas.')
    }
    return fila.map(celda).join(',')
  })
  return `${BOM}${lineas.join('\r\n')}\r\n`
}

/**
 * Nombre del archivo: el del rancho, qué se baja y el día del rancho.
 * Se quitan los caracteres que un archivo no puede llevar. No se inventa un
 * nombre si, después de eso, no queda ninguno.
 */
export function nombreDeArchivo(rancho: string, pieza: PiezaExportada, dia: string): string {
  const limpio = [...rancho]
    .map((char) => {
      const codigo = char.charCodeAt(0)
      if (codigo < 0x20 || '\\/:*?"<>|'.includes(char)) {
        return ' '
      }
      return char
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
  if (limpio === '') {
    throw new Error('El rancho no tiene un nombre que se pueda usar en el archivo.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    throw new Error('El día del archivo no es AAAA-MM-DD.')
  }
  return `${limpio} - ${pieza} - ${dia}.csv`
}

/** `filename` en ASCII y `filename*` con el nombre real, acentos incluidos. */
export function disposicion(nombre: string): string {
  const ascii = [...nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '')]
    .map((char) => {
      const codigo = char.charCodeAt(0)
      return codigo >= 0x20 && codigo <= 0x7e ? char : '_'
    })
    .join('')
  const citado = ascii.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `attachment; filename="${citado}"; filename*=UTF-8''${encodeURIComponent(nombre)}`
}

function celda(valor: string): string {
  if (/[",\r\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`
  }
  return valor
}
