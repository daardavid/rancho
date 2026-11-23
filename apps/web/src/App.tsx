import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { alVencerLaSesion } from './api/aviso'
import { LLAVE_DE_SESION, useSalir, useSesion } from './api/sesion'
import { AvisoDeError, BotonGrande, Cargando } from './ui/Avisos'
import { Alta } from './pantallas/Alta'
import { Ficha } from './pantallas/Ficha'
import { Hato } from './pantallas/Hato'
import { IniciarSesion } from './pantallas/IniciarSesion'
import { useRuta } from './ruta'

/**
 * La aplicación entera: sesión, ruta y la pantalla que toca.
 *
 * Si no hay sesión se muestra el inicio de sesión y la URL no se toca. Al
 * volver a entrar, la ruta sigue siendo la de antes, así que el dueño regresa a
 * la pantalla de destino en vez de empezar otra vez en el hato.
 */
export function App() {
  const sesion = useSesion()
  const ruta = useRuta()
  const cache = useQueryClient()

  // La API avisa cuando contesta 401 a cualquier consulta o comando. La sesión
  // se marca como ausente aquí, en la caché de esta aplicación.
  useEffect(
    () =>
      alVencerLaSesion(() => {
        cache.setQueryData(LLAVE_DE_SESION, null)
      }),
    [cache],
  )

  if (sesion.isPending) {
    return (
      <main className="pantalla">
        <Cargando que="Revisando la sesión…" />
      </main>
    )
  }

  if (sesion.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={sesion.error} />
        <BotonGrande alTocar={() => void sesion.refetch()}>Volver a intentar</BotonGrande>
      </main>
    )
  }

  if (sesion.data === null) {
    return <IniciarSesion />
  }

  return (
    <>
      <BarraDeSesion />
      {ruta.nombre === 'hato' ? <Hato /> : null}
      {ruta.nombre === 'alta' ? <Alta /> : null}
      {ruta.nombre === 'ficha' ? <Ficha animalId={ruta.animalId} /> : null}
    </>
  )
}

function BarraDeSesion() {
  const salir = useSalir()

  return (
    <div className="barra">
      <button
        type="button"
        className="enlace"
        onClick={() => {
          salir.mutate()
        }}
        disabled={salir.isPending}
      >
        {salir.isPending ? 'Saliendo…' : 'Salir'}
      </button>
    </div>
  )
}
