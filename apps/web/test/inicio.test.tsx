import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../src/App'
import { diaMas, hoyEnElRancho } from '../src/dominio/fechas'
import { animalDeLista, ANIMAL, fichaDeAnimal, montarApi, pintarApp, sesionAbierta } from './ayudas'

/**
 * Inicio con datos sintéticos. El orden, el vacío y la fecha plegada se leen en
 * la pantalla, no en un umbral escondido.
 */

const VIEJO = '11111111-1111-4111-8111-111111111111'
const HOY = '22222222-2222-4222-8222-222222222222'
const CRIA = '33333333-3333-4333-8333-333333333333'
const SIN_DATOS = '44444444-4444-4444-8444-444444444444'
const ATRASADO = '55555555-5555-4555-8555-555555555555'

const SESION_DE_PESO = '66666666-6666-4666-8666-666666666666'
const EN_DIAGNOSTICO = '99999999-9999-4999-8999-999999999999'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

function vista(desde: string, cambios: Record<string, unknown> = {}): () => {
  estado: number
  cuerpo: unknown
} {
  const hoy = hoyEnElRancho()
  return () => ({
    estado: 200,
    cuerpo: {
      hoy,
      desde,
      activosPorCategoria: [
        { categoria: 'calf', cantidad: 2 },
        { categoria: 'unknown', cantidad: 1 },
      ],
      cambios: {
        nacimientos: [{ animalId: CRIA, nombre: 'Cría del periodo', categoria: 'calf', fecha: hoy }],
        nacimientosSinFecha: 1,
        salidas: [],
        pesajes: 0,
        notasDeSanidad: 0,
      },
      paraRevisar: {
        fechaDeLaUltimaVuelta: null,
        huecosDeLaUltimaVuelta: [],
        sinLugar: [{ animalId: SIN_DATOS, nombre: null, categoria: 'unknown' }],
        lugarDesconocido: [],
        sinObservacion: [{ animalId: SIN_DATOS, nombre: null, categoria: 'unknown' }],
        porDiasSinVerse: [
          {
            animalId: VIEJO,
            nombre: 'Visto hace mucho',
            categoria: 'cow',
            dias: 40,
            fecha: '2026-10-01',
            origen: 'pesaje',
            origenId: '77777777-7777-4777-8777-777777777777',
          },
          {
            animalId: HOY,
            nombre: 'Visto hoy',
            categoria: 'cow',
            dias: 0,
            fecha: hoy,
            origen: 'sanidad',
            origenId: '88888888-8888-4888-8888-888888888888',
          },
          {
            animalId: EN_DIAGNOSTICO,
            nombre: 'Vista en el diagnóstico',
            categoria: 'cow',
            dias: 12,
            fecha: '2026-11-01',
            origen: 'diagnostico',
            origenId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          },
        ],
      },
      ...cambios,
    },
  })
}

/** El resumen de crecimiento: la base del grupo «Van atrás». */
function resumen(
  animales: readonly Record<string, unknown>[],
): () => { estado: number; cuerpo: unknown } {
  return () => ({
    estado: 200,
    cuerpo: {
      animales,
      gananciaMediaKilosPorDia: null,
      pesadosEnLaUltimaVuelta: 0,
      esperadosEnLaUltimaVuelta: 0,
      fechaDeLaUltimaVuelta: null,
    },
  })
}

function filaAtrasada(): Record<string, unknown> {
  return {
    animalId: ATRASADO,
    nombre: 'Becerro que va atrás',
    categoria: 'calf',
    ultimoPeso: {
      pesoId: ATRASADO,
      sesionId: SESION_DE_PESO,
      fecha: '2026-11-10',
      kilos: '160.000',
      calidad: 'measured',
      version: 1,
    },
    ultimoIntervalo: {
      fechaPrevia: '2026-10-20',
      dias: 21,
      kilosGanados: '-4.000',
      kilosPorDia: '-0.190',
      calidades: ['measured', 'measured'],
      incluyeCalidadNoMedida: false,
    },
    intervaloAnterior: null,
    diasDesdeElUltimoPesaje: 15,
    fueHuecoEnLaUltimaSesion: false,
  }
}

