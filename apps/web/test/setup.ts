import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Sin `globals`, Testing Library no registra su limpieza sola: hay que
// desmontar lo pintado y soltar el `fetch` falso entre pruebas.
afterEach(() => {
  cleanup()
})

/*
 * jsdom no implementa el desplazamiento de la ventana.
 *
 * La app vuelve arriba al cambiar de pantalla (R-30), y sin este doble jsdom
 * imprime «Not implemented: Window's scrollTo()» en cada cambio de ruta. El
 * desplazamiento de verdad se prueba en la prueba de punta a punta, contra un
 * navegador: aquí solo se calla el aviso.
 */
Object.defineProperty(window, 'scrollTo', {
  value: () => {
    /* Sin desplazamiento en jsdom. */
  },
  writable: true,
  configurable: true,
})
