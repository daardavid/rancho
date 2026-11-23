import type { ReactNode } from 'react'

import { mensajeDeError } from '../dominio/mensajes'

/** Una caja de error con la frase que dice qué hacer. */
export function AvisoDeError({ error }: { readonly error: unknown }) {
  const mensaje = mensajeDeError(error)
  return (
    <div className="aviso aviso--mal" role="alert">
      <p className="aviso__titulo">{mensaje.quePaso}</p>
      <p className="aviso__quehacer">{mensaje.queHacer}</p>
      <p className="aviso__codigo">Código: {mensaje.codigo}</p>
    </div>
  )
}

/** El texto de espera de una consulta. */
export function Cargando({ que }: { readonly que: string }) {
  return <p className="cargando">{que}</p>
}

export function BotonGrande({
  children,
  tipo = 'button',
  alTocar,
  deshabilitado = false,
  secundario = false,
}: {
  readonly children: ReactNode
  readonly tipo?: 'button' | 'submit'
  readonly alTocar?: () => void
  readonly deshabilitado?: boolean
  readonly secundario?: boolean
}) {
  return (
    <button
      type={tipo}
      className={secundario ? 'boton boton--secundario' : 'boton boton--principal'}
      onClick={alTocar}
      disabled={deshabilitado}
    >
      {children}
    </button>
  )
}
