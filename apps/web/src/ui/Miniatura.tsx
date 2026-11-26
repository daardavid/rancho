import { useState } from 'react'

/**
 * La foto chica del animal.
 *
 * La lista y los buscadores piden esta, no la foto completa. Si el archivo
 * no está (el SQL se restauró en otra máquina, o la versión publicada no
 * trae los bytes), no se deja el ícono de imagen rota.
 */
export function Miniatura({
  id,
  alFallar,
}: {
  readonly id: string | null | undefined
  readonly alFallar?: () => void
}) {
  const [idFallido, setIdFallido] = useState<string | null>(null)
  if (id === null || id === undefined || idFallido === id) {
    return null
  }
  return (
    <img
      className="ui-miniatura"
      alt=""
      src={`/api/evidencia/${id}`}
      onError={() => {
        setIdFallido(id)
        alFallar?.()
      }}
    />
  )
}
