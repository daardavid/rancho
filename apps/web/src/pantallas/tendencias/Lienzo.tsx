import { init, use as registrarECharts, type EChartsCoreOption, type EChartsType } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useMemo, useRef } from 'react'

import type { MesDeTendencia, VueltaDeTendencia } from '@rancho/api-contracts'

import type { AnimalParaGraficar } from '../../dominio/tendencias'
import { opcionDeMeses, opcionDePesos, opcionDeVueltas } from './opciones'

/**
 * El dibujo. Este archivo es el único que importa ECharts, y solo los módulos
 * que se usan. La pantalla lo carga con `import()` al abrirse.
 *
 * Lo que se dibuja —colores, símbolos, tramas y series— lo arma `opciones.ts`
 * con la paleta de la guía y las marcas de `estilo.ts`. Aquí solo se monta el
 * lienzo y se le entrega esa opción.
 *
 * Un hueco no es un punto: llega como tramos ya partidos, y el lienzo no une
 * lo que no existe.
 */

registrarECharts([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

export function GraficaDePesos({
  animales,
  etiqueta,
}: {
  readonly animales: readonly AnimalParaGraficar[]
  readonly etiqueta: string
}) {
  const opcion = useMemo(() => opcionDePesos(animales), [animales])
  const nodo = useGrafica(opcion)
  return <div ref={nodo} className="tendencias__lienzo" role="img" aria-label={etiqueta} />
}

export function GraficaDeVueltas({
  vueltas,
  etiqueta,
}: {
  readonly vueltas: readonly VueltaDeTendencia[]
  readonly etiqueta: string
}) {
  const opcion = useMemo(() => opcionDeVueltas(vueltas), [vueltas])
  const nodo = useGrafica(opcion)
  return <div ref={nodo} className="tendencias__lienzo" role="img" aria-label={etiqueta} />
}

export function GraficaDeMeses({
  meses,
  etiqueta,
}: {
  readonly meses: readonly MesDeTendencia[]
  readonly etiqueta: string
}) {
  const opcion = useMemo(() => opcionDeMeses(meses), [meses])
  const nodo = useGrafica(opcion)
  return <div ref={nodo} className="tendencias__lienzo" role="img" aria-label={etiqueta} />
}

function useGrafica(opcion: EChartsCoreOption) {
  const nodo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const elemento = nodo.current
    if (elemento === null) {
      return
    }
    const grafica: EChartsType = init(elemento)
    grafica.setOption(opcion)
    const alCambiar = (): void => {
      grafica.resize()
    }
    window.addEventListener('resize', alCambiar)
    return () => {
      window.removeEventListener('resize', alCambiar)
      grafica.dispose()
    }
  }, [opcion])

  return nodo
}
