import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { animalDeLista, CUANDO, CUENTA, montarApi, pintarApp, sesionAbierta } from './ayudas'

/**
 * El hato como lo pide R-18: conteos en los filtros, búsqueda que también
 * encuentra un arete que ya se cambió, aviso solo cuando hubo huecos y la
 * etiqueta de ganancia según la regla de «Revisar primero» de INC-003.
 *
 * Los datos son sintéticos: los animales del rancho no entran al repo.
 */

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const BECERRO_A = '11111111-1111-4111-8111-111111111111'
const BECERRO_B = '22222222-2222-4222-8222-222222222222'
const VACA = '33333333-3333-4333-8333-333333333333'
const TORO = '44444444-4444-4444-8444-444444444444'
const SIN_CATEGORIA = '55555555-5555-4555-8555-555555555555'
const SESION = '66666666-6666-4666-8666-666666666666'

function marca(valor: string, estado: 'active' | 'replaced') {
  return {
    id: crypto.randomUUID(),
    tipo: 'siniiga',
    valor,
    desde: '2025-03-01',
    estado,
    cambiadaEl: estado === 'active' ? null : '2026-02-10',
    recordedBy: CUENTA,
    recordedAt: CUANDO,
  }
}

function elHato() {
  return () => ({
    estado: 200,
    cuerpo: {
      animales: [
        animalDeLista({
          id: BECERRO_A,
          nombre: 'Canelo',
          categoria: 'calf',
          marcas: [marca('MX-0001', 'replaced'), marca('MX-9999', 'active')],
        }),
        animalDeLista({ id: BECERRO_B, nombre: 'Lucero', categoria: 'calf' }),
        animalDeLista({ id: VACA, nombre: 'La Pajarita', categoria: 'cow' }),
        animalDeLista({
          id: TORO,
          nombre: 'El Toro',
          categoria: 'bull',
          marcas: [marca('MX-3310', 'active')],
        }),
        animalDeLista({ id: SIN_CATEGORIA, nombre: 'Sin seña', categoria: 'unknown' }),
      ],
    },
  })
}

type OpcionesDeFila = {
  readonly categoria?: string
  readonly kilos?: string
  readonly ganados?: string
  readonly porDia?: string | null
  readonly calidades?: readonly [string, string]
  readonly sinIntervalo?: boolean
  readonly sinPeso?: boolean
  readonly hueco?: boolean
}

function fila(animalId: string, nombre: string, opciones: OpcionesDeFila = {}) {
  const sinPeso = opciones.sinPeso === true
  return {
    animalId,
    nombre,
    categoria: opciones.categoria ?? 'calf',
    ultimoPeso: sinPeso
      ? null
      : {
          pesoId: animalId,
          sesionId: SESION,
          fecha: '2026-11-01',
          kilos: opciones.kilos ?? '180.000',
          calidad: opciones.calidades?.[1] ?? 'measured',
          version: 1,
        },
    ultimoIntervalo:
      sinPeso || opciones.sinIntervalo === true
        ? null
        : {
            fechaPrevia: '2026-10-15',
            dias: 17,
            kilosGanados: opciones.ganados ?? '15.000',
            kilosPorDia: opciones.porDia === undefined ? '0.882' : opciones.porDia,
            calidades: opciones.calidades ?? ['measured', 'measured'],
            incluyeCalidadNoMedida:
              (opciones.calidades ?? ['measured', 'measured']).some(
                (calidad) => calidad !== 'measured',
              ),
          },
    diasDesdeElUltimoPesaje: sinPeso ? null : 3,
    fueHuecoEnLaUltimaSesion: opciones.hueco === true,
  }
}

/** El resumen con un animal de cada caso de la regla. */
function elResumen(filas: readonly Record<string, unknown>[]) {
  return () => ({ estado: 200, cuerpo: { animales: filas } })
}

function laUltimaSesion() {
  return () => ({
    estado: 200,
    cuerpo: {
      id: SESION,
      fecha: '2026-11-21',
      nota: null,
      reportedBy: null,
      commandId: '77777777-7777-4777-8777-777777777777',
      recordedBy: CUENTA,
      recordedAt: CUANDO,
      filas: [],
    },
  })
}

