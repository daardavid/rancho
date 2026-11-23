import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.tsx'],
    // `@testing-library` se limpia solo con esto entre pruebas.
    globals: false,
    restoreMocks: true,
  },
})
