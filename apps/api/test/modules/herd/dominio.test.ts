import { describe, expect, it } from 'vitest'

import { recordedBySchema } from '../../../src/shared-kernel/actores'
import { animalIdSchema, ranchIdSchema } from '../../../src/shared-kernel/ids'
import { corregirFicha, registrarAnimal } from '../../../src/modules/herd/domain/animal'
import { corregirSalida, registrarSalida } from '../../../src/modules/herd/domain/salida'
import { RechazoDeHerd } from '../../../src/modules/herd/domain/errores'
import { crearMarca, perderMarca, reemplazarMarca } from '../../../src/modules/herd/domain/marca'

const ranchId = ranchIdSchema.parse('11111111-1111-4111-8111-111111111111')
const recordedBy = recordedBySchema.parse('22222222-2222-4222-8222-222222222222')
const id = animalIdSchema.parse('33333333-3333-4333-8333-333333333333')
const cuando = new Date('2026-03-01T18:00:00.000Z')

describe('registrar un animal', () => {
  it('acepta una ficha con todo desconocido y la deja activa', () => {
    const animal = registrarAnimal({ id, ranchId, recordedBy, recordedAt: cuando })

    expect(animal).toEqual({
      id,
      ranchId,
      nombre: null,
      sexo: 'unknown',
      categoria: 'unknown',
      detalleCategoria: null,
      tenencia: 'unknown',
      participacionEconomica: 'unknown',
      notaDelArreglo: null,
      nota: null,
      activo: true,
      salida: null,
      version: 1,
      recordedBy,
      recordedAt: cuando,
    })
  })

  it('guarda la tenencia y la participación por separado, y «a la parte» no produce un número', () => {
    const aLaParte = registrarAnimal({
      id,
      ranchId,
      recordedBy,
      recordedAt: cuando,
      tenencia: 'a_la_parte',
      participacionEconomica: 'unknown',
      notaDelArreglo: 'dicho de palabra, sin cifra',
    })
    const delRancho = registrarAnimal({
      id,
      ranchId,
      recordedBy,
      recordedAt: cuando,
      tenencia: 'unknown',
      participacionEconomica: 'known',
    })
    const tercero = registrarAnimal({
      id,
      ranchId,
      recordedBy,
      recordedAt: cuando,
      tenencia: 'third_party',
      participacionEconomica: 'partially_known',
    })

    expect(aLaParte.tenencia).toBe('a_la_parte')
    expect(aLaParte.participacionEconomica).toBe('unknown')
    expect(aLaParte.notaDelArreglo).toBe('dicho de palabra, sin cifra')
    expect(delRancho.tenencia).toBe('unknown')
    expect(delRancho.participacionEconomica).toBe('known')
    expect(tercero.tenencia).toBe('third_party')
    expect(tercero.participacionEconomica).toBe('partially_known')

    for (const animal of [aLaParte, delRancho, tercero]) {
      expect(animal).not.toHaveProperty('porcentaje')
      expect(animal).not.toHaveProperty('parte')
      for (const [clave, valor] of Object.entries(animal)) {
        if (clave === 'version') {
          continue
        }
        expect(typeof valor).not.toBe('number')
      }
    }
  })

  it('rechaza un texto libre si la categoría no es other', () => {
    expect(() =>
      registrarAnimal({
        id,
        ranchId,
        recordedBy,
        recordedAt: cuando,
        categoria: 'calf',
        detalleCategoria: 'becerro',
      }),
    ).toThrow(RechazoDeHerd)
  })
})

describe('corregir la ficha', () => {
  it('no cambia el id y guarda solo el valor anterior del campo que cambió', () => {
    const animal = registrarAnimal({
      id,
      ranchId,
      recordedBy,
      recordedAt: cuando,
      tenencia: 'a_la_parte',
      participacionEconomica: 'unknown',
    })

    const corregida = corregirFicha(animal, { nombre: 'Seña de prueba' }, 'el nombre estaba vacío')

    expect(corregida.animal.id).toBe(animal.id)
    expect(corregida.animal.ranchId).toBe(animal.ranchId)
    expect(corregida.animal.tenencia).toBe('a_la_parte')
    expect(corregida.animal.participacionEconomica).toBe('unknown')
    expect(corregida.animal.version).toBe(2)
    expect(corregida.animal.recordedAt).toEqual(cuando)
    expect(corregida.anteriores).toEqual([{ campo: 'nombre', valorAnterior: null }])
    expect(corregida.motivo).toBe('el nombre estaba vacío')
  })

  it('al dejar la categoría other, suelta el texto libre y no lo convierte en otra categoría', () => {
    const animal = registrarAnimal({
      id,
      ranchId,
      recordedBy,
      recordedAt: cuando,
      categoria: 'other',
      detalleCategoria: 'novillo',
    })

    const corregida = corregirFicha(animal, { categoria: 'calf' }, 'era becerro')

    expect(corregida.animal.categoria).toBe('calf')
    expect(corregida.animal.detalleCategoria).toBeNull()
    expect(corregida.anteriores).toEqual([
      { campo: 'categoria', valorAnterior: 'other' },
      { campo: 'detalleCategoria', valorAnterior: 'novillo' },
    ])
  })
})

