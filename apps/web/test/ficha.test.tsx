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

    // Arriba, el arete puesto y la categoría como etiquetas.
    expect((await screen.findAllByText('SINIIGA MX-7777')).length).toBeGreaterThan(0)

    // Los aretes con su historia y las correcciones están plegados.
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: /Historia de correcciones/ }))
    expect(screen.getByText(/antes decía «Canela»/)).toBeDefined()
    expect(screen.getByText(/Estaba mal escrito en el cuaderno/)).toBeDefined()

    expect(screen.getByText('210.5 kg')).toBeDefined()
    expect(screen.getByText('Medido en la báscula')).toBeDefined()
  })
})

describe('Ficha: salida', () => {
  it('la URL manda: Atrás cierra el formulario de baja y Adelante lo vuelve a abrir', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaConNombre('Canelo') }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
    })

    pintarApp(`#/animal/${ANIMAL}/salida`)

    // Llega con la baja desplegada, como el acceso «Salida» de Inicio.
    expect(await screen.findByRole('heading', { name: 'Dar de baja' })).toBeDefined()

    // Atrás del navegador: la URL vuelve a la ficha sin `/salida`.
    window.location.hash = `#/animal/${ANIMAL}`
    expect(await screen.findByRole('button', { name: /^Dar de baja$/ })).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'Dar de baja' })).toBeNull()
  })

  /**
   * R-42: el texto de la flecha y su destino son la misma decisión.
   *
   * Una ficha dada de baja abierta desde Salidas no puede decir «Regresar al
   * hato» y aterrizar en Salidas (ni al revés). Se prueban los dos orígenes y
   * el caso sin origen, que se decide por el animal.
   */
  it('en una ficha dada de baja la flecha dice «Regresar a salidas» y lleva a Salidas', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({
          nombre: 'Canelo',
          activo: false,
          version: 2,
          salida: { motivo: 'sale', fecha: '2026-11-01', nota: null, evidenciaId: null },
        }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: { ...VISTA_VACIA, activo: false },
      }),
      'GET /api/animals?estado=salidas': () => ({ estado: 200, cuerpo: { animales: [] } }),
      'GET /api/read-models/known-weights': () => ({ estado: 200, cuerpo: { pesos: [] } }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    // Sin saber de dónde se llegó, se decide por el animal: salió, va a Salidas.
    const flecha = await screen.findByRole('button', { name: 'Regresar a salidas' })
    // Y no hay ninguna flecha que prometa el hato.
    expect(screen.queryByRole('button', { name: 'Regresar al hato' })).toBeNull()

    await usuario.click(flecha)
    expect(await screen.findByRole('heading', { name: 'Salidas' })).toBeDefined()
  })

  it('una ficha dada de baja abierta desde el hato regresa al hato, y lo dice', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({
          nombre: 'Canelo',
          activo: false,
          version: 2,
          salida: { motivo: 'sale', fecha: '2026-11-01', nota: null, evidenciaId: null },
        }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: { ...VISTA_VACIA, activo: false },
      }),
      'GET /api/animals': () => ({ estado: 200, cuerpo: { animales: [] } }),
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

    // La URL dice de dónde se llegó: la búsqueda del hato encuentra a quien salió.
    pintarApp(`#/animal/${ANIMAL}?desde=hato`)

    const flecha = await screen.findByRole('button', { name: 'Regresar al hato' })
    expect(screen.queryByRole('button', { name: 'Regresar a salidas' })).toBeNull()

    await usuario.click(flecha)
    expect(await screen.findByRole('heading', { name: 'Hato' })).toBeDefined()
  })

  it('una ficha activa abierta desde Salidas regresa a Salidas, sin decir hato', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaConNombre('Canelo') }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
    })

    pintarApp(`#/animal/${ANIMAL}?desde=salidas`)

    // Aunque el animal esté activo, se llegó desde Salidas: se regresa ahí.
    expect(await screen.findByRole('button', { name: 'Regresar a salidas' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Regresar al hato' })).toBeNull()
  })

  it('un origen que no se conoce no deja la flecha sin destino', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaConNombre('Canelo') }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
    })

    pintarApp(`#/animal/${ANIMAL}?desde=otro-lado`)

    // Se ignora el valor raro y se decide por el animal.
    expect(await screen.findByRole('button', { name: 'Regresar al hato' })).toBeDefined()
  })

  it('al volver a dejarlo activo avisa que regresó al hato, no que salió', async () => {
    const usuario = userEvent.setup()
    let activo = false
    const inactiva = fichaDeAnimal({
      nombre: 'Canelo',
      activo: false,
      version: 2,
      salida: {
        motivo: 'death',
        fecha: '2026-04-02',
        nota: null,
        evidenciaId: null,
      },
    })
    const activa = fichaDeAnimal({
      nombre: 'Canelo',
      activo: true,
      version: 3,
      salida: null,
      correccionesDeSalida: [
        {
          motivoAnterior: 'death',
          fechaAnterior: '2026-04-02',
          notaAnterior: null,
          evidenciaIdAnterior: null,
          motivo: 'se había equivocado',
          correctedBy: CUENTA,
          correctedAt: CUANDO,
        },
      ],
    })

    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: activo ? activa : inactiva }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: { ...VISTA_VACIA, activo },
      }),
      [`POST /api/animals/${ANIMAL}/exit/corrections`]: () => {
        activo = true
        return { estado: 200, cuerpo: activa }
      },
    })

    pintarApp(`#/animal/${ANIMAL}`)

    await usuario.click(await screen.findByRole('button', { name: 'Corregir la salida' }))
    await usuario.click(screen.getByRole('button', { name: 'Volver a dejarlo activo' }))
    await usuario.type(screen.getByLabelText('¿Por qué se corrige?'), 'se había equivocado')
    await usuario.click(screen.getByRole('button', { name: 'Volver al hato' }))

    expect(await screen.findByText(/volvió al hato activo/)).toBeDefined()
    expect(screen.getByText(/La salida anterior quedó en la historia/)).toBeDefined()
    expect(screen.queryByText(/Salida guardada/)).toBeNull()
  })

  it('dar de baja no dice que otro animal volvió, y deshacer la del mismo sí', async () => {
    const otro = '44444444-4444-4444-8444-444444444444'
    const usuario = userEvent.setup()
    let activo = true
    const activa = fichaDeAnimal({ nombre: 'Prueba 5', activo: true, version: 1 })
    const inactiva = fichaDeAnimal({
      nombre: 'Prueba 5',
      activo: false,
      version: 2,
      salida: { motivo: 'sale', fecha: '2026-11-25', nota: null, evidenciaId: null },
    })
    const otra = fichaDeAnimal({ id: otro, nombre: 'Prueba 3', activo: true })

    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: activo ? activa : inactiva }),
      [`GET /api/animals/${otro}`]: () => ({ estado: 200, cuerpo: otra }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: { ...VISTA_VACIA, activo },
      }),
      [`GET /api/read-models/animal-growth/${otro}`]: () => ({
        estado: 200,
        cuerpo: { ...VISTA_VACIA, animalId: otro, nombre: 'Prueba 3' },
      }),
      [`POST /api/animals/${ANIMAL}/exit`]: () => {
        activo = false
        return { estado: 200, cuerpo: inactiva }
      },
      [`POST /api/animals/${ANIMAL}/exit/corrections`]: () => {
        activo = true
        return {
          estado: 200,
          cuerpo: fichaDeAnimal({
            nombre: 'Prueba 5',
            activo: true,
            version: 3,
            salida: null,
          }),
        }
      },
    })

    pintarApp(`#/animal/${ANIMAL}`)
    await usuario.click(await screen.findByRole('button', { name: 'Dar de baja' }))
    await usuario.click(screen.getByRole('button', { name: 'Dar de baja' }))

    expect(await screen.findByText(/Salida guardada/)).toBeDefined()
    expect(screen.queryByText(/volvió al hato/)).toBeNull()

    window.location.hash = `#/animal/${otro}`
    expect(await screen.findByRole('heading', { name: 'Prueba 3' })).toBeDefined()
    expect(screen.queryByText(/volvió al hato/)).toBeNull()
    expect(screen.queryByText(/Salida guardada/)).toBeNull()

    window.location.hash = `#/animal/${ANIMAL}`
    await usuario.click(await screen.findByRole('button', { name: 'Corregir la salida' }))
    await usuario.click(screen.getByRole('button', { name: 'Volver a dejarlo activo' }))
    await usuario.type(screen.getByLabelText('¿Por qué se corrige?'), 'se había equivocado')
    await usuario.click(screen.getByRole('button', { name: 'Volver al hato' }))

    expect(await screen.findByText(/volvió al hato activo/)).toBeDefined()
  })
})

