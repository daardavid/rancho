export type TonoDeResumen = 'principal' | 'neutro' | 'aviso'

export type TarjetaDeResumen = {
  readonly etiqueta: string
  readonly valor: string
  readonly detalle: string
  readonly tono: TonoDeResumen
}

/** Las tres cifras de arriba en Crecimiento. El valor ya viene escrito. */
export function Resumen({ tarjetas }: { readonly tarjetas: readonly TarjetaDeResumen[] }) {
  return (
    <div className="ui-resumen">
      {tarjetas.map((tarjeta) => (
        <article
          key={tarjeta.etiqueta}
          className={`ui-resumen__tarjeta ui-resumen__tarjeta--${tarjeta.tono}`}
        >
          <p className="ui-resumen__etiqueta">{tarjeta.etiqueta}</p>
          <p className="ui-resumen__valor">{tarjeta.valor}</p>
          <p className="ui-resumen__detalle">{tarjeta.detalle}</p>
        </article>
      ))}
    </div>
  )
}
