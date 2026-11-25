import { AUSENCIA_DE_FOTO } from '@rancho/api-contracts'
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'

import { subirFoto } from '../api/evidencia'
import { AvisoDeError } from './Avisos'

/**
 * La foto del indicador, tomada con la cámara del celular.
 *
 * Es evidencia del peso. No elige si fue medido, visto o dicho: eso sigue
 * en «¿Cómo se obtuvo?». Quitar la foto del peso no borra el archivo.
 */

export function FotoVisible({
  evidenciaId,
  alt = 'Foto de la báscula',
}: {
  readonly evidenciaId: string | null | undefined
  readonly alt?: string
}) {
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
      alt={alt}
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
  idDelCampo,
  ancla,
  etiqueta = 'Foto de la báscula',
  ayuda = 'Opcional. No cambia si el peso se midió, se vio o te lo dijeron.',
  alt = 'Foto de la báscula',
  ayudaAlQuitar = 'Si la quitas, deja de verse en este peso. La foto no se borra.',
}: {
  readonly evidenciaId: string | null
  readonly alCambiar: (evidenciaId: string | null) => void
  /** Avisa mientras los bytes van al rancho, para no guardar el peso antes. */
  readonly alOcuparse?: (ocupada: boolean) => void
  readonly etiqueta?: string
  readonly ayuda?: string
  readonly alt?: string
  readonly ayudaAlQuitar?: string
  /**
   * Id estable del input. El botón de la cámara lo busca para abrirlo aunque
   * la tarjeta activa haya cambiado: la subida sigue viva en este componente.
   */
  readonly idDelCampo?: string
  /**
   * Dónde se ve la miniatura.
   *
   * - Sin ancla (`undefined`): el campo va en línea, como al corregir un peso.
   * - Un elemento: la miniatura del animal en turno, dentro de su tarjeta.
   * - `null`: la fila no está en turno. Solo queda el input oculto, para que
   *   una foto que todavía sube no se pierda, sin imagen ni «Quitar la foto».
   */
  readonly ancla?: HTMLElement | null
}) {
  const idGenerado = useId()
  const id = idDelCampo ?? idGenerado
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

  const alElegirArchivo = (evento: ChangeEvent<HTMLInputElement>): void => {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    elegir(archivo)
  }

  const controles = (
    <>
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
        <p className="campo__ayuda">{ayudaAlQuitar}</p>
      )}
    </>
  )

  // Corregir un peso no pasa ancla: el campo se ve y se enfoca, como los demás.
  if (ancla === undefined) {
    return (
      <div className="foto-bascula">
        <label className="campo__etiqueta" htmlFor={id}>
          {etiqueta}
        </label>
        <p className="campo__ayuda" id={`${id}-ayuda`}>
          {ayuda}
        </p>
        <FotoVisible evidenciaId={evidenciaId} alt={alt} />
        <input
          id={id}
          className="campo__entrada"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          aria-describedby={`${id}-ayuda`}
          disabled={ocupada}
          onChange={alElegirArchivo}
        />
        {controles}
      </div>
    )
  }

  const entradaOculta = (
    <input
      id={id}
      className="ui-sr"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      capture="environment"
      aria-label={etiqueta}
      disabled={ocupada}
      tabIndex={-1}
      onChange={alElegirArchivo}
    />
  )

  // Fila que no está en turno. El input sigue montado para no cortar la subida,
  // pero la imagen y «Quitar la foto» no entran al foco ni al lector.
  if (ancla === null) {
    return entradaOculta
  }

  return createPortal(
    <div className="pesaje__foto">
      {entradaOculta}
      <FotoVisible evidenciaId={evidenciaId} />
      {controles}
    </div>,
    ancla,
  )
}
