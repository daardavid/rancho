import { GrupoExclusivo, type OpcionDeGrupo } from './GrupoExclusivo'

/**
 * Píldoras de un toque para una pregunta con cuatro respuestas cortas
 * (¿de quién es?).
 *
 * Es un grupo de radios de verdad, como `Segmentado`: las flechas del teclado
 * mueven la elección y el lector anuncia cuál está marcada. La elegida va en
 * verde con el borde grueso; «No sé» es una píldora más y no se ve como error.
 */
export function Pildoras({
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
      clase="ui-pildoras"
      claseOpcion="ui-pildora"
    />
  )
}
