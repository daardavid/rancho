import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { filasDe } from '../../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../../src/infrastructure/db/semilla'
import { crearHerd } from '../../../src/modules/herd'
import { RechazoDeHerd } from '../../../src/modules/herd/domain/errores'
import { recordedBySchema } from '../../../src/shared-kernel/actores'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../../src/shared-kernel/conflictos'
import { nuevoId, ranchIdSchema, type RanchId } from '../../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../../db/base-de-pruebas'

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')
const desconocido = { certeza: 'unknown' as const, animalId: null, motivo: null }

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

describe('nacimiento y filiación', () => {
  it('la ficha no tiene columnas de madre ni de padre', async () => {
    const columnas = filasDe<{ column_name: string }>(
      await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'herd' AND table_name = 'animal'
      `),
    ).map((columna) => columna.column_name)

    expect(columnas).not.toEqual(
      expect.arrayContaining(['dam_id', 'sire_id', 'mother_id', 'father_id', 'madre', 'padre']),
    )
    expect(columnas).toContain('id')
  })

  it('crea la cría y la filiación juntas, y el reintento no duplica', async () => {
    const madreId = await alta('Vaca del parto', 'cow', 'female', 'ranch')
    const commandId = nuevoId()
    const criaId = nuevoId()
    const entrada = nacimiento(criaId, commandId, {
      madre: { certeza: 'observed' as const, animalId: madreId, motivo: null },
      fechaNacimiento: '2026-04-01',
      precisionFecha: 'exact' as const,
      sexo: 'male' as const,
      tenencia: 'ranch' as const,
    })

    const primero = await herd.registrarNacimiento(entrada)
    const segundo = await herd.registrarNacimiento(entrada)

    expect(segundo).toEqual(primero)
    expect(primero.animal.categoria).toBe('calf')
    expect(primero.animal.tenencia).toBe('ranch')
    expect(primero.filiacion.madre.animalId).toBe(madreId)
    expect(await contar('herd.parentage_record', criaId)).toBe(1)
    expect(await contar('herd.animal', criaId)).toBe(1)

    await expect(
      herd.registrarNacimiento({ ...entrada, sexo: 'female' }),
    ).rejects.toBeInstanceOf(ConflictoDeIdempotencia)
    expect(await contar('herd.animal', criaId)).toBe(1)
  })

  it('si la madre no está, no queda ni la cría ni la filiación', async () => {
    const criaId = nuevoId()
    await expect(
      herd.registrarNacimiento(
        nacimiento(criaId, nuevoId(), {
          madre: { certeza: 'observed' as const, animalId: nuevoId(), motivo: null },
        }),
      ),
    ).rejects.toBeInstanceOf(RechazoDeHerd)

    expect(await contar('herd.animal', criaId)).toBe(0)
    expect(await contar('herd.parentage_record', criaId)).toBe(0)
  })

  it('la cría de una madre a la parte queda con tenencia desconocida', async () => {
    const madreId = await alta('Vaca a la parte', 'cow', 'female', 'a_la_parte')
    const criaId = nuevoId()
    const hecho = await herd.registrarNacimiento(
      nacimiento(criaId, nuevoId(), {
        madre: { certeza: 'observed' as const, animalId: madreId, motivo: null },
      }),
    )

    expect(hecho.animal.tenencia).toBe('unknown')
    expect(hecho.animal.participacionEconomica).toBe('unknown')

    await expect(
      herd.registrarNacimiento(
        nacimiento(nuevoId(), nuevoId(), {
          madre: { certeza: 'observed' as const, animalId: madreId, motivo: null },
          tenencia: 'ranch' as const,
        }),
      ),
    ).rejects.toMatchObject({ codigo: 'tenencia_de_cria' })
  })

  it('único toro se guarda inferido, y no cuando no hay un solo toro', async () => {
    const toroId = await alta('Toro solo', 'bull', 'male', 'ranch')
    const criaId = nuevoId()
    const hecho = await herd.registrarNacimiento(
      nacimiento(criaId, nuevoId(), {
        padre: { certeza: 'inferred' as const, animalId: toroId, motivo: 'unico_toro' as const },
      }),
    )

    expect(hecho.filiacion.padre).toEqual({
      certeza: 'inferred',
      animalId: toroId,
      motivo: 'unico_toro',
    })

    await alta('Otro toro', 'bull', 'male', 'ranch')
    const rechazada = nuevoId()
    await expect(
      herd.registrarNacimiento(
        nacimiento(rechazada, nuevoId(), {
          padre: { certeza: 'inferred' as const, animalId: toroId, motivo: 'unico_toro' as const },
        }),
      ),
    ).rejects.toMatchObject({ codigo: 'unico_toro_no_aplica' })
    expect(await contar('herd.animal', rechazada)).toBe(0)
  })

  it('corregir la filiación conserva la anterior y no cambia la ficha', async () => {
    const madreId = await alta('Vaca corregible', 'cow', 'female', 'ranch')
    const criaId = nuevoId()
    await herd.registrarNacimiento(
      nacimiento(criaId, nuevoId(), {
        nombre: 'Becerro de prueba',
        madre: { certeza: 'observed' as const, animalId: madreId, motivo: null },
      }),
    )

    const antes = await herd.familia(ranchId, madreId)
    expect(antes?.crias.map((cria) => cria.animal.id)).toContain(criaId)

    const corregida = await herd.corregirFiliacion({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      criaId,
      version: 1,
      motivo: 'la madre no era esa',
      madre: desconocido,
      padre: desconocido,
      nota: null,
      fechaNacimiento: null,
      precisionFecha: null,
    })

    expect(corregida.version).toBe(2)
    expect(corregida.madre).toEqual(desconocido)
    expect(corregida.correcciones[0]).toMatchObject({
      madre: { certeza: 'observed', animalId: madreId, motivo: null },
      motivo: 'la madre no era esa',
    })

    await expect(
      herd.corregirFiliacion({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        criaId,
        version: 1,
        motivo: 'no debe aplicarse',
        madre: { certeza: 'observed' as const, animalId: madreId, motivo: null },
        padre: desconocido,
        nota: null,
        fechaNacimiento: null,
        precisionFecha: null,
      }),
    ).rejects.toBeInstanceOf(ConflictoDeVersion)

    const ficha = await herd.obtener(ranchId, criaId)
    expect(ficha?.nombre).toBe('Becerro de prueba')
    expect(ficha?.version).toBe(1)
    expect(ficha?.categoria).toBe('calf')
    expect(ficha?.correcciones).toEqual([])
  })

  it('corregir la madre deja el único toro ya guardado, y asignarlo con dos toros sigue sin aplicar', async () => {
    await dejarSinTorosActivos()
    try {
      const toroId = await alta('Toro de la corrección', 'bull', 'male', 'ranch')
      const madreId = await alta('Vaca del parto', 'cow', 'female', 'ranch')
      const padre = {
        certeza: 'inferred' as const,
        animalId: toroId,
        motivo: 'unico_toro' as const,
      }
      const criaId = nuevoId()
      await herd.registrarNacimiento(
        nacimiento(criaId, nuevoId(), {
          nombre: 'Cría del único toro',
          madre: { certeza: 'observed' as const, animalId: madreId, motivo: null },
          padre,
          fechaNacimiento: '2026-03-15',
          precisionFecha: 'approximate' as const,
        }),
      )

      await alta('Segundo toro activo', 'bull', 'male', 'ranch')

      const corregida = await herd.corregirFiliacion({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        criaId,
        version: 1,
        motivo: 'la madre no era esa',
        madre: desconocido,
        padre,
        nota: 'parto en el corral norte',
        fechaNacimiento: '2026-03-15',
        precisionFecha: 'approximate',
      })

      expect(corregida.version).toBe(2)
      expect(corregida.padre).toEqual(padre)
      expect(corregida.madre).toEqual(desconocido)
      expect(corregida.correcciones[0]).toMatchObject({
        madre: { certeza: 'observed', animalId: madreId, motivo: null },
        padre,
        nota: null,
        fechaNacimiento: '2026-03-15',
        precisionFecha: 'approximate',
        motivo: 'la madre no era esa',
      })

      const ficha = await herd.obtener(ranchId, criaId)
      expect(ficha?.nombre).toBe('Cría del único toro')
      expect(ficha?.version).toBe(1)
      expect(ficha?.categoria).toBe('calf')
      expect(ficha?.correcciones).toEqual([])

      // La madre ya no está activa y aun así la historia puede decir su nombre.
      await db.execute(sql`UPDATE herd.animal SET active = false WHERE id = ${madreId}`)
      const activos = await herd.listarActivos(ranchId)
      expect(activos.some((animal) => animal.id === madreId)).toBe(false)
      const familia = await herd.familia(ranchId, criaId)
      expect(familia?.referidos).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: madreId, nombre: 'Vaca del parto' })]),
      )

      const rechazada = nuevoId()
      await expect(
        herd.registrarNacimiento(
          nacimiento(rechazada, nuevoId(), {
            padre: { certeza: 'inferred' as const, animalId: toroId, motivo: 'unico_toro' as const },
          }),
        ),
      ).rejects.toMatchObject({ codigo: 'unico_toro_no_aplica' })
      expect(await contar('herd.animal', rechazada)).toBe(0)

      const sinPadre = nuevoId()
      await herd.registrarNacimiento(nacimiento(sinPadre, nuevoId(), {}))
      await expect(
        herd.corregirFiliacion({
          commandId: nuevoId(),
          ranchId,
          recordedBy,
          criaId: sinPadre,
          version: 1,
          motivo: 'ahora dicen que era el único toro',
          madre: desconocido,
          padre,
          nota: null,
          fechaNacimiento: null,
          precisionFecha: null,
        }),
      ).rejects.toMatchObject({ codigo: 'unico_toro_no_aplica' })
    } finally {
      await dejarSinTorosActivos()
    }
  })
})

/** Los toros que dejaron otras pruebas no cuentan: pasan a «Otra» y este caso arma los suyos. */
async function dejarSinTorosActivos(): Promise<void> {
  const activos = await herd.listarActivos(ranchId)
  for (const animal of activos) {
    if (animal.categoria !== 'bull') {
      continue
    }
    await herd.corregir({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId: animal.id,
      version: animal.version,
      motivo: 'en la prueba ya no cuenta como toro',
      cambios: { categoria: 'other' },
    })
  }
}

async function alta(
  nombre: string,
  categoria: 'cow' | 'bull',
  sexo: 'female' | 'male',
  tenencia: 'ranch' | 'a_la_parte',
): Promise<string> {
  const id = nuevoId()
  await herd.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id,
    nombre,
    categoria,
    sexo,
    tenencia,
  })
  return id
}

function nacimiento(
  criaId: string,
  commandId: string,
  extra: Partial<{
    nombre: string
    sexo: 'female' | 'male'
    tenencia: 'ranch' | 'a_la_parte' | 'unknown'
    fechaNacimiento: string | null
    precisionFecha: 'exact' | 'approximate' | null
    madre: { certeza: 'observed' | 'inferred' | 'unknown'; animalId: string | null; motivo: null | 'parto_visto' }
    padre: {
      certeza: 'observed' | 'inferred' | 'unknown'
      animalId: string | null
      motivo: null | 'unico_toro'
    }
  }>,
) {
  return {
    commandId,
    ranchId,
    recordedBy,
    id: criaId,
    filiacionId: nuevoId(),
    fechaNacimiento: extra.fechaNacimiento ?? null,
    precisionFecha: extra.precisionFecha ?? null,
    madre: extra.madre ?? desconocido,
    padre: extra.padre ?? desconocido,
    ...(extra.nombre === undefined ? {} : { nombre: extra.nombre }),
    ...(extra.sexo === undefined ? {} : { sexo: extra.sexo }),
    ...(extra.tenencia === undefined ? {} : { tenencia: extra.tenencia }),
  }
}

async function contar(tabla: 'herd.animal' | 'herd.parentage_record', id: string): Promise<number> {
  const columna = tabla === 'herd.animal' ? sql.raw('id') : sql.raw('offspring_id')
  const filas = filasDe<{ n: unknown }>(
    await db.execute(sql`
      SELECT count(*)::int AS n
      FROM ${sql.raw(tabla)}
      WHERE ${columna} = ${id}
    `),
  )
  const n = filas[0]?.n
  return typeof n === 'number' ? n : Number(n)
}
