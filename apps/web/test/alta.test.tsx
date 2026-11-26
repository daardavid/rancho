import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  animalDeLista,
  ANIMAL,
  CUENTA,
  CUANDO,
  fichaDeAnimal,
  montarApi,
  pintarApp,
  sesionAbierta,
} from './ayudas'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const VISTA_VACIA = {
  animalId: ANIMAL,
  nombre: null,
  categoria: 'unknown',
  activo: true,
  pesos: [],
  ultimoPesaje: null,
  huecos: [],
}

/** Un arete con su id: el alta lo manda en su propio comando. */
function areteDePrueba(valor = 'MX-1001') {
  return {
    estado: 201,
    cuerpo: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      tipo: 'siniiga',
      valor,
      desde: null,
      estado: 'active',
      cambiadaEl: null,
      recordedBy: CUENTA,
      recordedAt: CUANDO,
    },
  }
}

describe('Alta de un animal', () => {
  it('con todo en «No sé» manda un solo comando y no muestra ningún error', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'POST /api/animals': () => ({ estado: 201, cuerpo: fichaDeAnimal({ nombre: 'Lucero' }) }),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Lucero' }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: {
          animalId: ANIMAL,
          nombre: 'Lucero',
          categoria: 'unknown',
          activo: true,
          pesos: [],
          ultimoPesaje: null,
          huecos: [],
        },
      }),
    })

    pintarApp('#/alta')

    // Lo único que se toca es el botón: cada pregunta ya viene en «No sé».
    await usuario.click(await screen.findByRole('button', { name: /^Guardar$/ }))

    await waitFor(() => {
      expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(1)
    })

    const alta = api.peticiones.find((peticion) => peticion.metodo === 'POST')
    expect(alta?.ruta).toBe('/api/animals')
    expect(alta?.cuerpo).toMatchObject({
      sexo: 'unknown',
      categoria: 'unknown',
      tenencia: 'unknown',
      participacionEconomica: 'unknown',
    })

    const cuerpo = alta?.cuerpo as Record<string, unknown>
    // Nada inventado: sin nombre, sin detalle de categoría, sin nota, sin arete.
    expect(cuerpo.nombre).toBeUndefined()
    expect(cuerpo.detalleCategoria).toBeUndefined()
    expect(cuerpo.nota).toBeUndefined()
    expect(cuerpo.notaDelArreglo).toBeUndefined()
    // Los identificadores los genera la pantalla.
    expect(cuerpo.commandId).toMatch(/^[0-9a-f-]{36}$/)
    expect(cuerpo.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('«No sé» no se pinta como error en ninguna de sus preguntas', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'POST /api/animals': () => ({ estado: 201, cuerpo: fichaDeAnimal() }),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaDeAnimal() }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: VISTA_VACIA,
      }),
    })

    pintarApp('#/alta')

    const boton = await screen.findByRole('button', { name: /^Guardar$/ })
    expect((boton as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()

    // Tipo, sexo y tenencia ya vienen en «No sé», y se puede guardar así.
    const noSe = screen.getAllByRole('radio', { name: 'No sé' })
    expect(noSe).toHaveLength(3)
    for (const opcion of noSe) {
      expect((opcion as HTMLInputElement).checked).toBe(true)
    }

    await usuario.click(boton)
    await screen.findByRole('heading', { name: 'Sin nombre o seña' })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('el arete se manda en su propio comando después de crear el animal', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'POST /api/animals': () => ({ estado: 201, cuerpo: fichaDeAnimal({ nombre: 'Pinto' }) }),
      [`POST /api/animals/${ANIMAL}/marks`]: () => areteDePrueba('MX-1001'),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Pinto' }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
    })

    pintarApp('#/alta')

    await usuario.type(await screen.findByLabelText('Arete SINIIGA'), 'MX-1001')
    await usuario.click(screen.getByRole('button', { name: /^Guardar$/ }))

    await waitFor(() => {
      expect(api.peticiones.filter((peticion) => peticion.metodo === 'POST')).toHaveLength(2)
    })

    // Primero la ficha, que es lo único que crea identidad; después el arete,
    // ya con el id del animal que la API confirmó.
    const altas = api.peticiones.filter((peticion) => peticion.metodo === 'POST')
    expect(altas[0]?.ruta).toBe('/api/animals')
    expect(altas[1]?.ruta).toBe(`/api/animals/${ANIMAL}/marks`)

    const arete = altas[1]?.cuerpo as Record<string, unknown>
    expect(arete).toMatchObject({ tipo: 'siniiga', valor: 'MX-1001' })
    expect(arete.commandId).toMatch(/^[0-9a-f-]{36}$/)
    // Un arete nuevo es su propio registro, con su propio id.
    expect(arete.marcaId).toMatch(/^[0-9a-f-]{36}$/)
    // El día en que se lo puso no se inventa.
    expect(arete.desde).toBeUndefined()
  })

  it('«Guardar y dar de alta otro» sigue una sola regla: limpia lo del animal y conserva lo del lote', async () => {
    const usuario = userEvent.setup()
    let altas = 0
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'POST /api/animals': () => {
        altas += 1
        return { estado: 201, cuerpo: fichaDeAnimal({ nombre: `Becerro ${String(altas)}` }) }
      },
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaDeAnimal() }),
      [`POST /api/animals/${ANIMAL}/marks`]: () => areteDePrueba('4821'),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
    })

    pintarApp('#/alta')

    await usuario.type(await screen.findByLabelText('Nombre o seña'), 'Becerro Uno')
    await usuario.type(screen.getByLabelText('Arete SINIIGA'), '4821')
    await usuario.click(screen.getByRole('radio', { name: 'Becerro' }))
    await usuario.click(screen.getByRole('radio', { name: 'Hembra' }))
    await usuario.click(screen.getByRole('radio', { name: 'A la parte' }))
    // La nota del arreglo vive en «Más datos»; se abre como lo haría el dueño.
    await usuario.click(screen.getByRole('button', { name: /Más datos/ }))
    await usuario.type(screen.getByLabelText('Nota del arreglo'), 'Arreglo con el vecino')

    await usuario.click(screen.getByRole('button', { name: 'Guardar y dar de alta otro' }))

    // Se queda en la misma pantalla y avisa qué se guardó.
    expect(await screen.findByRole('status')).toBeDefined()
    expect(window.location.hash).toBe('#/alta')

    /*
     * La regla, que es la misma para todos los campos:
     *
     * - Se limpia lo que identifica a este animal: nombre o seña y arete.
     * - Se conserva lo que es del lote: tipo, sexo, tenencia, participación,
     *   detalle de «Otra» y nota del arreglo.
     *
     * Antes el sexo se reiniciaba y los demás no: eso era una excepción sin
     * regla. Ahora ningún campo se comporta distinto de los de su grupo.
     */
    expect((screen.getByLabelText('Nombre o seña') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Arete SINIIGA') as HTMLInputElement).value).toBe('')

    expect((screen.getByRole('radio', { name: 'Becerro' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: 'Hembra' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: 'A la parte' }) as HTMLInputElement).checked).toBe(
      true,
    )
    // La nota del arreglo es de la tenencia, no del animal: se conserva.
    expect((screen.getByLabelText('Nota del arreglo') as HTMLTextAreaElement).value).toBe(
      'Arreglo con el vecino',
    )

    await usuario.type(screen.getByLabelText('Nombre o seña'), 'Becerro Dos')
    await usuario.click(screen.getByRole('button', { name: 'Guardar y dar de alta otro' }))

    await waitFor(() => {
      expect(api.peticiones.filter((peticion) => peticion.ruta === '/api/animals')).toHaveLength(2)
    })

    const segundas = api.peticiones.filter((peticion) => peticion.ruta === '/api/animals')
    expect(segundas[1]?.cuerpo).toMatchObject({
      nombre: 'Becerro Dos',
      categoria: 'calf',
      sexo: 'female',
      tenencia: 'a_la_parte',
      notaDelArreglo: 'Arreglo con el vecino',
    })
    // Lo que identifica al animal no se copió al siguiente.
    expect(segundas[1]?.cuerpo).not.toHaveProperty('marca')
    // Son dos animales distintos: otro id y otro comando.
    const primera = segundas[0]?.cuerpo as Record<string, unknown>
    const segunda = segundas[1]?.cuerpo as Record<string, unknown>
    expect(segunda.id).not.toBe(primera.id)
    expect(segunda.commandId).not.toBe(primera.commandId)
  })

  it('Vaca propone Hembra y Toro propone Macho; Becerro no propone nada', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
    })

    pintarApp('#/alta')
    await screen.findByLabelText('Nombre o seña')

    const sexo = (): HTMLElement => screen.getByRole('radiogroup', { name: 'Sexo' })
    const marcado = (nombre: string): boolean =>
      (within(sexo()).getByRole('radio', { name: nombre }) as HTMLInputElement).checked

    // Se empieza en «No sé»: nada viene supuesto.
    expect(marcado('No sé')).toBe(true)

    await usuario.click(screen.getByRole('radio', { name: 'Vaca' }))
    // La propuesta se ve marcada y se puede cambiar.
    expect(marcado('Hembra')).toBe(true)
    await usuario.click(within(sexo()).getByRole('radio', { name: 'Macho' }))
    expect(marcado('Macho')).toBe(true)

    await usuario.click(screen.getByRole('radio', { name: 'Toro' }))
    expect(marcado('Macho')).toBe(true)
    await usuario.click(within(sexo()).getByRole('radio', { name: 'Hembra' }))
    expect(marcado('Hembra')).toBe(true)

    // Becerro no propone: el sexo se queda como lo dejó el dueño.
    await usuario.click(screen.getByRole('radio', { name: 'Becerro' }))
    expect(marcado('Hembra')).toBe(true)
  })

  it('«Otra categoría» vive en «Más datos» y viaja como «Otra» con su texto', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'POST /api/animals': () => ({ estado: 201, cuerpo: fichaDeAnimal() }),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaDeAnimal() }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
    })

    pintarApp('#/alta')

    // Plegado: lo opcional no ocupa la primera pantalla.
    expect(screen.queryByLabelText('Otra categoría')).toBeNull()

    await usuario.click(await screen.findByRole('button', { name: /Más datos/ }))
    await usuario.type(screen.getByLabelText('Otra categoría'), 'Semental joven')

    await usuario.click(screen.getByRole('button', { name: /^Guardar$/ }))

    await waitFor(() => {
      expect(api.peticiones.some((peticion) => peticion.metodo === 'POST')).toBe(true)
    })
    const cuerpo = api.peticiones.find((peticion) => peticion.metodo === 'POST')
      ?.cuerpo as Record<string, unknown>
    expect(cuerpo.categoria).toBe('other')
    expect(cuerpo.detalleCategoria).toBe('Semental joven')
  })

  it('si el arete falla, el reintento manda solo el arete y no crea otro animal', async () => {
    const usuario = userEvent.setup()
    let intentosDeArete = 0
    const api = montarApi({
      'GET /api/session': sesionAbierta(),
      'POST /api/animals': () => ({ estado: 201, cuerpo: fichaDeAnimal({ nombre: 'Pinto' }) }),
      [`POST /api/animals/${ANIMAL}/marks`]: () => {
        intentosDeArete += 1
        if (intentosDeArete === 1) {
          return { estado: 409, cuerpo: { codigo: 'marca_siniiga_duplicada' } }
        }
        return areteDePrueba('MX-2002')
      },
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Pinto' }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
    })

    pintarApp('#/alta')

    await usuario.type(await screen.findByLabelText('Arete SINIIGA'), 'MX-2002')
    await usuario.click(screen.getByRole('button', { name: /^Guardar$/ }))

    // El animal sí se guardó; se dice, y la ficha no se da por buena.
    expect(await screen.findByText('El animal sí se guardó. El arete no.')).toBeDefined()
    expect(
      api.peticiones.filter(
        (peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/animals',
      ),
    ).toHaveLength(1)

    // Se corrige el número y se reintenta: solo viaja el arete, con un comando
    // nuevo porque el contenido cambió.
    await usuario.clear(screen.getByLabelText('Arete SINIIGA'))
    await usuario.type(screen.getByLabelText('Arete SINIIGA'), 'MX-3003')
    await usuario.click(screen.getByRole('button', { name: /^Guardar$/ }))

    await waitFor(() => {
      expect(api.peticiones.filter((peticion) => peticion.ruta.includes('/marks'))).toHaveLength(2)
    })

    // El alta no se repitió: un solo comando de animal. La ficha, ya abierta,
    // sí puede leer el hato para la familia; eso no es otro alta.
    expect(
      api.peticiones.filter(
        (peticion) => peticion.metodo === 'POST' && peticion.ruta === '/api/animals',
      ),
    ).toHaveLength(1)
    const intentos = api.peticiones.filter((peticion) => peticion.ruta.includes('/marks'))
    const primero = intentos[0]?.cuerpo as Record<string, unknown>
    const segundo = intentos[1]?.cuerpo as Record<string, unknown>
    expect(segundo.valor).toBe('MX-3003')
    expect(segundo.commandId).not.toBe(primero.commandId)
  })

  it('encuentra al animal por un arete que ya se cambió', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({
        estado: 200,
        cuerpo: {
          animales: [
            animalDeLista({
              nombre: 'Canelo',
              marcas: [
                {
                  id: '66666666-6666-4666-8666-666666666666',
                  tipo: 'siniiga',
                  valor: 'MX-0001',
                  desde: '2025-03-01',
                  estado: 'replaced',
                  cambiadaEl: '2026-02-10',
                  recordedBy: CUENTA,
                  recordedAt: CUANDO,
                },
                {
                  id: '77777777-7777-4777-8777-777777777777',
                  tipo: 'siniiga',
                  valor: 'MX-9999',
                  desde: '2026-02-10',
                  estado: 'active',
                  cambiadaEl: null,
                  recordedBy: CUENTA,
                  recordedAt: CUANDO,
                },
              ],
            }),
          ],
        },
      }),
      'GET /api/read-models/growth-overview': () => ({
        estado: 200,
        cuerpo: {
          animales: [],
          gananciaMediaKilosPorDia: null,
          pesadosEnLaUltimaVuelta: 0,
          esperadosEnLaUltimaVuelta: 0,
          fechaDeLaUltimaVuelta: null,
        },
      }),
    })

    pintarApp('#/hato')

    expect(await screen.findByText('Canelo')).toBeDefined()
    // En la lista se ve el arete puesto, no el viejo.
    expect(screen.getByText(/SINIIGA MX-9999/)).toBeDefined()

    await usuario.type(screen.getByLabelText('Buscar'), 'MX-0001')
    expect(screen.getByText('Canelo')).toBeDefined()

    await usuario.clear(screen.getByLabelText('Buscar'))
    await usuario.type(screen.getByLabelText('Buscar'), 'no existe')
    expect(await screen.findByText('Ningún animal coincide')).toBeDefined()
  })

  it('sin animales invita a dar de alta el primero', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({ estado: 200, cuerpo: { animales: [] } }),
      'GET /api/animals?estado=salidas': () => ({ estado: 200, cuerpo: { animales: [] } }),
      'GET /api/read-models/growth-overview': () => ({
        estado: 200,
        cuerpo: {
          animales: [],
          gananciaMediaKilosPorDia: null,
          pesadosEnLaUltimaVuelta: 0,
          esperadosEnLaUltimaVuelta: 0,
          fechaDeLaUltimaVuelta: null,
        },
      }),
    })

    pintarApp('#/hato')

    expect(await screen.findByText('Empieza con el primer animal')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Dar de alta el primer animal' })).toBeDefined()
  })
})
