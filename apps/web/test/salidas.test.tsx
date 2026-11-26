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
