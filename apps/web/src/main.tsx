import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './fuentes.css'

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
