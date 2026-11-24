/**
 * Lee y escribe un `.env` sin perder el resto del archivo.
 *
 * Las comillas se quitan igual que en [`entorno.ts`](../db/entorno.ts): el
 * valor que ve el proceso es el de adentro, no las comillas.
 */

export function leerVariable(texto: string, clave: string): string | undefined {
  for (const linea of texto.split(/\r?\n/)) {
    if (!esAsignacion(linea, clave)) {
      continue
    }
    const separador = linea.indexOf('=')
    return quitarComillas(linea.slice(separador + 1).trim())
  }
  return undefined
}

/** Reemplaza la primera asignación de `clave`, o la agrega al final. */
export function escribirVariable(texto: string, clave: string, valor: string): string {
  validarClave(clave)
  validarValor(valor)
  const lineaNueva = serializar(clave, valor)
  const lineas = texto.split(/\r?\n/)
  const indice = lineas.findIndex((linea) => esAsignacion(linea, clave))
  if (indice === -1) {
    const base = texto.length === 0 || texto.endsWith('\n') ? texto : `${texto}\n`
    return `${base}${lineaNueva}\n`
  }
  lineas[indice] = lineaNueva
  const unido = lineas.join('\n')
  return unido.endsWith('\n') ? unido : `${unido}\n`
}

function esAsignacion(linea: string, clave: string): boolean {
  const limpia = linea.trim()
  if (limpia === '' || limpia.startsWith('#')) {
    return false
  }
  const separador = limpia.indexOf('=')
  if (separador === -1) {
    return false
  }
  return limpia.slice(0, separador).trim() === clave
}

function serializar(clave: string, valor: string): string {
  if (valor === '' || /[\s#]/.test(valor)) {
    return `${clave}="${valor}"`
  }
  return `${clave}=${valor}`
}

function validarClave(clave: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(clave)) {
    throw new Error(`El nombre de variable no es válido: ${clave}`)
  }
}

function validarValor(valor: string): void {
  if (/[\r\n"]/.test(valor)) {
    throw new Error('El valor no puede llevar saltos de línea ni comillas.')
  }
}

function quitarComillas(valor: string): string {
  const comillaDoble = valor.startsWith('"') && valor.endsWith('"')
  const comillaSimple = valor.startsWith("'") && valor.endsWith("'")
  if ((comillaDoble || comillaSimple) && valor.length >= 2) {
    return valor.slice(1, -1)
  }
  return valor
}
