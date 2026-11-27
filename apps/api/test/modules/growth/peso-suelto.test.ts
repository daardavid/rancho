import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { crearCapturaDeDestete } from '../../../src/application/destete'
import { filasDe } from '../../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../../src/infrastructure/db/semilla'
import { crearGrowth } from '../../../src/modules/growth'
import { crearHerd } from '../../../src/modules/herd'
import { recordedBySchema } from '../../../src/shared-kernel/actores'
import { nuevoId, ranchIdSchema, type RanchId } from '../../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../../db/base-de-pruebas'

/**
 * El peso al destete es un peso suelto. Una base que ya lo tenía como vuelta
 * queda reclasificada por el SQL de la migración, que es el único lugar donde
 * esta tarea lee `herd` desde Growth.
 */

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')

let db: Base
let cerrar: () => Promise<void> = async () => {}
let ranchId: RanchId
let herd: ReturnType<typeof crearHerd>
let growth: ReturnType<typeof crearGrowth>
let captura: ReturnType<typeof crearCapturaDeDestete>

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  db = base.db
  cerrar = base.cerrar
  const sembrado = await sembrarRancho(db, 'Rancho de prueba')
  ranchId = ranchIdSchema.parse(sembrado.id)
  herd = crearHerd(db)
  growth = crearGrowth(db, herd)
  captura = crearCapturaDeDestete(db)
}, 60_000)

afterAll(async () => {
  await cerrar()
})

describe('peso suelto del destete', () => {
  it('un destete con peso no es la última vuelta y la migración lo reclasifica', async () => {
    const cria = await animal('Cría destetada')
    const pesado = await animal('Pesado en la vuelta')

    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-11-25',
      filas: [
        {
          id: nuevoId(),
          animalId: pesado,
          resultado: 'pesado',
          kilos: '180.000',
          calidad: 'measured',
        },
      ],
    })

    await captura.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      precisionFecha: 'exact',
      fecha: '2026-11-26',
      animales: [
        {
          animalId: cria,
          desteteId: nuevoId(),
          peso: { id: nuevoId(), kilos: '95.5', calidad: 'measured' },
        },
      ],
    })

    expect(await claseDe(cria)).toBe('suelto')
    expect(await claseDe(pesado)).toBe('vuelta')

    const ultima = await growth.ultima(ranchId)
    expect(ultima?.fecha).toBe('2026-11-25')
    expect(ultima?.filas.map((fila) => fila.animalId)).toEqual([pesado])
    expect(ultima?.filas.map((fila) => fila.animalId)).not.toContain(cria)

    // Como estaba la base antes de esta tarea: el destete era una vuelta.
    await db.execute(sql`
      UPDATE growth.weighing_session
      SET kind = 'vuelta'
      WHERE id = (
        SELECT session_id FROM growth.weighing_line WHERE animal_id = ${cria}
      )
    `)
    expect(await claseDe(cria)).toBe('vuelta')

    await db.execute(sql.raw(sqlDeReclasificacion()))

    expect(await claseDe(cria)).toBe('suelto')
    expect(await claseDe(pesado)).toBe('vuelta')
    const despues = await growth.ultima(ranchId)
    expect(despues?.fecha).toBe('2026-11-25')
    expect(despues?.filas.map((fila) => fila.animalId)).not.toContain(cria)
  })
})

function sqlDeReclasificacion(): string {
  const ruta = fileURLToPath(new URL('../../../drizzle/0017_peso_suelto.sql', import.meta.url))
  const sentencia = readFileSync(ruta, 'utf8')
    .split('--> statement-breakpoint')
    .map((parte) => parte.trim())
    .find((parte) => parte.includes('SET "kind" = \'suelto\''))
  if (sentencia === undefined) {
    throw new Error('La migración no reclasifica las sesiones de destete.')
  }
  return sentencia.replace(/;\s*$/, '')
}

async function animal(nombre: string): Promise<string> {
  const id = nuevoId()
  await herd.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id,
    nombre,
    categoria: 'calf',
    sexo: 'female',
  })
  return id
}

async function claseDe(animalId: string): Promise<string> {
  const filas = filasDe<{ kind: string }>(
    await db.execute(sql`
      SELECT sesion.kind
      FROM growth.weighing_session sesion
      JOIN growth.weighing_line linea ON linea.session_id = sesion.id
      WHERE linea.animal_id = ${animalId}
    `),
  )
  const clase = filas[0]?.kind
  if (clase === undefined) {
    throw new Error('No está la sesión del animal.')
  }
  return clase
}
