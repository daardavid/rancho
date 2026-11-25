import { GrupoExclusivo, type OpcionDeGrupo } from './GrupoExclusivo'

/** Tres opciones sobre una pista (sexo, calidad del peso). */
export function Segmentado({
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
      clase="ui-segmentado"
      claseOpcion="ui-segmento"
      columnas={Math.max(opciones.length, 1)}
    />
  )
}
