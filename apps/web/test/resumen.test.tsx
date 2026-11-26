import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../src/App'
import { diaMas, hoyEnElRancho } from '../src/dominio/fechas'
import { textoDelResumen, type AnimalQueVaAtras } from '../src/dominio/resumen'
import { montarApi, pintarApp, sesionAbierta } from './ayudas'

/**
 * El resumen de la semana con datos sintéticos.
 *
 * Se prueba lo que el dueño ve y lo que manda: los conteos correctos, la frase
 * de lo que no se sabe, el texto que se copia cuando el navegador no ofrece
 * «Compartir», y la hoja de impresión que deja solo el documento.
 */

const HOY = '2026-11-26'
const DESDE = '2026-11-19'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

function resumen(cambios: Record<string, unknown> = {}): () => { estado: number; cuerpo: unknown } {
  return () => ({
    estado: 200,
    cuerpo: {
      rancho: 'Rancho de prueba',
      hoy: HOY,
      desde: DESDE,
      activos: {
        total: 6,
        porCategoria: [
          { categoria: 'calf', cantidad: 3 },
          { categoria: 'cow', cantidad: 2 },
          { categoria: 'unknown', cantidad: 1 },
        ],
      },
      nacimientos: { total: 2, sinFecha: 1 },
      salidas: {
        total: 2,
        porMotivo: [
          { motivo: 'sale', cantidad: 1 },
          { motivo: 'death', cantidad: 1 },
        ],
      },
      destetes: { total: 1, conPeso: 1, sinPeso: 0, sinFecha: 0 },
      prenez: {
        total: 2,
        porResultado: [
          { motivo: 'prenada', cantidad: 1 },
          { motivo: 'no_se', cantidad: 1 },
        ].map((fila) => ({ resultado: fila.motivo, cantidad: fila.cantidad })),
      },
      revisar: {
        sinObservacion: 3,
        huecosDeLaUltimaVuelta: 1,
        porDiasSinVerse: [
          { nombre: 'Visto hace mucho', dias: 40, origen: 'pesaje' },
          { nombre: 'Visto ayer', dias: 1, origen: 'sanidad' },
        ],
      },
      ...cambios,
    },
  })
}

