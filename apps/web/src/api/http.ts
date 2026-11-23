import { avisarSesionVencida } from './aviso'

/**
 * La única puerta a la API.
 *
 * Valida la respuesta con su contrato compartido y convierte un error HTTP en
 * un `ErrorDeApi` con el código que manda la API (`version_conflict`,
 * `no_autenticado`, …). La pantalla decide qué decir con `mensajes.ts`; aquí no
 * se inventa lenguaje del rancho.
 *
 * Un 401 significa que la sesión venció: se marca la sesión como ausente y la
 * aplicación regresa al inicio de sesión conservando la ruta de la URL, que es
 * la pantalla de destino.
 */

export class ErrorDeApi extends Error {
  readonly estado: number
  readonly codigo: string

  constructor(estado: number, codigo: string) {
    super(`La API contestó ${estado} ${codigo}`)
    this.name = 'ErrorDeApi'
    this.estado = estado
    this.codigo = codigo
  }
}

type Opciones = {
  readonly metodo?: 'GET' | 'POST' | 'DELETE'
  readonly cuerpo?: unknown
}

type Esquema<T> = { parse: (valor: unknown) => T }

export async function pedir<T>(
  esquema: Esquema<T>,
  ruta: string,
  opciones: Opciones = {},
): Promise<T> {
  const respuesta = await enviar(ruta, opciones)

  if (respuesta.status === 401) {
    avisarSesionVencida()
  }

  if (!respuesta.ok) {
    throw new ErrorDeApi(respuesta.status, await codigoDeError(respuesta))
  }

  let cuerpo: unknown
  try {
    cuerpo = await respuesta.json()
  } catch {
    throw new ErrorDeApi(respuesta.status, 'respuesta_invalida')
  }

  try {
    return esquema.parse(cuerpo)
  } catch {
    throw new ErrorDeApi(respuesta.status, 'respuesta_invalida')
  }
}

/** Para un comando que responde sin cuerpo (cerrar sesión). */
export async function pedirSinContenido(ruta: string, opciones: Opciones = {}): Promise<void> {
  const respuesta = await enviar(ruta, opciones)
  if (respuesta.status === 401) {
    avisarSesionVencida()
  }
  if (!respuesta.ok) {
    throw new ErrorDeApi(respuesta.status, await codigoDeError(respuesta))
  }
}

async function enviar(ruta: string, opciones: Opciones): Promise<Response> {
  const cabeceras: Record<string, string> = { accept: 'application/json' }
  if (opciones.cuerpo !== undefined) {
    cabeceras['content-type'] = 'application/json'
  }

  try {
    return await fetch(ruta, {
      method: opciones.metodo ?? 'GET',
      headers: cabeceras,
      ...(opciones.cuerpo !== undefined ? { body: JSON.stringify(opciones.cuerpo) } : {}),
    })
  } catch {
    // Sin señal o sin servidor: no hay estado HTTP. El mensaje pide revisar la
    // conexión y volver a intentar; el comando es idempotente, así que el
    // reintento no duplica nada.
    throw new ErrorDeApi(0, 'sin_conexion')
  }
}

async function codigoDeError(respuesta: Response): Promise<string> {
  try {
    const cuerpo: unknown = await respuesta.json()
    if (typeof cuerpo === 'object' && cuerpo !== null && 'codigo' in cuerpo) {
      const codigo = (cuerpo as { codigo?: unknown }).codigo
      if (typeof codigo === 'string') {
        return codigo
      }
    }
  } catch {
    return 'error_desconocido'
  }
  return 'error_desconocido'
}
