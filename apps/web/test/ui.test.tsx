import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { BarraInferior } from '../src/ui/BarraInferior'
import { CampoDeKilos } from '../src/ui/CampoDeKilos'
import { Desplegable } from '../src/ui/Desplegable'
import { Filtros } from '../src/ui/Filtros'
import { Mosaicos } from '../src/ui/Mosaicos'
import { Pildoras } from '../src/ui/Pildoras'
import { Segmentado } from '../src/ui/Segmentado'

const SEXOS = [
  { valor: 'male', texto: 'Macho' },
  { valor: 'female', texto: 'Hembra' },
  { valor: 'unknown', texto: 'No sé' },
]

const TIPOS = [
  { valor: 'calf', texto: 'Becerro' },
  { valor: 'cow', texto: 'Vaca' },
  { valor: 'unknown', texto: 'No sé' },
]

const FILTROS = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'calf', texto: 'Becerros' },
]

function SegmentadoConEstado({ inicial = 'male' }: { readonly inicial?: string }) {
  const [valor, setValor] = useState(inicial)
  return <Segmentado etiqueta="Sexo" opciones={SEXOS} valor={valor} alElegir={setValor} />
}

describe('Segmentado', () => {
  it('marca la opción elegida y cambia al tocarla, incluida «No sé»', async () => {
    const usuario = userEvent.setup()
    render(<SegmentadoConEstado />)

    const macho = screen.getByRole('radio', { name: 'Macho' })
    expect((macho as HTMLInputElement).checked).toBe(true)

    await usuario.click(screen.getByRole('radio', { name: 'No sé' }))

    expect((screen.getByRole('radio', { name: 'No sé' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: 'Macho' }) as HTMLInputElement).checked).toBe(false)
  })

  it('se mueve con las flechas del teclado', async () => {
    const usuario = userEvent.setup()
    render(<SegmentadoConEstado />)

    await usuario.click(screen.getByRole('radio', { name: 'Macho' }))
    await usuario.keyboard('{ArrowRight}')

    expect((screen.getByRole('radio', { name: 'Hembra' }) as HTMLInputElement).checked).toBe(true)
  })
})

describe('Mosaicos', () => {
  it('elige un tipo con un toque', async () => {
    const usuario = userEvent.setup()

    function Arnes() {
      const [valor, setValor] = useState('unknown')
      return <Mosaicos etiqueta="¿Qué es?" opciones={TIPOS} valor={valor} alElegir={setValor} />
    }

    render(<Arnes />)
    await usuario.click(screen.getByRole('radio', { name: 'Vaca' }))

    expect((screen.getByRole('radio', { name: 'Vaca' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByRole('radiogroup', { name: '¿Qué es?' })).toBeDefined()
  })
})

describe('Pildoras', () => {
  it('elige una tenencia con un toque y deja «No sé» como una píldora más', async () => {
    const usuario = userEvent.setup()

    const TENENCIAS = [
      { valor: 'ranch', texto: 'Del rancho' },
      { valor: 'a_la_parte', texto: 'A la parte' },
      { valor: 'third_party', texto: 'De otra persona' },
      { valor: 'unknown', texto: 'No sé' },
    ]

    function Arnes() {
      const [valor, setValor] = useState('unknown')
      return (
        <Pildoras
          etiqueta="¿De quién es?"
          opciones={TENENCIAS}
          valor={valor}
          alElegir={setValor}
        />
      )
    }

    render(<Arnes />)

    expect((screen.getByRole('radio', { name: 'No sé' }) as HTMLInputElement).checked).toBe(true)
    await usuario.click(screen.getByRole('radio', { name: 'A la parte' }))

    expect((screen.getByRole('radio', { name: 'A la parte' }) as HTMLInputElement).checked).toBe(
      true,
    )
    // No se pinta como error: es una respuesta válida del rancho.
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('Desplegable', () => {
  it('empieza cerrado, avisa su estado y conserva el contenido al abrir y cerrar', async () => {
    const usuario = userEvent.setup()
    render(
      <Desplegable titulo="Más datos" resumen="nota y arreglo">
        <p>Contenido plegado</p>
      </Desplegable>,
    )

    const boton = screen.getByRole('button', { name: /Más datos/ })
    const contenido = screen.getByText('Contenido plegado').parentElement
    expect(boton.getAttribute('aria-expanded')).toBe('false')
    // El cuerpo se queda montado y solo se oculta: cerrar sin querer no borra
    // lo que alguien estaba escribiendo.
    expect(contenido?.hidden).toBe(true)

    await usuario.click(boton)
    expect(boton.getAttribute('aria-expanded')).toBe('true')
    expect(contenido?.hidden).toBe(false)

    await usuario.click(boton)
    expect(boton.getAttribute('aria-expanded')).toBe('false')
    expect(contenido?.hidden).toBe(true)
  })
})

describe('Filtros', () => {
  it('deja activa la píldora que se toca', async () => {
    const usuario = userEvent.setup()
    const alElegir = vi.fn()

    render(
      <Filtros etiqueta="Filtrar el hato" opciones={FILTROS} valor="todos" alElegir={alElegir} />,
    )

    expect((screen.getByRole('radio', { name: 'Todos' }) as HTMLInputElement).checked).toBe(true)
    await usuario.click(screen.getByRole('radio', { name: 'Becerros' }))

    expect(alElegir).toHaveBeenCalledWith('calf')
  })
})

describe('CampoDeKilos', () => {
  it('conserva los kilos como texto y abre la cámara', async () => {
    const usuario = userEvent.setup()
    const fotos = vi.fn()

    function Arnes() {
      const [valor, setValor] = useState('')
      return (
        <CampoDeKilos
          etiqueta="Kilos de Pinto"
          valor={valor}
          alCambiar={setValor}
          alTomarFoto={fotos}
        />
      )
    }

    render(<Arnes />)
    const entrada = screen.getByLabelText('Kilos de Pinto') as HTMLInputElement

    expect(entrada.type).toBe('text')
    expect(entrada.inputMode).toBe('decimal')

    await usuario.type(entrada, '158.5')

    expect(entrada.value).toBe('158.5')
    expect(typeof entrada.value).toBe('string')

    await usuario.click(screen.getByRole('button', { name: 'Tomar foto de la báscula' }))
    expect(fotos).toHaveBeenCalledOnce()
  })
})

describe('BarraInferior', () => {
  it('es navegación fija y marca la pantalla en la que estás', () => {
    render(<BarraInferior ruta={{ nombre: 'ficha', animalId: '33333333-3333-4333-8333-333333333333' }} />)

    const nav = screen.getByRole('navigation', { name: 'Pantallas del rancho' })
    expect(nav.classList.contains('ui-barra-inferior--ventana')).toBe(true)
    expect(screen.getByRole('link', { name: 'Inicio' }).getAttribute('href')).toBe('#/')
    expect(screen.getByRole('link', { name: 'Hato' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Pesaje' }).getAttribute('aria-current')).toBeNull()
    expect(screen.getByRole('link', { name: 'Crecimiento' }).getAttribute('href')).toBe('#/crecimiento')
  })

  it('en una sesión de pesaje deja Pesaje como pantalla actual', () => {
    render(
      <BarraInferior ruta={{ nombre: 'sesion', sesionId: '55555555-5555-4555-8555-555555555555' }} />,
    )

    expect(screen.getByRole('link', { name: 'Pesaje' }).getAttribute('aria-current')).toBe('page')
  })
})
