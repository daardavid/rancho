import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sembrarRancho } from '../../../src/infrastructure/db/semilla'
import { crearHerd } from '../../../src/modules/herd'
import { RechazoDeHerd } from '../../../src/modules/herd/domain/errores'
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

async function animalConNombre(nombre: string): Promise<string> {
  const id = nuevoId()
  await herd.registrar({ commandId: nuevoId(), ranchId, recordedBy, id, nombre })
  return id
}

describe('notas de sanidad', () => {
  it('una nota a un grupo queda ligada a cada animal, con su propio id', async () => {
    const uno = await animalConNombre('Sanidad uno')
    const dos = await animalConNombre('Sanidad dos')
    const tres = await animalConNombre('Sanidad tres')

    const anotado = await herd.anotarSalud({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      tipo: 'vacuna',
      detalle: 'Vacuna contra el ántrax, en la manga',
      fecha: '2026-11-20',
      producto: 'Ántrax 200',
      vioAlAnimal: false,
      animales: [
        { animalId: uno, notaId: nuevoId() },
        { animalId: dos, notaId: nuevoId() },
        { animalId: tres, notaId: nuevoId() },
      ],
    })

    expect(anotado.notas).toHaveLength(3)
    expect(new Set(anotado.notas.map((nota) => nota.id)).size).toBe(3)

    for (const id of [uno, dos, tres]) {
      const notas = await herd.notasDeAnimal(ranchId, id)
      expect(notas?.notas).toHaveLength(1)
      expect(notas?.notas[0]?.tipo).toBe('vacuna')
      expect(notas?.notas[0]?.detalle).toBe('Vacuna contra el ántrax, en la manga')
      expect(notas?.notas[0]?.producto).toBe('Ántrax 200')
      // Cada nota es de su animal: no se comparte el renglón.
      expect(notas?.notas[0]?.animalId).toBe(id)
    }

    const porAnimal = await herd.notasDeAnimales(ranchId, [uno, dos])
    expect(porAnimal.map((fila) => fila.notas.length)).toEqual([1, 1])
  })

  it('no guarda «no se vio» si nadie lo eligió, y sí lo guarda si se eligió', async () => {
    const sinVisto = await animalConNombre('Sin visto')
    const conVisto = await animalConNombre('Con visto')
    const explicito = await animalConNombre('No se vio, dicho')

    await expect(
      herd.anotarSalud({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        tipo: 'problema',
        detalle: 'Dijo el vaquero que se le veía una herida',
        fecha: '2026-11-18',
        animales: [{ animalId: sinVisto, notaId: nuevoId() }],
      }),
    ).rejects.toMatchObject({ codigo: 'visto_sin_elegir' })
    expect((await herd.notasDeAnimal(ranchId, sinVisto))?.notas).toEqual([])

    await herd.anotarSalud({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      tipo: 'problema',
      detalle: 'Dijeron que no lo vieron',
      fecha: '2026-11-18',
      vioAlAnimal: false,
      animales: [{ animalId: explicito, notaId: nuevoId() }],
    })

    const marcada = await herd.anotarSalud({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      tipo: 'bano',
      detalle: 'Baño contra la mosca, en el corral',
      fecha: '2026-11-19',
      vioAlAnimal: true,
      animales: [{ animalId: conVisto, notaId: nuevoId() }],
    })

    const primera = await herd.notasDeAnimal(ranchId, explicito)
    expect(primera?.notas[0]?.vioAlAnimal).toBe(false)
    expect(primera?.notas[0]?.tipo).toBe('problema')

    const segunda = await herd.notasDeAnimal(ranchId, conVisto)
    expect(segunda?.notas[0]?.vioAlAnimal).toBe(true)
    expect(marcada.notas[0]?.vioAlAnimal).toBe(true)
  })

  it('corregir conserva la nota anterior con quién, cuándo y por qué', async () => {
    const animalId = await animalConNombre('Se corrige la nota')
    const notaId = nuevoId()

    await herd.anotarSalud({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      tipo: 'medicamento',
      detalle: 'Se le puso la vacuna de la rabia',
      fecha: '2026-11-10',
      vioAlAnimal: false,
      animales: [{ animalId, notaId }],
    })

    const corregida = await herd.corregirNota({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      notaId,
      version: 1,
      motivo: 'era la vacuna de la brucelosis, no la de la rabia',
      cambios: { detalle: 'Se le puso la vacuna de la brucelosis', producto: 'Brucelosis' },
    })

    expect(corregida.detalle).toBe('Se le puso la vacuna de la brucelosis')
    expect(corregida.producto).toBe('Brucelosis')
    expect(corregida.version).toBe(2)
    expect(corregida.correcciones).toEqual([
      expect.objectContaining({
        campo: 'detalle',
        valorAnterior: 'Se le puso la vacuna de la rabia',
        motivo: 'era la vacuna de la brucelosis, no la de la rabia',
      }),
      expect.objectContaining({ campo: 'producto', valorAnterior: null }),
    ])

    // La historia se queda y la nota no se duplica.
    const notas = await herd.notasDeAnimal(ranchId, animalId)
    expect(notas?.notas).toHaveLength(1)
    expect(notas?.notas[0]?.correcciones).toHaveLength(2)
  })

  it('una versión vieja no cambia la nota ni deja historia a medias', async () => {
    const animalId = await animalConNombre('Versión vieja de la nota')
    const notaId = nuevoId()

    await herd.anotarSalud({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      tipo: 'otro',
      detalle: 'Se le curó una pata',
      fecha: '2026-11-12',
      vioAlAnimal: false,
      animales: [{ animalId, notaId }],
    })

    await herd.corregirNota({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      notaId,
      version: 1,
      motivo: 'se anotó el día equivocado',
      cambios: { fecha: '2026-11-11' },
    })

    await expect(
      herd.corregirNota({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        notaId,
        version: 1,
        motivo: 'no debe quedar',
        cambios: { detalle: 'Otra cosa' },
      }),
    ).rejects.toBeInstanceOf(ConflictoDeVersion)

    const notas = await herd.notasDeAnimal(ranchId, animalId)
    expect(notas?.notas[0]?.detalle).toBe('Se le curó una pata')
    expect(notas?.notas[0]?.fecha).toBe('2026-11-11')
    expect(notas?.notas[0]?.correcciones).toHaveLength(1)
  })

  it('una corrección sin cambios se rechaza y no agrega historia', async () => {
    const animalId = await animalConNombre('Corrección vacía')
    const notaId = nuevoId()

    await herd.anotarSalud({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      tipo: 'vacuna',
      detalle: 'Vacuna de la rabia',
      fecha: '2026-11-13',
      vioAlAnimal: false,
      animales: [{ animalId, notaId }],
    })

    await expect(
      herd.corregirNota({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        notaId,
        version: 1,
        motivo: 'revisé la nota',
        cambios: { detalle: 'Vacuna de la rabia' },
      }),
    ).rejects.toMatchObject({ codigo: 'correccion_vacia' })

    const notas = await herd.notasDeAnimal(ranchId, animalId)
    expect(notas?.notas[0]?.version).toBe(1)
    expect(notas?.notas[0]?.correcciones).toEqual([])
  })

  it('el mismo comando devuelve lo guardado y otro contenido es conflicto', async () => {
    const animalId = await animalConNombre('Idempotente de sanidad')
    const commandId = nuevoId()
    const entrada = {
      commandId,
      ranchId,
      recordedBy,
      tipo: 'bano' as const,
      detalle: 'Baño de garrapata',
      fecha: '2026-11-14',
      vioAlAnimal: false,
      animales: [{ animalId, notaId: nuevoId() }],
    }

    const primero = await herd.anotarSalud(entrada)
    const segundo = await herd.anotarSalud(entrada)
    expect(segundo).toEqual(primero)

    await expect(
      herd.anotarSalud({ ...entrada, detalle: 'Otro baño' }),
    ).rejects.toBeInstanceOf(ConflictoDeIdempotencia)

    const notas = await herd.notasDeAnimal(ranchId, animalId)
    expect(notas?.notas).toHaveLength(1)
  })

  it('un animal ajeno al grupo no deja ninguna nota escrita', async () => {
    const propio = await animalConNombre('Propio de la nota')
    const ajeno = nuevoId()

    await expect(
      herd.anotarSalud({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        tipo: 'vacuna',
        detalle: 'Vacuna del grupo',
        fecha: '2026-11-15',
        vioAlAnimal: false,
        animales: [
          { animalId: propio, notaId: nuevoId() },
          { animalId: ajeno, notaId: nuevoId() },
        ],
      }),
    ).rejects.toBeInstanceOf(RechazoDeHerd)

    // La transacción se revirtió: el animal propio tampoco quedó con nota.
    const notas = await herd.notasDeAnimal(ranchId, propio)
    expect(notas?.notas).toEqual([])
  })

  it('el mismo id de nota repetido choca y no escribe dos veces', async () => {
    const uno = await animalConNombre('Nota repetida uno')
    const dos = await animalConNombre('Nota repetida dos')
    const notaId = nuevoId()

    await expect(
      herd.anotarSalud({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        tipo: 'otro',
        detalle: 'Se anotó dos veces el mismo renglón',
        fecha: '2026-11-16',
        vioAlAnimal: false,
        animales: [
          { animalId: uno, notaId },
          { animalId: dos, notaId },
        ],
      }),
    ).rejects.toMatchObject({ codigo: 'nota_ya_existe' })

    expect((await herd.notasDeAnimal(ranchId, uno))?.notas).toEqual([])
    expect((await herd.notasDeAnimal(ranchId, dos))?.notas).toEqual([])
  })

  it('un tipo que el rancho no usa se rechaza', async () => {
    const animalId = await animalConNombre('Tipo inventado')

    await expect(
      herd.anotarSalud({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        // @ts-expect-error: el tipo no es del vocabulario del rancho.
        tipo: 'inyeccion',
        detalle: 'Algo',
        fecha: '2026-11-17',
        vioAlAnimal: false,
        animales: [{ animalId, notaId: nuevoId() }],
      }),
    ).rejects.toMatchObject({ codigo: 'tipo_invalido' })

    expect((await herd.notasDeAnimal(ranchId, animalId))?.notas).toEqual([])
  })

  it('la nota guarda el día del hecho y la cuenta que la registró, no una observación', async () => {
    const animalId = await animalConNombre('Día del hecho')
    const notaId = nuevoId()

    const anotado = await herd.anotarSalud({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      tipo: 'problema',
      detalle: 'Se le vio cojera en la pata derecha',
      fecha: '2026-10-30',
      vioAlAnimal: false,
      animales: [{ animalId, notaId }],
    })

    const nota = anotado.notas[0]
    expect(nota?.fecha).toBe('2026-10-30')
    expect(nota?.recordedBy).toBe(recordedBy)
    // El día del hecho y el día en que se anotó son distintos.
    expect(nota?.recordedAt.startsWith('2026-10-30')).toBe(false)
    // «No se vio» quedó porque se eligió, no porque el campo viniera vacío.
    expect(nota?.vioAlAnimal).toBe(false)
  })

  it('rechaza sanidad para un animal que ya salió y no le escribe la nota', async () => {
    const animalId = await animalConNombre('Salió y se le anota')
    await herd.registrarSalida({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId,
      version: 1,
      motivo: 'sale',
      fecha: '2026-11-01',
    })

    await expect(
      herd.anotarSalud({
        commandId: nuevoId(),
        ranchId,
        recordedBy,
        tipo: 'otro',
        detalle: 'Se le anotó la última vacuna antes de irse',
        fecha: '2026-10-31',
        vioAlAnimal: true,
        animales: [{ animalId, notaId: nuevoId() }],
      }),
    ).rejects.toMatchObject({ codigo: 'fuera_del_hato' })

    const ficha = await herd.obtener(ranchId, animalId)
    expect(ficha?.activo).toBe(false)
    expect((await herd.notasDeAnimal(ranchId, animalId))?.notas).toEqual([])
  })

  it('las notas de un animal de otro rancho no se inventan', async () => {
    const animalId = await animalConNombre('De este rancho')
    const otroRancho = ranchIdSchema.parse(nuevoId())

    expect(await herd.notasDeAnimal(otroRancho, animalId)).toBeNull()
  })
})
