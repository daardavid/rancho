import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import type { Readable, Writable } from 'node:stream'
import { pathToFileURL } from 'node:url'

import type { FastifyInstance } from 'fastify'

import { esEntradaDirecta, leerContrasena } from '../identity/cli-cuenta'
import { escribirVariable, leerVariable } from './archivo-env'
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

/**
 * Prepara la base embebida, construye si hace falta y arranca la app.
 *
 * El proceso HTTP no migra. Este comando sí, antes de escuchar: es el mismo
 * paso explícito que `db:migrate`, junto con la semilla y la primera cuenta.
 * Correrlo otra vez no regenera el secreto, no crea otro rancho y no crea
 * otra cuenta.
 */
async function main(): Promise<void> {
  const raiz = raizDelRepo()
  const envRuta = join(raiz, '.env')
  const directorio = join(raiz, '.datos', 'pglite')

  console.log('RANCHO en local. Los datos quedan en .datos/ y git no los sube.')

  const secreto = asegurarSecretoEnArchivo(envRuta)
  if (secreto.generado) {
    console.log('SESSION_SECRET generado y guardado en .env. No se vuelve a generar.')
  }

  rechazarProduccion(envRuta)
  const nombre = await asegurarNombreDelRancho(envRuta)

  console.log('Preparando la base local…')
  const base = await abrirBaseLocal(directorio)
  let socket: { url: string; cerrar(): Promise<void> } | undefined
  let app: FastifyInstance | undefined
  try {
    const preparacion = await prepararInstalacionLocal(base.db, {
      nombreDelRancho: nombre,
      pedirCuenta: () => pedirPrimeraCuenta(),
    })
    informar(preparacion)

    if (haceFaltaConstruir(raiz)) {
      console.log('Construyendo la aplicación…')
      await construirAplicacion(raiz)
    } else {
      console.log('La aplicación ya está construida.')
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
      console.log(linea)
    }
    console.log('Si el celular no abre, Windows puede estar bloqueando Node en el firewall.')

    cerrarAlSalir(async () => {
      await servidor.close()
      await socket?.cerrar()
      await base.cerrar()
    })
  } catch (error) {
    await app?.close()
    await socket?.cerrar()
    await base.cerrar()
    throw error
  }
}

async function asegurarNombreDelRancho(envRuta: string): Promise<string> {
  const texto = readFileSync(envRuta, 'utf8')
  const actual = leerVariable(texto, 'RANCH_NAME')?.trim() ?? ''
  if (actual !== '') {
    return actual
  }

  exigirTerminal(process.stdin, 'RANCH_NAME')
  const nombre = (await preguntar(process.stdin, process.stdout, 'Nombre del rancho: ')).trim()
  if (nombre === '') {
    throw new Error('Falta el nombre del rancho. No se inventa uno.')
  }
  const nuevo = escribirVariable(texto, 'RANCH_NAME', nombre)
  writeFileSync(envRuta, nuevo, 'utf8')
  console.log('RANCH_NAME guardado en .env. La próxima vez no se pregunta.')
  return nombre
}

async function pedirPrimeraCuenta(): Promise<{ usuario: string; contrasena: string }> {
  exigirTerminal(process.stdin, 'la primera cuenta')
  const usuario = (await preguntar(process.stdin, process.stdout, 'Usuario: ')).trim()
  if (usuario === '') {
    throw new Error('El usuario no puede ir vacío.')
  }
  const contrasena = await leerContrasena(process.stdin, process.stdout)
  if (contrasena === '') {
    throw new Error('La contraseña no puede ir vacía.')
  }
  return { usuario, contrasena }
}

function informar(preparacion: PreparacionLocal): void {
  if (preparacion.ranchoCreado) {
    console.log(`Rancho creado (${preparacion.ranchId}).`)
  } else {
    console.log(`El rancho ya existía (${preparacion.ranchId}). No se creó otro.`)
  }
  if (preparacion.cuentaCreada) {
    console.log(
      `Cuenta creada (${preparacion.cuentaId ?? ''}) con rol ${preparacion.rol ?? ''} para el usuario ${preparacion.usuario ?? ''}.`,
    )
    console.log(
      'Es la cuenta de esta instalación local. El rol owner se puede crear después con cuenta:crear.',
    )
    return
  }
  console.log('Ya hay una cuenta. No se creó otra ni se cambió la contraseña.')
}

/**
 * `NODE_ENV=production` exige cookie `Secure`. El modo local no puede quitarla,
 * así que las dos juntas no arrancan. Se mira el proceso y el `.env`, porque
 * el servidor carga el archivo después.
 */
function rechazarProduccion(envRuta: string): void {
  const enArchivo = leerVariable(readFileSync(envRuta, 'utf8'), 'NODE_ENV')?.trim()
  if (process.env['NODE_ENV'] === 'production' || enArchivo === 'production') {
    throw new Error(
      'NODE_ENV=production no puede combinarse con el modo local. En producción la cookie lleva Secure, sin excepción.',
    )
  }
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
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
