import { useEffect, useRef, useState, type ReactNode } from 'react'

import { useSalir } from '../api/sesion'
import { irA } from '../ruta'
import { Encabezado, type AccionDeEncabezado } from '../ui/Encabezado'
import { IconoMenu } from '../ui/iconos'

/**
 * El encabezado de las cuatro pantallas de trabajo: Inicio, Hato, Pesaje y
 * Crecimiento.
 *
 * Es el mismo en las cuatro («MI RANCHO» y el título) y lleva el mismo menú ☰:
 * Nacimiento, Potreros, Salidas y Salir. Antes el menú vivía solo en el hato y
 * las otras pantallas tenían cada una su encabezado —el pesaje con flecha de
 * regreso y un «Salir» suelto arriba—, así que la misma acción aparecía en
 * lugares distintos según la pestaña.
 *
 * «Salir» se queda aquí, en un solo lugar. Las pantallas que no son pestaña
 * (ficha, alta, nacimiento, potreros, salidas, una sesión guardada) no lo
 * repiten: se regresan al hato y desde ahí se sale.
 */
export function EncabezadoDelRancho({
  titulo,
  subtitulo,
  acciones,
}: {
  readonly titulo: string
  readonly subtitulo?: ReactNode
  /**
   * Las acciones propias de la pantalla, antes del menú. Como mucho una: el
   * encabezado de la guía admite dos botones de ícono y el segundo es el menú.
   */
  readonly acciones?: readonly AccionDeEncabezado[]
}) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const salir = useSalir()

  // El menú se descarta como se descarta cualquier menú: con Escape o tocando
  // fuera. En el celular, tocar fuera es la salida natural cuando no hay teclado.
  useEffect(() => {
    if (!abierto) {
      return
    }
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        setAbierto(false)
      }
    }
    function alTocarFuera(evento: Event) {
      const nodo = contenedor.current
      if (nodo !== null && evento.target instanceof Node && !nodo.contains(evento.target)) {
        setAbierto(false)
      }
    }
    document.addEventListener('keydown', alTeclear)
    document.addEventListener('pointerdown', alTocarFuera)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.removeEventListener('pointerdown', alTocarFuera)
    }
  }, [abierto])

  const delMenu = acciones ?? []

  return (
    <div className="encabezado-rancho" ref={contenedor}>
      <Encabezado
        etiqueta="MI RANCHO"
        titulo={titulo}
        {...(subtitulo === undefined ? {} : { subtitulo })}
        acciones={[
          ...delMenu.slice(0, 1),
          {
            etiqueta: 'Menú',
            icono: <IconoMenu />,
            alTocar: () => {
              setAbierto(!abierto)
            },
          },
        ]}
      />

      {abierto ? (
        <div className="encabezado-rancho__menu">
          <button
            type="button"
            className="encabezado-rancho__opcion"
            onClick={() => {
              setAbierto(false)
              irA({ nombre: 'nacimiento', madreId: null })
            }}
          >
            Registrar nacimiento
          </button>
          <button
            type="button"
            className="encabezado-rancho__opcion"
            onClick={() => {
              setAbierto(false)
              irA({ nombre: 'potreros' })
            }}
          >
            Potreros
          </button>
          <button
            type="button"
            className="encabezado-rancho__opcion"
            onClick={() => {
              setAbierto(false)
              irA({ nombre: 'salidas' })
            }}
          >
            Salidas
          </button>
          <button
            type="button"
            className="encabezado-rancho__opcion"
            disabled={salir.isPending}
            onClick={() => {
              setAbierto(false)
              salir.mutate()
            }}
          >
            {salir.isPending ? 'Saliendo…' : 'Salir'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
