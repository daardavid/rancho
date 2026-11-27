import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { filasDe } from '../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearGrowth } from '../../src/modules/growth'
import { crearHerd } from '../../src/modules/herd'
import { crearModelosDeCrecimiento } from '../../src/read-models'
import { recordedBySchema } from '../../src/shared-kernel/actores'
import { nuevoId, ranchIdSchema, type RanchId } from '../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']

const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')

let db: Base
let cerrar: () => Promise<void> = async () => {}
let ranchId: RanchId
let herd: ReturnType<typeof crearHerd>
let growth: ReturnType<typeof crearGrowth>
let modelos: ReturnType<typeof crearModelosDeCrecimiento>

beforeAll(async () => {
  const base = await abrirBaseDePruebas()
  db = base.db
  cerrar = base.cerrar
  const sembrado = await sembrarRancho(db, 'Rancho de prueba')
  ranchId = ranchIdSchema.parse(sembrado.id)
  herd = crearHerd(db)
  growth = crearGrowth(db, herd)
  modelos = crearModelosDeCrecimiento(db)
}, 60_000)

afterAll(async () => {
  await cerrar()
})

async function animal(cambios: Record<string, unknown> = {}): Promise<string> {
  const id = nuevoId()
  await herd.registrar({ commandId: nuevoId(), ranchId, recordedBy, id, ...cambios })
  return id
}

/** Un animal con dos pesos. Devuelve los ids de los pesos para corregirlos. */
async function pesadoDosVeces(
  animalId: string,
  primero: { fecha: string; kilos: string; calidad?: 'measured' | 'observed' | 'declared' },
  segundo: { fecha: string; kilos: string; calidad?: 'measured' | 'observed' | 'declared' },
): Promise<{ primeroId: string; segundoId: string }> {
  const primeroId = nuevoId()
  const segundoId = nuevoId()

  await growth.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id: nuevoId(),
    fecha: primero.fecha,
    filas: [
      {
        id: primeroId,
        animalId,
        resultado: 'pesado',
        kilos: primero.kilos,
        calidad: primero.calidad ?? 'measured',
      },
    ],
  })

  await growth.registrar({
    commandId: nuevoId(),
    ranchId,
    recordedBy,
    id: nuevoId(),
    fecha: segundo.fecha,
    filas: [
      {
        id: segundoId,
        animalId,
        resultado: 'pesado',
        kilos: segundo.kilos,
        calidad: segundo.calidad ?? 'measured',
      },
    ],
  })

  return { primeroId, segundoId }
}