describe('Inicio', () => {
  it('«#/» abre Inicio y «#/hato» abre el hato', async () => {
    const desde = diaMas(hoyEnElRancho(), -7)
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/read-models/inicio?desde=${desde}`]: vista(desde),
      'GET /api/read-models/growth-overview': resumen([]),
      'GET /api/animals': () => ({
        estado: 200,
        cuerpo: { animales: [animalDeLista({ nombre: 'Canelo' })] },
      }),
      'GET /api/read-models/locations': () => ({
        estado: 200,
        cuerpo: { animales: [] },
      }),
      'GET /api/paddocks': () => ({ estado: 200, cuerpo: { potreros: [], sinAsignacion: 0, desconocidos: 0 } }),
    })

    pintarApp('#/')
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Inicio' }).getAttribute('aria-current')).toBe('page')

    window.location.hash = '#/hato'
    expect(await screen.findByRole('heading', { name: /^Hato$/ })).toBeDefined()
  })

  it('muestra lo que hay que revisar antes que el resumen, con la fecha plegada', async () => {
    const desde = diaMas(hoyEnElRancho(), -7)
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/read-models/inicio?desde=${desde}`]: vista(desde),
      'GET /api/read-models/growth-overview': resumen([]),
    })

    pintarApp('#/')

    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeDefined()
    expect(screen.getByText('MI RANCHO')).toBeDefined()

    // Los cuatro accesos directos, con el nombre que ve el dueño.
    const accesos = screen.getByRole('region', { name: 'Accesos directos' })
    expect(within(accesos).getByRole('link', { name: /Registrar pesaje/ })).toBeDefined()
    expect(within(accesos).getByRole('link', { name: /Nacimiento/ })).toBeDefined()
    expect(within(accesos).getByRole('link', { name: /Nota de sanidad/ })).toBeDefined()
    expect(within(accesos).getByRole('link', { name: /Salida/ })).toBeDefined()
    for (const control of [...screen.getAllByRole('link'), ...screen.getAllByRole('button')]) {
      const nombre = (
        control.getAttribute('aria-label') ??
        control.textContent ??
        ''
      )
        .replace(/\s+/g, ' ')
        .trim()
      expect(nombre, control.outerHTML.slice(0, 160)).not.toBe('')
    }

    // Para revisar va antes que el resumen del periodo.
    const revisar = screen.getByRole('region', { name: 'Para revisar' })
    const periodico = screen.getByRole('region', { name: 'Resumen del periodo' })
    expect(
      revisar.compareDocumentPosition(periodico) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    // La fecha no arranca la pantalla: está plegada y el campo no se ve.
    const fecha = within(periodico).getByRole('button', { name: /Últimos 7 días/ })
    expect(fecha.getAttribute('aria-expanded')).toBe('false')
    // El cuerpo queda montado pero oculto: el campo no se ve hasta abrir.
    const desdeElCampo = within(periodico).getByLabelText('Desde')
    expect(desdeElCampo.closest('[hidden]')).not.toBeNull()

    await userEvent.setup().click(fecha)
    expect(fecha.getAttribute('aria-expanded')).toBe('true')
    expect(desdeElCampo.closest('[hidden]')).toBeNull()

    expect(within(screen.getByRole('region', { name: 'Activos' })).getByText('No sé')).toBeDefined()
    expect(screen.getByText('Hay 1 nacimiento sin fecha. No entra en la cuenta.')).toBeDefined()

    const dias = screen.getByRole('region', { name: 'Días sin verse' })
    const nombres = within(dias).getAllByRole('link').map((enlace) => enlace.textContent)
    expect(nombres[0]).toContain('Visto hace mucho')
    expect(nombres[0]).toContain('hace 40 días')
    expect(nombres[1]).toContain('Visto hoy')
    expect(nombres[1]).toContain('hoy')
    expect(nombres).toHaveLength(3)

    const enDiagnostico = within(dias).getByRole('link', { name: /Vista en el diagnóstico/ })
    expect(enDiagnostico.textContent).toContain('diagnóstico de preñez')
    expect(enDiagnostico.textContent).not.toContain('nota de sanidad')
  })

  it('sin animales invita a dar de alta el primero y no afirma nada de «todos» o «nadie»', async () => {
    const desde = diaMas(hoyEnElRancho(), -7)
    const hoy = hoyEnElRancho()
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/read-models/inicio?desde=${desde}`]: () => ({
        estado: 200,
        cuerpo: {
          hoy,
          desde,
          activosPorCategoria: [],
          cambios: {
            nacimientos: [],
            nacimientosSinFecha: 0,
            salidas: [],
            pesajes: 0,
            notasDeSanidad: 0,
          },
          paraRevisar: {
            fechaDeLaUltimaVuelta: null,
            huecosDeLaUltimaVuelta: [],
            sinLugar: [],
            lugarDesconocido: [],
            sinObservacion: [],
            porDiasSinVerse: [],
          },
        },
      }),
      'GET /api/read-models/growth-overview': resumen([]),
    })

    const { container } = pintarApp('#/')

    expect(await screen.findByRole('button', { name: 'Dar de alta el primer animal' })).toBeDefined()
    // Con el hato vacío no se afirma nada de «todos» ni de «nadie».
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('Nadie está')
    expect(texto).not.toContain('Todos tienen')
    expect(texto).toContain('Todavía no hay animales en el hato')
    expect(texto).toContain('Cuando haya animales, aquí se ve a quién hay que revisar.')
  })

  it('después de dar de alta al primero, Inicio deja de decir que no hay animales', async () => {
    const desde = diaMas(hoyEnElRancho(), -7)
    const hoy = hoyEnElRancho()
    let hayAnimal = false

    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/read-models/inicio?desde=${desde}`]: () => ({
        estado: 200,
        cuerpo: {
          hoy,
          desde,
          activosPorCategoria: hayAnimal ? [{ categoria: 'unknown', cantidad: 1 }] : [],
          cambios: {
            nacimientos: [],
            nacimientosSinFecha: 0,
            salidas: [],
            pesajes: 0,
            notasDeSanidad: 0,
          },
          paraRevisar: {
            fechaDeLaUltimaVuelta: null,
            huecosDeLaUltimaVuelta: [],
            sinLugar: hayAnimal
              ? [{ animalId: ANIMAL, nombre: 'Lucero', categoria: 'unknown' }]
              : [],
            lugarDesconocido: [],
            sinObservacion: hayAnimal
              ? [{ animalId: ANIMAL, nombre: 'Lucero', categoria: 'unknown' }]
              : [],
            porDiasSinVerse: [],
          },
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
      'POST /api/animals': () => {
        hayAnimal = true
        return { estado: 201, cuerpo: fichaDeAnimal({ id: ANIMAL, nombre: 'Lucero' }) }
      },
      [`GET /api/animals/${ANIMAL}`]: () => ({
        estado: 200,
        cuerpo: fichaDeAnimal({ id: ANIMAL, nombre: 'Lucero' }),
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

    // El mismo cliente que usa la app, con su `staleTime`: sin invalidar la
    // consulta de Inicio, volver antes de 30 s mostraría la respuesta vieja.
    const cliente = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
        mutations: { retry: false },
      },
    })
    window.location.hash = '#/'
    render(
      <QueryClientProvider client={cliente}>
        <App />
      </QueryClientProvider>,
    )

    const usuario = userEvent.setup()
    // Inicio invita a dar de alta al primero; el dueño la sigue.
    await usuario.click(await screen.findByRole('button', { name: 'Dar de alta el primer animal' }))
    await usuario.click(await screen.findByRole('button', { name: /^Guardar$/ }))
    // El alta abre la ficha del animal recién creado.
    expect(await screen.findByRole('heading', { name: 'Lucero' })).toBeDefined()

    window.location.hash = '#/'

    // Ya no se dice que no hay animales: se ve al que se acaba de dar de alta.
    expect(await screen.findByText('1 animal activo')).toBeDefined()
    expect(screen.queryByText('Todavía no hay animales en el hato')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Dar de alta el primer animal' })).toBeNull()
  })

  it('un becerro atrasado aparece en «Para revisar», con el motivo y sin umbral', async () => {    const desde = diaMas(hoyEnElRancho(), -7)
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/read-models/inicio?desde=${desde}`]: vista(desde),
      'GET /api/read-models/growth-overview': resumen([filaAtrasada()]),
    })

    pintarApp('#/')
    await screen.findByRole('heading', { name: 'Inicio' })

    const revisar = screen.getByRole('region', { name: 'Para revisar' })
    const enlace = await within(revisar).findByRole('link', { name: /Becerro que va atrás/ })
    expect(enlace.textContent).toContain('Perdió kilos en el último intervalo')
  })

  it('un hato que quedó vacío conserva el resumen del periodo y no afirma nada de «nadie»', async () => {
    const desde = diaMas(hoyEnElRancho(), -7)
    const hoy = hoyEnElRancho()
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/read-models/inicio?desde=${desde}`]: () => ({
        estado: 200,
        cuerpo: {
          hoy,
          desde,
          activosPorCategoria: [],
          cambios: {
            nacimientos: [],
            nacimientosSinFecha: 0,
            salidas: [{ animalId: ANIMAL, nombre: 'El que salió', categoria: 'cow', fecha: hoy }],
            pesajes: 0,
            notasDeSanidad: 0,
          },
          paraRevisar: {
            fechaDeLaUltimaVuelta: null,
            huecosDeLaUltimaVuelta: [],
            sinLugar: [],
            lugarDesconocido: [],
            sinObservacion: [],
            porDiasSinVerse: [],
          },
        },
      }),
      'GET /api/read-models/growth-overview': resumen([]),
    })

    const { container } = pintarApp('#/')

    // Hubo una salida: no se dice «todavía no hay animales» ni se esconde el
    // periodo, que es lo único que hay que mirar.
    const periodo = await screen.findByRole('region', { name: 'Resumen del periodo' })
    expect(within(periodo).getByText('El que salió')).toBeDefined()

    const texto = container.textContent ?? ''
    expect(texto).not.toContain('Todavía no hay animales')
    expect(texto).not.toContain('Nadie está')
    expect(texto).not.toContain('Todos tienen')
    // La fecha es un rango, no una explicación técnica del valor por omisión.
    expect(texto).not.toContain('por omisión')
  })

  it('la primera pestaña de la barra es Inicio y lleva a «#/»', async () => {
    const desde = diaMas(hoyEnElRancho(), -7)
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/read-models/inicio?desde=${desde}`]: vista(desde),
      'GET /api/read-models/growth-overview': resumen([]),
    })

    pintarApp('#/')
    await screen.findByRole('heading', { name: 'Inicio' })

    const pestanas = screen.getByRole('navigation', { name: 'Pantallas del rancho' })
    const enlaces = within(pestanas).getAllByRole('link')
    expect(enlaces[0]?.textContent).toBe('Inicio')
    expect(enlaces[0]?.getAttribute('href')).toBe('#/')
    expect(within(pestanas).getByRole('link', { name: 'Hato' }).getAttribute('href')).toBe('#/hato')
  })
})
