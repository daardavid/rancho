import { abrirCliente } from './cliente'
import { cargarEnvLocal, exigirVariable } from './entorno'
import { afirmarResetPermitido, restablecerEsquemas } from './reset'

async function main(): Promise<void> {
  cargarEnvLocal()
  const url = exigirVariable('DATABASE_URL')
  afirmarResetPermitido(url)
  const cliente = abrirCliente(url)
  try {
    await restablecerEsquemas(cliente.db)
  } finally {
    await cliente.cerrar()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
