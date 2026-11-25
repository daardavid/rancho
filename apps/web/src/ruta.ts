import { useEffect, useState } from 'react'

/**
 * Las pantallas viven en la URL (`#/animal/<id>`), no en un estado suelto.
 *
 * Es lo que pide la tarea: si la sesión vence a media ficha, la aplicación
 * manda al inicio de sesión y al volver la URL sigue siendo la de la ficha, así
 * que la pantalla de destino no se pierde. También hace que el botón de atrás
 * del celular se comporte como se espera. No se agrega un enrutador: son unas
 * pocas pantallas.
 *
 * `#/` es Inicio: al abrir la app se ve lo que hay que revisar, que es lo que
 * pide el North Star del MVP. El hato vive en `#/hato`. Los enlaces viejos a
 * `#/inicio` siguen abriendo Inicio.
 */

export type Ruta =
  | { readonly nombre: 'inicio' }
  /**
   * El hato. Con `modo` abre el modo de selección ya encendido, que es lo que
   * usan los accesos directos de Inicio para anotar sanidad sin buscar el
   * botón: la captura es la misma, solo se llega un toque más adelante.
   */
  | { readonly nombre: 'hato'; readonly modo?: 'sanidad' }
  | { readonly nombre: 'salidas' }
  | { readonly nombre: 'potreros' }
  | { readonly nombre: 'alta' }
  | { readonly nombre: 'nacimiento'; readonly madreId: string | null }
  /** La ficha; con `abrirSalida` llega con el formulario de baja ya abierto. */
  | { readonly nombre: 'ficha'; readonly animalId: string; readonly abrirSalida?: boolean }
  | { readonly nombre: 'pesaje' }
  | { readonly nombre: 'crecimiento' }
  /** Elegir qué animal sale del hato, desde el acceso directo de Inicio. */
  | { readonly nombre: 'salida' }
  | { readonly nombre: 'sesion'; readonly sesionId: string }
  | { readonly nombre: 'muestra' }

export const RUTA_DEL_INICIO: Ruta = { nombre: 'inicio' }
export const RUTA_DEL_HATO: Ruta = { nombre: 'hato' }

export function leerRuta(hash: string): Ruta {
  const limpio = hash.replace(/^#/, '')
  // La raíz es Inicio. Un hash que no se reconoce tampoco deja al dueño en una
  // pantalla en blanco: vuelve a Inicio.
  if (limpio === '' || limpio === '/' || limpio === '/inicio') {
    return RUTA_DEL_INICIO
  }
  if (limpio === '/hato') {
    return RUTA_DEL_HATO
  }
  if (limpio === '/hato/sanidad') {
    return { nombre: 'hato', modo: 'sanidad' }
  }
  if (limpio === '/salidas') {
    return { nombre: 'salidas' }
  }
  if (limpio === '/potreros') {
    return { nombre: 'potreros' }
  }
  if (limpio === '/alta') {
    return { nombre: 'alta' }
  }
  if (limpio === '/nacimiento') {
    return { nombre: 'nacimiento', madreId: null }
  }
  if (limpio === '/pesaje') {
    return { nombre: 'pesaje' }
  }
  if (limpio === '/crecimiento') {
    return { nombre: 'crecimiento' }
  }
  if (limpio === '/salida') {
    return { nombre: 'salida' }
  }
  // La muestra de componentes solo existe con el servidor de desarrollo.
  if (limpio === '/muestra' && import.meta.env.DEV) {
    return { nombre: 'muestra' }
  }
  const nacimiento = /^\/nacimiento\/([0-9a-fA-F-]{36})$/.exec(limpio)
  if (nacimiento !== null && nacimiento[1] !== undefined) {
    return { nombre: 'nacimiento', madreId: nacimiento[1] }
  }
  const sesion = /^\/sesion\/([0-9a-fA-F-]{36})$/.exec(limpio)
  if (sesion !== null && sesion[1] !== undefined) {
    return { nombre: 'sesion', sesionId: sesion[1] }
  }
  // La ficha abierta en «dar de baja»: es la misma ficha con el formulario ya
  // desplegado, para que el acceso directo de Inicio no obligue a buscarlo.
  const salidaDeLaFicha = /^\/animal\/([0-9a-fA-F-]{36})\/salida$/.exec(limpio)
  if (salidaDeLaFicha !== null && salidaDeLaFicha[1] !== undefined) {
    return { nombre: 'ficha', animalId: salidaDeLaFicha[1], abrirSalida: true }
  }
  const ficha = /^\/animal\/([0-9a-fA-F-]{36})$/.exec(limpio)
  if (ficha !== null && ficha[1] !== undefined) {
    return { nombre: 'ficha', animalId: ficha[1] }
  }
  return RUTA_DEL_INICIO
}

export function rutaAHash(ruta: Ruta): string {
  switch (ruta.nombre) {
    case 'inicio':
      return '#/'
    case 'hato':
      return ruta.modo === undefined ? '#/hato' : `#/hato/${ruta.modo}`
    case 'salidas':
      return '#/salidas'
    case 'potreros':
      return '#/potreros'
    case 'alta':
      return '#/alta'
    case 'nacimiento':
      return ruta.madreId === null ? '#/nacimiento' : `#/nacimiento/${ruta.madreId}`
    case 'pesaje':
      return '#/pesaje'
    case 'crecimiento':
      return '#/crecimiento'
    case 'salida':
      return '#/salida'
    case 'muestra':
      return '#/muestra'
    case 'sesion':
      return `#/sesion/${ruta.sesionId}`
    case 'ficha':
      return ruta.abrirSalida === true
        ? `#/animal/${ruta.animalId}/salida`
        : `#/animal/${ruta.animalId}`
  }
}

export function irA(ruta: Ruta): void {
  window.location.hash = rutaAHash(ruta)
}

/** La ruta actual, siguiendo `hashchange`. */
export function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(() => leerRuta(window.location.hash))

  useEffect(() => {
    const alCambiar = (): void => {
      setRuta(leerRuta(window.location.hash))
    }
    window.addEventListener('hashchange', alCambiar)
    return () => {
      window.removeEventListener('hashchange', alCambiar)
    }
  }, [])

  return ruta
}