describe('Filtros del hato', () => {
  it('muestra el conteo por categoría y solo las que tienen animales', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([]),
    })

    pintarApp('#/')

    await screen.findByText('Canelo')

    expect(screen.getByRole('radio', { name: 'Todos 5' })).toBeDefined()
    expect(screen.getByRole('radio', { name: 'Becerros 2' })).toBeDefined()
    expect(screen.getByRole('radio', { name: 'Vacas 1' })).toBeDefined()
    expect(screen.getByRole('radio', { name: 'Toros 1' })).toBeDefined()
    // «No sé» es una categoría del rancho: se filtra con su nombre, no se
    // esconde ni se mete en otro grupo.
    expect(screen.getByRole('radio', { name: 'No sé 1' })).toBeDefined()
  })

  it('al tocar una categoría deja solo sus animales', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([]),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')

    await usuario.click(screen.getByRole('radio', { name: 'Becerros 2' }))

    expect(screen.getByText('Canelo')).toBeDefined()
    expect(screen.getByText('Lucero')).toBeDefined()
    expect(screen.queryByText('La Pajarita')).toBeNull()
    expect(screen.queryByText('El Toro')).toBeNull()

    await usuario.click(screen.getByRole('radio', { name: 'Toros 1' }))

    expect(screen.getByText('El Toro')).toBeDefined()
    expect(screen.queryByText('Canelo')).toBeNull()
  })

  it('el conteo no cambia por lo que se escribió en el buscador', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([]),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')

    await usuario.type(screen.getByLabelText('Buscar'), 'canelo')

    // El número dice cuántos hay, no cuántos se ven.
    expect(screen.getByRole('radio', { name: 'Becerros 2' })).toBeDefined()
    expect(screen.getByRole('radio', { name: 'Vacas 1' })).toBeDefined()
  })
})

describe('Búsqueda del hato', () => {
  it('encuentra al animal por un arete que ya se cambió', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([]),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')

    // En la fila se ve el arete puesto, no el viejo.
    expect(screen.getByText(/SINIIGA MX-9999/)).toBeDefined()

    await usuario.type(screen.getByLabelText('Buscar'), 'MX-0001')

    expect(screen.getByText('Canelo')).toBeDefined()
    expect(screen.queryByText('Lucero')).toBeNull()
  })

  it('sin coincidencias lo dice sin ofrecer otra pantalla', async () => {
    const usuario = userEvent.setup()
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([]),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')

    await usuario.type(screen.getByLabelText('Buscar'), 'no-hay-nadie')

    expect(screen.getByText('Ningún animal coincide')).toBeDefined()
  })
})

describe('Aviso de huecos', () => {
  it('con animales que no se pesaron dice cuántos y cuándo, y lleva a crecimiento', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': laUltimaSesion(),
      'GET /api/read-models/growth-overview': elResumen([
        fila(BECERRO_A, 'Canelo', { hueco: true }),
        fila(BECERRO_B, 'Lucero', { hueco: true }),
      ]),
    })

    pintarApp('#/')

    expect(await screen.findByText('2 animales no se pesaron')).toBeDefined()
    expect(await screen.findByText('En la vuelta del 21 nov 2026')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Ver' }).getAttribute('href')).toBe('#/crecimiento')
  })

  it('sin huecos no hay aviso', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([
        fila(BECERRO_A, 'Canelo'),
        fila(BECERRO_B, 'Lucero'),
      ]),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')

    expect(screen.queryByText(/no se pesaron/)).toBeNull()
    expect(screen.queryByText(/no se pesó/)).toBeNull()
  })

  it('con un solo hueco lo dice en singular', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': laUltimaSesion(),
      'GET /api/read-models/growth-overview': elResumen([
        fila(BECERRO_A, 'Canelo', { hueco: true }),
      ]),
    })

    pintarApp('#/')

    expect(await screen.findByText('1 animal no se pesó')).toBeDefined()
  })
})

