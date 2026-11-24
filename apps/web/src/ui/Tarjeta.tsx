import type { ReactNode } from 'react'

export function Tarjeta({
  children,
  activa = false,
}: {
  readonly children: ReactNode
  readonly activa?: boolean
}) {
  return <div className={activa ? 'ui-tarjeta ui-tarjeta--activa' : 'ui-tarjeta'}>{children}</div>
}
