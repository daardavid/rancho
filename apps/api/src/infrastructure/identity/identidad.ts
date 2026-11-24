import type { EjecutorSql } from '../db/filas'
import { crearCuenta } from './cuentas'
import {
  cerrarSesion,
  iniciarSesion,
  resolverSesion,
  type ResultadoDeInicio,
  type SesionActiva,
} from './sesiones'

export type { ResultadoDeInicio, SesionActiva }
export { crearCuenta }

/** Lo que el borde HTTP necesita. No conoce Drizzle ni la librería de contraseñas. */
export type IdentidadHttp = {
  iniciar(entrada: { usuario: string; contrasena: string }): Promise<ResultadoDeInicio>
  cerrar(token: string): Promise<void>
  resolver(token: string): Promise<SesionActiva | null>
}

/**
 * La identidad tal como la usa el borde HTTP, con el secreto de la instalación
 * cerrado adentro.
 *
 * El secreto no se pasa en cada llamada ni se lee de `process.env` aquí: entra
 * una vez, al armar la aplicación, y quien llama no lo ve. En producción el
 * proceso se niega a arrancar si falta ([`cargarConfiguracion`](../../main.ts));
 * en las pruebas llega desde `abrirBaseDePruebas`.
 */
export function crearIdentidad(db: EjecutorSql, secretoDeSesion: string): IdentidadHttp {
  if (secretoDeSesion.trim() === '') {
    throw new Error('Falta el secreto de sesión: sin él no se puede firmar ninguna cookie.')
  }

  return {
    iniciar: (entrada) => iniciarSesion(db, secretoDeSesion, entrada),
    cerrar: (token) => cerrarSesion(db, secretoDeSesion, token),
    resolver: (token) => resolverSesion(db, secretoDeSesion, token),
  }
}
