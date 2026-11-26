import { relative } from 'node:path'

import { esEntradaDirecta } from '../identity/cli-cuenta'
import { raizDelRepo } from './construir'
import {
  AVISO_FOTOS_FUERA_DEL_SQL,
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
  for (const linea of lineasTrasElRespaldo(mostrar(raiz, ruta))) {
    console.log(linea)
  }
}

/** Lo que `npm run respaldo` imprime cuando el archivo ya quedó escrito. */
export function lineasTrasElRespaldo(rutaVisible: string): readonly string[] {
  return [
    `Respaldo escrito en ${rutaVisible}.`,
    'Ese archivo reemplaza la base local, y también se carga en un PostgreSQL de servidor.',
    'En la laptop: docs/development/correr-local.md.',
    'En la base publicada: npm run cargar-respaldo. Pasos en docs/development/publicar.md.',
    AVISO_FOTOS_FUERA_DEL_SQL,
  ]
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
