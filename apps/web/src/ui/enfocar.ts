import { useEffect, type RefObject } from 'react'

/**
 * Baja hasta el primer aviso y lo enfoca.
 *
 * El botón de guardar puede estar fijo abajo mientras el aviso quedó más
 * arriba, fuera de la pantalla. El aviso ya existe: hay que llevar la vista
 * hasta él. `tabIndex` negativo lo hace enfocable sin meterlo en el tabulado.
 */
export function enfocarPrimerAviso(contenedor: HTMLElement | null): void {
  const aviso = contenedor?.querySelector<HTMLElement>('[role="alert"]')
  if (aviso === undefined || aviso === null) {
    return
  }
  if (!aviso.hasAttribute('tabindex')) {
    aviso.tabIndex = -1
  }
  if (typeof aviso.scrollIntoView === 'function') {
    aviso.scrollIntoView({ block: 'center' })
  }
  aviso.focus()
}

/** Cuando `señal` cambia, enfoca el primer aviso que haya dentro del contenedor. */
export function useEnfocarAviso(contenedor: RefObject<HTMLElement | null>, señal: unknown): void {
  useEffect(() => {
    enfocarPrimerAviso(contenedor.current)
  }, [contenedor, señal])
}
