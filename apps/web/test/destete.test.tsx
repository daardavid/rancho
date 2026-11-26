import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useKilosDestetados } from '../src/api/destete'
import { diaLegible } from '../src/dominio/fechas'
import { Ficha } from '../src/pantallas/Ficha'
import {
  animalDeLista,
  ANIMAL,
  CUANDO,
  CUENTA,
  fichaDeAnimal,
  montarApi,
  pintarApp,
  sesionAbierta,
  type Peticion,
} from './ayudas'

/**
 * Destete en la ficha: la historia se lee en español, el formulario no guarda
 * a medias y un peso al destete refresca las lecturas que lo muestran.
 *
 * Los datos son sintéticos.
 */

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const PESO = '77777777-7777-4777-8777-777777777777'
const SESION = '55555555-5555-4555-8555-555555555555'
const DESTETE = '99999999-9999-4999-8999-999999999999'
const FOTO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function veces(peticiones: readonly Peticion[], metodo: string, ruta: string): number {
  return peticiones.filter((peticion) => peticion.metodo === metodo && peticion.ruta === ruta).length
}

function fichaDeLaCria(): Record<string, unknown> {
  return fichaDeAnimal({
    id: ANIMAL,
    nombre: 'Canelo',
    sexo: 'female',
    categoria: 'calf',
  })
}

function vistaConPeso(): Record<string, unknown> {
  const peso = {
    pesoId: PESO,
    sesionId: SESION,
    fecha: '2026-11-01',
    kilos: '180.000',
    calidad: 'measured',
    version: 1,
  }
  return {
    animalId: ANIMAL,
    nombre: 'Canelo',
    categoria: 'calf',
    activo: true,
    pesos: [{ ...peso, intervalo: null }],
    ultimoPesaje: peso,
    huecos: [],
  }
}

function pesosConHistoria(): Record<string, unknown> {
  return {
    animalId: ANIMAL,
    pesos: [
      {
        id: PESO,
        animalId: ANIMAL,
        sesionId: SESION,
        fecha: '2026-11-01',
        kilos: '180.000',
        calidad: 'measured',
        version: 1,
        evidenciaId: null,
        correcciones: [],
      },
    ],
  }
}

function desteteConCorrecciones(): Record<string, unknown> {
  return {
    animalId: ANIMAL,
    destete: {
      id: DESTETE,
      fecha: '2024-09-15',
      precisionFecha: 'exact',
      nota: null,
      reportedBy: null,
      version: 2,
      peso: {
        id: PESO,
        kilos: '200.000',
        calidad: 'measured',
        evidenciaId: FOTO,
      },
      edad: { clase: 'sin_nacimiento' },
      correcciones: [
        {
          campo: 'fecha',
          valorAnterior: '2024-08-01',
          motivo: 'El día estaba mal',
          correctedBy: CUENTA,
          correctedAt: CUANDO,
        },
        {
          campo: 'precision',
          valorAnterior: 'approximate',
          motivo: 'Sí se sabía el día',
          correctedBy: CUENTA,
          correctedAt: CUANDO,
        },
        {
          campo: 'precision',
          valorAnterior: 'exact',
          motivo: 'Era aproximada',
          correctedBy: CUENTA,
          correctedAt: CUANDO,
        },
        {
          campo: 'precision',
          valorAnterior: 'no_se',
          motivo: 'Luego se supo',
          correctedBy: CUENTA,
          correctedAt: CUANDO,
        },
        {
          campo: 'fecha',
          valorAnterior: null,
          motivo: 'No había día',
          correctedBy: CUENTA,
          correctedAt: CUANDO,
        },
      ],
    },
  }
}

type Rutas = Parameters<typeof montarApi>[0]

function rutasDeFicha(extra: Rutas = {}): Rutas {
  return {
    'GET /api/session': sesionAbierta(),
    [`GET /api/animals/${ANIMAL}`]: () => ({ estado: 200, cuerpo: fichaDeLaCria() }),
    [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({
      estado: 200,
      cuerpo: {
        animalId: ANIMAL,
        nombre: 'Canelo',
        categoria: 'calf',
        activo: true,
        pesos: [],
        ultimoPesaje: null,
        huecos: [],
      },
    }),
    'GET /api/paddocks': () => ({
      estado: 200,
      cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 },
    }),
    [`GET /api/animals/${ANIMAL}/location`]: () => ({
      estado: 200,
      cuerpo: { vigente: null, historia: [] },
    }),
    ...extra,
  }
}