describe('AnimalGrowthView', () => {
  it('la ganancia por día coincide al gramo con un cálculo hecho a mano', async () => {
    const animalId = await animal()
    // 180.500 kg el 1 de marzo, 219.875 kg el 21 de marzo: 20 días.
    // 219.875 - 180.500 = 39.375 kg. 39.375 / 20 = 1.96875 -> 1.969 kg/día.
    await pesadoDosVeces(
      animalId,
      { fecha: '2026-03-01', kilos: '180.500' },
      { fecha: '2026-03-21', kilos: '219.875' },
    )

    const vista = await modelos.vistaDeAnimal(ranchId, animalId)
    expect(vista).not.toBeNull()
    expect(vista?.pesos).toHaveLength(2)

    const [primero, segundo] = vista?.pesos ?? []
    expect(primero?.intervalo).toBeNull()
    expect(segundo?.intervalo).toEqual({
      fechaPrevia: '2026-03-01',
      dias: 20,
      kilosGanados: '39.375',
      kilosPorDia: '1.969',
      calidades: ['measured', 'measured'],
      incluyeCalidadNoMedida: false,
    })
    expect(vista?.ultimoPesaje).toMatchObject({
      pesoId: segundo?.pesoId,
      fecha: '2026-03-21',
      kilos: '219.875',
      calidad: 'measured',
    })
  })

  it('la ganancia puede ser negativa y se conserva el signo', async () => {
    const animalId = await animal()
    await pesadoDosVeces(
      animalId,
      { fecha: '2026-04-01', kilos: '200.000' },
      { fecha: '2026-04-11', kilos: '185.500' },
    )

    const vista = await modelos.vistaDeAnimal(ranchId, animalId)
    const intervalo = vista?.pesos.at(-1)?.intervalo
    // -14.500 / 10 = -1.45 -> -1.450
    expect(intervalo).toMatchObject({
      dias: 10,
      kilosGanados: '-14.500',
      kilosPorDia: '-1.450',
    })
  })

  it('un peso corregido usa el valor corregido, no el que se capturó', async () => {
    const animalId = await animal()
    const { segundoId } = await pesadoDosVeces(
      animalId,
      { fecha: '2026-05-01', kilos: '100.000' },
      { fecha: '2026-05-11', kilos: '130.000' },
    )

    // Antes de corregir: 30.000 / 10 = 3.000
    const antes = await modelos.vistaDeAnimal(ranchId, animalId)
    expect(antes?.pesos.at(-1)?.intervalo?.kilosPorDia).toBe('3.000')

    // El peso real era 105.000: el animal perdió 5 kg, no ganó 30.
    await growth.corregir({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      pesoId: segundoId,
      version: 1,
      motivo: 'leí de más',
      kilos: '105.000',
    })

    const despues = await modelos.vistaDeAnimal(ranchId, animalId)
    // 5.000 / 10 = 0.500
    expect(despues?.pesos.at(-1)).toMatchObject({ kilos: '105.000', version: 2 })
    expect(despues?.pesos.at(-1)?.intervalo).toMatchObject({
      dias: 10,
      kilosGanados: '5.000',
      kilosPorDia: '0.500',
    })
    // El último pesaje también es el corregido.
    expect(despues?.ultimoPesaje).toMatchObject({ kilos: '105.000', version: 2 })
  })

  it('corregir la calidad mueve el aviso del intervalo, no solo los kilos', async () => {
    const animalId = await animal()
    const { segundoId } = await pesadoDosVeces(
      animalId,
      { fecha: '2026-05-01', kilos: '100.000' },
      { fecha: '2026-05-11', kilos: '130.000', calidad: 'measured' },
    )

    const antes = await modelos.vistaDeAnimal(ranchId, animalId)
    expect(antes?.pesos.at(-1)?.intervalo?.incluyeCalidadNoMedida).toBe(false)

    await growth.corregir({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      pesoId: segundoId,
      version: 1,
      motivo: 'no lo pesé, me lo dijeron',
      calidad: 'declared',
    })

    const despues = await modelos.vistaDeAnimal(ranchId, animalId)
    expect(despues?.pesos.at(-1)?.intervalo).toMatchObject({
      calidades: ['measured', 'declared'],
      incluyeCalidadNoMedida: true,
    })
  })

  it('un intervalo de 0 días no divide entre cero', async () => {
    const animalId = await animal()
    await pesadoDosVeces(
      animalId,
      { fecha: '2026-06-15', kilos: '210.000' },
      { fecha: '2026-06-15', kilos: '214.500' },
    )

    const vista = await modelos.vistaDeAnimal(ranchId, animalId)
    expect(vista?.pesos).toHaveLength(2)
    expect(vista?.pesos.at(-1)?.intervalo).toEqual({
      fechaPrevia: '2026-06-15',
      dias: 0,
      kilosGanados: '4.500',
      kilosPorDia: null,
      calidades: ['measured', 'measured'],
      incluyeCalidadNoMedida: false,
    })
  })

  it('un intervalo con un peso declarado u observado lo dice, no lo esconde', async () => {
    const declarado = await animal()
    await pesadoDosVeces(
      declarado,
      { fecha: '2026-07-01', kilos: '150.000', calidad: 'declared' },
      { fecha: '2026-07-15', kilos: '165.000', calidad: 'measured' },
    )
    const vistaDeclarado = await modelos.vistaDeAnimal(ranchId, declarado)
    expect(vistaDeclarado?.pesos.at(-1)?.intervalo).toMatchObject({
      calidades: ['declared', 'measured'],
      incluyeCalidadNoMedida: true,
    })

    const observado = await animal()
    await pesadoDosVeces(
      observado,
      { fecha: '2026-07-01', kilos: '150.000', calidad: 'measured' },
      { fecha: '2026-07-15', kilos: '165.000', calidad: 'observed' },
    )
    const vistaObservado = await modelos.vistaDeAnimal(ranchId, observado)
    expect(vistaObservado?.pesos.at(-1)?.intervalo).toMatchObject({
      calidades: ['measured', 'observed'],
      incluyeCalidadNoMedida: true,
    })
  })

  it('un animal sin pesos ni huecos devuelve la serie vacía, no un error', async () => {
    const animalId = await animal()

    const vista = await modelos.vistaDeAnimal(ranchId, animalId)
    expect(vista).toMatchObject({
      animalId,
      pesos: [],
      ultimoPesaje: null,
      huecos: [],
      activo: true,
    })
  })

  it('un animal de otro rancho no se ve', async () => {
    const ajeno = nuevoId()
    const otroRancho = nuevoId()
    await db.execute(sql`
      INSERT INTO herd.animal (
        id, ranch_id, sex, category, tenure, economic_participation, active, version,
        recorded_by, recorded_at
      ) VALUES (
        ${ajeno}, ${otroRancho}, 'female', 'calf', 'unknown', 'unknown', true, 1,
        ${recordedBy}, ${new Date()}
      )
    `)

    expect(await modelos.vistaDeAnimal(ranchId, ajeno)).toBeNull()
  })

  it('el hueco aparece como sesión en la que no se pesó, y no es una baja', async () => {
    const animalId = await animal()
    const sesionId = nuevoId()
    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: sesionId,
      fecha: '2026-08-01',
      filas: [{ id: nuevoId(), animalId, resultado: 'hueco' }],
    })

    const vista = await modelos.vistaDeAnimal(ranchId, animalId)
    expect(vista?.pesos).toEqual([])
    expect(vista?.ultimoPesaje).toBeNull()
    expect(vista?.huecos).toEqual([{ sesionId, fecha: '2026-08-01' }])
    expect(vista?.activo).toBe(true)
  })
})

