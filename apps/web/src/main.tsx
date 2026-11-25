import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource/archivo/latin-700.css'
import '@fontsource/archivo/latin-800.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'

import { App } from './App'
import { crearCliente } from './api/cliente'
import './estilos.css'
import './ui/componentes.css'

const raiz = document.getElementById('root')
if (raiz === null) {
  throw new Error('Falta el nodo #root en index.html')
}

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={crearCliente()}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
