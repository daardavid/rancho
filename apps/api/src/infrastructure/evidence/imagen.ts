/**
 * Qué foto de la báscula se puede guardar.
 *
 * El tipo lo deciden los bytes, no el Content-Type que mande el celular
 * ([ADR-011](../../../../../docs/architecture/adr/ADR-011-evidence-storage.md)).
 * JPEG, PNG y WebP cubren la cámara del teléfono. Un PDF o un audio no es
 * la foto del indicador: esta subida es solo esa foto.
 */

export const TAMANO_MAXIMO_DE_FOTO = 25 * 1024 * 1024

export const TIPOS_DE_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'] as const
export type TipoDeImagen = (typeof TIPOS_DE_IMAGEN)[number]

export const MENSAJE_FOTO_NO_ES_IMAGEN =
  'Eso no es una foto JPEG, PNG o WebP. Toma la foto del indicador con la cámara del celular.'
export const MENSAJE_FOTO_GRANDE =
  'La foto pesa más de 25 MB. Toma otra más cerca del indicador.'
export const MENSAJE_FOTO_VACIA = 'La foto llegó vacía. Tómala otra vez.'

export const CODIGOS_DE_RECHAZO_DE_FOTO = [
  'foto_no_es_imagen',
  'foto_demasiado_grande',
  'foto_vacia',
] as const

export type CodigoDeRechazoDeFoto = (typeof CODIGOS_DE_RECHAZO_DE_FOTO)[number]

export class RechazoDeEvidencia extends Error {
  readonly codigo: CodigoDeRechazoDeFoto
  readonly mensaje: string

  constructor(codigo: CodigoDeRechazoDeFoto, mensaje: string) {
    super(mensaje)
    this.name = 'RechazoDeEvidencia'
    this.codigo = codigo
    this.mensaje = mensaje
  }
}

/** Tipo de imagen según los primeros bytes, o `null` si no es de las permitidas. */
export function tipoDeImagen(bytes: Uint8Array): TipoDeImagen | null {
  if (esJpeg(bytes)) {
    return 'image/jpeg'
  }
  if (esPng(bytes)) {
    return 'image/png'
  }
  if (esWebp(bytes)) {
    return 'image/webp'
  }
  return null
}

/**
 * Acepta la foto o explica por qué no.
 *
 * El tamaño se mira antes que la magia: un archivo enorme no se inspecciona
 * como si fuera una imagen.
 */
export function revisarImagen(bytes: Uint8Array): TipoDeImagen {
  if (bytes.byteLength === 0) {
    throw new RechazoDeEvidencia('foto_vacia', MENSAJE_FOTO_VACIA)
  }
  if (bytes.byteLength > TAMANO_MAXIMO_DE_FOTO) {
    throw new RechazoDeEvidencia('foto_demasiado_grande', MENSAJE_FOTO_GRANDE)
  }

  const tipo = tipoDeImagen(bytes)
  if (tipo === null) {
    throw new RechazoDeEvidencia('foto_no_es_imagen', MENSAJE_FOTO_NO_ES_IMAGEN)
  }
  return tipo
}

/**
 * El nombre que mandó el celular, guardado como dato.
 *
 * Se queda en el último tramo y sin separadores: nunca es una ruta. Si no
 * queda nada usable, no hay nombre.
 */
export function nombreOriginalDe(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined) {
    return null
  }

  let texto = valor.trim()
  if (texto === '') {
    return null
  }
  try {
    texto = decodeURIComponent(texto).trim()
  } catch {
    // Un `%` suelto no es un nombre codificado. Se usa el texto tal cual.
  }

  const segmento = texto.split(/[/\\]/).pop()?.trim() ?? ''
  const limpio = [...segmento].filter((caracter) => caracter.charCodeAt(0) >= 32).join('')
  if (limpio === '' || limpio === '.' || limpio === '..') {
    return null
  }
  return limpio.slice(0, 200)
}

function esJpeg(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

function esPng(bytes: Uint8Array): boolean {
  const firma = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.byteLength < firma.length) {
    return false
  }
  return firma.every((byte, indice) => bytes[indice] === byte)
}

function esWebp(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 12) {
    return false
  }
  const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
  const webp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  return riff && webp
}
