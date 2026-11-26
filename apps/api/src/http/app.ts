import Fastify, { type FastifyInstance, LogController } from 'fastify'

import type { PuertoDeEvidencia } from '../infrastructure/evidence/puerto'
import type { CapturaDeDestete } from '../application/destete'
import type { Growth } from '../modules/growth'
import type { Herd } from '../modules/herd'
import type { Journal } from '../modules/journal'
import type { IdentidadHttp } from '../infrastructure/identity/identidad'
import type {
  ModelosDeCrecimiento,
  ModelosDeCria,
  ModelosDeExportacion,
  ModelosDePresencia,
  ModelosDeResumen,
  ModelosDeTendencias,
} from '../read-models'
import { registrarResolucionDeSesion } from './guardia'
import { idDePeticion } from './request-id'
import { registrarRutasDeAnimales } from './routes/animales'
import { registrarRutasDeLugar } from './routes/lugar'
import { registrarRutasDeNacimientos } from './routes/nacimientos'
import { registrarRutasDeCrecimiento } from './routes/crecimiento'
import { registrarRutaDeSalud, type ComprobacionDeBase } from './routes/health'
import { registrarParserDeFotos, registrarRutasDeEvidencia } from './routes/evidencia'
import { registrarRutasDePesaje } from './routes/pesajes'
import { registrarRutasDePresencia } from './routes/presencia'
import { registrarRutasDeResumen } from './routes/resumen'
import { registrarRutasDeCria, registrarRutasDePrenez } from './routes/cria'
import { registrarRutasDeDestete } from './routes/destete'
import { registrarRutasDeBitacora } from './routes/bitacora'
import { registrarRutasDeExportacion } from './routes/exportacion'
import { registrarRutasDeSalud } from './routes/salud'
import { registrarRutasDeSesion } from './routes/sesion'
import { registrarRutasDeTendencias } from './routes/tendencias'

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
  /** Si falta, la última observación y Inicio no se montan. */
  readonly presencia?: ModelosDePresencia
  /** Si falta, el resumen de la semana no se monta. */
  readonly resumen?: ModelosDeResumen
  /** Si falta, la lectura de tendencias no se monta. */
  readonly tendencias?: ModelosDeTendencias
  /** Si falta, el historial de cría y la lista de vacas no se montan. */
  readonly cria?: ModelosDeCria
  /** Si falta, anotar un destete no se monta. Corregirlo también pide Herd. */
  readonly destete?: CapturaDeDestete
  /** Si falta, la bitácora y los pendientes no se montan. */
  readonly journal?: Journal
  /** Si falta, no se puede bajar el hato, los pesos ni los eventos. */
  readonly exportacion?: ModelosDeExportacion
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
    registrarRutasDeLugar(app, opciones.herd)
    registrarRutasDeSalud(app, opciones.herd)
    registrarRutasDePrenez(app, opciones.herd)
    if (opciones.destete !== undefined) {
      registrarRutasDeDestete(app, opciones.destete, opciones.herd)
    }
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
  if (opciones.presencia !== undefined) {
    registrarRutasDePresencia(app, opciones.presencia)
  }
  if (opciones.resumen !== undefined) {
    // El día del rancho sale del mismo modelo de presencia que usa Inicio: no
    // se calcula una segunda vez con otro reloj.
    registrarRutasDeResumen(app, opciones.resumen)
  }
  if (opciones.tendencias !== undefined) {
    registrarRutasDeTendencias(app, opciones.tendencias)
  }
  if (opciones.cria !== undefined) {
    registrarRutasDeCria(app, opciones.cria)
  }
  if (opciones.journal !== undefined) {
    registrarRutasDeBitacora(app, opciones.journal)
  }
  if (opciones.exportacion !== undefined) {
    registrarRutasDeExportacion(app, opciones.exportacion)
  }

  return app
}