describe('Etiqueta de ganancia', () => {
  it('va bien en verde con la ganancia por día del animal', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([
        fila(BECERRO_A, 'Canelo', { porDia: '0.920' }),
      ]),
    })

    pintarApp('#/')

    const etiqueta = await screen.findByText('+0.92 kg/día')
    expect(etiqueta.className).toContain('ui-etiqueta--bien')
  })

  it('no se pesó en la última vuelta es ámbar «No se pesó»', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/weighing-sessions/latest': laUltimaSesion(),
      'GET /api/read-models/growth-overview': elResumen([
        fila(BECERRO_A, 'Canelo', { hueco: true, porDia: '0.920' }),
      ]),
    })

    pintarApp('#/')

    const filaDeCanelo = (await screen.findByText('Canelo')).closest('button')
    expect(filaDeCanelo).not.toBeNull()
    const etiqueta = within(filaDeCanelo as HTMLElement).getByText('No se pesó')
    expect(etiqueta.className).toContain('ui-etiqueta--revisar')
  })

  it('un intervalo con un peso que no se midió pide revisar, aunque la ganancia suba', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([
        fila(BECERRO_A, 'Canelo', {
          porDia: '1.500',
          calidades: ['measured', 'declared'],
        }),
      ]),
    })

    pintarApp('#/')

    const etiqueta = await screen.findByText('Revisar')
    expect(etiqueta.className).toContain('ui-etiqueta--revisar')
  })

  it('un animal que pierde kilos pide revisar aunque todavía no tenga con qué comparar', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([
        fila(BECERRO_A, 'Canelo', { ganados: '-4.000', porDia: '-0.235' }),
      ]),
    })

    pintarApp('#/')

    const etiqueta = await screen.findByText('Revisar')
    expect(etiqueta.className).toContain('ui-etiqueta--revisar')
    // La ganancia negativa no se pinta como si fuera buena.
    expect(screen.queryByText('-0.24 kg/día')).toBeNull()
  })

  it('sin ningún peso va en gris «Sin pesajes», con guion en lugar de kilos', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([
        fila(VACA, 'La Pajarita', { categoria: 'cow', sinPeso: true }),
      ]),
    })

    pintarApp('#/')

    const filaDeLaVaca = (await screen.findByText('La Pajarita')).closest('button') as HTMLElement
    const etiqueta = within(filaDeLaVaca).getByText('Sin pesajes')
    expect(etiqueta.className).toContain('ui-etiqueta--sin-datos')
    expect(within(filaDeLaVaca).getByText('—')).toBeDefined()
  })

  it('con un solo peso falta el intervalo: gris, no un mal resultado', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([
        fila(BECERRO_A, 'Canelo', { sinIntervalo: true }),
      ]),
    })

    pintarApp('#/')

    const etiqueta = await screen.findByText('Falta otro pesaje')
    expect(etiqueta.className).toContain('ui-etiqueta--sin-datos')
  })
})

describe('Una sola acción de cada cosa', () => {
  it('el pesaje se ofrece una vez como acción, en el botón flotante', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([]),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')

    // La píldora de «Pesaje» de la barra de abajo es navegación, no la acción.
    const acciones = screen
      .getAllByRole('link')
      .filter((enlace) => (enlace.textContent ?? '').includes('Registrar pesaje'))
    expect(acciones).toHaveLength(1)
    expect(acciones[0]?.getAttribute('href')).toBe('#/pesaje')
    expect(acciones[0]?.className).toContain('ui-boton-flotante')
  })

  it('el alta se ofrece una vez, en el «+» del encabezado', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([]),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')

    const alAlta = screen
      .getAllByRole('link')
      .filter((enlace) => enlace.getAttribute('href') === '#/alta')
    expect(alAlta).toHaveLength(1)
    expect(alAlta[0]?.getAttribute('aria-label')).toBe('Dar de alta un animal')
  })

  it('en el hato vacío la única invitación es la tarjeta, sin el «+»', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({ estado: 200, cuerpo: { animales: [] } }),
      'GET /api/read-models/growth-overview': elResumen([]),
    })

    pintarApp('#/')

    expect(await screen.findByText('Empieza con el primer animal')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Dar de alta el primer animal' })).toBeDefined()
    expect(screen.queryByRole('link', { name: 'Dar de alta un animal' })).toBeNull()
    // Tampoco se ofrece un pesaje que no tiene a quién pesar.
    expect(screen.queryByRole('link', { name: /Registrar pesaje/ })).toBeNull()
  })

  it('«Salir» vive en el menú y no se repite en la pantalla', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([]),
    })

    pintarApp('#/')
    await screen.findByText('Canelo')

    expect(screen.queryByRole('button', { name: 'Salir' })).toBeNull()

    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Menú' }))

    expect(screen.getAllByRole('button', { name: 'Salir' })).toHaveLength(1)
  })

  it('el encabezado dice cuántos animales hay y hace cuánto fue el último pesaje', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': elHato(),
      'GET /api/read-models/growth-overview': elResumen([
        fila(BECERRO_A, 'Canelo'),
        fila(BECERRO_B, 'Lucero'),
      ]),
    })

    pintarApp('#/')

    expect(await screen.findByText('MI RANCHO')).toBeDefined()
    expect(screen.getByText('5 animales activos · último pesaje hace 3 días')).toBeDefined()
  })
})
