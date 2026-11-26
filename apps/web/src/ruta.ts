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
  | { readonly nombre: 'hato'; readonly modo?: 'sanidad' | 'destete' }
  | { readonly nombre: 'salidas' }
  | { readonly nombre: 'potreros' }
  | { readonly nombre: 'alta' }
  | { readonly nombre: 'nacimiento'; readonly madreId: string | null }
  /**
   * La ficha; con `abrirSalida` llega con el formulario de baja ya abierto.
   *
   * `desde` es de dónde se llegó. La flecha de regreso regresa ahí y dice el
   * nombre de ese lugar, así que el texto siempre coincide con el destino: una
   * ficha dada de baja abierta desde Salidas no manda al hato, y la abierta
   * buscando en el hato no manda a Salidas. Sin `desde` (una recarga, un enlace
   * guardado) se decide por el animal: activo al hato, dado de baja a salidas.
   */
  | {
      readonly nombre: 'ficha'
      readonly animalId: string
      readonly abrirSalida?: boolean
      readonly desde?: DesdeLaFicha
    }
  | { readonly nombre: 'pesaje' }
  | { readonly nombre: 'crecimiento' }
  /** Vacas por días desde el último parto. No es una pestaña. */
  | { readonly nombre: 'vacas' }
  /** Gráficas de la revisión. No es una pestaña: se abre con un botón. */
  | { readonly nombre: 'tendencias' }
  /** Elegir qué animal sale del hato, desde el acceso directo de Inicio. */
  | { readonly nombre: 'salida' }
  /**
   * El resumen de la semana para compartir. Llega con el día desde el que se
   * cuenta, para abrir el mismo periodo que se estaba viendo en Inicio.
   */
  | { readonly nombre: 'resumen'; readonly desde: string | null }
  /** Notas con fecha que no son de un animal. No es una pestaña. */
  | { readonly nombre: 'bitacora' }
  /** Pendientes que el dueño se pone. No es una pestaña. */
  | { readonly nombre: 'pendientes' }
  /** Bajar el hato, los pesos y los eventos. No es una pestaña. */
  | { readonly nombre: 'exportar' }
  | { readonly nombre: 'sesion'; readonly sesionId: string }
  | { readonly nombre: 'muestra' }

export const RUTA_DEL_INICIO: Ruta = { nombre: 'inicio' }
export const RUTA_DEL_HATO: Ruta = { nombre: 'hato' }

/**
 * De dónde se llegó a la ficha.
 *
 * Es un valor cerrado, no el hash anterior: el regreso lleva a una pantalla que
 * existe y no a cualquier lado. Son los tres lugares que hoy abren una ficha:
 * el hato, la lista de salidas y el acceso «Salida» de Inicio.
 */
export type DesdeLaFicha = 'hato' | 'salidas' | 'inicio'

const DESDE_DE_LA_FICHA: readonly DesdeLaFicha[] = ['hato', 'salidas', 'inicio']

function leerDesde(valor: string | undefined): DesdeLaFicha | undefined {
  return DESDE_DE_LA_FICHA.find((desde) => desde === valor)
}

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
  if (limpio === '/hato/destete') {
    return { nombre: 'hato', modo: 'destete' }
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
  if (limpio === '/vacas') {
    return { nombre: 'vacas' }
  }
  if (limpio === '/tendencias') {
    return { nombre: 'tendencias' }
  }
  if (limpio === '/salida') {
    return { nombre: 'salida' }
  }
  if (limpio === '/resumen') {
    return { nombre: 'resumen', desde: null }
  }
  if (limpio === '/bitacora') {
    return { nombre: 'bitacora' }
  }
  if (limpio === '/pendientes') {
    return { nombre: 'pendientes' }
  }
  if (limpio === '/exportar') {
    return { nombre: 'exportar' }
  }
  // El resumen abierto desde Inicio trae el mismo día de arranque del periodo:
  // se comparte lo que se estaba viendo, no otro rango.
  const resumenConDesde = /^\/resumen\/(\d{4}-\d{2}-\d{2})$/.exec(limpio)
  if (resumenConDesde !== null && resumenConDesde[1] !== undefined) {
    return { nombre: 'resumen', desde: resumenConDesde[1] }
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
  //
  // `?desde=` dice de qué pantalla se llegó. Es opcional y solo se acepta un
  // lugar conocido: un enlace guardado o recargado sin él sigue abriendo la
  // ficha, y la flecha se decide por el animal.
  const ficha = /^\/animal\/([0-9a-fA-F-]{36})(\/salida)?(?:\?(.*))?$/.exec(limpio)
  if (ficha !== null && ficha[1] !== undefined) {
    const base =
      ficha[2] === '/salida'
        ? { nombre: 'ficha' as const, animalId: ficha[1], abrirSalida: true }
        : { nombre: 'ficha' as const, animalId: ficha[1] }
    const desde = leerDesde(new URLSearchParams(ficha[3] ?? '').get('desde') ?? undefined)
    return desde === undefined ? base : { ...base, desde }
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
    case 'vacas':
      return '#/vacas'
    case 'tendencias':
      return '#/tendencias'
    case 'salida':
      return '#/salida'
    case 'resumen':
      return ruta.desde === null ? '#/resumen' : `#/resumen/${ruta.desde}`
    case 'bitacora':
      return '#/bitacora'
    case 'pendientes':
      return '#/pendientes'
    case 'exportar':
      return '#/exportar'
    case 'muestra':
      return '#/muestra'
    case 'sesion':
      return `#/sesion/${ruta.sesionId}`
    case 'ficha': {
      const camino = ruta.abrirSalida === true
        ? `#/animal/${ruta.animalId}/salida`
        : `#/animal/${ruta.animalId}`
      return ruta.desde === undefined ? camino : `${camino}?desde=${ruta.desde}`
    }
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
