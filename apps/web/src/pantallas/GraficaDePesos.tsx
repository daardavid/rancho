import type { PuntoDeCrecimiento } from '@rancho/api-contracts'

import { diaLegible, kilosLegibles } from '../dominio/fechas'
import { gramosDe, textoDeGramos } from '../dominio/kilos'
import { TAMANO_DE_ETIQUETA, anchoDeEtiqueta } from './etiquetasDeGrafica'

/**
 * La serie de pesos de un animal, en una gráfica simple.
 *
 * No se agrega biblioteca de gráficas: una serie de cinco a diez puntos por
 * animal no la necesita, y una dependencia más es mantenimiento para siempre.
 * Son unas líneas de SVG. Lo que la biblioteca haría —escalar los puntos a un
 * cuadro— se hace aquí en veinte líneas y se puede leer entero.
 *
 * **Los kilos no se convierten a `number` para guardar nada.** Para dibujar sí
 * hace falta una coordenada, y una coordenada es un píxel, no un peso: el peso
 * se pasa a gramos enteros con aritmética de texto (`gramosDe`, sin coma
 * flotante) y de ahí a una posición. La etiqueta que lee el dueño sigue siendo
 * el texto que guardó la API.
 *
 * Con un solo peso no hay línea que trazar. En vez de una gráfica vacía o una
 * línea inventada, se dice que hace falta otro pesaje.
 */
export function GraficaDePesos({ pesos }: { readonly pesos: readonly PuntoDeCrecimiento[] }) {
  if (pesos.length === 0) {
    return <p className="campo__ayuda">Todavía no hay pesos que dibujar.</p>
  }

  if (pesos.length === 1) {
    const unico = pesos[0]
    return (
      <p className="campo__ayuda">
        Con un solo pesaje no hay línea todavía.
        {unico === undefined ? '' : ` El primero fue ${kilosLegibles(unico.kilos)} el ${diaLegible(unico.fecha)}.`}{' '}
        La gráfica aparece con el siguiente.
      </p>
    )
  }

  const alto = 160
  const margenArriba = 16
  const margenDerecha = 12
  const margenAbajo = 28
  const anchoDelDibujo = 220

  // Gramos enteros: no hay peso de coma flotante ni en el dibujo.
  const gramos = pesos.map((punto) => gramosDe(punto.kilos))
  const maximo = Math.max(...gramos)
  const minimo = Math.min(...gramos)
  // Un solo peso con varios registros iguales dejaría el rango en cero.
  const rango = maximo === minimo ? 1 : maximo - minimo

  // Tres renglones de referencia: el mayor, el de en medio y el menor.
  const medio = Math.round((maximo + minimo) / 2)
  const niveles = maximo === minimo ? [maximo] : [maximo, medio, minimo]
  const etiquetas = niveles.map((nivel) => kilosLegibles(textoDeGramos(nivel)))
  const margenIzquierda =
    etiquetas.reduce((mayor, texto) => Math.max(mayor, anchoDeEtiqueta(texto)), 0) + 8
  const ancho = margenIzquierda + anchoDelDibujo + margenDerecha
  const utilAlto = alto - margenArriba - margenAbajo

  const x = (indice: number): number => {
    if (pesos.length === 1) {
      return margenIzquierda + anchoDelDibujo / 2
    }
    return margenIzquierda + (anchoDelDibujo * indice) / (pesos.length - 1)
  }
  const y = (valor: number): number =>
    margenArriba + utilAlto - (utilAlto * (valor - minimo)) / rango

  const puntos = gramos.map((valor, indice) => ({
    cx: x(indice),
    cy: y(valor),
    punto: pesos[indice],
  }))

  const linea = puntos.map((punto) => `${punto.cx.toFixed(1)},${punto.cy.toFixed(1)}`).join(' ')

  const primero = puntos[0]
  const ultimo = puntos.at(-1)

  return (
    <figure className="grafica">
      <svg
        className="grafica__lienzo"
        viewBox={`0 0 ${String(ancho)} ${String(alto)}`}
        role="img"
        aria-label={`Pesos de ${String(pesos.length)} pesajes, de ${kilosLegibles(
          primero?.punto?.kilos ?? null,
        )} a ${kilosLegibles(ultimo?.punto?.kilos ?? null)}`}
      >
        {niveles.map((nivel, indice) => (
          <g key={nivel}>
            <line
              className="grafica__guia"
              x1={margenIzquierda}
              x2={ancho - margenDerecha}
              y1={y(nivel)}
              y2={y(nivel)}
            />
            <text
              className="grafica__etiqueta"
              fontSize={TAMANO_DE_ETIQUETA}
              x={margenIzquierda - 6}
              y={y(nivel) + 4}
              textAnchor="end"
            >
              {etiquetas[indice]}
            </text>
          </g>
        ))}
        <polyline className="grafica__linea" points={linea} />
        {puntos.map((punto, indice) => (
          <circle
            key={punto.punto?.pesoId ?? indice}
            className={
              punto.punto?.calidad === 'measured'
                ? 'grafica__punto'
                : 'grafica__punto grafica__punto--declarado'
            }
            cx={punto.cx}
            cy={punto.cy}
            r={4}
          />
        ))}
        {primero === undefined ? null : (
          <text
            className="grafica__etiqueta"
            fontSize={TAMANO_DE_ETIQUETA}
            x={primero.cx}
            y={alto - 8}
            textAnchor="start"
          >
            {diaLegible(primero.punto?.fecha ?? null)}
          </text>
        )}
        {ultimo === undefined || ultimo === primero ? null : (
          <text
            className="grafica__etiqueta"
            fontSize={TAMANO_DE_ETIQUETA}
            x={ultimo.cx}
            y={alto - 8}
            textAnchor="end"
          >
            {diaLegible(ultimo.punto?.fecha ?? null)}
          </text>
        )}
      </svg>
      {pesos.some((punto) => punto.calidad !== 'measured') ? (
        <figcaption className="grafica__pie">
          El punto hueco es un peso que no se midió en la báscula.
        </figcaption>
      ) : null}
    </figure>
  )
}
