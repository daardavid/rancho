import { useState, type ReactNode } from 'react'

import { IconoAbajo } from './iconos'

/**
 * Un bloque que se abre y se cierra con un toque.
 *
 * Lo opcional se esconde ([Guía visual](../../../../../docs/design/guia-visual.md)):
 * «Más datos» en el alta, los aretes y la historia en la ficha. El cuerpo se
 * queda montado y solo se oculta, para no perder lo que alguien estaba
 * escribiendo al cerrarlo sin querer.
 *
 * Es un botón con `aria-expanded`, no un `<details>`: así el título y el
 * resumen se leen juntos y el estado lo anuncia el lector.
 */
export function Desplegable({
  titulo,
  resumen,
  abierto: abiertoAlAbrir = false,
  children,
}: {
  readonly titulo: string
  /** Lo que hay dentro, en dos palabras. Se ve junto al título. */
  readonly resumen?: string
  readonly abierto?: boolean
  readonly children: ReactNode
}) {
  const [abierto, setAbierto] = useState(abiertoAlAbrir)

  return (
    <section className="ui-desplegable" data-abierto={abierto ? 'true' : 'false'}>
      <button
        type="button"
        className="ui-desplegable__cabecera"
        aria-expanded={abierto}
        onClick={() => {
          setAbierto((actual) => !actual)
        }}
      >
        <span className="ui-desplegable__texto">
          <span className="ui-desplegable__titulo">{titulo}</span>
          {resumen === undefined ? null : (
            <span className="ui-desplegable__resumen"> · {resumen}</span>
          )}
        </span>
        <span className="ui-desplegable__flecha">
          <IconoAbajo tamano={16} />
        </span>
      </button>
      <div className="ui-desplegable__cuerpo" hidden={!abierto}>
        {children}
      </div>
    </section>
  )
}
