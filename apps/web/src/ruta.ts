import { useEffect, useState } from 'react'

/**
 * Las pantallas viven en la URL (`#/animal/<id>`), no en un estado suelto.
 *
 * Es lo que pide la tarea: si la sesión vence a media ficha, la aplicación
 * manda al inicio de sesión y al volver la URL sigue siendo la de la ficha, así
 * que la pantalla de destino no se pierde. También hace que el botón de atrás
 * del celular se comporte como se espera. No se agrega un enrutador: son unas
 * pocas pantallas.
 */

export type Ruta =
  | { readonly nombre: 'hato' }
  | { readonly nombre: 'salidas' }
  | { readonly nombre: 'potreros' }
  | { readonly nombre: 'alta' }
  | { readonly nombre: 'nacimiento'; readonly madreId: string | null }
  | { readonly nombre: 'ficha'; readonly animalId: string }
  | { readonly nombre: 'pesaje' }
  | { readonly nombre: 'crecimiento' }
  | { readonly nombre: 'sesion'; readonly sesionId: string }
  | { readonly nombre: 'muestra' }

export const RUTA_DEL_HATO: Ruta = { nombre: 'hato' }

export function leerRuta(hash: string): Ruta {
  const limpio = hash.replace(/^#/, '')
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
  const ficha = /^\/animal\/([0-9a-fA-F-]{36})$/.exec(limpio)
  if (ficha !== null && ficha[1] !== undefined) {
    return { nombre: 'ficha', animalId: ficha[1] }
  }
  return RUTA_DEL_HATO
}

export function rutaAHash(ruta: Ruta): string {
  switch (ruta.nombre) {
    case 'hato':
      return '#/'
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
    case 'muestra':
      return '#/muestra'
    case 'sesion':
      return `#/sesion/${ruta.sesionId}`
    case 'ficha':
      return `#/animal/${ruta.animalId}`
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
