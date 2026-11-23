import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.tsx'],
    setupFiles: ['test/setup.ts'],
    // Limpia lo pintado entre una prueba y otra. El `fetch` falso se quita a
    // mano en cada archivo para que una prueba no herede la API de la anterior.
    globals: false,
    restoreMocks: true,
  },
})
