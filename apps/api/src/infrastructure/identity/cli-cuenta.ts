import { createInterface, type Interface } from 'node:readline'
import { Readable, Writable } from 'node:stream'
import { pathToFileURL } from 'node:url'

import { abrirCliente } from '../db/cliente'
import { cargarEnvLocal, exigirVariable } from '../db/entorno'
import { NoSePudoCrearLaCuenta, crearCuenta } from './cuentas'

export function leerArgumentos(argv: readonly string[]): { rol: string; usuario: string } {
  let rol: string | undefined
  let usuario: string | undefined

  for (let indice = 0; indice < argv.length; indice += 1) {
    const bandera = argv[indice]
    if (bandera === '--rol') {
      indice += 1
      rol = exigirValor(argv[indice], '--rol')
      continue
    }
    if (bandera === '--usuario') {
      indice += 1
      usuario = exigirValor(argv[indice], '--usuario')
      continue
    }
    throw new Error(
      `No reconozco «${bandera ?? ''}». Uso: npm run cuenta:crear -w @rancho/api -- --rol owner --usuario <usuario>`,
    )
  }

  if (rol === undefined || usuario === undefined) {
    throw new Error('Uso: npm run cuenta:crear -w @rancho/api -- --rol owner --usuario <usuario>')
  }

  return { rol, usuario }
}

function exigirValor(valor: string | undefined, bandera: string): string {
  if (valor === undefined || valor.startsWith('--')) {
    throw new Error(`Falta el valor de ${bandera}.`)
  }
  return valor
}

/**
 * Pide la contraseña sin mostrarla en una terminal, o la lee de la entrada
 * estándar cuando no hay terminal (una tubería, por ejemplo).
 */
export async function leerContrasena(entrada: Readable, salida: Writable): Promise<string> {
  if (!esTerminal(entrada)) {
    const trozos: Buffer[] = []
    for await (const trozo of entrada) {
      trozos.push(typeof trozo === 'string' ? Buffer.from(trozo) : Buffer.from(trozo))
    }
    return Buffer.concat(trozos).toString('utf8').replace(/\r?\n$/, '')
  }

  const pregunta = 'Contraseña: '
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: entrada, output: salida, terminal: true })
    const conSalida = rl as Interface & { _writeToOutput: (texto: string) => void }
    const escribir = conSalida._writeToOutput.bind(rl)
    conSalida._writeToOutput = (texto: string) => {
      if (texto.startsWith(pregunta) || texto === '\n' || texto === '\r\n') {
        escribir(texto)
      }
    }
    rl.question(pregunta, (respuesta) => {
      rl.close()
      resolve(respuesta)
    })
    rl.once('error', reject)
  })
}

function esTerminal(entrada: Readable): entrada is Readable & { isTTY: true } {
  return 'isTTY' in entrada && entrada.isTTY === true
}

export function esEntradaDirecta(urlDelModulo: string, argv1: string | undefined): boolean {
  if (argv1 === undefined) {
    return false
  }
  return urlDelModulo === pathToFileURL(argv1).href
}

async function main(): Promise<void> {
  const { rol, usuario } = leerArgumentos(process.argv.slice(2))
  const contrasena = await leerContrasena(process.stdin, process.stdout)
  if (contrasena === '') {
    throw new Error('La contraseña no puede ir vacía.')
  }

  cargarEnvLocal()
  const cliente = abrirCliente(exigirVariable('DATABASE_URL'))
  try {
    const cuenta = await crearCuenta(cliente.db, { rol, usuario, contrasena })
    process.stdout.write(
      `Cuenta creada (${cuenta.id}) con rol ${cuenta.rol} para el rancho ${cuenta.ranchId}.\n`,
    )
  } finally {
    await cliente.cerrar()
  }
}

if (esEntradaDirecta(import.meta.url, process.argv[1])) {
  main().catch((error: unknown) => {
    const mensaje =
      error instanceof NoSePudoCrearLaCuenta || error instanceof Error ? error.message : String(error)
    console.error(mensaje)
    process.exitCode = 1
  })
}
