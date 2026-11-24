import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { TAMANO_MAXIMO_DE_FOTO, nombreOriginalDe, revisarImagen } from '../../src/infrastructure/evidence/imagen'
import { crearPuertoDeEvidencia } from '../../src/infrastructure/evidence/puerto'
import { ranchIdSchema } from '../../src/shared-kernel/ids'

const ranchId = ranchIdSchema.parse('11111111-1111-4111-8111-111111111111')
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])

describe('revisar una foto', () => {
  it('acepta JPEG, PNG y WebP por los bytes, no por el nombre', () => {
    expect(revisarImagen(jpeg)).toBe('image/jpeg')
    expect(
      revisarImagen(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])),
    ).toBe('image/png')
    const webp = new Uint8Array(12)
    webp.set([0x52, 0x49, 0x46, 0x46], 0)
    webp.set([0x57, 0x45, 0x42, 0x50], 8)
    expect(revisarImagen(webp)).toBe('image/webp')
  })

  it('rechaza otro tipo y una foto vacía, y lo dice', () => {
    expect(() => revisarImagen(Uint8Array.from(Buffer.from('GIF89a')))).toThrow(
      expect.objectContaining({
        codigo: 'foto_no_es_imagen',
        mensaje: expect.stringMatching(/JPEG, PNG o WebP/),
      }),
    )
    expect(() => revisarImagen(new Uint8Array())).toThrow(
      expect.objectContaining({ codigo: 'foto_vacia', mensaje: expect.stringMatching(/vacía/) }),
    )
  })

  it('rechaza lo que pasa de 25 MB antes de guardarlo', async () => {
    const carpeta = await mkdtemp(join(tmpdir(), 'rancho-foto-'))
    const grande = new Uint8Array(TAMANO_MAXIMO_DE_FOTO + 1)
    grande[0] = 0xff
    grande[1] = 0xd8
    grande[2] = 0xff

    const puerto = crearPuertoDeEvidencia(
      {
        execute: () => {
          throw new Error('No debía escribir la fila: la foto no cabe.')
        },
      },
      carpeta,
    )

    await expect(
      puerto.guardar({ ranchId, bytes: grande, nombreOriginal: 'indicador.jpg' }),
    ).rejects.toMatchObject({
      codigo: 'foto_demasiado_grande',
      mensaje: expect.stringMatching(/25 MB/),
    })
    expect(await readdir(carpeta)).toEqual([])
    await rm(carpeta, { recursive: true, force: true })
  })
})

describe('nombre original', () => {
  it('se queda como dato y no como ruta', () => {
    expect(nombreOriginalDe('../../nota.txt')).toBe('nota.txt')
    expect(nombreOriginalDe('..\\secreto.jpg')).toBe('secreto.jpg')
    expect(nombreOriginalDe('%2e%2e%2fpeso.jpg')).toBe('peso.jpg')
    expect(nombreOriginalDe('..')).toBeNull()
    expect(nombreOriginalDe('')).toBeNull()
    expect(nombreOriginalDe(null)).toBeNull()
  })
})
