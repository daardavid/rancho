import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { alVencerLaSesion } from './api/aviso'
import { LLAVE_DE_SESION, useSesion } from './api/sesion'
import { AvisoDeError, BotonGrande, Cargando } from './ui/Avisos'
import { BarraInferior } from './ui/BarraInferior'
import { Alta } from './pantallas/Alta'
import { Inicio } from './pantallas/Inicio'
import { Crecimiento } from './pantallas/Crecimiento'
import { Ficha } from './pantallas/Ficha'
import { Hato } from './pantallas/Hato'
import { Potreros } from './pantallas/Potreros'
import { SalidaPorElegir } from './pantallas/SalidaPorElegir'
import { Salidas } from './pantallas/Salidas'
import { IniciarSesion } from './pantallas/IniciarSesion'
import { Muestra } from './pantallas/Muestra'
import { Nacimiento } from './pantallas/Nacimiento'
import { Pesaje } from './pantallas/Pesaje'
import { Sesion } from './pantallas/Sesion'
import { rutaAHash, useRuta } from './ruta'

/**
 * La aplicación entera: sesión, ruta y la pantalla que toca.
 *
 * Si no hay sesión se muestra el inicio de sesión y la URL no se toca. Al
 * volver a entrar, la ruta sigue siendo la de antes, así que el dueño regresa a
 * la pantalla de destino en vez de empezar otra vez desde la raíz.
 *
 * `#/` es Inicio. Las pantallas de trabajo —inicio, hato, pesaje y
 * crecimiento— se alcanzan desde la barra de abajo, con el pulgar y sin menús,
 * y las cuatro llevan el mismo encabezado con el mismo menú ☰. No es un
 * enrutador: son enlaces al `hash` de la URL.
 *
 * «Salir» vive en ese menú y en ningún otro lugar. Antes había una barra suelta
 * con «Salir» arriba de las pantallas que no eran pestaña; se quita para que la
 * acción esté siempre en el mismo sitio y no se repita.
 */
export function App() {
  const sesion = useSesion()
  const ruta = useRuta()
  const cache = useQueryClient()

  /**
   * Una pantalla nueva abre arriba.
   *
   * El navegador conserva la posición del desplazamiento al cambiar solo el
   * `hash`: si se venía del final de una lista larga, Potreros abría con su
   * encabezado a media altura. Volver al inicio de la pantalla es lo que el
   * dueño espera al entrar a otra cosa.
   */
  const claveDeRuta = rutaAHash(ruta)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [claveDeRuta])

  // La API avisa cuando contesta 401 a cualquier consulta o comando. La sesión
  // se marca como ausente aquí, en la caché de esta aplicación.
  useEffect(
    () =>
      alVencerLaSesion(() => {
        cache.setQueryData(LLAVE_DE_SESION, null)
      }),
    [cache],
  )

  if (import.meta.env.DEV && ruta.nombre === 'muestra') {
    return <Muestra />
  }

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
    <div className="con-navegacion">
      {ruta.nombre === 'inicio' ? <Inicio /> : null}
      {ruta.nombre === 'hato' ? (
        // La clave remonta el hato cuando cambia el modo: entrar desde el
        // acceso de Inicio con la selección encendida y después tocar la
        // pestaña tiene que dejar la pantalla normal, no a media selección.
        <Hato key={ruta.modo ?? 'hato'} modoInicial={ruta.modo ?? null} />
      ) : null}
      {ruta.nombre === 'salidas' ? <Salidas /> : null}
      {ruta.nombre === 'potreros' ? <Potreros /> : null}
      {ruta.nombre === 'alta' ? <Alta /> : null}
      {ruta.nombre === 'nacimiento' ? <Nacimiento madreId={ruta.madreId} /> : null}
      {ruta.nombre === 'salida' ? <SalidaPorElegir /> : null}
      {ruta.nombre === 'ficha' ? (
        // La clave remonta la ficha al cambiar de animal: los avisos de una
        // baja, una corrección o una nota son de ese animal y de esta visita.
        <Ficha
          key={ruta.animalId}
          animalId={ruta.animalId}
          abrirSalida={ruta.abrirSalida === true}
        />
      ) : null}
      {ruta.nombre === 'pesaje' ? <Pesaje /> : null}
      {ruta.nombre === 'sesion' ? <Sesion sesionId={ruta.sesionId} /> : null}
      {ruta.nombre === 'crecimiento' ? <Crecimiento /> : null}
      <BarraInferior ruta={ruta} />
    </div>
  )
}
