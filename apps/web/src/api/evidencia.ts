import { evidenciaCreadaSchema } from '@rancho/api-contracts'

import { avisarSesionVencida } from './aviso'
import { ErrorDeApi } from './http'

/** 25 MB, el tope de una foto del indicador. */
const TAMANO_MAXIMO_DE_FOTO = 25 * 1024 * 1024

/**
 * Manda los bytes de la foto. El servidor mira la magia, no el tipo que
 * declare el celular, y devuelve el id para ponerlo junto al peso.
 */
export async function subirFoto(archivo: File): Promise<string> {
  if (archivo.size === 0) {
    throw new ErrorDeApi(422, 'foto_vacia')
  }
  if (archivo.size > TAMANO_MAXIMO_DE_FOTO) {
    throw new ErrorDeApi(413, 'foto_demasiado_grande')
  }

  let respuesta: Response
  try {
    respuesta = await fetch('/api/evidencia', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/octet-stream',
        'x-nombre-original': encodeURIComponent(archivo.name),
      },
      body: archivo,
    })
  } catch {
    throw new ErrorDeApi(0, 'sin_conexion')
  }

  if (respuesta.status === 401) {
    avisarSesionVencida()
  }

  if (!respuesta.ok) {
    throw new ErrorDeApi(respuesta.status, await codigoDe(respuesta))
  }

  let cuerpo: unknown
  try {
    cuerpo = await respuesta.json()
  } catch {
    throw new ErrorDeApi(respuesta.status, 'respuesta_invalida')
  }

  try {
    return evidenciaCreadaSchema.parse(cuerpo).id
  } catch {
    throw new ErrorDeApi(respuesta.status, 'respuesta_invalida')
  }
}

async function codigoDe(respuesta: Response): Promise<string> {
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
