import { useId, useState, type ChangeEvent, type ReactNode } from 'react'

import { subirFoto } from '../api/evidencia'
import { usePonerFoto } from '../api/hato'
import type { Animal } from '../dominio/tipos'
import { nombreVisible } from '../dominio/animal'
import { AvisoDeError } from './Avisos'
import { prepararFotos } from './prepararFoto'

/**
 * La foto para reconocer al animal.
 *
 * Cámara o galería: el celular ofrece las dos si el campo no fuerza la cámara.
 * Cambiarla deja la anterior guardada. No cambia ningún dato de la ficha.
 */
export function FotoDelAnimal({ animal }: { readonly animal: Animal }) {
  const id = useId()
  const poner = usePonerFoto(animal.id)
  const [error, setError] = useState<unknown>(null)
  const [ocupada, setOcupada] = useState(false)
  const [idFallido, setIdFallido] = useState<string | null>(null)
  const foto = animal.foto
  const etiqueta = foto === null ? 'Agregar foto' : 'Cambiar foto'

  const elegir = (archivo: File | undefined): void => {
    if (archivo === undefined || ocupada) {
      return
    }
    setError(null)
    setOcupada(true)
    void prepararFotos(archivo)
      .then(async ({ foto: reducida, miniatura }) => {
        const evidenciaId = await subirFoto(reducida)
        const miniaturaId = await subirFoto(miniatura)
        await poner.mutateAsync({
          commandId: crypto.randomUUID(),
          version: animal.foto?.version ?? 0,
          evidenciaId,
          miniaturaId,
        })
      })
      .then(
        () => {
          setOcupada(false)
        },
        (fallo: unknown) => {
          setError(fallo)
          setOcupada(false)
        },
      )
  }

  const alElegirArchivo = (evento: ChangeEvent<HTMLInputElement>): void => {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    elegir(archivo)
  }

  let imagen: ReactNode = null
  if (foto !== null) {
    imagen =
      idFallido === foto.evidenciaId ? (
        <p className="campo__ayuda">La foto se registró, pero no se encuentra.</p>
      ) : (
        <img
          className="ficha__foto"
          alt={`Foto de ${nombreVisible(animal)}`}
          src={`/api/evidencia/${foto.evidenciaId}`}
          onError={() => {
            setIdFallido(foto.evidenciaId)
          }}
        />
      )
  }

  return (
    <section className="ficha__seccion foto-animal">
      <h2 className="ficha__titulo">Foto</h2>
      {imagen}
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      <p className="campo__ayuda" id={`${id}-ayuda`}>
        Cámara o galería. Sirve para reconocer al animal. No cambia sus datos.
        {foto === null ? '' : ' Si la cambias, la anterior se queda guardada.'}
      </p>
      <input
        id={id}
        className="campo__entrada"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-describedby={`${id}-ayuda`}
        disabled={ocupada}
        onChange={alElegirArchivo}
      />
      {ocupada ? <p className="campo__ayuda">Subiendo la foto…</p> : null}
      {error === null ? null : <AvisoDeError error={error} />}
    </section>
  )
}
