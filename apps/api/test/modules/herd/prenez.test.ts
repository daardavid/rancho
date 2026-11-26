import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sembrarRancho } from '../../../src/infrastructure/db/semilla'
import { crearHerd } from '../../../src/modules/herd'
import { RechazoDeHerd } from '../../../src/modules/herd/domain/errores'
import { recordedBySchema } from '../../../src/shared-kernel/actores'
import { nuevoId, ranchIdSchema, type RanchId } from '../../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../../db/base-de-pruebas'

const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')

let cerrar: () => Promise<void> = async () => {}
let ranchId: RanchId
let herd: ReturnType<typeof crearHerd>

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  cerrar = base.cerrar
  const sembrado = await sembrarRancho(base.db, 'Rancho de prueba')
  ranchId = ranchIdSchema.parse(sembrado.id)
  herd = crearHerd(base.db)
}, 60_000)

afterAll(async () => {
  await cerrar()
})

describe('diagnóstico de preñez', () => {
  it('corregir con un id que no es UUID se rechaza como no encontrado', async () => {
    const error: unknown = await herd
      .corregirDiagnostico({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        diagnosticoId: 'no-es-un-uuid',
        version: 1,
        motivo: 'La fecha del cuaderno era otra',
        cambios: { fecha: '2026-11-01' },
      })
      .then(
        () => null,
        (rechazo: unknown) => rechazo,
      )

    expect(error).toBeInstanceOf(RechazoDeHerd)
    expect(error).toMatchObject({ codigo: 'no_encontrado' } satisfies Partial<RechazoDeHerd>)
  })
})
