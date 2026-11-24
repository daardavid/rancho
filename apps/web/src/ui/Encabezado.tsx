import type { ReactNode } from 'react'

import { IconoRegresar } from './iconos'

export type AccionDeEncabezado = {
  readonly etiqueta: string
  readonly icono: ReactNode
  readonly href?: string
  readonly alTocar?: () => void
  readonly destacado?: boolean
}

function BotonDeIcono({ accion }: { readonly accion: AccionDeEncabezado }) {
  const clase =
    accion.destacado === true ? 'ui-icono-boton ui-icono-boton--destacado' : 'ui-icono-boton'
  if (accion.href !== undefined) {
    return (
      <a className={clase} href={accion.href} aria-label={accion.etiqueta}>
        {accion.icono}
      </a>
    )
  }
  return (
    <button type="button" className={clase} aria-label={accion.etiqueta} onClick={accion.alTocar}>
      {accion.icono}
    </button>
  )
}

/**
 * Título de pantalla. Con regreso el título baja a 24 px, como en Pesaje y Alta.
 * A la derecha caben hasta dos botones de ícono.
 *
 * `compacto` baja el título a 24 px también sin flecha de regreso: lo usan las
 * pantallas que se cierran con una «X» (Alta), donde el título de 30 px de una
 * pantalla de trabajo no cabe con los dos botones.
 */
export function Encabezado({
  etiqueta,
  titulo,
  subtitulo,
  acciones,
  alRegresar,
  hrefRegresar,
  etiquetaRegresar = 'Regresar',
  compacto = false,
}: {
  readonly etiqueta?: string
  readonly titulo: string
  readonly subtitulo?: ReactNode
  readonly acciones?: readonly AccionDeEncabezado[]
  readonly alRegresar?: () => void
  readonly hrefRegresar?: string
  readonly etiquetaRegresar?: string
  readonly compacto?: boolean
}) {
  const conRegreso = alRegresar !== undefined || hrefRegresar !== undefined
  const botones = (acciones ?? []).slice(0, 2)
  const conTituloChico = conRegreso || compacto

  return (
    <header className={conRegreso ? 'ui-encabezado ui-encabezado--regreso' : 'ui-encabezado'}>
      {conRegreso ? (
        hrefRegresar !== undefined ? (
          <a className="ui-icono-boton" href={hrefRegresar} aria-label={etiquetaRegresar}>
            <IconoRegresar />
          </a>
        ) : (
          <button type="button" className="ui-icono-boton" aria-label={etiquetaRegresar} onClick={alRegresar}>
            <IconoRegresar />
          </button>
        )
      ) : null}
      <div className="ui-encabezado__texto">
        {etiqueta === undefined ? null : <p className="ui-encabezado__etiqueta">{etiqueta}</p>}
        <h1
          className={
            conTituloChico
              ? 'ui-encabezado__titulo ui-encabezado__titulo--regreso'
              : 'ui-encabezado__titulo'
          }
        >
          {titulo}
        </h1>
        {subtitulo === undefined ? null : typeof subtitulo === 'string' ? (
          <p className="ui-encabezado__subtitulo">{subtitulo}</p>
        ) : (
          <div className="ui-encabezado__subtitulo">{subtitulo}</div>
        )}
      </div>
      {botones.length === 0 ? null : (
        <div className="ui-encabezado__acciones">
          {botones.map((accion) => (
            <BotonDeIcono key={accion.etiqueta} accion={accion} />
          ))}
        </div>
      )}
    </header>
  )
}
