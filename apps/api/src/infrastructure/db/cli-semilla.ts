import { abrirCliente } from './cliente'
import { cargarEnvLocal, exigirVariable } from './entorno'
import { sembrarRancho } from './semilla'

async function main(): Promise<void> {
  cargarEnvLocal()
  const url = exigirVariable('DATABASE_URL')
  const nombre = exigirVariable('RANCH_NAME')
  const cliente = abrirCliente(url)
  try {
    const resultado = await sembrarRancho(cliente.db, nombre)
    if (resultado.creado) {
      console.log(`Rancho creado (${resultado.id}).`)
    } else {
      console.log(`El rancho ya existía (${resultado.id}). No se creó otro.`)
    }
  } finally {
    await cliente.cerrar()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
