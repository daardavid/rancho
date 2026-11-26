import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import type { Animal } from '../src/dominio/tipos'
import { FilaDeAnimal } from '../src/ui/FilaDeAnimal'
import { FotoDelAnimal } from '../src/ui/FotoDelAnimal'

const EVIDENCIA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const MINIATURA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const ANIMAL: Animal = {
  id: '33333333-3333-4333-8333-333333333333',
  nombre: 'Canelo',
  sexo: 'unknown',
  categoria: 'unknown',
  detalleCategoria: null,
  tenencia: 'unknown',
  participacionEconomica: 'unknown',
  notaDelArreglo: null,
  nota: null,
  activo: true,
  salida: null,
  version: 1,
  recordedBy: 'propietario',
  recordedAt: '2026-11-22T15:04:05.678Z',
  marcas: [],
  foto: { evidenciaId: EVIDENCIA, miniaturaId: MINIATURA, version: 1 },
}

function conConsultas(nodo: ReactNode) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={cliente}>{nodo}</QueryClientProvider>
}

describe('foto del animal cuando el archivo no está', () => {
  it('en la ficha dice que la foto se registró pero no se encuentra', () => {
    const vista = render(conConsultas(<FotoDelAnimal animal={ANIMAL} />))
    fireEvent.error(screen.getByRole('img', { name: 'Foto de Canelo' }))

    expect(screen.getByText('La foto se registró, pero no se encuentra.')).toBeDefined()
    expect(screen.queryByRole('img', { name: 'Foto de Canelo' })).toBeNull()
    expect(vista.container.querySelector('img')).toBeNull()
  })

  it('en la fila vuelve a las iniciales y no deja la imagen rota', () => {
    const vista = render(
      <FilaDeAnimal
        nombre="Canelo"
        detalle="Sin arete"
        peso="—"
        ganancia="Sin peso"
        tono="sinDatos"
        categoria="cow"
        miniaturaId={MINIATURA}
      />,
    )
    const imagen = vista.container.querySelector('img')
    expect(imagen).not.toBeNull()
    if (imagen === null) {
      return
    }
    fireEvent.error(imagen)

    expect(screen.getByText('CA')).toBeDefined()
    expect(vista.container.querySelector('img')).toBeNull()
    expect(vista.container.querySelector('.ui-avatar')).not.toBeNull()
  })
})
