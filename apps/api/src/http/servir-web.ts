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
 *
 * `preCompressed: true` hace que un `index-abc.js` viaje como
 * `index-abc.js.br` o `.gz` cuando el navegador lo acepta. Los dos los escribe
 * el build de la web (`apps/web/build/comprimir.ts`), así que el celular con
 * señal débil baja alrededor de un tercio de los bytes y el servidor no gasta
 * CPU comprimiendo en cada petición. `@fastify/static` agrega `Vary:
 * Accept-Encoding` solo, que es lo que evita que una caché compartida
 * devuelva la versión comprimida a un cliente que no la acepta. Lo que el
 * navegador pida sin `Accept-Encoding` se sirve tal cual.
 *
 * Los `.br` y `.gz` no se publican como rutas propias (`globIgnore`): existen
 * solo como hermanos del asset para la negociación. Pedirlos por su nombre no
 * es una ruta útil y no hace falta que exista.
 */
export function servirLaWeb(app: FastifyInstance, carpeta: string): void {
  app.register(fastifyStatic, {
    root: carpeta,
    prefix: '/',
    wildcard: false,
    index: ['index.html'],
    preCompressed: true,
    globIgnore: ['**/*.br', '**/*.gz'],
    // Los assets llevan hash en el nombre: se pueden cachear para siempre. El
    // índice no, porque es el que dice qué assets cargar en este despliegue.
    cacheControl: true,
    maxAge: '1y',
    immutable: true,
    setHeaders: (respuesta, ruta) => {
      if (esElIndice(ruta)) {
        respuesta.header('cache-control', 'no-store')
      }
    },
  })
}

/**
 * Si la ruta servida es el índice, comprimida o no.
 *
 * Con `preCompressed`, la ruta que llega aquí cuando el navegador acepta
 * compresión es `index.html.br` o `index.html.gz`, no `index.html`. Comparar
 * solo con `index.html` dejaría el índice con la caché de un año de los
 * assets: el celular seguiría abriendo la versión vieja después de publicar.
 */
function esElIndice(ruta: string): boolean {
  const sinCompresion = ruta.replace(/\.(br|gz)$/, '')
  return sinCompresion.endsWith('index.html')
}
