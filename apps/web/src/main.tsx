import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import './estilos.css'

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      // La API del rancho no cambia sola en segundo plano. Un reintento corto
      // basta para un celular con mala señal; más reintentos solo alargan la
      // espera del dueño frente a un mensaje de error.
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

const raiz = document.getElementById('root')
if (raiz === null) {
  throw new Error('Falta el nodo #root en index.html')
}

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
