import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import type { Readable, Writable } from 'node:stream'
import { pathToFileURL } from 'node:url'

import type { FastifyInstance } from 'fastify'

import { esEntradaDirecta, leerContrasena } from '../identity/cli-cuenta'
import { escribirVariable, leerVariable } from './archivo-env'
import { afirmarModoLocalPermitido, nodeEnvEscrito } from './produccion'
import {
  abrirBaseLocal,
  exponerBaseLocal,
  prepararInstalacionLocal,
  type PreparacionLocal,
} from './base'
import { construirAplicacion, haceFaltaConstruir, raizDelRepo } from './construir'
import { direccionesDeEstaMaquina, lineasParaAbrir, puertoEscuchando } from './direcciones'
import { asegurarSecretoEnArchivo } from './secreto'

type Compilado = { arrancar?: () => Promise<FastifyInstance> }

type Anunciar = (linea: string) => void

export type OpcionesDeLocal = {
  readonly raiz?: string
  /** `false` prepara e informa y no abre el puerto. Lo usan las pruebas. */
  readonly escuchar?: boolean
  readonly anunciar?: Anunciar
  readonly entrada?: Readable
  readonly salida?: Writable
}

/**
 * Prepara la base embebida, construye si hace falta y arranca la app.
 *
 * El proceso HTTP no migra. Este comando sí, antes de escuchar: es el mismo
 * paso explícito que `db:migrate`, junto con la semilla y la primera cuenta.
 * Correrlo otra vez no regenera el secreto, no crea otro rancho y no crea
 * otra cuenta. Si ya hay cuenta, dice el usuario y no la contraseña.
 */
export async function correrLocal(opciones: OpcionesDeLocal = {}): Promise<void> {
  const raiz = opciones.raiz ?? raizDelRepo()
  const escuchar = opciones.escuchar ?? true
  const anunciar = opciones.anunciar ?? anunciarEnConsola
  const entrada = opciones.entrada ?? process.stdin
  const salida = opciones.salida ?? process.stdout
  const envRuta = join(raiz, '.env')
  const directorio = join(raiz, '.datos', 'pglite')

  anunciar('RANCHO en local. Los datos quedan en .datos/ y git no los sube.')

  const secreto = asegurarSecretoEnArchivo(envRuta)
  if (secreto.generado) {
    anunciar('SESSION_SECRET generado y guardado en .env. No se vuelve a generar.')
  }

  afirmarModoLocalPermitido(process.env['NODE_ENV'], nodeEnvEscrito(envRuta))
  const nombre = await asegurarNombreDelRancho(envRuta, entrada, salida, anunciar)

  anunciar('Preparando la base local…')
  const base = await abrirBaseLocal(directorio)
  let baseCerrada = false
  const cerrarBase = async (): Promise<void> => {
    if (baseCerrada) {
      return
    }
    baseCerrada = true
    await base.cerrar()
  }
  let socket: { url: string; cerrar(): Promise<void> } | undefined
  let app: FastifyInstance | undefined
  try {
    const preparacion = await prepararInstalacionLocal(base.db, {
      nombreDelRancho: nombre,
      pedirCuenta: () => pedirPrimeraCuenta(entrada, salida),
    })
    informar(preparacion, anunciar)
    if (!escuchar) {
      await cerrarBase()
      return
    }

    if (haceFaltaConstruir(raiz)) {
      anunciar('Construyendo la aplicación…')
      await construirAplicacion(raiz)
    } else {
      anunciar('La aplicación ya está construida.')
    }

    socket = await exponerBaseLocal(base.cliente)
    process.env['SESSION_SECRET'] = secreto.secreto
    process.env['RANCH_NAME'] = nombre
    process.env['MODO'] = 'local'
    process.env['HOST'] = '0.0.0.0'
    process.env['DB_POOL'] = '1'
    process.env['DATABASE_URL'] = socket.url

    const servidor = await arrancarConstruido(join(raiz, 'apps', 'api', 'dist', 'main.js'))
    app = servidor
    const puerto = puertoEscuchando(servidor.server)
    for (const linea of lineasParaAbrir(puerto, direccionesDeEstaMaquina())) {
      anunciar(linea)
    }
    anunciar('Si el celular no abre, Windows puede estar bloqueando Node en el firewall.')

    cerrarAlSalir(async () => {
      await servidor.close()
      await socket?.cerrar()
      await cerrarBase()
    })
  } catch (error) {
    await app?.close()
    await socket?.cerrar()
    await cerrarBase()
    throw error
  }
}