function crecimiento(cambios: Record<string, unknown> = {}): () => {
  estado: number
  cuerpo: unknown
} {
  return () => ({
    estado: 200,
    cuerpo: {
      animales: [
        {
          animalId: '55555555-5555-4555-8555-555555555555',
          nombre: 'Becerro que va atrás',
          categoria: 'calf',
          ultimoPeso: {
            pesoId: '66666666-6666-4666-8666-666666666666',
            sesionId: '77777777-7777-4777-8777-777777777777',
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
        },
      ],
      gananciaMediaKilosPorDia: '0.450',
      pesadosEnLaUltimaVuelta: 5,
      esperadosEnLaUltimaVuelta: 6,
      fechaDeLaUltimaVuelta: '2026-11-24',
      ...cambios,
    },
  })
}

describe('resumen de la semana', () => {
  it('el texto trae los conteos correctos y la frase de lo que no se sabe', () => {
    const datos = resumen()().cuerpo as Parameters<typeof textoDelResumen>[0]
    const texto = textoDelResumen(datos, crecimiento()().cuerpo as Parameters<typeof textoDelResumen>[1])

    expect(texto).toContain('Rancho de prueba')
    expect(texto).toContain('Del 19 nov 2026 al 26 nov 2026')
    expect(texto).toContain('Animales activos: 6')
    expect(texto).toContain('Becerro 3')
    expect(texto).toContain('Nacimientos: 2')
    expect(texto).toContain('Salidas: 2 (Venta 1, Muerte 1)')
    expect(texto).toContain('Destetes: 1, 1 con peso')
    expect(texto).toContain('Diagnósticos de preñez: 2')
    expect(texto).toContain('5 de 6 pesados')
    expect(texto).toContain('+0.45 kg/día')
    expect(texto).toContain('Becerro que va atrás: Perdió kilos en el último intervalo')
    expect(texto).toContain('Visto hace mucho: hace 40 días')

    // Lo que no se sabe se dice: no se esconde detrás de un cero.
    expect(texto).toContain('1 nacimiento sin fecha')
    expect(texto).toContain('1 animal se esperaba en la última vuelta y no se pesó')
    expect(texto).toContain('3 animales sin observación')
    expect(texto).toContain('1 animal sin categoría')

    // Sin tablas anchas ni identificadores internos.
    expect(texto).not.toContain('|')
    expect(texto).not.toContain('55555555-5555')
  })

  it('dice que no falta nada cuando todo está completo', () => {
    const datos = resumen({
      nacimientos: { total: 1, sinFecha: 0 },
      activos: { total: 2, porCategoria: [{ categoria: 'cow', cantidad: 2 }] },
      revisar: { sinObservacion: 0, huecosDeLaUltimaVuelta: 0, porDiasSinVerse: [] },
    })().cuerpo as Parameters<typeof textoDelResumen>[0]
    const texto = textoDelResumen(datos, crecimiento({ animales: [] })().cuerpo as Parameters<typeof textoDelResumen>[1])

    expect(texto).toContain('Lo que no se sabe: no falta ningún dato en este resumen.')
    expect(texto).toContain('Van atrás: ninguno con sus propios pesos.')
  })

  it('quien va atrás sale de sus propios pesos y no de una meta', () => {
    const datos = resumen()().cuerpo as Parameters<typeof textoDelResumen>[0]
    const cuerpo = crecimiento()().cuerpo as Parameters<typeof textoDelResumen>[1]
    const texto = textoDelResumen(datos, cuerpo)
    const atras: readonly AnimalQueVaAtras[] = [{ nombre: 'Becerro que va atrás', motivo: 'Perdió kilos en el último intervalo' }]
    for (const animal of atras) {
      expect(texto).toContain(`${animal.nombre}: ${animal.motivo}`)
    }
    expect(texto).not.toContain('meta')
  })

  it('sin los pesos no afirma que no hay vuelta de pesaje: dice que no se pudieron traer', () => {
    const datos = resumen()().cuerpo as Parameters<typeof textoDelResumen>[0]
    const texto = textoDelResumen(datos, null)

    expect(texto).toContain('Última vuelta de pesaje: no se pudieron traer los pesos.')
    expect(texto).not.toContain('todavía no hay')
    // El bloque de «Van atrás» dice lo mismo: el texto no se contradice.
    expect(texto).toContain('Van atrás: no se pudieron traer los pesos.')
  })

  it('con los pesos pero sin vuelta sí dice que todavía no hay', () => {
    const datos = resumen()().cuerpo as Parameters<typeof textoDelResumen>[0]
    const sinVuelta = crecimiento({
      animales: [],
      fechaDeLaUltimaVuelta: null,
      pesadosEnLaUltimaVuelta: 0,
      esperadosEnLaUltimaVuelta: 0,
      gananciaMediaKilosPorDia: null,
    })().cuerpo as Parameters<typeof textoDelResumen>[1]
    const texto = textoDelResumen(datos, sinVuelta)

    expect(texto).toContain('Última vuelta de pesaje: todavía no hay.')
    expect(texto).not.toContain('no se pudieron traer los pesos')
  })

  it('pinta el resumen con el nombre del rancho y lo que no se sabe', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/read-models/resumen': resumen(),
      'GET /api/read-models/growth-overview': crecimiento(),
    })

    const { container } = pintarApp('#/resumen')

    expect(await screen.findByRole('heading', { name: 'Resumen de la semana' })).toBeDefined()
    const hoja = screen.getByRole('region', { name: 'Resumen para compartir' })
    expect(within(hoja).getByText('Rancho de prueba')).toBeDefined()
    expect(within(hoja).getByText('3 animales sin observación.')).toBeDefined()
    expect(within(hoja).getByText(/1 nacimiento sin fecha/)).toBeDefined()

    // No aparece ningún identificador interno en lo que se comparte.
    expect(container.textContent ?? '').not.toContain('55555555-5555')
    expect(container.textContent ?? '').not.toContain('22222222-2222')
  })

  it('si no se pueden traer los pesos, lo dice y no afirma que no hay vuelta', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: async () => {} } })
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/read-models/resumen': resumen(),
      'GET /api/read-models/growth-overview': () => ({ estado: 500, cuerpo: { codigo: 'error' } }),
    })

    pintarApp('#/resumen')

    expect(await screen.findByText('No se pudieron traer los pesos.')).toBeDefined()
    expect(screen.queryByText('Todavía no hay una vuelta de pesaje.')).toBeNull()
  })

  it('mientras se traen los pesos, no deja compartir ni guardar el PDF', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: async () => {} } })
    // Los pesos nunca contestan: la consulta se queda pendiente.
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/read-models/resumen': resumen(),
      'GET /api/read-models/growth-overview': () => new Promise<never>(() => {}),
    })

    pintarApp('#/resumen')

    const copiar = await screen.findByRole('button', { name: 'Copiar texto' })
    expect((copiar as HTMLButtonElement).disabled).toBe(true)
    const pdf = screen.getByRole('button', { name: 'Guardar como PDF' })
    expect((pdf as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Trayendo los pesos…')).toBeDefined()
  })

  it('sin «Compartir» del navegador, el botón copia el texto', async () => {
    const escribir = vi.fn(async (_texto: string) => {})
    // `userEvent` instala su propio portapapeles al armarse; esta prueba fija el
    // del navegador, así que se toca el botón directo.
    vi.stubGlobal('navigator', { clipboard: { writeText: escribir } })

    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/read-models/resumen': resumen(),
      'GET /api/read-models/growth-overview': crecimiento(),
    })

    pintarApp('#/resumen')

    const copiar = await screen.findByRole('button', { name: 'Copiar texto' })
    fireEvent.click(copiar)

    expect(escribir).toHaveBeenCalledTimes(1)
    const texto = escribir.mock.calls[0]?.[0] ?? ''
    expect(texto).toContain('Rancho de prueba')
    expect(texto).toContain('Animales activos: 6')
    expect(texto).toContain('3 animales sin observación')

    expect(await screen.findByText(/quedó en el portapapeles/)).toBeDefined()
  })

  it('con «Compartir» del navegador, manda el mismo texto por la API del sistema', async () => {
    const compartir = vi.fn(async (_datos: { text: string }) => {})
    vi.stubGlobal('navigator', { share: compartir })

    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/read-models/resumen': resumen(),
      'GET /api/read-models/growth-overview': crecimiento(),
    })

    pintarApp('#/resumen')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Compartir' }))

    expect(compartir).toHaveBeenCalledTimes(1)
    expect(compartir.mock.calls[0]?.[0].text).toContain('Animales activos: 6')
  })

  it('«Guardar como PDF» usa la impresión del navegador', async () => {
    const imprimir = vi.fn()
    vi.stubGlobal('print', imprimir)

    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/read-models/resumen': resumen(),
      'GET /api/read-models/growth-overview': crecimiento(),
    })

    pintarApp('#/resumen')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Guardar como PDF' }))
    expect(imprimir).toHaveBeenCalledTimes(1)
  })

  it('Inicio lleva al resumen con el mismo periodo que se está viendo', async () => {
    const desde = diaMas(hoyEnElRancho(), -7)
    let rutaPedida = ''
    montarApi({
      'GET /api/session': sesionAbierta(),
      [`GET /api/read-models/inicio?desde=${desde}`]: () => {
        rutaPedida = `/api/read-models/inicio?desde=${desde}`
        return {
          estado: 200,
          cuerpo: {
            hoy: hoyEnElRancho(),
            desde,
            activosPorCategoria: [{ categoria: 'cow', cantidad: 1 }],
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
        }
      },
      'GET /api/read-models/growth-overview': crecimiento({ animales: [] }),
    })

    pintarApp('#/')
    const enlace = await screen.findByRole('link', { name: 'Compartir resumen' })
    expect(rutaPedida).toBe(`/api/read-models/inicio?desde=${desde}`)
    expect(enlace.getAttribute('href')).toBe(`#/resumen/${desde}`)
  })

  it('al volver a abrir el resumen cuenta otra vez y no muestra lo de antes', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: async () => {} } })
    let pedidas = 0
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/read-models/resumen': () => {
        pedidas += 1
        // La segunda vez el dueño ya anotó al que faltaba: el resumen lo cuenta.
        return resumen({
          activos: { total: pedidas === 1 ? 6 : 7, porCategoria: [{ categoria: 'cow', cantidad: 7 }] },
        })()
      },
      'GET /api/read-models/growth-overview': crecimiento(),
    })

    // El mismo cliente que usa la app, con sus 30 s de `staleTime`: el resumen
    // no puede quedarse con la respuesta vieja por eso.
    const cliente = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
        mutations: { retry: false },
      },
    })
    window.location.hash = '#/resumen'
    render(
      <QueryClientProvider client={cliente}>
        <App />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('6 activos')).toBeDefined()
    expect(pedidas).toBe(1)

    // El dueño sale a Inicio a anotar el dato que faltaba y vuelve al resumen.
    window.location.hash = '#/hato'
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Resumen para compartir' })).toBeNull()
    })
    window.location.hash = '#/resumen'

    expect(await screen.findByText('7 activos')).toBeDefined()
    expect(pedidas).toBe(2)
    expect(screen.queryByText('6 activos')).toBeNull()
  })
})

