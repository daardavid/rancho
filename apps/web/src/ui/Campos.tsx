import { useId, type ReactNode } from 'react'

/**
 * Los campos de la captura, pensados para el pulgar ([UX-13](../../../../../docs/product/ux-principles.md)).
 *
 * Un campo por renglón, etiqueta arriba y área táctil grande. Las opciones se
 * pintan como botones apilados para que se pueda escoger con un toque y sin
 * abrir una lista. «No sé» es una opción más: se ve igual que las demás y no
 * se marca como error ([UX-04](../../../../../docs/product/ux-principles.md)).
 */

import type { Etiquetado } from '../dominio/etiquetas'

/** La misma forma que una etiqueta: el código que viaja y el texto que se lee. */
export type Opcion = Etiquetado
export function CampoDeTexto({
  etiqueta,
  valor,
  alCambiar,
  ayuda,
  tipo = 'text',
  autoComplete,
  requerido = false,
  maxLength,
}: {
  readonly etiqueta: string
  readonly valor: string
  readonly alCambiar: (valor: string) => void
  readonly ayuda?: string
  readonly tipo?: 'text' | 'password'
  readonly autoComplete?: string
  readonly requerido?: boolean
  readonly maxLength?: number
}) {
  const id = useId()
  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta}
        {requerido ? <span className="campo__requerido"> (obligatorio)</span> : null}
      </label>
      {ayuda === undefined ? null : (
        <p className="campo__ayuda" id={`${id}-ayuda`}>
          {ayuda}
        </p>
      )}
      <input
        id={id}
        className="campo__entrada"
        type={tipo}
        value={valor}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
        autoComplete={autoComplete}
        aria-describedby={ayuda === undefined ? undefined : `${id}-ayuda`}
        maxLength={maxLength}
      />
    </div>
  )
}

export function CampoDeArea({
  etiqueta,
  valor,
  alCambiar,
  ayuda,
  maxLength,
}: {
  readonly etiqueta: string
  readonly valor: string
  readonly alCambiar: (valor: string) => void
  readonly ayuda?: string
  readonly maxLength?: number
}) {
  const id = useId()
  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      {ayuda === undefined ? null : (
        <p className="campo__ayuda" id={`${id}-ayuda`}>
          {ayuda}
        </p>
      )}
      <textarea
        id={id}
        className="campo__entrada campo__entrada--area"
        rows={3}
        value={valor}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
        aria-describedby={ayuda === undefined ? undefined : `${id}-ayuda`}
        maxLength={maxLength}
      />
    </div>
  )
}

/**
 * Una pregunta con sus respuestas posibles, una por renglón.
 *
 * Es un `radiogroup` de verdad: se navega con el teclado y el lector de
 * pantalla anuncia cuál está escogida. La opción «No sé» se captura aparte para
 * no pintarla nunca como un error.
 */
export function CampoDeOpciones({
  etiqueta,
  opciones,
  valor,
  alCambiar,
  ayuda,
  valorDesconocido = 'unknown',
}: {
  readonly etiqueta: string
  readonly opciones: readonly Opcion[]
  readonly valor: string
  readonly alCambiar: (valor: string) => void
  readonly ayuda?: string
  readonly valorDesconocido?: string | null
}) {
  const nombre = useId()
  return (
    <fieldset className="campo">
      <legend className="campo__etiqueta">{etiqueta}</legend>
      {ayuda === undefined ? null : <p className="campo__ayuda">{ayuda}</p>}
      <div className="opciones">
        {opciones.map((opcion) => (
          <label
            key={opcion.codigo}
            className={
              valorDesconocido !== null && opcion.codigo === valorDesconocido
                ? 'opcion opcion--nose'
                : 'opcion'
            }
          >
            <input
              type="radio"
              name={nombre}
              value={opcion.codigo}
              checked={valor === opcion.codigo}
              onChange={() => {
                alCambiar(opcion.codigo)
              }}
            />
            <span>{opcion.texto}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Un bloque con título, para que la pantalla se lea por secciones. */
export function Seccion({
  titulo,
  children,
}: {
  readonly titulo: string
  readonly children: ReactNode
}) {
  return (
    <section className="seccion">
      <h2 className="seccion__titulo">{titulo}</h2>
      {children}
    </section>
  )
}
