import { init, use as registrarECharts, type EChartsCoreOption, type EChartsType } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useMemo, useRef } from 'react'

import type { MesDeTendencia, VueltaDeTendencia } from '@rancho/api-contracts'

import { diaCorto, diaLegible, kilosLegibles, mesLegible, numeroLegible } from '../../dominio/fechas'
import { calidad, motivoDeSalida } from '../../dominio/etiquetas'
import type { AnimalParaGraficar } from '../../dominio/tendencias'

/**
 * El dibujo. Este archivo es el único que importa ECharts, y solo los módulos
 * que se usan. La pantalla lo carga con `import()` al abrirse.
 *
 * Los kilos siguen siendo texto hasta `coordenada`, que existe solo para
 * poner un punto en el lienzo. La etiqueta que se lee usa el texto original.
 * Un hueco no es un punto: llega como tramos ya partidos.
 */

registrarECharts([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const COLORES_DE_LINEA = ['#1c1f1a', '#3d5a80', '#6b5344', '#2f5d50', '#5c4a6e', '#3e4c3a'] as const
const VERDE = '#1f5c3f'
const TINTA = '#1c1f1a'
const SUAVE = '#5c6258'
const AMBAR = '#8a4b00'

const COLOR_DE_MOTIVO: Record<string, string> = {
  sale: TINTA,
  death: '#8a2f26',
  confirmed_missing: AMBAR,
  other: '#3d5a80',
  unknown: '#6b6258',
}

type Dato = {
  readonly value: readonly [number, number | '-']
  readonly texto: string
  readonly detalle: string
  readonly symbol?: 'none' | 'circle'
  readonly itemStyle?: { readonly color: string; readonly borderColor: string; readonly borderWidth: number }
}

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

function opcionDePesos(animales: readonly AnimalParaGraficar[]): EChartsCoreOption {
  const fechas = animales.flatMap((animal) => animal.tramos.flatMap((tramo) => tramo.map((punto) => punto.fecha)))
  const series = animales.flatMap((animal, indice) => {
    const color = COLORES_DE_LINEA[indice % COLORES_DE_LINEA.length] ?? TINTA
    return animal.tramos.map((tramo) => ({
      name: animal.nombre,
      type: 'line' as const,
      connectNulls: false,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 10,
      color,
      data: tramo.map((punto) => datoDePeso(punto, color)),
    }))
  })

  return base(fechas, series, 'kg')
}

function opcionDeVueltas(vueltas: readonly VueltaDeTendencia[]): EChartsCoreOption {
  const fechas = vueltas.map((vuelta) => vuelta.fecha)
  const series = [
    {
      name: 'Ganancia media',
      type: 'line' as const,
      connectNulls: false,
      showSymbol: true,
      symbolSize: 10,
      color: TINTA,
      data: vueltas.map((vuelta) => {
        if (vuelta.gananciaMediaKilosPorDia === null) {
          return {
            value: [posicionDe(vuelta.fecha), '-'] as const,
            texto: '',
            detalle: '',
            symbol: 'none' as const,
          }
        }
        return {
          value: [posicionDe(vuelta.fecha), coordenada(vuelta.gananciaMediaKilosPorDia)] as const,
          texto: `${numeroLegible(vuelta.gananciaMediaKilosPorDia)} kg por día`,
          detalle: diaLegible(vuelta.fecha),
          symbol: 'circle' as const,
        }
      }),
    },
  ]
  return base(fechas, series, 'kg por día')
}

function opcionDeMeses(meses: readonly MesDeTendencia[]): EChartsCoreOption {
  const motivos = motivosPresentes(meses)
  const series = [
    {
      name: 'Nacimientos',
      type: 'bar' as const,
      data: meses.map((mes) => mes.nacimientos),
      itemStyle: { color: VERDE },
      barMaxWidth: 28,
    },
    ...motivos.map((motivo) => ({
      name: motivoDeSalida(motivo),
      type: 'bar' as const,
      stack: 'salidas',
      barMaxWidth: 28,
      itemStyle: { color: COLOR_DE_MOTIVO[motivo] ?? SUAVE },
      data: meses.map((mes) => mes.salidas.find((salida) => salida.motivo === motivo)?.cantidad ?? 0),
    })),
  ]

  return {
    textStyle: { fontFamily: 'Inter Variable, Inter, sans-serif', color: TINTA },
    tooltip: { trigger: 'item', confine: true },
    legend: { bottom: 0, textStyle: { color: TINTA, fontSize: 12 } },
    grid: { left: 8, right: 8, top: 16, bottom: 48, containLabel: true },
    xAxis: {
      type: 'category',
      data: meses.map((mes) => mesLegible(mes.mes)),
      axisLabel: { color: SUAVE, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: SUAVE, fontSize: 11 },
    },
    series,
  }
}

function base(
  fechas: readonly string[],
  series: readonly { readonly type: 'line'; readonly data: readonly Dato[] }[],
  unidad: string,
): EChartsCoreOption {
  const conAnio = new Set(fechas.map((fecha) => fecha.slice(0, 4))).size > 1
  return {
    textStyle: { fontFamily: 'Inter Variable, Inter, sans-serif', color: TINTA },
    tooltip: { trigger: 'item', confine: true, formatter: textoDelPunto },
    legend: { bottom: 0, textStyle: { color: TINTA, fontSize: 12 } },
    grid: { left: 8, right: 8, top: 16, bottom: 48, containLabel: true },
    xAxis: {
      type: 'time',
      axisLabel: {
        color: SUAVE,
        fontSize: 11,
        hideOverlap: true,
        formatter: (valor: number) => etiquetaDeTiempo(valor, conAnio),
      },
    },
    yAxis: {
      type: 'value',
      name: unidad,
      nameTextStyle: { color: SUAVE, fontSize: 11 },
      scale: true,
      axisLabel: { color: SUAVE, fontSize: 11 },
    },
    series,
  }
}

function datoDePeso(punto: AnimalParaGraficar['tramos'][number][number], colorDeLinea: string): Dato {
  const noMedido = punto.calidad !== 'measured'
  return {
    value: [posicionDe(punto.fecha), coordenada(punto.kilos)],
    texto: kilosLegibles(punto.kilos),
    detalle: `${diaLegible(punto.fecha)} · ${calidad(punto.calidad)}`,
    symbol: 'circle',
    itemStyle: noMedido
      ? {
          color: '#ffffff',
          borderColor: punto.calidad === 'observed' ? AMBAR : SUAVE,
          borderWidth: 2,
        }
      : { color: colorDeLinea, borderColor: colorDeLinea, borderWidth: 0 },
  }
}

function motivosPresentes(meses: readonly MesDeTendencia[]): readonly MotivoDeSalida[] {
  const orden: readonly MotivoDeSalida[] = ['sale', 'death', 'confirmed_missing', 'other', 'unknown']
  const presentes = new Set(meses.flatMap((mes) => mes.salidas.map((salida) => salida.motivo)))
  return orden.filter((motivo) => presentes.has(motivo))
}

type MotivoDeSalida = MesDeTendencia['salidas'][number]['motivo']

/** Solo para la coordenada. El texto que lee el dueño no pasa por aquí. */
function coordenada(texto: string): number {
  if (!/^-?\d+\.\d{3}$/.test(texto)) {
    throw new Error(`Un número para dibujar no trae tres decimales: ${texto}`)
  }
  return Number(texto)
}

/** Posición en el eje, en UTC, para que el día del rancho no se corra. */
function posicionDe(fecha: string): number {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  if (partes === null) {
    return 0
  }
  return Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))
}

