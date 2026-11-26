import { existsSync, readFileSync, statSync } from 'node:fs'
import { createInterface } from 'node:readline'
import type { Readable, Writable } from 'node:stream'

import { esEntradaDirecta } from '../identity/cli-cuenta'
import { resolverArchivoDeRestauracion } from '../local/respaldo'
import {
  CONFIRMACION_DE_CARGA,
  cargarRespaldoEnPostgres,
  confirmarCarga,
  describirDestino,
  esArchivoDeRespaldo,
  leerArchivoDeCarga,
} from './cargar-respaldo'
import { cargarEnvLocal, exigirVariable } from './entorno'

async function main(): Promise<void> {
  const archivo = resolverArchivoDeRestauracion(leerArchivoDeCarga(process.argv.slice(2)))
  if (!existsSync(archivo) || !statSync(archivo).isFile()) {
    throw new Error(`No está el archivo ${archivo}.`)
  }

  const sqlTexto = readFileSync(archivo, 'utf8')
  if (!esArchivoDeRespaldo(sqlTexto)) {
    throw new Error('El archivo no es un respaldo de RANCHO (SQL de pg_dump).')
  }

  cargarEnvLocal()
  const url = exigirVariable('DATABASE_URL')
  const destino = describirDestino(url)

  console.log('Vas a reemplazar los esquemas de la app en esta base:')
  console.log(`  ${destino}`)
  console.log(`  archivo: ${archivo}`)
  console.log('')
  console.log('Se borran herd, growth, identity, evidence y drizzle, y se ponen los del archivo.')
  console.log('Las fotos no van en el archivo: solo sus datos. Los bytes se quedan en la laptop.')
  console.log('npm run local no usa esta base. Sigue en .datos/.')
  console.log('')
  exigirTerminal(process.stdin)
  const respuesta = await preguntar(
    process.stdin,
    process.stdout,
    `Para seguir, escribe ${CONFIRMACION_DE_CARGA} y pulsa Enter: `,
  )
  if (!confirmarCarga(respuesta)) {
    console.log('No se cargó nada.')
    process.exitCode = 1
    return
  }

  await cargarRespaldoEnPostgres(url, sqlTexto)
  console.log(`Listo. La base ${destino} quedó con el archivo.`)
  console.log('El siguiente db:migrate no vuelve a crear lo que el archivo ya trajo.')
}

function exigirTerminal(entrada: Readable): void {
  if (!('isTTY' in entrada) || entrada.isTTY !== true) {
    throw new Error(
      'Falta la confirmación y no hay terminal para pedirla. Corre npm run cargar-respaldo en una terminal.',
    )
  }
}

function preguntar(entrada: Readable, salida: Writable, pregunta: string): Promise<string> {
  return new Promise((resolvePromesa, reject) => {
    const rl = createInterface({ input: entrada, output: salida, terminal: true })
    rl.question(pregunta, (respuesta) => {
      // Igual que `npm run restaurar`: cerrar sin reanudar, para que la
      // terminal vuelva. Reanudar deja el TTY tomado.
      rl.close()
      resolvePromesa(respuesta)
    })
    rl.once('error', reject)
  })
}

if (esEntradaDirecta(import.meta.url, process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
