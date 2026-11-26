import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// El proxy de desarrollo manda `/api` a la API local, así que la web usa rutas
// relativas y no necesita una URL ni CORS. En despliegue, el mismo proceso de
// Node sirve la SPA y la API bajo un solo origen
// ([deployment-strategy.md](../../docs/architecture/deployment-strategy.md)).
export default defineConfig({
  plugins: [react()],
  build: {
    modulePreload: {
      // El import() de Tendencias no se precarga: si no, el celular bajaría
      // ECharts al abrir Inicio.
      resolveDependencies(_filename, deps) {
        return deps.filter((dep) => !/tendencias/i.test(dep))
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
  },
})
