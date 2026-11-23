import { construirApp } from './http/app'
import { abrirCliente } from './infrastructure/db/cliente'
import { cargarEnvLocal, exigirVariable } from './infrastructure/db/entorno'
import { crearIdentidad } from './infrastructure/identity/identidad'
import { crearHerd } from './modules/herd'

const PUERTO_POR_OMISION = 3000
const HOST_POR_OMISION = '127.0.0.1'

function leerPuerto(valor: string | undefined): number {
  if (valor === undefined) {
    return PUERTO_POR_OMISION
  }

  const puerto = Number(valor)
  if (!Number.isInteger(puerto) || puerto <= 0 || puerto > 65_535) {
    throw new Error(`PORT no es un puerto válido: ${valor}`)
  }

  return puerto
}

async function arrancar(): Promise<void> {
  cargarEnvLocal()
  const url = exigirVariable('DATABASE_URL')
  const cliente = abrirCliente(url)
  const app = construirApp({
    identidad: crearIdentidad(cliente.db),
    herd: crearHerd(cliente.db),
    produccion: process.env['NODE_ENV'] === 'production',
  })

  app.addHook('onClose', async () => {
    await cliente.cerrar()
  })

  for (const senal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(senal, () => {
      app.log.info({ senal }, 'Cerrando la API')
      void app.close().then(
        () => {
          process.exit(0)
        },
        (error: unknown) => {
          app.log.error({ error }, 'No se pudo cerrar la API')
          process.exit(1)
        },
      )
    })
  }

  const puerto = leerPuerto(process.env['PORT'])
  const host = process.env['HOST'] ?? HOST_POR_OMISION

  try {
    await app.listen({ port: puerto, host })
  } catch (error) {
    await app.close()
    throw error
  }
}

arrancar().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
