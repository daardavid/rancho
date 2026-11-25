/**
 * Barra de la vuelta: verde lo pesado, ámbar lo que no se pesó.
 * El ancho es un porcentaje de conteo para dibujar; no es un peso.
 */
function porcentaje(parte: number, total: number): number {
  if (total <= 0 || parte <= 0) {
    return 0
  }
  return Math.round((Math.min(parte, total) * 100) / total)
}

export function BarraDeAvance({
  texto,
  detalle,
  pesados,
  sinPeso,
  total,
}: {
  readonly texto: string
  readonly detalle?: string
  readonly pesados: number
  readonly sinPeso: number
  readonly total: number
}) {
  const anchoPesados = porcentaje(pesados, total)
  const anchoHuecos = Math.min(porcentaje(sinPeso, total), 100 - anchoPesados)

  return (
    <div className="ui-avance">
      <div className="ui-avance__leyenda">
        <span className="ui-avance__texto">{texto}</span>
        {detalle === undefined ? null : <span className="ui-avance__detalle">{detalle}</span>}
      </div>
      <div className="ui-avance__pista" aria-hidden="true">
        <span className="ui-avance__pesados" style={{ width: `${anchoPesados}%` }} />
        <span className="ui-avance__huecos" style={{ width: `${anchoHuecos}%` }} />
      </div>
    </div>
  )
}
