import { useEffect, useState } from 'react'

/**
 * Las pantallas viven en la URL (`#/animal/<id>`), no en un estado suelto.
 *
 * Es lo que pide la tarea: si la sesión vence a media ficha, la aplicación
 * manda al inicio de sesión y al volver la URL sigue siendo la de la ficha, así
 * que la pantalla de destino no se pierde. También hace que el botón de atrás
 * del celular se comporte como se espera. No se agrega un enrutador: son tres
 * pantallas.
 */

export type Ruta =
  | { readonly nombre: 'hato' }
  | { readonly nombre: 'alta' }
  | { readonly nombre: 'ficha'; readonly animalId: string }

export const RUTA_DEL_HATO: Ruta = { nombre: 'hato' }

export function leerRuta(hash: string): Ruta {
  const limpio = hash.replace(/^#/, '')
  if (limpio === '/alta') {
    return { nombre: 'alta' }
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
    case 'alta':
      return '#/alta'
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
