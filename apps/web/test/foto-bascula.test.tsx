import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FotoVisible } from '../src/ui/FotoDeLaBascula'

const PRIMERA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const SEGUNDA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

describe('FotoVisible', () => {
  it('vuelve a mostrar la imagen cuando la foto cambia', () => {
    const vista = render(<FotoVisible evidenciaId={PRIMERA} />)
    fireEvent.error(screen.getByRole('img', { name: 'Foto de la báscula' }))

    expect(screen.getByText('La foto se registró, pero no se encuentra.')).toBeDefined()
    expect(screen.queryByRole('img', { name: 'Foto de la báscula' })).toBeNull()

    vista.rerender(<FotoVisible evidenciaId={SEGUNDA} />)
    const imagen = screen.getByRole('img', { name: 'Foto de la báscula' })
    expect(imagen.getAttribute('src')).toBe(`/api/evidencia/${SEGUNDA}`)
    expect(screen.queryByText('La foto se registró, pero no se encuentra.')).toBeNull()
  })
})
