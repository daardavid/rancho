import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { filasDe } from '../../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../../src/infrastructure/db/semilla'
import { crearHerd } from '../../../src/modules/herd'
import { recordedBySchema } from '../../../src/shared-kernel/actores'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../../src/shared-kernel/conflictos'
import { nuevoId, ranchIdSchema, type RanchId } from '../../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../../db/base-de-pruebas'

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')

let db: Base
let cerrar: () => Promise<void> = async () => {}
let ranchId: RanchId
let herd: ReturnType<typeof crearHerd>

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  db = base.db
  cerrar = base.cerrar
  const sembrado = await sembrarRancho(db, 'Rancho de prueba')
  ranchId = ranchIdSchema.parse(sembrado.id)
  herd = crearHerd(db)
}, 60_000)

afterAll(async () => {
  await cerrar()
})

describe('ficha', () => {
  it('no tiene columna numérica de participación', async () => {
    const columnas = filasDe<{ column_name: string; data_type: string }>(
      await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'herd' AND table_name = 'animal'
      `),
    )

    expect(columnas.filter((columna) => columna.data_type === 'numeric')).toEqual([])
    expect(columnas.map((columna) => columna.column_name)).not.toEqual(
      expect.arrayContaining(['porcentaje', 'parte', 'share']),
    )
    expect(columnas.map((columna) => columna.column_name)).toContain('version')
  })

  it('la corrección guarda el valor anterior y una versión vieja no cambia nada', async () => {
    const id = nuevoId()
    await herd.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id,
      tenencia: 'a_la_parte',
      participacionEconomica: 'unknown',
    })

    const corregida = await herd.corregir({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId: id,
      version: 1,
      motivo: 'ahora tiene seña',
      cambios: { nombre: 'Seña de prueba' },
    })
    expect(corregida.version).toBe(2)
    expect(corregida.tenencia).toBe('a_la_parte')
    expect(corregida.participacionEconomica).toBe('unknown')

    await expect(
      herd.corregir({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        animalId: id,
        version: 1,
        motivo: 'no debe aplicarse',
        cambios: { nombre: 'No debe quedar' },
      }),
    ).rejects.toBeInstanceOf(ConflictoDeVersion)

    const ficha = await herd.obtener(ranchId, id)
    expect(ficha?.nombre).toBe('Seña de prueba')
    expect(ficha?.version).toBe(2)
    expect(ficha?.correcciones).toEqual([
      expect.objectContaining({
        campo: 'nombre',
        valorAnterior: null,
        motivo: 'ahora tiene seña',
        correctedBy: recordedBy,
      }),
    ])

    const filas = filasDe<{ tenure: string; name: string }>(
      await db.execute(sql`SELECT tenure, name FROM herd.animal WHERE id = ${id}`),
    )
    expect(filas).toEqual([{ tenure: 'a_la_parte', name: 'Seña de prueba' }])
  })

  it('el mismo comando con otro contenido es idempotency_mismatch y no duplica la ficha', async () => {
    const id = nuevoId()
    const commandId = nuevoId()
    const primera = await herd.registrar({
      commandId,
      ranchId,
      recordedBy,
      id,
      nombre: 'Primera seña',
    })
    const repetida = await herd.registrar({
      commandId,
      ranchId,
      recordedBy,
      id,
      nombre: 'Primera seña',
    })
    expect(repetida).toEqual(primera)

    await expect(
      herd.registrar({
        commandId,
        ranchId,
        recordedBy,
        id,
        nombre: 'Otra seña',
      }),
    ).rejects.toBeInstanceOf(ConflictoDeIdempotencia)

    const filas = filasDe<{ name: string }>(
      await db.execute(sql`SELECT name FROM herd.animal WHERE id = ${id}`),
    )
    expect(filas).toEqual([{ name: 'Primera seña' }])
  })
})

describe('marcas', () => {
  it('encuentra al animal por el arete que ya fue reemplazado o se perdió', async () => {
    const animalId = nuevoId()
    const vieja = nuevoId()
    const nueva = nuevoId()
    await herd.registrar({ commandId: nuevoId(), ranchId, recordedBy, id: animalId })
    await herd.agregarMarca({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId,
      marcaId: vieja,
      tipo: 'siniiga',
      valor: 'PRUEBA-ARETE-VIEJO',
      desde: '2026-01-15',
    })
    await herd.reemplazarMarca({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId,
      marcaAnteriorId: vieja,
      marcaId: nueva,
      tipo: 'siniiga',
      valor: 'PRUEBA-ARETE-NUEVO',
      cambiadaEl: '2026-02-01',
    })

    expect(await idsDe(herd.buscarPorMarca(ranchId, 'PRUEBA-ARETE-VIEJO'))).toEqual([animalId])
    expect(await idsDe(herd.buscarPorMarca(ranchId, 'PRUEBA-ARETE-NUEVO'))).toEqual([animalId])

    await herd.marcarPerdida({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId,
      marcaId: nueva,
      cambiadaEl: null,
    })

    expect(await idsDe(herd.buscarPorMarca(ranchId, 'PRUEBA-ARETE-NUEVO'))).toEqual([animalId])
    const ficha = await herd.obtener(ranchId, animalId)
    expect(ficha?.marcas.map((marca) => marca.estado).sort()).toEqual(['lost', 'replaced'])
  })

  it('no admite dos SINIIGA vigentes iguales en el rancho', async () => {
    const primero = nuevoId()
    const segundo = nuevoId()
    await herd.registrar({ commandId: nuevoId(), ranchId, recordedBy, id: primero })
    await herd.registrar({ commandId: nuevoId(), ranchId, recordedBy, id: segundo })
    await herd.agregarMarca({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId: primero,
      marcaId: nuevoId(),
      tipo: 'siniiga',
      valor: 'PRUEBA-SINIIGA-UNICA',
    })

    await expect(
      herd.agregarMarca({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        animalId: segundo,
        marcaId: nuevoId(),
        tipo: 'siniiga',
        valor: 'PRUEBA-SINIIGA-UNICA',
      }),
    ).rejects.toMatchObject({ codigo: 'marca_siniiga_duplicada' })

    const ajenas = filasDe(
      await db.execute(sql`
        SELECT id FROM herd.animal_mark
        WHERE animal_id = ${segundo} AND value = 'PRUEBA-SINIIGA-UNICA'
      `),
    )
    expect(ajenas).toEqual([])
  })

  it('al reemplazar, el mismo SINIIGA puede volver a quedar vigente', async () => {
    const animalId = nuevoId()
    const vieja = nuevoId()
    const nueva = nuevoId()
    await herd.registrar({ commandId: nuevoId(), ranchId, recordedBy, id: animalId })
    await herd.agregarMarca({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId,
      marcaId: vieja,
      tipo: 'siniiga',
      valor: 'PRUEBA-ARETE-REUSO',
    })

    await herd.reemplazarMarca({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId,
      marcaAnteriorId: vieja,
      marcaId: nueva,
      tipo: 'siniiga',
      valor: 'PRUEBA-ARETE-REUSO',
    })

    const encontradas = await herd.buscarPorMarca(ranchId, 'PRUEBA-ARETE-REUSO')
    expect(encontradas.map((ficha) => ficha.id)).toEqual([animalId])
    expect(encontradas[0]?.marcas).toHaveLength(2)
  })
})

describe('consulta para Growth', () => {
  it('dice si cada id existe y está activo en este rancho', async () => {
    const activo = nuevoId()
    const inactivo = nuevoId()
    const deOtroRancho = nuevoId()
    await herd.registrar({ commandId: nuevoId(), ranchId, recordedBy, id: activo })
    await herd.registrar({ commandId: nuevoId(), ranchId, recordedBy, id: inactivo })
    await db.execute(sql`UPDATE herd.animal SET active = false WHERE id = ${inactivo}`)
    await herd.registrar({
      commandId: nuevoId(),
      ranchId: ranchIdSchema.parse('99999999-9999-4999-8999-999999999999'),
      recordedBy,
      id: deOtroRancho,
    })

    const estados = await herd.existenEnElRancho(ranchId, [
      activo,
      inactivo,
      deOtroRancho,
      'no-es-uuid',
    ])

    expect(estados).toEqual([
      { id: activo, existe: true, activo: true },
      { id: inactivo, existe: true, activo: false },
      { id: deOtroRancho, existe: false, activo: false },
      { id: 'no-es-uuid', existe: false, activo: false },
    ])

    const lista = await herd.listarActivos(ranchId)
    const ids = lista.map((animal) => animal.id)
    expect(ids).toContain(activo)
    expect(ids).not.toContain(inactivo)
    expect(ids).not.toContain(deOtroRancho)
  })
})

async function idsDe(promesa: Promise<{ id: string }[]>): Promise<string[]> {
  const fichas = await promesa
  return fichas.map((ficha) => ficha.id)
}
