import { relative } from 'node:path'

import { esEntradaDirecta } from '../identity/cli-cuenta'
import { raizDelRepo } from './construir'
import {
  afirmarRespaldoPermitido,
  nodeEnvDelArchivo,
  respaldarBaseLocal,
  rutasDeLaBaseLocal,
} from './respaldo'

async function main(): Promise<void> {
  const raiz = raizDelRepo()
  afirmarRespaldoPermitido(process.env['NODE_ENV'], nodeEnvDelArchivo(raiz))
  const { datos, respaldos } = rutasDeLaBaseLocal(raiz)
  const ruta = await respaldarBaseLocal({
    directorioDeDatos: datos,
    directorioDeRespaldos: respaldos,
  })
  console.log(`Respaldo escrito en ${mostrar(raiz, ruta)}.`)
  console.log('Ese archivo reemplaza la base local, y también se carga en un PostgreSQL de servidor.')
  console.log('En la laptop: docs/development/correr-local.md.')
  console.log('En la base publicada: npm run cargar-respaldo. Pasos en docs/development/publicar.md.')
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
