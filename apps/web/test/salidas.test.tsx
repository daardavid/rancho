import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { animalDeLista, montarApi, pintarApp, sesionAbierta } from './ayudas'

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const VENDIDO = '99999999-9999-4999-8999-999999999999'

describe('Lista de salidas', () => {
  it('muestra el último peso como el hato, y un guion si no hay peso', async () => {
    const sinPeso = '88888888-8888-4888-8888-888888888888'
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals?estado=salidas': () => ({
        estado: 200,
        cuerpo: {
          animales: [
            animalDeLista({
              id: VENDIDO,
              nombre: 'Vendido',
              activo: false,
              salida: { motivo: 'sale', fecha: '2026-11-01', nota: null, evidenciaId: null },
            }),
            animalDeLista({
              id: sinPeso,
              nombre: 'Sin peso',
              activo: false,
              salida: { motivo: 'death', fecha: '2026-11-02', nota: null, evidenciaId: null },
            }),
          ],
        },
      }),
      'GET /api/read-models/known-weights': () => ({
        estado: 200,
        cuerpo: {
          pesos: [
            { animalId: VENDIDO, fecha: '2026-10-01', kilos: '180.000' },
            { animalId: VENDIDO, fecha: '2026-11-01', kilos: '210.500' },
          ],
        },
      }),
    })

    pintarApp('#/salidas')

    const vendido = (await screen.findByText('Vendido')).closest('button') as HTMLElement
    expect(vendido.textContent).toContain('210.5 kg')
    const vacio = screen.getByText('Sin peso').closest('button') as HTMLElement
    expect(vacio.textContent).toContain('—')
  })
})

const CON_PESO = '11111111-1111-4111-8111-111111111111'
const SIN_PESO = '22222222-2222-4222-8222-222222222222'
const SESION = '66666666-6666-4666-8666-666666666666'
const PESO = '77777777-7777-4777-8777-777777777777'

describe('Salida desde Inicio', () => {
  it('muestra el último peso como el hato, y un guion si no hay peso', async () => {
    montarApi({
      'GET /api/session': sesionAbierta(),
      'GET /api/animals': () => ({
        estado: 200,
        cuerpo: {
          animales: [
            animalDeLista({ id: CON_PESO, nombre: 'Con peso', categoria: 'cow' }),
            animalDeLista({ id: SIN_PESO, nombre: 'Sin peso', categoria: 'cow' }),
          ],
        },
      }),
      'GET /api/read-models/growth-overview': () => ({
        estado: 200,
        cuerpo: {
          animales: [
            {
              animalId: CON_PESO,
              nombre: 'Con peso',
              categoria: 'cow',
              ultimoPeso: {
                pesoId: PESO,
                sesionId: SESION,
                fecha: '2026-11-01',
                kilos: '210.500',
                calidad: 'measured',
                version: 1,
              },
              ultimoIntervalo: null,
              intervaloAnterior: null,
              diasDesdeElUltimoPesaje: 3,
              fueHuecoEnLaUltimaSesion: false,
            },
            {
              animalId: SIN_PESO,
              nombre: 'Sin peso',
              categoria: 'cow',
              ultimoPeso: null,
              ultimoIntervalo: null,
              intervaloAnterior: null,
              diasDesdeElUltimoPesaje: null,
              fueHuecoEnLaUltimaSesion: false,
            },
          ],
          gananciaMediaKilosPorDia: null,
          pesadosEnLaUltimaVuelta: 1,
          esperadosEnLaUltimaVuelta: 2,
          fechaDeLaUltimaVuelta: '2026-11-01',
        },
      }),
    })

    pintarApp('#/salida')

    await screen.findByText('210.5 kg')
    const conPeso = screen.getByText('Con peso').closest('button') as HTMLElement
    expect(conPeso.textContent).toContain('210.5 kg')
    const sinPeso = screen.getByText('Sin peso').closest('button') as HTMLElement
    expect(sinPeso.textContent).toContain('—')
  })
})
