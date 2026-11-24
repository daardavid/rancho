import { existsSync, readFileSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import type { Readable, Writable } from 'node:stream'

import { esEntradaDirecta } from '../identity/cli-cuenta'
import { raizDelRepo } from './construir'
import {
  CONFIRMACION_DE_RESTAURACION,
  afirmarRespaldoPermitido,
  asegurarBaseLibre,
  confirmarRestauracion,
  esRespaldoSql,
  leerArchivoDeRestauracion,
  nodeEnvDelArchivo,
  restaurarBaseLocal,
  rutasDeLaBaseLocal,
} from './respaldo'

async function main(): Promise<void> {
  const raiz = raizDelRepo()
  afirmarRespaldoPermitido(process.env['NODE_ENV'], nodeEnvDelArchivo(raiz))

  const archivo = resolve(leerArchivoDeRestauracion(process.argv.slice(2)))
  if (!existsSync(archivo) || !statSync(archivo).isFile()) {
    throw new Error(`No está el archivo ${archivo}.`)
  }
  if (!esRespaldoSql(readFileSync(archivo, 'utf8'))) {
    throw new Error('El archivo no es un respaldo de RANCHO (SQL de pg_dump).')
  }

  const { datos, respaldos } = rutasDeLaBaseLocal(raiz)
  await asegurarBaseLibre(datos)

  console.log('Vas a reemplazar la base local (.datos/) con este archivo:')
  console.log(`  ${archivo}`)
  console.log('')
  console.log('Se borra lo que hay ahora en los esquemas de la app y se pone lo del archivo.')
  console.log('Si ya había base, antes se guarda una copia en respaldos/.')
  console.log('')
  exigirTerminal(process.stdin)
  const respuesta = await preguntar(
    process.stdin,
    process.stdout,
    `Para seguir, escribe ${CONFIRMACION_DE_RESTAURACION} y pulsa Enter: `,
  )
  if (!confirmarRestauracion(respuesta)) {
    console.log('No se restauró nada.')
    process.exitCode = 1
    return
  }

  const resultado = await restaurarBaseLocal({
    directorioDeDatos: datos,
    directorioDeRespaldos: respaldos,
    archivo,
  })
  console.log('La base local quedó reemplazada con el archivo.')
  if (resultado.respaldoPrevio === null) {
    console.log('No había base local, así que no se hizo un respaldo previo.')
    return
  }
  console.log(`Lo que había antes quedó en ${mostrar(raiz, resultado.respaldoPrevio)}.`)
}

function exigirTerminal(entrada: Readable): void {
  if (!('isTTY' in entrada) || entrada.isTTY !== true) {
    throw new Error(
      'Falta la confirmación y no hay terminal para pedirla. Corre npm run restaurar en una terminal.',
    )
  }
}

function preguntar(entrada: Readable, salida: Writable, pregunta: string): Promise<string> {
  return new Promise((resolvePromesa, reject) => {
    const rl = createInterface({ input: entrada, output: salida, terminal: true })
    rl.question(pregunta, (respuesta) => {
      rl.close()
      entrada.resume()
      resolvePromesa(respuesta)
    })
    rl.once('error', reject)
  })
}

function mostrar(raiz: string, ruta: string): string {
  const rel = relative(raiz, ruta)
  return rel === '' ? ruta : rel
}

if (esEntradaDirecta(import.meta.url, process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
