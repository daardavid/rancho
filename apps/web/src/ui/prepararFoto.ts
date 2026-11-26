import { ErrorDeApi } from '../api/http'

const FOTO_LADO = 1280
const MINIATURA_LADO = 160

/**
 * Achica la foto en el celular, antes de subirla, para no gastar datos.
 *
 * Sale una foto para verla en la ficha y una miniatura para las listas.
 * Las dos son JPEG. No hace falta otra librería: lo hace el canvas.
 */
export async function prepararFotos(archivo: File): Promise<{ foto: File; miniatura: File }> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(archivo)
  } catch {
    throw new ErrorDeApi(422, 'foto_no_es_imagen')
  }

  try {
    const foto = await reducir(bitmap, FOTO_LADO, 0.82, 'foto.jpg')
    const miniatura = await reducir(bitmap, MINIATURA_LADO, 0.8, 'miniatura.jpg')
    return { foto, miniatura }
  } finally {
    bitmap.close()
  }
}

function reducir(bitmap: ImageBitmap, lado: number, calidad: number, nombre: string): Promise<File> {
  const mayor = Math.max(bitmap.width, bitmap.height)
  const escala = mayor === 0 ? 1 : Math.min(1, lado / mayor)
  const ancho = Math.max(1, Math.round(bitmap.width * escala))
  const alto = Math.max(1, Math.round(bitmap.height * escala))
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const contexto = canvas.getContext('2d')
  if (contexto === null) {
    return Promise.reject(new ErrorDeApi(0, 'error_desconocido'))
  }
  contexto.drawImage(bitmap, 0, 0, ancho, alto)

  return new Promise((resolver, rechazar) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null || blob.size === 0) {
          rechazar(new ErrorDeApi(422, 'foto_vacia'))
          return
        }
        resolver(new File([blob], nombre, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      calidad,
    )
  })
}