function etiquetaDeTiempo(valor: number, conAnio: boolean): string {
  if (!Number.isFinite(valor)) {
    return ''
  }
  const fecha = new Date(valor)
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getUTCDate()).padStart(2, '0')
  const texto = `${String(fecha.getUTCFullYear())}-${mes}-${dia}`
  return conAnio ? diaLegible(texto) : diaCorto(texto)
}

function textoDelPunto(params: unknown): string {
  const lista = Array.isArray(params) ? params : [params]
  const bloques: string[] = []
  for (const crudo of lista) {
    if (typeof crudo !== 'object' || crudo === null || !('data' in crudo)) {
      continue
    }
    const data = crudo.data
    if (typeof data !== 'object' || data === null || !('texto' in data) || typeof data.texto !== 'string') {
      continue
    }
    if (data.texto === '') {
      continue
    }
    const serie = 'seriesName' in crudo && typeof crudo.seriesName === 'string' ? crudo.seriesName : ''
    const detalle = 'detalle' in data && typeof data.detalle === 'string' ? data.detalle : ''
    const partes = [serie, detalle, data.texto].filter((parte) => parte !== '').map(escapar)
    bloques.push(partes.join('<br/>'))
  }
  return bloques.join('<br/><br/>')
}

function escapar(texto: string): string {
  return texto.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
