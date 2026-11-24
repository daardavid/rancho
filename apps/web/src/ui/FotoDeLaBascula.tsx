import { AUSENCIA_DE_FOTO } from '@rancho/api-contracts'
import { useEffect, useId, useRef, useState } from 'react'

import { subirFoto } from '../api/evidencia'
import { AvisoDeError } from './Avisos'

/**
 * La foto del indicador, tomada con la cámara del celular.
 *
 * Es evidencia del peso. No elige si fue medido, visto o dicho: eso sigue
 * en «¿Cómo se obtuvo?». Quitar la foto del peso no borra el archivo.
 */

export function FotoVisible({ evidenciaId }: { readonly evidenciaId: string | null | undefined }) {
  const [idFallido, setIdFallido] = useState<string | null>(null)
  if (evidenciaId === null || evidenciaId === undefined || evidenciaId === AUSENCIA_DE_FOTO) {
    return null
  }
  if (idFallido === evidenciaId) {
    return <p className="campo__ayuda">La foto se registró, pero no se encuentra.</p>
  }

  return (
    <img
      className="foto-bascula__imagen"
      alt="Foto de la báscula"
      src={`/api/evidencia/${evidenciaId}`}
      onError={() => {
        setIdFallido(evidenciaId)
      }}
    />
  )
}

export function FotoDeLaBascula({
  evidenciaId,
  alCambiar,
  alOcuparse,
}: {
  readonly evidenciaId: string | null
  readonly alCambiar: (evidenciaId: string | null) => void
  /** Avisa mientras los bytes van al rancho, para no guardar el peso antes. */
  readonly alOcuparse?: (ocupada: boolean) => void
}) {
  const id = useId()
  const [ocupada, setOcupada] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const alCambiarVigente = useRef(alCambiar)
  const alOcuparseVigente = useRef(alOcuparse)
  const montado = useRef(true)
  const subiendo = useRef(false)

  useEffect(() => {
    alCambiarVigente.current = alCambiar
    alOcuparseVigente.current = alOcuparse
  }, [alCambiar, alOcuparse])

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
      if (subiendo.current) {
        subiendo.current = false
        alOcuparseVigente.current?.(false)
      }
    }
  }, [])

  const ocupar = (valor: boolean): void => {
    subiendo.current = valor
    setOcupada(valor)
    alOcuparseVigente.current?.(valor)
  }

  const elegir = (archivo: File | undefined): void => {
    if (archivo === undefined || ocupada) {
      return
    }
    setError(null)
    ocupar(true)
    void subirFoto(archivo).then(
      (fotoId) => {
        // Si el renglón se quitó o pasó a «No se pesó», este componente ya no
        // está. La subida no vuelve a escribir el peso; el botón de guardar
        // se soltó al desmontar.
        if (!montado.current) {
          return
        }
        alCambiarVigente.current(fotoId)
        ocupar(false)
      },
      (fallo: unknown) => {
        if (!montado.current) {
          return
        }
        setError(fallo)
        ocupar(false)
      },
    )
  }

  return (
    <div className="foto-bascula">
      <label className="campo__etiqueta" htmlFor={id}>
        Foto de la báscula
      </label>
      <p className="campo__ayuda" id={`${id}-ayuda`}>
        Opcional. No cambia si el peso se midió, se vio o te lo dijeron.
      </p>
      <FotoVisible evidenciaId={evidenciaId} />
      <input
        id={id}
        className="campo__entrada"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        aria-describedby={`${id}-ayuda`}
        disabled={ocupada}
        onChange={(evento) => {
          const archivo = evento.target.files?.[0]
          evento.target.value = ''
          elegir(archivo)
        }}
      />
      {ocupada ? <p className="campo__ayuda">Subiendo la foto…</p> : null}
      {error === null ? null : <AvisoDeError error={error} />}
      {evidenciaId === null ? null : (
        <button
          type="button"
          className="enlace"
          onClick={() => {
            alCambiar(null)
          }}
        >
          Quitar la foto
        </button>
      )}
      {evidenciaId === null ? null : (
        <p className="campo__ayuda">Si la quitas, deja de verse en este peso. La foto no se borra.</p>
      )}
    </div>
  )
}
