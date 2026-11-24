import { GrupoExclusivo, type OpcionDeGrupo } from './GrupoExclusivo'

/** Píldoras de un toque. La activa va en tinta, con texto blanco. */
export function Filtros({
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
      clase="ui-filtros"
      claseOpcion="ui-filtro"
      mostrarEtiqueta={false}
    />
  )
}
