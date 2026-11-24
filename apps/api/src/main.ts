import type { FastifyInstance } from 'fastify'
import { pathToFileURL } from 'node:url'

import { construirApp } from './http/app'
import { carpetaDeLaWeb } from './http/estaticos'
import { servirLaWeb } from './http/servir-web'
import { abrirCliente } from './infrastructure/db/cliente'
import { cargarEnvLocal } from './infrastructure/db/entorno'
import { comprobacionDeBase } from './infrastructure/db/salud'
import { anunciarModoLocal, cargarConfiguracion } from './infrastructure/configuracion'
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
 * Arrancar no migra ni siembra ([arranque.test.ts](../test/infrastructure/arranque.test.ts)):
 * la base se prepara con `db:migrate` y `db:seed`, que son comandos explícitos.
 *
 * `arrancar` se exporta para que las pruebas de punta a punta levanten **este**
 * código, el compilado, dentro de su propio proceso
 * ([`e2e/servidor.ts`](../../../../e2e/servidor.ts)). Un hijo aparte quedaría
 * vivo en Windows después de que muera quien lo lanzó, y la corrida siguiente
 * probaría contra un `dist` viejo.
 */
export async function arrancar(): Promise<FastifyInstance> {
  cargarEnvLocal()
  const configuracion = cargarConfiguracion()

  const cliente = abrirCliente(configuracion.databaseUrl, configuracion.maxConexiones)
  const herd = crearHerd(cliente.db)
  const app = construirApp({
    identidad: crearIdentidad(cliente.db, configuracion.secretoDeSesion),
    herd,
    growth: crearGrowth(cliente.db, herd),
    crecimiento: crearModelosDeCrecimiento(cliente.db),
    base: comprobacionDeBase(cliente.db),
    produccion: configuracion.cookieSegura,
  })

  const carpeta = carpetaDeLaWeb()
  if (carpeta !== null) {
    servirLaWeb(app, carpeta)
    app.log.info({ carpeta }, 'Sirviendo la web construida desde el mismo proceso')
  }

  app.addHook('onClose', async () => {
    await cliente.cerrar()
  })

  try {
    await app.listen({ port: configuracion.puerto, host: configuracion.host })
  } catch (error) {
    await app.close()
    throw error
  }

  anunciarModoLocal(configuracion)

  return app
}

/** Cierra con la señal del sistema, para un despliegue que para el proceso. */
function cerrarConSenales(app: FastifyInstance): void {
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
}

/**
 * Sigue el mismo patrón que `cuenta:crear`: solo arranca solo cuando es el
 * archivo que se ejecutó. Importado desde una prueba, exporta `arrancar` y no
 * se queda escuchando.
 */
function esElArchivoEjecutado(): boolean {
  const entrada = process.argv[1]
  if (entrada === undefined) {
    return false
  }
  try {
    return import.meta.url === pathToFileURL(entrada).href
  } catch {
    return false
  }
}

if (esElArchivoEjecutado()) {
  arrancar()
    .then(cerrarConSenales)
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    })
}
