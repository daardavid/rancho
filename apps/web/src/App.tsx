import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { alVencerLaSesion } from './api/aviso'
import { LLAVE_DE_SESION, useSalir, useSesion } from './api/sesion'
import { AvisoDeError, BotonGrande, Cargando } from './ui/Avisos'
import { Alta } from './pantallas/Alta'
import { Crecimiento } from './pantallas/Crecimiento'
import { Ficha } from './pantallas/Ficha'
import { Hato } from './pantallas/Hato'
import { IniciarSesion } from './pantallas/IniciarSesion'
import { Pesaje } from './pantallas/Pesaje'
import { Sesion } from './pantallas/Sesion'
import { irA, useRuta, type Ruta } from './ruta'

/**
 * La aplicación entera: sesión, ruta y la pantalla que toca.
 *
 * Si no hay sesión se muestra el inicio de sesión y la URL no se toca. Al
 * volver a entrar, la ruta sigue siendo la de antes, así que el dueño regresa a
 * la pantalla de destino en vez de empezar otra vez en el hato.
 *
 * Las pantallas de trabajo —hato, pesaje y crecimiento— se alcanzan desde la
 * barra de abajo, con el pulgar y sin menús. No es un enrutador: son rutas en
 * el `hash` de la URL y un par de botones.
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
      {ruta.nombre === 'pesaje' ? <Pesaje /> : null}
      {ruta.nombre === 'sesion' ? <Sesion sesionId={ruta.sesionId} /> : null}
      {ruta.nombre === 'crecimiento' ? <Crecimiento /> : null}
      <BarraInferior ruta={ruta} />
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

/**
 * Las tres pantallas del trabajo diario, abajo y a un toque.
 *
 * El pesaje y el crecimiento están al mismo nivel que el hato porque son el
 * trabajo, no un detalle escondido en un menú. La pantalla en la que estás se
 * marca con `aria-current`.
 */
function BarraInferior({ ruta }: { readonly ruta: Ruta }) {
  return (
    <nav className="barra-inferior" aria-label="Pantallas del rancho">
      <EnlaceDeBarra ruta={ruta} destino={{ nombre: 'hato' }} etiqueta="Hato" />
      <EnlaceDeBarra ruta={ruta} destino={{ nombre: 'pesaje' }} etiqueta="Pesaje" />
      <EnlaceDeBarra ruta={ruta} destino={{ nombre: 'crecimiento' }} etiqueta="Crecimiento" />
    </nav>
  )
}

function EnlaceDeBarra({
  ruta,
  destino,
  etiqueta,
}: {
  readonly ruta: Ruta
  readonly destino: Ruta
  readonly etiqueta: string
}) {
  const activa =
    (destino.nombre === 'hato' &&
      (ruta.nombre === 'hato' || ruta.nombre === 'ficha' || ruta.nombre === 'alta')) ||
    (destino.nombre === 'pesaje' && (ruta.nombre === 'pesaje' || ruta.nombre === 'sesion')) ||
    ruta.nombre === destino.nombre

  return (
    <button
      type="button"
      className={activa ? 'barra-inferior__enlace barra-inferior__enlace--activa' : 'barra-inferior__enlace'}
      aria-current={activa ? 'page' : undefined}
      onClick={() => {
        irA(destino)
      }}
    >
      {etiqueta}
    </button>
  )
}
