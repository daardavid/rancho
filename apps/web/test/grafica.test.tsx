import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { anchoDeEtiqueta } from '../src/pantallas/etiquetasDeGrafica'
import { GraficaDePesos } from '../src/pantallas/GraficaDePesos'

const PIE = 'El punto hueco es un peso que no se midió en la báscula.'

function punto(
  kilos: string,
  fecha: string,
  calidad: 'measured' | 'observed' | 'declared' = 'measured',
) {
  return {
    pesoId: `44444444-4444-4444-8444-${kilos.replace(/\D/g, '').padStart(12, '0')}`,
    sesionId: '55555555-5555-4555-8555-555555555555',
    fecha,
    kilos,
    calidad,
    version: 1,
    intervalo: null,
  }
}

describe('Gráfica de pesos', () => {
  it('muestra 152.5 kg y 140.25 kg enteros, dentro del cuadro', () => {
    render(
      <GraficaDePesos
        pesos={[
          punto('140.250', '2026-10-25'),
          punto('152.500', '2026-11-25'),
        ]}
      />,
    )

    const svg = screen.getByRole('img')
    const ancho = Number(svg.getAttribute('viewBox')?.split(' ')[2])
    const etiquetas = [...svg.querySelectorAll('text')]

    for (const texto of ['152.5 kg', '140.25 kg']) {
      const nodo = etiquetas.find((etiqueta) => etiqueta.textContent === texto)
      expect(nodo, texto).toBeDefined()
      const x = Number(nodo?.getAttribute('x'))
      const ancla = nodo?.getAttribute('text-anchor')
      // El texto termina en x y crece hacia la izquierda. Tiene que caber en el cuadro.
      const inicio = ancla === 'end' ? x - anchoDeEtiqueta(texto) : x
      expect(inicio).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(ancho)
    }

    expect(screen.queryByText(PIE)).toBeNull()
  })

  it('el pie del punto hueco solo aparece si hay un peso que no se midió', () => {
    const { rerender } = render(
      <GraficaDePesos
        pesos={[punto('140.250', '2026-10-25', 'declared'), punto('152.500', '2026-11-25')]}
      />,
    )
    expect(document.querySelector('figcaption')?.textContent).toContain(PIE)

    rerender(
      <GraficaDePesos pesos={[punto('140.250', '2026-10-25'), punto('152.500', '2026-11-25')]} />,
    )
    expect(document.querySelector('figcaption')).toBeNull()
  })
})