/** Mantiene viva la lista de kilos destetados, que no está en la ficha. */
function LecturaDeKilos() {
  useKilosDestetados()
  return null
}

describe('Destete en la ficha', () => {
  it('la historia del destete se lee en español y enseña la foto del peso', async () => {
    montarApi(
      rutasDeFicha({
        [`GET /api/read-models/destete/${ANIMAL}`]: () => ({
          estado: 200,
          cuerpo: desteteConCorrecciones(),
        }),
      }),
    )

    pintarApp(`#/animal/${ANIMAL}`)

    expect(
      await screen.findByText(new RegExp(`antes decía «${diaLegible('2024-08-01')}»`)),
    ).toBeDefined()
    expect(screen.getByText(/antes decía «Fecha exacta»/)).toBeDefined()
    expect(screen.getByText(/antes decía «Aproximada»/)).toBeDefined()
    expect(screen.getByText(/antes decía «No sé»/)).toBeDefined()
    expect(screen.getByText(/antes decía «no se anotó»/)).toBeDefined()

    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/\bexact\b/)
    expect(texto).not.toMatch(/\bapproximate\b/)
    expect(texto).not.toMatch(/\bno_se\b/)
    expect(texto).not.toContain('2024-08-01')

    const foto =
      screen.queryByRole('img', { name: 'Foto de la báscula' }) ??
      screen.queryByText('La foto se registró, pero no se encuentra.')
    expect(foto).not.toBeNull()

    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Corregir este destete' }))
    const corregir = screen.getByRole('button', { name: 'Guardar corrección' })
    expect((corregir as HTMLButtonElement).disabled).toBe(true)
    await usuario.type(screen.getByLabelText('¿Por qué se corrige?'), 'Se anotó el día que no era')
    expect(
      (screen.getByRole('button', { name: 'Guardar corrección' }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('no deja guardar el destete ni la corrección si faltan datos, y la foto es la de la báscula', async () => {
    const usuario = userEvent.setup()
    montarApi(rutasDeFicha())
    pintarApp(`#/animal/${ANIMAL}`)

    await usuario.click(await screen.findByRole('button', { name: 'Anotar destete' }))
    const guardar = screen.getByRole('button', { name: 'Guardar destete' })
    expect((guardar as HTMLButtonElement).disabled).toBe(true)

    await usuario.click(screen.getByRole('radio', { name: 'Fecha exacta' }))
    expect((guardar as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Día del destete'), { target: { value: '2024-08-01' } })
    expect((screen.getByRole('button', { name: 'Guardar destete' }) as HTMLButtonElement).disabled).toBe(
      false,
    )

    await usuario.type(screen.getByLabelText('Peso al destete, si se pesó'), '200')
    expect((screen.getByRole('button', { name: 'Guardar destete' }) as HTMLButtonElement).disabled).toBe(
      true,
    )

    const foto = document.querySelector('input[type="file"]')
    expect(foto).toBeInstanceOf(HTMLInputElement)
    expect((foto as HTMLInputElement).accept).toBe('image/jpeg,image/png,image/webp')
    expect(
      screen.getByText('Opcional. No cambia si el peso se midió, se vio o te lo dijeron.'),
    ).toBeDefined()
  })

  it('en el hato no se guarda el destete si no hay crías elegidas', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({
        estado: 200,
        cuerpo: {
          animales: [animalDeLista({ id: ANIMAL, nombre: 'Canelo', categoria: 'calf' })],
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
      'GET /api/paddocks': () => ({
        estado: 200,
        cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 },
      }),
      'GET /api/locations': () => ({ estado: 200, cuerpo: { animales: [] } }),
    })

    pintarApp('#/hato/destete')

    const guardar = await screen.findByRole('button', { name: 'Guardar destete' })
    expect((guardar as HTMLButtonElement).disabled).toBe(true)

    await usuario.click(screen.getByRole('checkbox', { name: 'Elegir a Canelo' }))
    await usuario.click(screen.getByRole('radio', { name: 'Fecha exacta' }))
    expect((screen.getByRole('button', { name: 'Guardar destete' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    fireEvent.change(screen.getByLabelText('Día del destete'), { target: { value: '2024-08-01' } })
    expect((screen.getByRole('button', { name: 'Guardar destete' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('corregir el peso vuelve a pedir el destete y refresca la cría y los kilos destetados', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      ...rutasDeFicha(),
      [`GET /api/read-models/animal-growth/${ANIMAL}`]: () => ({ estado: 200, cuerpo: vistaConPeso() }),
      [`GET /api/animals/${ANIMAL}/weights`]: () => ({ estado: 200, cuerpo: pesosConHistoria() }),
      [`POST /api/weights/${PESO}/corrections`]: () => ({
        estado: 200,
        cuerpo: {
          id: PESO,
          animalId: ANIMAL,
          sesionId: SESION,
          fecha: '2026-11-01',
          kilos: '188.000',
          calidad: 'measured',
          version: 2,
          evidenciaId: null,
          correcciones: [],
        },
      }),
    })

    const cliente = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    render(
      <QueryClientProvider client={cliente}>
        <Ficha animalId={ANIMAL} />
        <LecturaDeKilos />
      </QueryClientProvider>,
    )

    await screen.findByRole('button', { name: 'Corregir este peso' })
    await waitFor(() => {
      expect(veces(api.peticiones, 'GET', `/api/read-models/destete/${ANIMAL}`)).toBeGreaterThan(0)
      expect(veces(api.peticiones, 'GET', `/api/read-models/cria/${ANIMAL}`)).toBeGreaterThan(0)
      expect(veces(api.peticiones, 'GET', '/api/read-models/kilos-destetados')).toBeGreaterThan(0)
    })
    const desteteAntes = veces(api.peticiones, 'GET', `/api/read-models/destete/${ANIMAL}`)
    const criaAntes = veces(api.peticiones, 'GET', `/api/read-models/cria/${ANIMAL}`)
    const kilosAntes = veces(api.peticiones, 'GET', '/api/read-models/kilos-destetados')

    await usuario.click(screen.getByRole('button', { name: 'Corregir este peso' }))
    const kilos = screen.getByLabelText('Kilos')
    await usuario.clear(kilos)
    await usuario.type(kilos, '188')
    await usuario.type(screen.getByLabelText('¿Por qué se corrige?'), 'Se leyó mal la báscula')
    await usuario.click(screen.getByRole('button', { name: 'Guardar corrección' }))

    await waitFor(() => {
      expect(veces(api.peticiones, 'GET', `/api/read-models/destete/${ANIMAL}`)).toBeGreaterThan(
        desteteAntes,
      )
      expect(veces(api.peticiones, 'GET', `/api/read-models/cria/${ANIMAL}`)).toBeGreaterThan(criaAntes)
      expect(veces(api.peticiones, 'GET', '/api/read-models/kilos-destetados')).toBeGreaterThan(
        kilosAntes,
      )
    })
  })

  it('anotar un destete con peso vuelve a pedir la última observación', async () => {
    const usuario = userEvent.setup()
    const api = montarApi({
      ...rutasDeFicha(),
      'POST /api/weanings': () => ({
        estado: 200,
        cuerpo: {
          destetes: [
            {
              id: DESTETE,
              animalId: ANIMAL,
              fecha: '2024-08-01',
              precisionFecha: 'exact',
              nota: null,
              reportedBy: null,
              pesoId: PESO,
              version: 1,
              recordedBy: CUENTA,
              recordedAt: CUANDO,
              correcciones: [],
            },
          ],
          pesos: [
            {
              id: PESO,
              animalId: ANIMAL,
              kilos: '200.000',
              calidad: 'measured',
              evidenciaId: null,
            },
          ],
        },
      }),
    })

    pintarApp(`#/animal/${ANIMAL}`)

    await screen.findByRole('button', { name: 'Anotar destete' })
    await waitFor(() => {
      expect(
        veces(api.peticiones, 'GET', `/api/read-models/ultima-observacion/${ANIMAL}`),
      ).toBeGreaterThan(0)
    })
    const antes = veces(api.peticiones, 'GET', `/api/read-models/ultima-observacion/${ANIMAL}`)

    await usuario.click(screen.getByRole('button', { name: 'Anotar destete' }))
    await usuario.click(screen.getByRole('radio', { name: 'Fecha exacta' }))
    fireEvent.change(screen.getByLabelText('Día del destete'), { target: { value: '2024-08-01' } })
    await usuario.type(screen.getByLabelText('Peso al destete, si se pesó'), '200')
    await usuario.click(screen.getByRole('radio', { name: 'Medido' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar destete' }))

    await waitFor(() => {
      expect(veces(api.peticiones, 'GET', `/api/read-models/ultima-observacion/${ANIMAL}`)).toBeGreaterThan(
        antes,
      )
    })
  })
})
