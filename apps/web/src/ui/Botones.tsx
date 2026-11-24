import type { ReactNode } from 'react'

type Anclaje = 'ventana' | 'marco' | 'flujo'

export function BotonPrincipal({
  children,
  tipo = 'button',
  alTocar,
  deshabilitado = false,
  href,
}: {
  readonly children: ReactNode
  readonly tipo?: 'button' | 'submit'
  readonly alTocar?: () => void
  readonly deshabilitado?: boolean
  readonly href?: string
}) {
  if (href !== undefined) {
    return (
      <a className="ui-boton-principal" href={href}>
        {children}
      </a>
    )
  }
  return (
    <button
      type={tipo}
      className="ui-boton-principal"
      onClick={alTocar}
      disabled={deshabilitado}
    >
      {children}
    </button>
  )
}

export function BotonSecundario({
  children,
  tipo = 'button',
  alTocar,
  deshabilitado = false,
  href,
  tono = 'verde',
}: {
  readonly children: ReactNode
  readonly tipo?: 'button' | 'submit'
  readonly alTocar?: () => void
  readonly deshabilitado?: boolean
  readonly href?: string
  readonly tono?: 'verde' | 'tinta'
}) {
  const clase = tono === 'tinta' ? 'ui-boton-secundario ui-boton-secundario--tinta' : 'ui-boton-secundario'
  if (href !== undefined) {
    return (
      <a className={clase} href={href}>
        {children}
      </a>
    )
  }
  return (
    <button type={tipo} className={clase} onClick={alTocar} disabled={deshabilitado}>
      {children}
    </button>
  )
}

/**
 * La acción principal de Hato, flotando sobre la barra inferior.
 * `ventana` la fija al borde de la ventana, dentro de la columna.
 */
export function BotonFlotante({
  children,
  icono,
  alTocar,
  href,
  anclaje = 'ventana',
}: {
  readonly children: ReactNode
  readonly icono?: ReactNode
  readonly alTocar?: () => void
  readonly href?: string
  readonly anclaje?: Anclaje
}) {
  const clase = `ui-boton-flotante ui-boton-flotante--${anclaje}`
  const contenido = (
    <>
      {icono}
      {children}
    </>
  )
  if (href !== undefined) {
    return (
      <a className={clase} href={href}>
        {contenido}
      </a>
    )
  }
  return (
    <button type="button" className={clase} onClick={alTocar}>
      {contenido}
    </button>
  )
}
