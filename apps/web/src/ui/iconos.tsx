import type { ReactNode } from 'react'

/**
 * Íconos de trazo de la guía: 2 px, sin biblioteca y sin emoji.
 * `currentColor` para que el botón que los contiene pinte el trazo.
 */

function Icono({
  children,
  tamano,
}: {
  readonly children: ReactNode
  readonly tamano: number
}) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

type Tamano = { readonly tamano?: number }

export function IconoMas({ tamano = 22 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <path d="M12 5v14M5 12h14" />
    </Icono>
  )
}

export function IconoMenu({ tamano = 20 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icono>
  )
}

export function IconoBuscar({ tamano = 18 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icono>
  )
}

export function IconoAviso({ tamano = 22 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </Icono>
  )
}

export function IconoBascula({ tamano = 22 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <path d="M6 20h12l-1.5-11h-9z" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v2" />
    </Icono>
  )
}

export function IconoInicio({ tamano = 22 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M7 10.5V20h10v-9.5" />
    </Icono>
  )
}

export function IconoHato({ tamano = 22 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </Icono>
  )
}

export function IconoCrecimiento({ tamano = 22 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </Icono>
  )
}

export function IconoRegresar({ tamano = 20 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <path d="M15 18l-6-6 6-6" />
    </Icono>
  )
}

export function IconoCerrar({ tamano = 18 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icono>
  )
}

export function IconoPalomita({ tamano = 16 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <path d="M5 12l5 5 9-10" />
    </Icono>
  )
}

export function IconoReloj({ tamano = 16 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </Icono>
  )
}

export function IconoCamara({ tamano = 24 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </Icono>
  )
}

export function IconoAbajo({ tamano = 16 }: Tamano) {
  return (
    <Icono tamano={tamano}>
      <path d="m6 9 6 6 6-6" />
    </Icono>
  )
}
