import { useEffect, useState, type ComponentType } from 'react'

import { Cargando } from '../ui/Avisos'
import { BotonPrincipal } from '../ui/Botones'

/**
 * Descarga el trozo de las gráficas al abrir la pantalla.
 *
 * Mientras llega, se dice que se están preparando. Si la descarga falla, se
 * dice y se puede volver a intentar: no se dibuja una gráfica vacía.
 */
export function CargarTendencias() {
  const [intento, setIntento] = useState(0)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [Pantalla, setPantalla] = useState<ComponentType | null>(null)

  useEffect(() => {
    let vivo = true
    void import('./Tendencias')
      .then((modulo) => {
        if (!vivo) {
          return
        }
        setPantalla(() => modulo.Tendencias)
        setEstado('listo')
      })
      .catch(() => {
        if (!vivo) {
          return
        }
        setEstado('error')
      })
    return () => {
      vivo = false
    }
  }, [intento])

  if (estado === 'error') {
    return (
      <AvisoDeGraficas
        alReintentar={() => {
          setPantalla(null)
          setEstado('cargando')
          setIntento((actual) => actual + 1)
        }}
      />
    )
  }

  if (estado !== 'listo' || Pantalla === null) {
    return (
      <main className="pantalla">
        <Cargando que="Preparando las gráficas…" />
      </main>
    )
  }

  return <Pantalla />
}

export function AvisoDeGraficas({ alReintentar }: { readonly alReintentar: () => void }) {
  return (
    <main className="pantalla">
      <p className="aviso aviso--mal" role="alert">
        No se pudieron preparar las gráficas.
      </p>
      <BotonPrincipal alTocar={alReintentar}>Volver a intentar</BotonPrincipal>
    </main>
  )
}
