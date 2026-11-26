import type { EChartsCoreOption } from 'echarts/core'

import type { MesDeTendencia, VueltaDeTendencia } from '@rancho/api-contracts'

import { diaCorto, diaLegible, kilosLegibles, mesLegible, numeroLegible } from '../../dominio/fechas'
import { calidad, motivoDeSalida } from '../../dominio/etiquetas'
import type { AnimalParaGraficar } from '../../dominio/tendencias'
import {
  AMBAR_TEXTO,
  BORDE,
  BLANCO,
  COLOR_DE_NACIMIENTOS,
  MARCA_DE_VUELTAS,
  ORDEN_DE_MOTIVOS,
  SUAVE,
  TINTA,
  marcaDeAnimal,
  marcaDeMotivo,
  type MarcaDeAnimal,
  type Simbolo,
} from './estilo'

/**
 * Lo que se le entrega a ECharts: series, ejes y leyenda.
 *
 * Está aparte del dibujo para que se pueda leer sin lienzo. **Aquí no se
 * importa ECharts en tiempo de ejecución**: el tipo se importa con `import
 * type` y desaparece al compilar. Por eso la prueba de la paleta no baja la
 * biblioteca ni necesita un canvas, y la pantalla sigue sin cargar las
 * gráficas hasta que se abre.
 *
 * Los colores y las marcas —color, símbolo y trazo por animal, y color y trama
 * por motivo de salida— salen de `estilo.ts`. Los kilos siguen siendo texto
 * hasta `coordenada`, que existe solo para poner un punto en el lienzo.
 */

type Dato = {
  readonly value: readonly [number, number | '-']
  readonly texto: string
  readonly detalle: string
  readonly symbol: Simbolo | 'none'
  readonly itemStyle?: { readonly color: string; readonly borderColor: string; readonly borderWidth: number }
}

type SerieDeLinea = {
  readonly name: string
  readonly type: 'line'
  readonly data: readonly Dato[]
  readonly symbol: Simbolo
  readonly symbolSize: number
  readonly lineStyle: { readonly color: string; readonly type: string; readonly width: number }
  readonly itemStyle: { readonly color: string }
}

export function opcionDePesos(animales: readonly AnimalParaGraficar[]): EChartsCoreOption {
  const fechas = animales.flatMap((animal) => animal.tramos.flatMap((tramo) => tramo.map((punto) => punto.fecha)))
  const series: SerieDeLinea[] = animales.flatMap((animal, indice) => {
    const marca = marcaDeAnimal(indice)
    return animal.tramos.map((tramo) => ({
      name: animal.nombre,
      type: 'line' as const,
      connectNulls: false,
      symbol: marca.simbolo,
      symbolSize: 10,
      lineStyle: { color: marca.color, type: marca.trazo, width: 2 },
      itemStyle: { color: marca.color },
      data: tramo.map((punto) => datoDePeso(punto, marca)),
    }))
  })

  return base(fechas, series, 'kg')
}

export function opcionDeVueltas(vueltas: readonly VueltaDeTendencia[]): EChartsCoreOption {
  const fechas = vueltas.map((vuelta) => vuelta.fecha)
  const marca = MARCA_DE_VUELTAS
  const series: SerieDeLinea[] = [
    {
      name: 'Ganancia media',
      type: 'line' as const,
      symbol: marca.simbolo,
      symbolSize: 10,
      lineStyle: { color: marca.color, type: marca.trazo, width: 2 },
      itemStyle: { color: marca.color },
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
          symbol: marca.simbolo,
        }
      }),
    },
  ]
  return base(fechas, series, 'kg por día')
}

export function opcionDeMeses(meses: readonly MesDeTendencia[]): EChartsCoreOption {
  const motivos = motivosPresentes(meses)
  const series = [
    {
      name: 'Nacimientos',
      type: 'bar' as const,
      data: meses.map((mes) => mes.nacimientos),
      itemStyle: { color: COLOR_DE_NACIMIENTOS },
      barMaxWidth: 28,
    },
    ...motivos.map((motivo) => {
      const marca = marcaDeMotivo(motivo)
      return {
        name: motivoDeSalida(motivo),
        type: 'bar' as const,
        stack: 'salidas',
        barMaxWidth: 28,
        // La trama es parte de la serie, no del punto: así la leyenda enseña
        // la misma marca que la barra y el motivo se distingue sin color.
        itemStyle: { color: marca.color, decal: marca.decal },
        data: meses.map((mes) => mes.salidas.find((salida) => salida.motivo === motivo)?.cantidad ?? 0),
      }
    }),
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
      axisLine: { lineStyle: { color: BORDE } },
      axisTick: { lineStyle: { color: BORDE } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: SUAVE, fontSize: 11 },
      splitLine: { lineStyle: { color: BORDE } },
    },
    series,
  }
}

function base(
  fechas: readonly string[],
  series: readonly SerieDeLinea[],
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
      axisLine: { lineStyle: { color: BORDE } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: unidad,
      nameTextStyle: { color: SUAVE, fontSize: 11 },
      scale: true,
      axisLabel: { color: SUAVE, fontSize: 11 },
      splitLine: { lineStyle: { color: BORDE } },
    },
    series,
  }
}

/**
 * Un punto de la serie de un animal.
 *
 * El símbolo es el del animal, así que las series se distinguen también sin
 * color. Un peso que no se midió va hueco y con el borde de su calidad: ámbar
 * si lo vio alguien, neutro si solo lo dijeron. El hueco no es un cero ni un
 * punto lleno.
 */
function datoDePeso(
  punto: AnimalParaGraficar['tramos'][number][number],
  marca: MarcaDeAnimal,
): Dato {
  const noMedido = punto.calidad !== 'measured'
  return {
    value: [posicionDe(punto.fecha), coordenada(punto.kilos)],
    texto: kilosLegibles(punto.kilos),
    detalle: `${diaLegible(punto.fecha)} · ${calidad(punto.calidad)}`,
    symbol: marca.simbolo,
    itemStyle: noMedido
      ? {
          color: BLANCO,
          borderColor: punto.calidad === 'observed' ? AMBAR_TEXTO : SUAVE,
          borderWidth: 2,
        }
      : { color: marca.color, borderColor: marca.color, borderWidth: 0 },
  }
}

function motivosPresentes(meses: readonly MesDeTendencia[]): readonly MotivoDeSalida[] {
  const presentes = new Set(meses.flatMap((mes) => mes.salidas.map((salida) => salida.motivo)))
  return ORDEN_DE_MOTIVOS.filter((motivo) => presentes.has(motivo))
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
