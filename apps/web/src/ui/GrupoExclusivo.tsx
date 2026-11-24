import { useId, type CSSProperties } from 'react'

/** Una opción de un control de una sola elección: sexo, tipo, filtro. */
export type OpcionDeGrupo = {
  readonly valor: string
  readonly texto: string
}

/**
 * Radios de verdad con el mismo `name`: las flechas del teclado mueven la
 * elección y el lector anuncia cuál está marcada. «No sé» es una opción más;
 * no lleva estilo de error.
 */
export function GrupoExclusivo({
  etiqueta,
  opciones,
  valor,
  alElegir,
  clase,
  claseOpcion,
  mostrarEtiqueta = true,
  columnas,
}: {
  readonly etiqueta: string
  readonly opciones: readonly OpcionDeGrupo[]
  readonly valor: string
  readonly alElegir: (valor: string) => void
  readonly clase: string
  readonly claseOpcion: string
  readonly mostrarEtiqueta?: boolean
  readonly columnas?: number
}) {
  const nombre = useId()
  const idEtiqueta = useId()
  const estilo: CSSProperties | undefined =
    columnas === undefined
      ? undefined
      : { gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }

  return (
    <div className="ui-grupo">
      {mostrarEtiqueta ? (
        <p className="ui-grupo__etiqueta" id={idEtiqueta}>
          {etiqueta}
        </p>
      ) : null}
      <div
        className={clase}
        role="radiogroup"
        aria-label={mostrarEtiqueta ? undefined : etiqueta}
        aria-labelledby={mostrarEtiqueta ? idEtiqueta : undefined}
        style={estilo}
      >
        {opciones.map((opcion) => {
          const activa = valor === opcion.valor
          return (
            <label
              key={opcion.valor}
              className={activa ? `${claseOpcion} ui-opcion ${claseOpcion}--activa` : `${claseOpcion} ui-opcion`}
            >
              <input
                type="radio"
                name={nombre}
                value={opcion.valor}
                checked={activa}
                onChange={() => {
                  alElegir(opcion.valor)
                }}
              />
              <span>{opcion.texto}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