describe('resumen del hato', () => {
  it('ordena huecos de la última sesión primero y luego la menor ganancia por día', async () => {
    const conGananciaAlta = await animal()
    const conGananciaBaja = await animal()
    const soloHueco = await animal()
    const sinNada = await animal()

    await pesadoDosVeces(
      conGananciaAlta,
      { fecha: '2026-09-01', kilos: '100.000' },
      { fecha: '2026-09-11', kilos: '140.000' },
    )
    await pesadoDosVeces(
      conGananciaBaja,
      { fecha: '2026-09-01', kilos: '100.000' },
      { fecha: '2026-09-11', kilos: '105.000' },
    )
    const ultimaSesion = nuevoId()
    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: ultimaSesion,
      fecha: '2026-09-20',
      filas: [{ id: nuevoId(), animalId: soloHueco, resultado: 'hueco' }],
    })

    const resumen = await modelos.resumenDelHato(ranchId, '2026-09-21')
    const ids = resumen.animales.map((fila) => fila.animalId)

    // El hueco de la última sesión va primero; luego la menor ganancia por día;
    // el animal sin pesos ni huecos no aparece en la pantalla de crecimiento.
    expect(ids).toContain(soloHueco)
    expect(ids).toContain(conGananciaAlta)
    expect(ids).toContain(conGananciaBaja)
    expect(ids).not.toContain(sinNada)

    // El hueco se adelanta a los dos animales que sí se pesaron.
    expect(ids.indexOf(soloHueco)).toBeLessThan(ids.indexOf(conGananciaBaja))
    expect(ids.indexOf(soloHueco)).toBeLessThan(ids.indexOf(conGananciaAlta))
    // Entre los pesados, la menor ganancia por día va primero.
    expect(ids.indexOf(conGananciaBaja)).toBeLessThan(ids.indexOf(conGananciaAlta))

    const hueco = resumen.animales.find((fila) => fila.animalId === soloHueco)
    expect(hueco).toMatchObject({
      ultimoPeso: null,
      ultimoIntervalo: null,
      diasDesdeElUltimoPesaje: null,
      fueHuecoEnLaUltimaSesion: true,
    })

    const baja = resumen.animales.find((fila) => fila.animalId === conGananciaBaja)
    expect(baja).toMatchObject({
      diasDesdeElUltimoPesaje: 10,
      fueHuecoEnLaUltimaSesion: false,
    })
    expect(baja?.ultimoPeso).toMatchObject({ kilos: '105.000' })
    expect(baja?.ultimoIntervalo).toMatchObject({ dias: 10, kilosPorDia: '0.500' })
  })

  it('no incluye animales inactivos', async () => {
    const inactivo = await animal()
    await pesadoDosVeces(
      inactivo,
      { fecha: '2026-10-01', kilos: '100.000' },
      { fecha: '2026-10-11', kilos: '110.000' },
    )
    await db.execute(sql`
      UPDATE herd.animal
      SET active = false, exit_reason = 'unknown', exit_known_on = '2026-01-15'
      WHERE id = ${inactivo}
    `)

    const resumen = await modelos.resumenDelHato(ranchId, '2026-10-12')
    expect(resumen.animales.map((fila) => fila.animalId)).not.toContain(inactivo)
  })
})