describe('marcas', () => {
  it('una marca reemplazada conserva el valor y la nueva es otra', () => {
    const animalId = id
    const anterior = crearMarca({
      id: '44444444-4444-4444-8444-444444444444',
      ranchId,
      animalId,
      tipo: 'siniiga',
      valor: '  PRUEBA-ARETE-1  ',
      recordedBy,
      recordedAt: cuando,
    })

    const cerrada = reemplazarMarca(anterior, '2026-04-02')
    const nueva = crearMarca({
      id: '55555555-5555-4555-8555-555555555555',
      ranchId,
      animalId,
      tipo: 'siniiga',
      valor: 'PRUEBA-ARETE-2',
      desde: '2026-04-02',
      recordedBy,
      recordedAt: cuando,
    })

    expect(anterior.valor).toBe('PRUEBA-ARETE-1')
    expect(cerrada.valor).toBe(anterior.valor)
    expect(cerrada.estado).toBe('replaced')
    expect(cerrada.cambiadaEl).toBe('2026-04-02')
    expect(nueva.estado).toBe('active')
    expect(nueva.id).not.toBe(cerrada.id)
    expect(nueva.animalId).toBe(animalId)
  })

  it('no vuelve a cerrar una marca que ya se perdió', () => {
    const marca = perderMarca(
      crearMarca({
        id: '44444444-4444-4444-8444-444444444444',
        ranchId,
        animalId: id,
        tipo: 'other',
        valor: 'seña-roja',
        recordedBy,
        recordedAt: cuando,
      }),
      null,
    )

    expect(marca.estado).toBe('lost')
    expect(marca.cambiadaEl).toBeNull()
    expect(() => reemplazarMarca(marca, null)).toThrow(expect.objectContaining({ codigo: 'marca_no_activa' }))
  })
})

describe('salida del activo', () => {
  const animal = registrarAnimal({ id, ranchId, recordedBy, recordedAt: cuando, nombre: 'Seña' })

  it('acepta el motivo desconocido y deja la ficha', () => {
    const baja = registrarSalida(animal, { motivo: 'unknown', fecha: '2026-04-02' })

    expect(baja.activo).toBe(false)
    expect(baja.salida).toEqual({
      motivo: 'unknown',
      fecha: '2026-04-02',
      nota: null,
      evidenciaId: null,
    })
    expect(baja.nombre).toBe('Seña')
    expect(baja.id).toBe(animal.id)
    expect(baja.version).toBe(2)
  })

  it('corregir la salida lo devuelve a activo y conserva la salida anterior', () => {
    const baja = registrarSalida(animal, { motivo: 'death', fecha: '2026-04-02', nota: 'lo encontraron' })
    const vuelta = corregirSalida(baja, { activo: true }, 'seguía en el potrero')

    expect(vuelta.animal.activo).toBe(true)
    expect(vuelta.animal.salida).toBeNull()
    expect(vuelta.anterior).toEqual({
      motivo: 'death',
      fecha: '2026-04-02',
      nota: 'lo encontraron',
      evidenciaId: null,
    })
    expect(vuelta.motivo).toBe('seguía en el potrero')
    expect(vuelta.animal.version).toBe(3)
  })

  it('no mezcla volver a activo con un cambio de la salida', () => {
    const baja = registrarSalida(animal, { motivo: 'death', fecha: '2026-04-02' })
    expect(() => corregirSalida(baja, { activo: true, motivo: 'sale' }, 'no')).toThrow(
      expect.objectContaining({ codigo: 'salida_incoherente' }),
    )
  })
})
