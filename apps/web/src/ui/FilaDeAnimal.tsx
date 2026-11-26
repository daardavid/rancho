import type { ReactNode } from 'react'

import { Etiqueta, type TonoDeEtiqueta } from './Etiqueta'
import { Miniatura } from './Miniatura'

/** Categoría solo para el color del avatar. No es un dato nuevo del animal. */
export type CategoriaVisual = 'calf' | 'cow' | 'bull' | 'other' | 'unknown'

/**
 * Dos letras para el avatar.
 * Con dos palabras, la inicial de cada una. Con una, las dos primeras letras.
 */
function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter((palabra) => palabra !== '')
  const primera = palabras[0]
  if (primera === undefined) {
    return '·'
  }
  const segunda = palabras[1]
  if (segunda !== undefined) {
    return `${primera.charAt(0)}${segunda.charAt(0)}`.toLocaleUpperCase('es-MX')
  }
  return primera.slice(0, 2).toLocaleUpperCase('es-MX')
}

function Cuerpo({
  nombre,
  detalle,
  peso,
  ganancia,
  tono,
  categoria,
  miniaturaId,
}: {
  readonly nombre: string
  readonly detalle: string
  readonly peso: string
  readonly ganancia: string
  readonly tono: TonoDeEtiqueta
  readonly categoria: CategoriaVisual
  readonly miniaturaId?: string | null
}) {
  return (
    <>
      {miniaturaId === null || miniaturaId === undefined ? (
        <span className={`ui-avatar ui-avatar--${categoria}`}>{iniciales(nombre)}</span>
      ) : (
        <Miniatura id={miniaturaId} />
      )}
      <span className="ui-fila__texto">
        <span className="ui-fila__nombre">{nombre}</span>
        <span className="ui-fila__detalle">{detalle}</span>
      </span>
      <span className="ui-fila__peso">
        <span className="ui-fila__kilos">{peso}</span>
        <Etiqueta tono={tono}>{ganancia}</Etiqueta>
      </span>
    </>
  )
}

export function FilaDeAnimal({
  nombre,
  detalle,
  peso,
  ganancia,
  tono,
  categoria = 'unknown',
  miniaturaId = null,
  href,
  alTocar,
  seleccion,
}: {
  readonly nombre: string
  readonly detalle: string
  readonly peso: string
  readonly ganancia: string
  readonly tono: TonoDeEtiqueta
  readonly categoria?: CategoriaVisual
  /** Si hay foto, la fila muestra la miniatura y no las iniciales. */
  readonly miniaturaId?: string | null
  readonly href?: string
  readonly alTocar?: () => void
  /**
   * Modo de selección para mover varios animales a la vez. La fila deja de
   * navegar y se convierte en una casilla grande: en el celular se toca la fila
   * entera, no un cuadrito diminuto.
   */
  readonly seleccion?: {
    readonly marcado: boolean
    readonly alCambiar: (marcado: boolean) => void
    readonly nombreAccesible: string
  }
}) {
  const cuerpo: ReactNode = (
    <Cuerpo
      nombre={nombre}
      detalle={detalle}
      peso={peso}
      ganancia={ganancia}
      tono={tono}
      categoria={categoria}
      miniaturaId={miniaturaId}
    />
  )

  if (seleccion !== undefined) {
    return (
      <label className={seleccion.marcado ? 'ui-fila ui-fila--marcada' : 'ui-fila'}>
        <input
          type="checkbox"
          className="ui-fila__casilla"
          checked={seleccion.marcado}
          aria-label={seleccion.nombreAccesible}
          onChange={(evento) => {
            seleccion.alCambiar(evento.target.checked)
          }}
        />
        {cuerpo}
      </label>
    )
  }

  if (href !== undefined) {
    return (
      <a className="ui-fila" href={href}>
        {cuerpo}
      </a>
    )
  }
  if (alTocar !== undefined) {
    return (
      <button type="button" className="ui-fila" onClick={alTocar}>
        {cuerpo}
      </button>
    )
  }
  return <div className="ui-fila ui-fila--estatica">{cuerpo}</div>
}
