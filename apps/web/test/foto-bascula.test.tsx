import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FotoDeLaBascula, FotoVisible } from '../src/ui/FotoDeLaBascula'

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

function FotoEnLinea() {
  const [evidenciaId, setEvidenciaId] = useState<string | null>(null)
  return <FotoDeLaBascula evidenciaId={evidenciaId} alCambiar={setEvidenciaId} />
}

describe('FotoDeLaBascula en línea, sin ancla', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra el campo, deja subir una foto y quitarla', async () => {
    const usuario = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ id: PRIMERA, tipo: 'image/jpeg', tamano: 4 }), {
            status: 201,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )

    const vista = render(<FotoEnLinea />)
    const contenedor = vista.container.querySelector('.foto-bascula')
    expect(contenedor).not.toBeNull()
    expect(contenedor?.classList.contains('ui-sr')).toBe(false)

    const etiqueta = screen.getByText('Foto de la báscula', { selector: 'label' })
    expect(etiqueta.closest('.ui-sr')).toBeNull()

    const entrada = screen.getByLabelText('Foto de la báscula') as HTMLInputElement
    expect(entrada.classList.contains('ui-sr')).toBe(false)
    expect(entrada.classList.contains('campo__entrada')).toBe(true)
    expect(entrada.tabIndex).not.toBe(-1)
    expect(entrada.getAttribute('tabindex')).toBeNull()

    await usuario.upload(
      entrada,
      new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])], 'bascula.jpg', { type: 'image/jpeg' }),
    )

    expect(await screen.findByRole('img', { name: 'Foto de la báscula' })).toBeDefined()
    await usuario.click(screen.getByRole('button', { name: 'Quitar la foto' }))
    expect(screen.queryByRole('img', { name: 'Foto de la báscula' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Quitar la foto' })).toBeNull()
  })
})
