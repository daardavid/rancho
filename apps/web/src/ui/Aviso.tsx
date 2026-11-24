import { IconoAviso } from './iconos'

/** Tarjeta ámbar: hueco de pesaje u otra cosa que hay que mirar. */
export function Aviso({
  titulo,
  detalle,
  enlace,
}: {
  readonly titulo: string
  readonly detalle?: string
  readonly enlace?: { readonly texto: string; readonly href: string }
}) {
  return (
    <div className="ui-aviso">
      <IconoAviso />
      <div className="ui-aviso__texto">
        <p className="ui-aviso__titulo">{titulo}</p>
        {detalle === undefined ? null : <p className="ui-aviso__detalle">{detalle}</p>}
      </div>
      {enlace === undefined ? null : (
        <a className="ui-aviso__enlace" href={enlace.href}>
          {enlace.texto}
        </a>
      )}
    </div>
  )
}