describe('Ficha: última observación', () => {
  it('dice hace cuántos días se vio y en qué pesaje', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaConNombre('Canelo') }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
      [`GET /api/read-models/ultima-observacion/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: {
          animalId: ANIMAL,
          observacion: {
            fecha: '2026-11-20',
            origen: 'pesaje',
            origenId: '44444444-4444-4444-8444-444444444444',
            dias: 4,
          },
        },
      }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    expect(
      await screen.findByText('Visto por última vez: hace 4 días, en el pesaje del 20 nov 2026.'),
    ).toBeDefined()
  })

  it('sin pesaje ni nota vista se queda vacío, no en cero días', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaConNombre('Canelo') }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    expect(await screen.findByText('Sin observación')).toBeDefined()
    expect(screen.queryByText(/hace 0 días/)).toBeNull()
  })
})

describe('Ficha: lo que nadie dijo', () => {
  it('la tenencia desconocida dice de qué es', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ nombre: 'Canelo', tenencia: 'unknown', categoria: 'unknown' }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: VISTA_VACIA }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    expect(await screen.findByText('Dueño: no sé')).toBeDefined()
    expect(screen.getByText('Categoría: no sé')).toBeDefined()
  })

  it('un animal dado de baja no ofrece sanidad ni moverlo de potrero', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({
          nombre: 'Canelo',
          activo: false,
          salida: {
            motivo: 'sale',
            fecha: '2026-11-01',
            nota: null,
            evidenciaId: null,
          },
        }),
      }),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: { ...VISTA_VACIA, activo: false },
      }),
      [`GET /api/animals/${ANIMAL}/location`]: () => ({
        estado: 200,
        cuerpo: { vigente: null, historia: [] },
      }),
      'GET /api/paddocks': () => ({ estado: 200, cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 } }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    expect(await screen.findByText('Ya salió del hato. No se le asigna potrero.')).toBeDefined()
    expect(screen.queryByText(/Mover a…/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Anotar sanidad' })).toBeNull()
  })
})
