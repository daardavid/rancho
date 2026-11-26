import { join } from 'node:path'
import { createInterface } from 'node:readline'
import type { Readable, Writable } from 'node:stream'

import { esEntradaDirecta, leerContrasena } from '../identity/cli-cuenta'
import { abrirBaseLocal, listarCuentasLocales, type CuentaLocal } from './base'
import { raizDelRepo } from './construir'
import { cambiarContrasenaDeCuenta, cuentaParaCambiar } from './contrasena'
import { afirmarModoLocalPermitido, nodeEnvEscrito } from './produccion'
import { hayBaseLocal, rutasDeLaBaseLocal } from './respaldo'

type Anunciar = (linea: string) => void

export type OpcionesDeContrasena = {
  readonly raiz?: string
  readonly anunciar?: Anunciar
  readonly entrada?: Readable
  readonly salida?: Writable
  /** La usan las pruebas. En la terminal se usa `leerContrasena`. */
  readonly leerClave?: () => Promise<string>
  /** La usan las pruebas cuando hay varias cuentas. */
  readonly elegirUsuario?: (cuentas: readonly CuentaLocal[]) => Promise<string>
}

/**
 * Cambia la contraseña de una cuenta en `.datos/pglite`, con el servidor parado.
 *
 * Se niega con `NODE_ENV=production`, igual que `npm run local`. No imprime
 * la contraseña ni su hash.
 */
export async function ejecutarContrasena(opciones: OpcionesDeContrasena = {}): Promise<void> {
  const raiz = opciones.raiz ?? raizDelRepo()
  const anunciar = opciones.anunciar ?? anunciarEnConsola
  const entrada = opciones.entrada ?? process.stdin
  const salida = opciones.salida ?? process.stdout

  afirmarModoLocalPermitido(process.env['NODE_ENV'], nodeEnvEscrito(join(raiz, '.env')))

  const { datos } = rutasDeLaBaseLocal(raiz)
  if (!hayBaseLocal(datos)) {
    throw new Error(
      'No hay base local en .datos/. Corre npm run local antes de cambiar la contraseña.',
    )
  }

  const base = await abrirBaseLocal(datos)
  try {
    const cuentas = await listarCuentasLocales(base.db)
    const usuario = await usuarioElegido(cuentas, opciones, entrada, salida, anunciar)
    anunciar(`Contraseña nueva para el usuario ${usuario}. No se muestra al escribirla.`)
    const contrasena =
      opciones.leerClave !== undefined
        ? await opciones.leerClave()
        : await leerContrasena(entrada, salida)
    if (contrasena === '') {
      throw new Error('La contraseña no puede ir vacía.')
    }
    await cambiarContrasenaDeCuenta(base.db, usuario, contrasena)
    anunciar(
      `Contraseña cambiada para el usuario ${usuario}. Se cerraron sus sesiones y se quitó el bloqueo por intentos fallidos.`,
    )
  } finally {
    await base.cerrar()
  }
}

async function usuarioElegido(
  cuentas: readonly CuentaLocal[],
  opciones: OpcionesDeContrasena,
  entrada: Readable,
  salida: Writable,
  anunciar: Anunciar,
): Promise<string> {
  if (cuentas.length <= 1) {
    return cuentaParaCambiar(cuentas, null)
  }
  if (opciones.elegirUsuario !== undefined) {
    return cuentaParaCambiar(cuentas, await opciones.elegirUsuario(cuentas))
  }

  exigirTerminal(entrada)
  anunciar('Hay varias cuentas.')
  for (const cuenta of cuentas) {
    anunciar(`- ${cuenta.usuario} (${cuenta.rol})`)
  }
  const respuesta = await preguntar(entrada, salida, 'Usuario: ')
  return cuentaParaCambiar(cuentas, respuesta)
}

function anunciarEnConsola(linea: string): void {
  console.log(linea)
}

function exigirTerminal(entrada: Readable): void {
  if (!('isTTY' in entrada) || entrada.isTTY !== true) {
    throw new Error(
      'Hay varias cuentas y no hay terminal para preguntar cuál. Corre npm run contrasena en una terminal.',
    )
  }
}

function preguntar(entrada: Readable, salida: Writable, pregunta: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: entrada, output: salida, terminal: true })
    rl.question(pregunta, (respuesta) => {
      rl.close()
      entrada.resume()
      resolve(respuesta)
    })
    rl.once('error', reject)
  })
}

if (esEntradaDirecta(import.meta.url, process.argv[1])) {
  ejecutarContrasena().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
