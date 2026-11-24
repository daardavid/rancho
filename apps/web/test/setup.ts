import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Sin `globals`, Testing Library no registra su limpieza sola: hay que
// desmontar lo pintado y soltar el `fetch` falso entre pruebas.
afterEach(() => {
  cleanup()
})
