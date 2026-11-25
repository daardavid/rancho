import Fastify, { type FastifyInstance, LogController } from 'fastify'

import type { PuertoDeEvidencia } from '../infrastructure/evidence/puerto'
import type { Growth } from '../modules/growth'
import type { Herd } from '../modules/herd'
import type { IdentidadHttp } from '../infrastructure/identity/identidad'
import type { ModelosDeCrecimiento } from '../read-models'
import { registrarResolucionDeSesion } from './guardia'
import { idDePeticion } from './request-id'
import { registrarRutasDeAnimales } from './routes/animales'
import { registrarRutasDeNacimientos } from './routes/nacimientos'
import { registrarRutasDeCrecimiento } from './routes/crecimiento'
import { registrarRutaDeSalud, type ComprobacionDeBase } from './routes/health'
import { registrarParserDeFotos, registrarRutasDeEvidencia } from './routes/evidencia'
import { registrarRutasDePesaje } from './routes/pesajes'
import { registrarRutasDeSesion } from './routes/sesion'

export type OpcionesApp = {
  /** Baja el nivel de log en las pruebas. */
  readonly nivelDeLog?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'
  /** Si falta, las rutas de sesión no se montan. La salud sigue sin base. */
  readonly identidad?: IdentidadHttp
  /** `Secure` en la cookie solo cuando esto es verdadero. */
  readonly produccion?: boolean
  /** Si falta, las rutas de la ficha no se montan. */
  readonly herd?: Herd
  /** Si falta, las rutas de pesaje no se montan. */
  readonly growth?: Growth
  /** Si falta, no se puede subir ni ver la foto de la báscula. */
  readonly evidencia?: PuertoDeEvidencia
  /** Si falta, las rutas de crecimiento no se montan. */
  readonly crecimiento?: ModelosDeCrecimiento
  /**
   * Si falta, `GET /api/health/ready` no se monta. Las pruebas del borde sin
   * base corren así; el proceso de verdad siempre la monta.
   */
  readonly base?: ComprobacionDeBase
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
        paths: [
          'req.headers.cookie',
          'req.headers.authorization',
          'req.body.contrasena',
          'res.headers["set-cookie"]',
        ],
        censor: '[redactado]',
      },
    },
    logController: new LogController({ requestIdLogLabel: 'requestId' }),
    // El id sale de aquí y se repite en cada línea de log de la petición.
    genReqId: (peticion) => idDePeticion(peticion.headers['x-request-id']),
    // Nunca se confía en un proxy por omisión: así `peticion.ip` es la del
    // socket y no una cabecera que el cliente pueda inventar. El límite de
    // entrada cuenta con esa IP; con `trustProxy` encendido, cualquiera podría
    // mandar una cabecera distinta en cada intento y esquivarlo.
    trustProxy: false,
  })

  // El id de petición se devuelve al cliente para que un reporte de error se
  // pueda cruzar con el log sin adivinar.
  app.addHook('onSend', async (peticion, respuesta) => {
    respuesta.header('x-request-id', peticion.id)
  })

  registrarResolucionDeSesion(app, opciones.identidad)
  registrarRutaDeSalud(app, opciones.base)
  if (opciones.identidad !== undefined) {
    registrarRutasDeSesion(app, {
      identidad: opciones.identidad,
      produccion: opciones.produccion === true,
    })
  }
  if (opciones.herd !== undefined) {
    registrarRutasDeAnimales(app, opciones.herd)
    registrarRutasDeNacimientos(app, opciones.herd)
  }
  if (opciones.growth !== undefined) {
    registrarRutasDePesaje(app, opciones.growth)
  }
  if (opciones.evidencia !== undefined) {
    registrarParserDeFotos(app)
    registrarRutasDeEvidencia(app, opciones.evidencia)
  }
  if (opciones.crecimiento !== undefined) {
    registrarRutasDeCrecimiento(app, opciones.crecimiento)
  }

  return app
}