describe('media de la última vuelta', () => {
  it('coincide con un cálculo hecho a mano y trae el intervalo anterior', async () => {
    const id = ranchIdSchema.parse(nuevoId())
    await db.execute(sql`
      INSERT INTO identity.ranch (id, nombre, created_at)
      VALUES (${id}, 'Rancho de la media', ${new Date()})
    `)
    const herdLocal = crearHerd(db)
    const growthLocal = crearGrowth(db, herdLocal)

    async function alta(): Promise<string> {
      const animalId = nuevoId()
      await herdLocal.registrar({ commandId: nuevoId(), ranchId: id, recordedBy, id: animalId })
      return animalId
    }

    const subio = await alta()
    const parejo = await alta()
    const mismoDia = await alta()
    const unPeso = await alta()
    const hueco = await alta()

    await growthLocal.registrar({
      commandId: nuevoId(),
      ranchId: id,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-11-01',
      filas: [
        { id: nuevoId(), animalId: subio, resultado: 'pesado', kilos: '100.000', calidad: 'measured' },
        { id: nuevoId(), animalId: parejo, resultado: 'pesado', kilos: '200.000', calidad: 'measured' },
        { id: nuevoId(), animalId: unPeso, resultado: 'pesado', kilos: '80.000', calidad: 'measured' },
      ],
    })

    await growthLocal.registrar({
      commandId: nuevoId(),
      ranchId: id,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-11-11',
      filas: [
        { id: nuevoId(), animalId: subio, resultado: 'pesado', kilos: '110.010', calidad: 'measured' },
        { id: nuevoId(), animalId: parejo, resultado: 'pesado', kilos: '210.020', calidad: 'measured' },
        { id: nuevoId(), animalId: mismoDia, resultado: 'pesado', kilos: '50.000', calidad: 'measured' },
      ],
    })

    // Dos pesajes el mismo día: hay kilos ganados, pero no kilos por día.
    await growthLocal.registrar({
      commandId: nuevoId(),
      ranchId: id,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-11-11',
      filas: [
        { id: nuevoId(), animalId: mismoDia, resultado: 'pesado', kilos: '54.500', calidad: 'measured' },
      ],
    })

    await growthLocal.registrar({
      commandId: nuevoId(),
      ranchId: id,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-11-21',
      filas: [
        { id: nuevoId(), animalId: subio, resultado: 'pesado', kilos: '113.020', calidad: 'measured' },
        { id: nuevoId(), animalId: hueco, resultado: 'hueco' },
      ],
    })

    const resumen = await modelos.resumenDelHato(id, '2026-11-22')

    // La media es de la última vuelta (21 nov), no el promedio de intervalos
    // que terminan en otra. En esa vuelta solo se pesó a subio:
    // (113.020 − 110.010) / 10 = 0.301. parejo se quedó en la del 11 nov.
    expect(resumen.gananciaMediaKilosPorDia).toBe('0.301')
    expect(resumen.pesadosEnLaUltimaVuelta).toBe(1)
    expect(resumen.esperadosEnLaUltimaVuelta).toBe(2)
    expect(resumen.fechaDeLaUltimaVuelta).toBe('2026-11-21')

    const filaQueBajo = resumen.animales.find((fila) => fila.animalId === subio)
    expect(filaQueBajo?.ultimoIntervalo).toMatchObject({ kilosPorDia: '0.301', dias: 10 })
    expect(filaQueBajo?.intervaloAnterior).toMatchObject({
      fechaPrevia: '2026-11-01',
      dias: 10,
      kilosGanados: '10.010',
      kilosPorDia: '1.001',
      incluyeCalidadNoMedida: false,
    })

    expect(
      resumen.animales.find((fila) => fila.animalId === mismoDia)?.ultimoIntervalo?.kilosPorDia,
    ).toBeNull()
    expect(resumen.animales.find((fila) => fila.animalId === unPeso)?.ultimoIntervalo).toBeNull()
    expect(resumen.animales.find((fila) => fila.animalId === hueco)?.fueHuecoEnLaUltimaSesion).toBe(
      true,
    )
  })
})

describe('pesos conocidos para comparar una captura', () => {
  it('trae fecha y kilos en orden, y un hueco no entra', async () => {
    const animalId = await animal()
    const octubre = nuevoId()
    const noviembre = nuevoId()

    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-11-25',
      filas: [
        {
          id: noviembre,
          animalId,
          resultado: 'pesado',
          kilos: '152.500',
          calidad: 'measured',
        },
      ],
    })
    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-10-01',
      filas: [
        {
          id: octubre,
          animalId,
          resultado: 'pesado',
          kilos: '120.000',
          calidad: 'measured',
        },
      ],
    })
    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-12-01',
      filas: [{ id: nuevoId(), animalId, resultado: 'hueco' }],
    })

    const deEste = (await modelos.pesosConocidos(ranchId)).filter((peso) => peso.animalId === animalId)
    expect(deEste).toEqual([
      { animalId, fecha: '2026-10-01', kilos: '120.000' },
      { animalId, fecha: '2026-11-25', kilos: '152.500' },
    ])
  })
})

describe('lo derivado no se guarda', () => {
  it('ninguna tabla de la base guarda la ganancia de peso', async () => {
    const columnas = filasDe<{ table_schema: string; table_name: string; column_name: string }>(
      await db.execute(sql`
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema IN ('herd', 'growth')
      `),
    )

    const nombres = columnas.map((columna) => columna.column_name.toLowerCase())
    const sospechosas = nombres.filter((nombre) =>
      /gain|ganancia|growth|crecimiento|daily|por_dia|interval|ultima_observacion|last_observation/.test(
        nombre,
      ),
    )
    expect(sospechosas).toEqual([])
  })
})