describe('hoja de impresión', () => {
  /*
   * La hoja de impresión se prueba sobre el CSS de verdad. No hay un motor de
   * impresión en la prueba de pantalla: lo que se fija aquí es que la regla
   * `@media print` existe y esconde la barra inferior y los botones, que es lo
   * que deja solo el resumen en el PDF.
   */
  const css = readFileSync(join(import.meta.dirname, '..', 'src', 'estilos.css'), 'utf-8')

  function bloqueDeImpresion(): string {
    const inicio = css.indexOf('@media print')
    expect(inicio).toBeGreaterThan(-1)
    return css.slice(inicio)
  }

  it('solo imprime el resumen: esconde la barra inferior, el encabezado y los botones', () => {
    const bloque = bloqueDeImpresion()
    expect(bloque).toContain('@page')
    expect(bloque).toContain('letter portrait')
    for (const selector of [
      '.ui-barra-inferior',
      '.ui-encabezado',
      '.resumen__acciones',
      '.ui-desplegable',
      '.ui-boton-principal',
      '.ui-boton-secundario',
    ]) {
      expect(bloque, selector).toContain(selector)
    }
    expect(bloque).toContain('display: none')
  })

  it('deja la hoja del resumen en tamaño carta sin bordes de tarjeta', () => {
    const bloque = bloqueDeImpresion()
    expect(bloque).toContain('.resumen__hoja')
    expect(bloque).toContain('border: 0')
  })

  it('no imprime el aviso del portapapeles: es un mensaje de la pantalla, no del documento', () => {
    const bloque = bloqueDeImpresion()
    // Se busca la regla cuyo cuerpo oculta, y se lee solo su lista de selectores.
    const reglaOculta = /([^{}]+)\{\s*display:\s*none\s*!important;/.exec(bloque)
    expect(reglaOculta).not.toBeNull()
    const selectores = (reglaOculta?.[1] ?? '').split(',').map((selector) => selector.trim())
    expect(selectores).toContain('.resumen__aviso')

    // Y ya no se le pinta en negro: no se imprime.
    const reglaDeColor = /([^{}]+)\{\s*color:\s*#000000;/.exec(bloque)
    expect(reglaDeColor).not.toBeNull()
    expect(reglaDeColor?.[1] ?? '').not.toContain('.resumen__aviso')
  })
})
