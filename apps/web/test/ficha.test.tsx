import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ANIMAL, CUANDO, CUENTA, fichaDeAnimal, montarApi, pintarApp, sesionAbierta } from './ayudas'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const VISTA_VACIA = {
  animalId: ANIMAL,
  nombre: 'Canelo',
  categoria: 'cow',
  activo: true,
  pesos: [],
  ultimoPesaje: null,
  huecos: [],
}

function fichaConNombre(nombre: string, version = 1) {
  return fichaDeAnimal({
    nombre,
    sexo: 'female',
    categoria: 'cow',
    tenencia: 'ranch',
    participacionEconomica: 'known',
    version,
    correcciones: [
      {
        campo: 'nombre',
        valorAnterior: 'Canela',
        motivo: 'Estaba mal escrito en el cuaderno',
        correctedBy: CUENTA,
        correctedAt: CUANDO,
      },
    ],
    marcas: [
      {
        id: '88888888-8888-4888-8888-888888888888',
        tipo: 'siniiga',
        valor: 'MX-7777',
        desde: '2025-01-05',
        estado: 'active',
        cambiadaEl: null,
        recordedBy: CUENTA,
        recordedAt: CUANDO,
      },
    ],
  })
}

describe('Ficha: corregir', () => {
  it('pide el motivo y lo manda con el cambio y la versión que tiene abierta', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaConNombre('Canelo') }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
      [`POST /api/animals/${ANIMAL}/corrections`]: () => ({
        estado: 200,
        cuerpo: fichaConNombre('Canelo II', 2),
      }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    await usuario.click(await screen.findByRole('button', { name: 'Corregir la ficha' }))

    const motivo = screen.getByLabelText('¿Por qué se corrige?')
    const guardar = screen.getByRole('button', { name: 'Guardar corrección' })

    // Sin motivo no se puede guardar: no se manda nada a la API.
    expect((guardar as HTMLButtonElement).disabled).toBe(true)

    await usuario.clear(screen.getByLabelText('Nombre o seña'))
    await usuario.type(screen.getByLabelText('Nombre o seña'), 'Canelo II')
    await usuario.type(motivo, 'Se le puso el nombre completo')
    await usuario.click(guardar)

    await waitFor(() => {
      expect(api.peticiones.some((peticion) => peticion.metodo === 'POST')).toBe(true)
    })

    const correccion = api.peticiones.find((peticion) => peticion.metodo === 'POST')
    expect(correccion?.ruta).toBe(`/api/animals/${ANIMAL}/corrections`)
    expect(correccion?.cuerpo).toMatchObject({
      version: 1,
      motivo: 'Se le puso el nombre completo',
      nombre: 'Canelo II',
    })
    const cuerpo = correccion?.cuerpo as Record<string, unknown> | undefined
    expect(cuerpo?.commandId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('si alguien más cambió la ficha, lo explica y ofrece recargar', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaConNombre('Canelo') }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
      [`POST /api/animals/${ANIMAL}/corrections`]: () => ({
        estado: 409,
        cuerpo: { codigo: 'version_conflict' },
      }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    await usuario.click(await screen.findByRole('button', { name: 'Corregir la ficha' }))
    await usuario.clear(screen.getByLabelText('Nombre o seña'))
    await usuario.type(screen.getByLabelText('Nombre o seña'), 'Canelo II')
    await usuario.type(screen.getByLabelText('¿Por qué se corrige?'), 'Nombre completo')
    await usuario.click(screen.getByRole('button', { name: 'Guardar corrección' }))

    // La frase dice qué pasó y qué hacer, no solo el código.
    expect(
      await screen.findByText('Alguien más cambió esta ficha mientras la tenías abierta.'),
    ).toBeDefined()
    expect(screen.getByText(/Recarga la ficha para ver lo último/)).toBeDefined()
    expect(screen.getByRole('button', { name: 'Recargar la ficha' })).toBeDefined()
    // El formulario se retira: seguir escribiendo sobre datos viejos no sirve.
    expect(screen.queryByLabelText('¿Por qué se corrige?')).toBeNull()
  })

  it('después de guardar, vuelve a la ficha con la versión nueva para la siguiente corrección', async () => {
    const usuario = userEvent.setup()
    let corregidas = 0
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaConNombre('Canelo', corregidas === 0 ? 1 : 2),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
      [`POST /api/animals/${ANIMAL}/corrections`]: () => {
        corregidas += 1
        return { estado: 200, cuerpo: fichaConNombre('Canelo II', 2) }
      },
    })

    pintarApp(`#/animal/${ANIMAL}`)

    await usuario.click(await screen.findByRole('button', { name: 'Corregir la ficha' }))
    await usuario.clear(screen.getByLabelText('Nombre o seña'))
    await usuario.type(screen.getByLabelText('Nombre o seña'), 'Canelo II')
    await usuario.type(screen.getByLabelText('¿Por qué se corrige?'), 'Nombre completo')
    await usuario.click(screen.getByRole('button', { name: 'Guardar corrección' }))

    // Vuelve a la ficha, avisa que se guardó y releyó con la versión nueva.
    expect(await screen.findByText(/Corrección guardada/)).toBeDefined()
    expect(screen.queryByLabelText('¿Por qué se corrige?')).toBeNull()

    await usuario.click(screen.getByRole('button', { name: 'Corregir la ficha' }))
    await usuario.type(screen.getByLabelText('¿Por qué se corrige?'), 'Otra cosa')
    await usuario.click(screen.getByRole('button', { name: 'Guardar corrección' }))

    await waitFor(() => {
      expect(
        api.peticiones.filter((peticion) => peticion.metodo === 'POST'),
      ).toHaveLength(2)
    })

    const segunda = api.peticiones.filter((peticion) => peticion.metodo === 'POST')[1]
    const cuerpoDeLaSegunda = (segunda?.cuerpo ?? {}) as Record<string, unknown>
    // La segunda corrección manda la versión que la primera dejó, no la vieja.
    expect(cuerpoDeLaSegunda.version).toBe(2)
  })

  it('enseña los aretes y la historia de correcciones que ya tenía', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaConNombre('Canelo') }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: {
          ...VISTA_VACIA,
          pesos: [
            {
              pesoId: '99999999-9999-4999-8999-999999999999',
              sesionId: '55555555-5555-4555-8555-555555555555',
              fecha: '2026-11-01',
              kilos: '210.500',
              calidad: 'measured',
              version: 1,
              intervalo: null,
            },
          ],
          ultimoPesaje: {
            pesoId: '99999999-9999-4999-8999-999999999999',
            sesionId: '55555555-5555-4555-8555-555555555555',
            fecha: '2026-11-01',
            kilos: '210.500',
            calidad: 'measured',
            version: 1,
          },
        },
      }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    expect(await screen.findByText('SINIIGA MX-7777')).toBeDefined()
    expect(screen.getByText(/antes decía «Canela»/)).toBeDefined()
    expect(screen.getByText(/Estaba mal escrito en el cuaderno/)).toBeDefined()
    expect(screen.getByText('210.5 kg')).toBeDefined()
    expect(screen.getByText('Medido en la báscula')).toBeDefined()
  })
})
