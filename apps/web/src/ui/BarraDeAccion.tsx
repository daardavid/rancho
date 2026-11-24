import type { ReactNode } from 'react'

type Anclaje = 'ventana' | 'marco' | 'flujo'

/**
 * Pie de Pesaje y Alta. En la ventana queda fija al borde inferior de la
 * columna; con `sobreLaNavegacion` se sienta encima de la barra de 72 px.
 */
export function BarraDeAccion({
  children,
  nota,
  anclaje = 'ventana',
  sobreLaNavegacion = false,
}: {
  readonly children: ReactNode
  readonly nota?: string
  readonly anclaje?: Anclaje
  readonly sobreLaNavegacion?: boolean
}) {
  const encima = sobreLaNavegacion ? ' ui-barra-accion--sobre-nav' : ''
  return (
    <div className={`ui-barra-accion ui-barra-accion--${anclaje}${encima}`}>
      {children}
      {nota === undefined ? null : <p className="ui-barra-accion__nota">{nota}</p>}
    </div>
  )
}
