import { useId } from 'react'

import { IconoCamara } from './iconos'

/**
 * El peso se queda como texto. El campo no lo convierte a `number`:
 * los kilos viajan como cadena hasta la API.
 */
export function CampoDeKilos({
  etiqueta,
  valor,
  alCambiar,
  alTomarFoto,
}: {
  readonly etiqueta: string
  readonly valor: string
  readonly alCambiar: (valor: string) => void
  readonly alTomarFoto?: () => void
}) {
  const id = useId()

  return (
    <div className="ui-kilos">
      <label className="ui-sr" htmlFor={id}>
        {etiqueta}
      </label>
      <div className="ui-kilos__renglon">
        <div className="ui-kilos__caja">
          <input
            id={id}
            className="ui-kilos__entrada"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={valor}
            onChange={(evento) => {
              alCambiar(evento.target.value)
            }}
          />
          <span className="ui-kilos__sufijo" aria-hidden="true">
            kg
          </span>
        </div>
        <button
          type="button"
          className="ui-kilos__foto"
          aria-label="Tomar foto de la báscula"
          onClick={alTomarFoto}
        >
          <IconoCamara />
        </button>
      </div>
    </div>
  )
}
