import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'

import { sql } from 'drizzle-orm'

import { evidenceIdSchema, nuevoId, ranchIdSchema, type EvidenceId, type RanchId } from '../../shared-kernel/ids'
import { filasDe, type EjecutorSql } from '../db/filas'

import { nombreOriginalDe, revisarImagen, type TipoDeImagen } from './imagen'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Lo que el borde y Growth pueden pedirle al almacén.
 *
 * `descartar` existe para una limpieza explícita del disco. Corregir un peso,
 * quitar su foto o borrar el hecho no lo llaman: los bytes se quedan.
 */
export type MetadatosDeEvidencia = {
  readonly id: EvidenceId
  readonly ranchId: RanchId
  readonly clave: string
  readonly tipo: TipoDeImagen
  readonly tamano: number
  readonly sha256: string
  readonly nombreOriginal: string | null
}

export type LecturaDeEvidencia = {
  readonly metadatos: MetadatosDeEvidencia
  /** `null` cuando la fila existe y el archivo ya no está en el disco. */
  readonly bytes: Uint8Array | null
}

export type PuertoDeEvidencia = {
  guardar(entrada: {
    readonly ranchId: RanchId
    readonly bytes: Uint8Array
    readonly nombreOriginal: string | null
  }): Promise<MetadatosDeEvidencia>
  leer(ranchId: RanchId, id: string): Promise<LecturaDeEvidencia | null>
  perteneceAlRancho(ranchId: RanchId, evidenciaId: string): Promise<boolean>
  descartar(ranchId: RanchId, id: string): Promise<void>
}

type FilaDeArchivo = {
  id: string
  ranch_id: string
  storage_key: string
  content_type: string
  byte_size: unknown
  sha256: string
  original_filename: string | null
}

/**
 * Adaptador de sistema de archivos.
 *
 * Escribe en `{carpeta}/{ranchId}/{evidenceId}` y la fila en `evidence.file`.
 * El nombre que llegó del celular no entra en esa ruta.
 */
export function crearPuertoDeEvidencia(db: EjecutorSql, carpeta: string): PuertoDeEvidencia {
  return {
    async guardar(entrada) {
      const tipo = revisarImagen(entrada.bytes)
      const ranchId = ranchIdSchema.parse(entrada.ranchId)
      const id = evidenceIdSchema.parse(nuevoId())
      const clave = `${ranchId}/${id}`
      const sha256 = createHash('sha256').update(entrada.bytes).digest('hex')
      const nombre = nombreOriginalDe(entrada.nombreOriginal)
      const destino = rutaDelArchivo(carpeta, ranchId, id)

      await mkdir(resolve(carpeta, ranchId), { recursive: true })
      await writeFile(destino, entrada.bytes)

      await db.execute(sql`
        INSERT INTO evidence.file (
          id, ranch_id, storage_key, content_type, byte_size, sha256, original_filename
        ) VALUES (
          ${id}, ${ranchId}, ${clave}, ${tipo}, ${entrada.bytes.byteLength}, ${sha256}, ${nombre}
        )
      `)

      return {
        id,
        ranchId,
        clave,
        tipo,
        tamano: entrada.bytes.byteLength,
        sha256,
        nombreOriginal: nombre,
      }
    },

    async leer(ranchId, id) {
      const metadatos = await leerFila(db, ranchId, id)
      if (metadatos === null) {
        return null
      }

      try {
        const bytes = await readFile(rutaDelArchivo(carpeta, metadatos.ranchId, metadatos.id))
      return { metadatos, bytes }
    } catch (error) {
        if (esArchivoAusente(error)) {
          return { metadatos, bytes: null }
        }
        throw error
      }
    },

    async perteneceAlRancho(ranchId, evidenciaId) {
      return (await leerFila(db, ranchId, evidenciaId)) !== null
    },

    async descartar(ranchId, id) {
      const metadatos = await leerFila(db, ranchId, id)
      if (metadatos === null) {
        return
      }
      await db.execute(sql`
        DELETE FROM evidence.file
        WHERE id = ${metadatos.id} AND ranch_id = ${metadatos.ranchId}
      `)
      await rm(rutaDelArchivo(carpeta, metadatos.ranchId, metadatos.id), { force: true })
    },
  }
}

async function leerFila(
  db: EjecutorSql,
  ranchId: RanchId,
  id: string,
): Promise<MetadatosDeEvidencia | null> {
  const ranch = ranchIdSchema.safeParse(ranchId)
  const evidencia = evidenceIdSchema.safeParse(id)
  if (!ranch.success || !evidencia.success) {
    return null
  }

  const filas = filasDe<FilaDeArchivo>(
    await db.execute(sql`
      SELECT id, ranch_id, storage_key, content_type, byte_size, sha256, original_filename
      FROM evidence.file
      WHERE id = ${evidencia.data} AND ranch_id = ${ranch.data}
    `),
  )
  const fila = filas[0]
  if (fila === undefined) {
    return null
  }

  const clave = `${ranch.data}/${evidencia.data}`
  if (fila.storage_key !== clave) {
    return null
  }
  if (!esTipoDeImagen(fila.content_type)) {
    return null
  }

  return {
    id: evidencia.data,
    ranchId: ranch.data,
    clave,
    tipo: fila.content_type,
    tamano: entero(fila.byte_size),
    sha256: fila.sha256,
    nombreOriginal: fila.original_filename,
  }
}

/**
 * Ruta del archivo a partir de los dos ids, ya validados como UUID.
 *
 * No se parte la llave guardada ni el nombre original: un `..` ahí no tiene
 * a dónde ir.
 */
function rutaDelArchivo(carpeta: string, ranchId: string, id: string): string {
  if (!UUID.test(ranchId) || !UUID.test(id)) {
    throw new Error('La foto solo se guarda con los ids del rancho y de la evidencia.')
  }

  const raiz = resolve(carpeta)
  const destino = resolve(join(raiz, ranchId, id))
  const relativo = relative(raiz, destino)
  if (relativo.startsWith('..') || isAbsolute(relativo)) {
    throw new Error('La foto se salió de su carpeta.')
  }
  return destino
}

function esTipoDeImagen(valor: string): valor is TipoDeImagen {
  return valor === 'image/jpeg' || valor === 'image/png' || valor === 'image/webp'
}

function entero(valor: unknown): number {
  if (typeof valor === 'number' && Number.isInteger(valor)) {
    return valor
  }
  if (typeof valor === 'string' && /^\d+$/.test(valor)) {
    return Number(valor)
  }
  throw new Error('El tamaño guardado de la foto no se puede leer.')
}

function esArchivoAusente(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
