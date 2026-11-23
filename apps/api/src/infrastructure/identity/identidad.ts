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

export function crearIdentidad(db: EjecutorSql): IdentidadHttp {
  return {
    iniciar: (entrada) => iniciarSesion(db, entrada),
    cerrar: (token) => cerrarSesion(db, token),
    resolver: (token) => resolverSesion(db, token),
  }
}
