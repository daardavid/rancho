import { GrupoExclusivo, type OpcionDeGrupo } from './GrupoExclusivo'

/** Rejilla de botones grandes para elegir una opción (tipo de animal). */
export function Mosaicos({
  etiqueta,
  opciones,
  valor,
  alElegir,
}: {
  readonly etiqueta: string
  readonly opciones: readonly OpcionDeGrupo[]
  readonly valor: string
  readonly alElegir: (valor: string) => void
}) {
  return (
    <GrupoExclusivo
      etiqueta={etiqueta}
      opciones={opciones}
      valor={valor}
      alElegir={alElegir}
      clase="ui-mosaicos"
      claseOpcion="ui-mosaico"
    />
  )
}