function anunciarEnConsola(linea: string): void {
  console.log(linea)
}

async function asegurarNombreDelRancho(
  envRuta: string,
  entrada: Readable,
  salida: Writable,
  anunciar: Anunciar,
): Promise<string> {
  const texto = readFileSync(envRuta, 'utf8')
  const actual = leerVariable(texto, 'RANCH_NAME')?.trim() ?? ''
  if (actual !== '') {
    return actual
  }

  exigirTerminal(entrada, 'RANCH_NAME')
  const nombre = (await preguntar(entrada, salida, 'Nombre del rancho: ')).trim()
  if (nombre === '') {
    throw new Error('Falta el nombre del rancho. No se inventa uno.')
  }
  const nuevo = escribirVariable(texto, 'RANCH_NAME', nombre)
  writeFileSync(envRuta, nuevo, 'utf8')
  anunciar('RANCH_NAME guardado en .env. La próxima vez no se pregunta.')
  return nombre
}

async function pedirPrimeraCuenta(
  entrada: Readable,
  salida: Writable,
): Promise<{ usuario: string; contrasena: string }> {
  exigirTerminal(entrada, 'la primera cuenta')
  const usuario = (await preguntar(entrada, salida, 'Usuario: ')).trim()
  if (usuario === '') {
    throw new Error('El usuario no puede ir vacío.')
  }
  const contrasena = await leerContrasena(entrada, salida)
  if (contrasena === '') {
    throw new Error('La contraseña no puede ir vacía.')
  }
  return { usuario, contrasena }
}

function informar(preparacion: PreparacionLocal, anunciar: Anunciar): void {
  if (preparacion.ranchoCreado) {
    anunciar(`Rancho creado (${preparacion.ranchId}).`)
  } else {
    anunciar(`El rancho ya existía (${preparacion.ranchId}). No se creó otro.`)
  }
  if (preparacion.cuentaCreada) {
    anunciar(
      `Cuenta creada (${preparacion.cuentaId ?? ''}) con rol ${preparacion.rol ?? ''} para el usuario ${preparacion.usuario ?? ''}.`,
    )
    anunciar(
      'Es la cuenta de esta instalación local. El rol owner se puede crear después con cuenta:crear.',
    )
    return
  }
  anunciar(textoDeCuentaExistente(preparacion.usuarios))
}

/**
 * Lo que `npm run local` dice cuando la cuenta ya existe.
 *
 * Nombra al usuario para no tener que adivinarlo. No incluye la contraseña
 * ni su hash. Con varias cuentas, las lista todas.
 */
export function textoDeCuentaExistente(usuarios: readonly string[]): string {
  const cierre = 'No se creó otra ni se cambió la contraseña.'
  const primero = usuarios[0]
  if (primero === undefined) {
    return `Ya hay una cuenta. ${cierre}`
  }
  if (usuarios.length === 1) {
    return `Ya hay una cuenta: usuario ${primero}. ${cierre}`
  }
  const lista = usuarios.map((usuario) => `usuario ${usuario}`).join(', ')
  return `Ya hay cuentas: ${lista}. ${cierre}`
}

async function arrancarConstruido(servidor: string): Promise<FastifyInstance> {
  const modulo = (await import(pathToFileURL(servidor).href)) as Compilado
  if (typeof modulo.arrancar !== 'function') {
    throw new Error(`${servidor} no exporta «arrancar».`)
  }
  return modulo.arrancar()
}

function exigirTerminal(entrada: Readable, que: string): void {
  if (!('isTTY' in entrada) || entrada.isTTY !== true) {
    throw new Error(
      `Falta ${que} y no hay terminal para preguntarlo. Ponlo en .env o corre npm run local en una terminal.`,
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

function cerrarAlSalir(cerrar: () => Promise<void>): void {
  let cerrando = false
  const hacerlo = (): void => {
    if (cerrando) {
      return
    }
    cerrando = true
    void cerrar().then(
      () => {
        process.exit(0)
      },
      (error: unknown) => {
        console.error(error instanceof Error ? error.message : String(error))
        process.exit(1)
      },
    )
  }
  process.once('SIGINT', hacerlo)
  process.once('SIGTERM', hacerlo)
}

if (esEntradaDirecta(import.meta.url, process.argv[1])) {
  correrLocal().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
