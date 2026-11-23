import Fastify, { type FastifyInstance, LogController } from 'fastify'

import { idDePeticion } from './request-id'
import { registrarRutaDeSalud } from './routes/health'

export type OpcionesApp = {
  /** Baja el nivel de log en las pruebas. */
  readonly nivelDeLog?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'
}

/**
 * Arma la aplicación HTTP.
 *
 * Aquí solo vive lo del borde: logger Pino, id de petición y rutas delgadas. Las
 * reglas del rancho no entran a este archivo; cuando existan módulos, cada ruta
 * llamará a su `index.ts` o a un orquestador de `application/`
 * ([ADR-005](../../../../docs/architecture/adr/ADR-005-backend-runtime.md)).
 *
 * Se exporta como función para que las pruebas usen `app.inject()` sin abrir un
 * puerto.
 */
export function construirApp(opciones: OpcionesApp = {}): FastifyInstance {
  const app = Fastify({
    logger: {
      // Pino ya es el logger por omisión de Fastify; se deja explícito porque la
      // arquitectura pide Pino con id de petición.
      level: opciones.nivelDeLog ?? 'info',
      redact: {
        paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
        censor: '[redactado]',
      },
    },
    logController: new LogController({ requestIdLogLabel: 'requestId' }),
    // El id sale de aquí y se repite en cada línea de log de la petición.
    genReqId: (peticion) => idDePeticion(peticion.headers['x-request-id']),
    // Nunca se confía en un proxy por omisión: la IP del cliente se usará en el
    // límite de intentos de inicio de sesión cuando exista la sesión.
    trustProxy: false,
  })

  // El id de petición se devuelve al cliente para que un reporte de error se
  // pueda cruzar con el log sin adivinar.
  app.addHook('onSend', async (peticion, respuesta) => {
    respuesta.header('x-request-id', peticion.id)
  })

  registrarRutaDeSalud(app)

  return app
}
