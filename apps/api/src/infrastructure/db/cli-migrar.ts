import { abrirCliente } from './cliente'
import { cargarEnvLocal, exigirVariable } from './entorno'
import { aplicarMigraciones } from './migrar'

async function main(): Promise<void> {
  cargarEnvLocal()
  const url = exigirVariable('DATABASE_URL')
  const cliente = abrirCliente(url)
  try {
    await aplicarMigraciones(cliente.db)
  } finally {
    await cliente.cerrar()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
