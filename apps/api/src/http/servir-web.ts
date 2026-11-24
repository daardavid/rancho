import fastifyStatic from '@fastify/static'
import type { FastifyInstance } from 'fastify'

/**
 * Sirve la web construida desde el mismo proceso que la API.
 *
 * Un solo origen es lo que mantiene la cookie de primera parte
 * ([ADR-010](../../../../docs/architecture/adr/ADR-010-authentication.md)): el
 * navegador habla con un solo nombre, así que `SameSite=Lax` alcanza y no hay
 * CORS que abrir. Además el despliegue es un proceso, no dos.
 *
 * Solo se monta cuando hay una carpeta con la web construida. En desarrollo
 * Vite sirve la web y manda `/api` a este proceso, así que aquí no hay nada que
 * servir y la API se comporta igual que antes.
 *
 * `wildcard: false` es a propósito: las pantallas de la SPA viven en el `hash`
 * de la URL (`#/pesaje`), no en rutas del servidor. Pedir `/pesaje` es un 404
 * de verdad y no se disfraza con una reescritura al índice, que escondería un
 * archivo faltante.
 */
export function servirLaWeb(app: FastifyInstance, carpeta: string): void {
  app.register(fastifyStatic, {
    root: carpeta,
    prefix: '/',
    wildcard: false,
    index: ['index.html'],
    // Los assets llevan hash en el nombre: se pueden cachear para siempre. El
    // índice no, porque es el que dice qué assets cargar en este despliegue.
    cacheControl: true,
    maxAge: '1y',
    immutable: true,
    setHeaders: (respuesta, ruta) => {
      if (ruta.endsWith('index.html')) {
        respuesta.header('cache-control', 'no-store')
      }
    },
  })
}
