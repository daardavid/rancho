import { construirApp } from './http/app'

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

const app = construirApp()

async function arrancar(): Promise<void> {
  const puerto = leerPuerto(process.env['PORT'])
  const host = process.env['HOST'] ?? HOST_POR_OMISION

  await app.listen({ port: puerto, host })
}

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

arrancar().catch((error: unknown) => {
  app.log.error({ error }, 'La API no arrancó')
  process.exit(1)
})
