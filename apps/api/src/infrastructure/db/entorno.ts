import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Lee un `.env` local sin pisar lo que ya vino del proceso.
 *
 * Lo usan los comandos de base. El servidor no lo carga: así un `.env` de
 * desarrollo no hace que el proceso HTTP migre ni siembre al arrancar.
 */
export function cargarEnvLocal(): void {
  const candidatos = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]

  for (const ruta of candidatos) {
    if (!existsSync(ruta)) {
      continue
    }
    aplicar(readFileSync(ruta, 'utf8'))
    return
  }
}

export function exigirVariable(nombre: string): string {
  const valor = process.env[nombre]
  if (valor === undefined || valor.trim() === '') {
    throw new Error(`Falta ${nombre}.`)
  }
  return valor
}

function aplicar(texto: string): void {
  for (const linea of texto.split(/\r?\n/)) {
    const limpia = linea.trim()
    if (limpia === '' || limpia.startsWith('#')) {
      continue
    }

    const separador = limpia.indexOf('=')
    if (separador === -1) {
      continue
    }

    const clave = limpia.slice(0, separador).trim()
    if (clave === '' || process.env[clave] !== undefined) {
      continue
    }

    process.env[clave] = quitarComillas(limpia.slice(separador + 1).trim())
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
