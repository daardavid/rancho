import type { ReactNode } from 'react'

export type TonoDeEtiqueta = 'bien' | 'revisar' | 'sinDatos'

const CLASE: Record<TonoDeEtiqueta, string> = {
  bien: 'ui-etiqueta ui-etiqueta--bien',
  revisar: 'ui-etiqueta ui-etiqueta--revisar',
  sinDatos: 'ui-etiqueta ui-etiqueta--sin-datos',
}

/** Píldora de estado. El texto va siempre: el color no es el único aviso. */
export function Etiqueta({
  tono,
  children,
}: {
  readonly tono: TonoDeEtiqueta
  readonly children: ReactNode
}) {
  return <span className={CLASE[tono]}>{children}</span>
}
