import { useEffect, useId, useRef } from 'react'

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
  enfocar = false,
  error,
}: {
  readonly etiqueta: string
  readonly valor: string
  readonly alCambiar: (valor: string) => void
  readonly alTomarFoto?: () => void
  /** Al montar, el teclado decimal queda listo. El pesaje lo usa al cambiar de animal. */
  readonly enfocar?: boolean
  readonly error?: string
}) {
  const id = useId()
  const entrada = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (enfocar) {
      entrada.current?.focus()
    }
  }, [enfocar])

  return (
    <div className="ui-kilos">
      <label className="ui-sr" htmlFor={id}>
        {etiqueta}
      </label>
      <div className="ui-kilos__renglon">
        <div className="ui-kilos__caja">
          <input
            ref={entrada}
            id={id}
            className="ui-kilos__entrada"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={valor}
            aria-invalid={error === undefined ? undefined : true}
            aria-describedby={error === undefined ? undefined : `${id}-error`}
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
      {error === undefined ? null : (
        <p className="campo__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
