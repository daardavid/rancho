import type { ComponentType } from 'react'

import { rutaAHash, type Ruta } from '../ruta'
import { IconoBascula, IconoCrecimiento, IconoHato, IconoInicio } from './iconos'

type Pestana = 'inicio' | 'hato' | 'pesaje' | 'crecimiento'
type Anclaje = 'ventana' | 'marco' | 'flujo'

const PESTANAS: readonly {
  readonly nombre: Pestana
  readonly etiqueta: string
  readonly Icono: ComponentType
}[] = [
  { nombre: 'inicio', etiqueta: 'Inicio', Icono: IconoInicio },
  { nombre: 'hato', etiqueta: 'Hato', Icono: IconoHato },
  { nombre: 'pesaje', etiqueta: 'Pesaje', Icono: IconoBascula },
  { nombre: 'crecimiento', etiqueta: 'Crecimiento', Icono: IconoCrecimiento },
]

function pestanaDe(ruta: Ruta): Pestana | null {
  switch (ruta.nombre) {
    case 'inicio':
      return 'inicio'
    case 'hato':
    case 'alta':
    case 'nacimiento':
    case 'ficha':
    case 'salidas':
    case 'potreros':
      return 'hato'
    case 'pesaje':
    case 'sesion':
      return 'pesaje'
    case 'crecimiento':
      return 'crecimiento'
    case 'tendencias':
    case 'vacas':
      // Tendencias y la lista de vacas no son pestaña. Ninguna queda marcada.
      return null
    case 'salida':
      // «Salida» es una captura que se abre desde Inicio y no deja de serlo.
      return 'inicio'
    case 'resumen':
      // El resumen sale de Inicio y regresa ahí: no es una pestaña propia.
      return 'inicio'
    case 'bitacora':
    case 'pendientes':
      return 'inicio'
    case 'muestra':
      return null
  }
}

function destinoDe(pestana: Pestana): Ruta {
  switch (pestana) {
    case 'inicio':
      return { nombre: 'inicio' }
    case 'hato':
      return { nombre: 'hato' }
    case 'pesaje':
      return { nombre: 'pesaje' }
    case 'crecimiento':
      return { nombre: 'crecimiento' }
  }
}

/**
 * Las cuatro pantallas del trabajo. Inicio es la primera. Enlaces de verdad,
 * fijos al borde inferior
 * de la ventana y del ancho de la columna — también en computadora.
 */
export function BarraInferior({
  ruta,
  anclaje = 'ventana',
  alElegir,
}: {
  readonly ruta: Ruta
  readonly anclaje?: Anclaje
  readonly alElegir?: (pestana: Pestana) => void
}) {
  const activa = pestanaDe(ruta)

  return (
    <nav className={`ui-barra-inferior ui-barra-inferior--${anclaje}`} aria-label="Pantallas del rancho">
      {PESTANAS.map((pestana) => {
        const encendida = pestana.nombre === activa
        return (
          <a
            key={pestana.nombre}
            className={
              encendida
                ? 'ui-barra-inferior__enlace ui-barra-inferior__enlace--activa'
                : 'ui-barra-inferior__enlace'
            }
            href={rutaAHash(destinoDe(pestana.nombre))}
            aria-current={encendida ? 'page' : undefined}
            onClick={(evento) => {
              if (alElegir === undefined) {
                return
              }
              evento.preventDefault()
              alElegir(pestana.nombre)
            }}
          >
            <pestana.Icono />
            {pestana.etiqueta}
          </a>
        )
      })}
    </nav>
  )
}
