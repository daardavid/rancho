import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sembrarRancho } from '../../../src/infrastructure/db/semilla'
import { crearGrowth } from '../../../src/modules/growth'
import { crearHerd } from '../../../src/modules/herd'
import { RechazoDeHerd } from '../../../src/modules/herd/domain/errores'
import { crearModelosDeCrecimiento } from '../../../src/read-models'
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

async function animalConNombre(nombre: string): Promise<string> {
  const id = nuevoId()
  await herd.registrar({ commandId: nuevoId(), ranchId, recordedBy, id, nombre })
  return id
}

async function potreroConNombre(nombre: string): Promise<string> {
  const id = nuevoId()
  await herd.registrarPotrero({ commandId: nuevoId(), ranchId, recordedBy, id, nombre })
  return id
}

describe('potreros y lugar esperado', () => {
  it('abre un potrero sin nombre y le pone nombre después, con historia', async () => {
    const id = nuevoId()
    const sinNombre = await herd.registrarPotrero({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id,
    })
    expect(sinNombre.nombre).toBeNull()
    expect(sinNombre.correcciones).toEqual([])

    const corregido = await herd.corregirPotrero({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      potreroId: id,
      version: 1,
      motivo: 'así le dice el rancho',
      cambios: { nombre: 'El Zapote' },
    })
    expect(corregido.nombre).toBe('El Zapote')
    expect(corregido.version).toBe(2)
    expect(corregido.correcciones).toEqual([
      expect.objectContaining({ campo: 'nombre', valorAnterior: null, motivo: 'así le dice el rancho' }),
    ])

    // Una versión vieja no cambia nada y no deja historia a medias.
    await expect(
      herd.corregirPotrero({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        potreroId: id,
        version: 1,
        motivo: 'no debe quedar',
        cambios: { nombre: 'Otro nombre' },
      }),
    ).rejects.toBeInstanceOf(ConflictoDeVersion)

    const guardado = await herd.potrero(ranchId, id)
    expect(guardado?.nombre).toBe('El Zapote')
    expect(guardado?.correcciones).toHaveLength(1)
  })

  it('el mismo comando de potrero devuelve lo guardado y otro contenido es conflicto', async () => {
    const commandId = nuevoId()
    const id = nuevoId()
    const primero = await herd.registrarPotrero({ commandId, ranchId, recordedBy, id, nombre: 'La Esperanza' })
    const segundo = await herd.registrarPotrero({ commandId, ranchId, recordedBy, id, nombre: 'La Esperanza' })
    expect(segundo).toEqual(primero)

    await expect(
      herd.registrarPotrero({ commandId, ranchId, recordedBy, id, nombre: 'Otro' }),
    ).rejects.toBeInstanceOf(ConflictoDeIdempotencia)

    expect(await herd.potreros(ranchId)).toContainEqual(expect.objectContaining({ id, nombre: 'La Esperanza' }))
  })

  it('mover un grupo escribe una asignación por animal en una transacción', async () => {
    const potrero = await potreroConNombre('Potrero del grupo')
    const uno = await animalConNombre('Grupo uno')
    const dos = await animalConNombre('Grupo dos')
    const tres = await animalConNombre('Grupo tres')

    const movimiento = await herd.asignarLugar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      potreroId: potrero,
      desde: '2026-11-20',
      animales: [
        { animalId: uno, asignacionId: nuevoId() },
        { animalId: dos, asignacionId: nuevoId() },
        { animalId: tres, asignacionId: nuevoId() },
      ],
    })

    expect(movimiento.asignaciones).toHaveLength(3)
    expect(new Set(movimiento.asignaciones.map((asignacion) => asignacion.id)).size).toBe(3)
    for (const id of [uno, dos, tres]) {
      const lugar = await herd.lugarDe(ranchId, id)
      expect(lugar?.vigente?.potreroId).toBe(potrero)
      expect(lugar?.vigente?.desde).toBe('2026-11-20')
      expect(lugar?.historia).toHaveLength(1)
    }

    const conteo = await herd.potrerosDelRancho(ranchId)
    const fila = conteo.potreros.find((fila) => fila.id === potrero)
    expect(fila?.esperados).toBe(3)
  })

  it('un animal ajeno al grupo no deja ninguna asignación escrita', async () => {
    const potrero = await potreroConNombre('Potrero del fallo')
    const propio = await animalConNombre('Propio del grupo')
    const ajeno = nuevoId()

    await expect(
      herd.asignarLugar({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        potreroId: potrero,
        desde: '2026-11-21',
        animales: [
          { animalId: propio, asignacionId: nuevoId() },
          { animalId: ajeno, asignacionId: nuevoId() },
        ],
      }),
    ).rejects.toBeInstanceOf(RechazoDeHerd)

    // La transacción se revirtió: el animal propio tampoco quedó con lugar.
    const lugar = await herd.lugarDe(ranchId, propio)
    expect(lugar?.historia).toEqual([])
  })

  it('el lugar vigente es el último y no se borra el anterior', async () => {
    const primero = await potreroConNombre('Potrero primero')
    const segundo = await potreroConNombre('Potrero segundo')
    const animalId = await animalConNombre('Se mueve')

    await herd.asignarLugar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      potreroId: primero,
      desde: '2026-11-01',
      animales: [{ animalId, asignacionId: nuevoId() }],
    })
    await herd.asignarLugar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      potreroId: segundo,
      desde: '2026-11-10',
      animales: [{ animalId, asignacionId: nuevoId() }],
    })
    // Un movimiento anotado con fecha anterior no cambia el vigente.
    await herd.asignarLugar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      potreroId: primero,
      desde: '2026-10-05',
      animales: [{ animalId, asignacionId: nuevoId() }],
    })

    const lugar = await herd.lugarDe(ranchId, animalId)
    expect(lugar?.vigente?.potreroId).toBe(segundo)
    expect(lugar?.vigente?.desde).toBe('2026-11-10')
    // La historia se guarda completa y en orden de fecha, del más viejo al más
    // nuevo. La anotación con fecha anterior no se descarta ni pisa la vigente.
    expect(lugar?.historia.map((asignacion) => asignacion.desde)).toEqual([
      '2026-10-05',
      '2026-11-01',
      '2026-11-10',
    ])
    expect(lugar?.historia.map((asignacion) => asignacion.potreroId)).toEqual([
      primero,
      primero,
      segundo,
    ])

    const lugares = await herd.lugaresDelHato(ranchId)
    expect(lugares.animales.find((fila) => fila.animalId === animalId)).toEqual({
      animalId,
      potreroId: segundo,
      desde: '2026-11-10',
    })
  })

  it('«no sé» es un lugar válido y se cuenta aparte de los que no tienen lugar', async () => {
    const conPotrero = await potreroConNombre('Potrero del no sé')
    const sabe = await animalConNombre('Sabe dónde está')
    const noSabe = await animalConNombre('No sabe dónde está')

    await herd.asignarLugar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      potreroId: conPotrero,
      desde: '2026-11-02',
      animales: [{ animalId: sabe, asignacionId: nuevoId() }],
    })
    const desconocida = await herd.asignarLugar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      potreroId: null,
      desde: '2026-11-03',
      animales: [{ animalId: noSabe, asignacionId: nuevoId() }],
    })
    expect(desconocida.asignaciones[0]?.potreroId).toBeNull()

    const lugar = await herd.lugarDe(ranchId, noSabe)
    expect(lugar?.vigente?.potreroId).toBeNull()

    const conteo = await herd.potrerosDelRancho(ranchId)
    expect(conteo.desconocidos).toBeGreaterThanOrEqual(1)
    expect(conteo.potreros.find((fila) => fila.id === conPotrero)?.esperados).toBe(1)
  })

  it('guarda quién lo dijo, aparte de la cuenta que lo registró', async () => {
    const potrero = await potreroConNombre('Potrero del origen')
    const animalId = await animalConNombre('Dicho por un trabajador')

    const movimiento = await herd.asignarLugar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      potreroId: potrero,
      desde: '2026-11-17',
      nota: 'se pasaron al lote de abajo',
      reportedBy: 'Don Chico, por WhatsApp',
      animales: [{ animalId, asignacionId: nuevoId() }],
    })

    const publicada = movimiento.asignaciones[0]
    expect(publicada?.reportedBy).toBe('Don Chico, por WhatsApp')
    // La cuenta que registró es otra cosa: no se pisa ni se mezcla.
    expect(publicada?.recordedBy).toBe(recordedBy)

    const lugar = await herd.lugarDe(ranchId, animalId)
    expect(lugar?.vigente?.reportedBy).toBe('Don Chico, por WhatsApp')
    expect(lugar?.vigente?.nota).toBe('se pasaron al lote de abajo')
  })

  it('sin quién lo dijo, la asignación se guarda con el origen en nulo', async () => {
    const animalId = await animalConNombre('Nadie dijo quién')
    await herd.asignarLugar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      potreroId: null,
      desde: '2026-11-18',
      animales: [{ animalId, asignacionId: nuevoId() }],
    })

    const lugar = await herd.lugarDe(ranchId, animalId)
    expect(lugar?.vigente?.reportedBy).toBeNull()
    expect(lugar?.vigente?.recordedBy).toBe(recordedBy)
  })

  it('un origen de solo espacios se rechaza y no escribe nada', async () => {
    const potrero = await potreroConNombre('Potrero del origen vacío')
    const animalId = await animalConNombre('Origen en blanco')

    await expect(
      herd.asignarLugar({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        potreroId: potrero,
        desde: '2026-11-19',
        reportedBy: '   ',
        animales: [{ animalId, asignacionId: nuevoId() }],
      }),
    ).rejects.toMatchObject({ codigo: 'texto_invalido' })

    const lugar = await herd.lugarDe(ranchId, animalId)
    expect(lugar?.historia).toEqual([])
  })

  it('repetir un id de asignación ya guardado es un rechazo y no escribe otra fila', async () => {
    const potrero = await potreroConNombre('Potrero del id repetido')
    const animalId = await animalConNombre('Id repetido fuera del comando')
    const asignacionId = nuevoId()

    await herd.asignarLugar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      potreroId: potrero,
      desde: '2026-11-20',
      animales: [{ animalId, asignacionId }],
    })

    // Otro comando, otro animal, el mismo id de asignación: el cliente lo acuñó
    // y ya está guardado. Es un 409, no un «no encontrado».
    const otroAnimal = await animalConNombre('Otro con el mismo id')
    await expect(
      herd.asignarLugar({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        potreroId: potrero,
        desde: '2026-11-21',
        animales: [{ animalId: otroAnimal, asignacionId }],
      }),
    ).rejects.toMatchObject({ codigo: 'asignacion_ya_existe' })

    expect((await herd.lugarDe(ranchId, otroAnimal))?.historia).toEqual([])
    expect((await herd.lugarDe(ranchId, animalId))?.historia).toHaveLength(1)
  })

  it('el mismo id de asignación repetido dentro del grupo se rechaza antes de escribir', async () => {
    const potrero = await potreroConNombre('Potrero del id duplicado')
    const uno = await animalConNombre('Duplicado uno')
    const dos = await animalConNombre('Duplicado dos')
    const asignacionId = nuevoId()

    await expect(
      herd.asignarLugar({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        potreroId: potrero,
        desde: '2026-11-22',
        animales: [
          { animalId: uno, asignacionId },
          { animalId: dos, asignacionId },
        ],
      }),
    ).rejects.toMatchObject({ codigo: 'asignacion_ya_existe' })

    // No quedó ninguna fila parcial del grupo.
    expect((await herd.lugarDe(ranchId, uno))?.historia).toEqual([])
    expect((await herd.lugarDe(ranchId, dos))?.historia).toEqual([])
  })

  it('asignar un lugar no cambia la última observación ni escribe pesos', async () => {
    const potrero = await potreroConNombre('Potrero sin observar')
    const animalId = await animalConNombre('Pesado y movido')

    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-11-05',
      filas: [
        { id: nuevoId(), animalId, resultado: 'pesado', kilos: '182.250', calidad: 'measured' },
      ],
    })

    const antes = await modelos.vistaDeAnimal(ranchId, animalId)
    expect(antes?.ultimoPesaje?.kilos).toBe('182.250')

    await herd.asignarLugar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      potreroId: potrero,
      desde: '2026-11-06',
      animales: [{ animalId, asignacionId: nuevoId() }],
    })

    const despues = await modelos.vistaDeAnimal(ranchId, animalId)
    expect(despues).toEqual(antes)
    expect(despues?.pesos).toHaveLength(1)
    expect(despues?.ultimoPesaje?.fecha).toBe('2026-11-05')
  })

  it('el mismo comando de movimiento no escribe otra asignación por animal', async () => {
    const potrero = await potreroConNombre('Potrero idempotente')
    const animalId = await animalConNombre('Se mueve dos veces')
    const commandId = nuevoId()
    const entrada = {
      commandId,
      ranchId,
      recordedBy,
      potreroId: potrero,
      desde: '2026-11-11',
      animales: [{ animalId, asignacionId: nuevoId() }],
    }

    const primero = await herd.asignarLugar(entrada)
    const segundo = await herd.asignarLugar(entrada)
    expect(segundo).toEqual(primero)

    const lugar = await herd.lugarDe(ranchId, animalId)
    expect(lugar?.historia).toHaveLength(1)
  })

  it('un potrero de otro rancho o un animal repetido se rechazan sin escribir', async () => {
    const potrero = await potreroConNombre('Potrero del rechazo')
    const animalId = await animalConNombre('Repetido')

    await expect(
      herd.asignarLugar({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        potreroId: nuevoId(),
        desde: '2026-11-12',
        animales: [{ animalId, asignacionId: nuevoId() }],
      }),
    ).rejects.toBeInstanceOf(RechazoDeHerd)

    await expect(
      herd.asignarLugar({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        potreroId: potrero,
        desde: '2026-11-12',
        animales: [
          { animalId, asignacionId: nuevoId() },
          { animalId, asignacionId: nuevoId() },
        ],
      }),
    ).rejects.toMatchObject({ codigo: 'animal_repetido' })

    const lugar = await herd.lugarDe(ranchId, animalId)
    expect(lugar?.historia).toEqual([])
  })

  it('rechaza el lugar de un animal dado de baja y no lo devuelve al hato', async () => {
    const potrero = await potreroConNombre('Potrero de la salida')
    const animalId = await animalConNombre('Se va y se le asigna lugar')

    await herd.registrarSalida({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId,
      version: 1,
      motivo: 'unknown',
      fecha: '2026-11-15',
    })

    await expect(
      herd.asignarLugar({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        potreroId: potrero,
        desde: '2026-11-16',
        animales: [{ animalId, asignacionId: nuevoId() }],
      }),
    ).rejects.toMatchObject({ codigo: 'fuera_del_hato' })

    const ficha = await herd.obtener(ranchId, animalId)
    expect(ficha?.activo).toBe(false)
    expect(ficha?.nombre).toBe('Se va y se le asigna lugar')
    expect((await herd.lugarDe(ranchId, animalId))?.historia).toEqual([])

    const lugares = await herd.lugaresDelHato(ranchId)
    expect(lugares.animales.map((fila) => fila.animalId)).not.toContain(animalId)
  })
})
