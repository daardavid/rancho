import { construirApp } from './http/app'
import { carpetaDeLaWeb } from './http/estaticos'
import { servirLaWeb } from './http/servir-web'
import { abrirCliente } from './infrastructure/db/cliente'
import { cargarEnvLocal } from './infrastructure/db/entorno'
import { cargarConfiguracion } from './infrastructure/configuracion'
import { crearIdentidad } from './infrastructure/identity/identidad'
import { crearGrowth } from './modules/growth'
import { crearHerd } from './modules/herd'
import { crearModelosDeCrecimiento } from './read-models'

/**
 * El proceso de la aplicación: una base, una sesión y un servidor.
 *
 * En producción este mismo proceso sirve la API en `/api` y la web construida
 * en `/`, para que la cookie de sesión sea de primera parte
 * ([deployment-strategy.md](../../docs/architecture/deployment-strategy.md)).
 * En desarrollo Vite sirve la web y manda `/api` aquí, así que la carpeta de la
 * web no existe y solo se montan las rutas de la API.
 *
 * Arrancar no migra ni siembra
 * ([arranque.test.ts](../test/infrastructure/arranque.test.ts)): la base se
 * prepara con `db:migrate` y `db:seed`, que son comandos explícitos.
 */
async function arrancar(): Promise<void> {
  cargarEnvLocal()
  const configuracion = cargarConfiguracion()

  const cliente = abrirCliente(configuracion.databaseUrl)
  const herd = crearHerd(cliente.db)
  const app = construirApp({
    identidad: crearIdentidad(cliente.db, configuracion.secretoDeSesion),
    herd,
    growth: crearGrowth(cliente.db, herd),
    crecimiento: crearModelosDeCrecimiento(cliente.db),
    produccion: configuracion.produccion,
  })

  const carpeta = carpetaDeLaWeb()
  if (carpeta !== null) {
    servirLaWeb(app, carpeta)
    app.log.info({ carpeta }, 'Sirviendo la web construida desde el mismo proceso')
  }

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

  try {
    await app.listen({ port: configuracion.puerto, host: configuracion.host })
  } catch (error) {
    await app.close()
    throw error
  }
}

arrancar().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
