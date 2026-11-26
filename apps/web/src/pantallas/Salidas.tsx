import { useMemo, useState } from 'react'

import { useSalidas } from '../api/hato'
import { usePesosConocidos } from '../api/pesajes'
import { areteVigente, coincide, normalizar, nombreVisible } from '../dominio/animal'
import { diaLegible, kilosLegibles } from '../dominio/fechas'
import { ultimosKilos } from '../dominio/ultimoPeso'
import { motivoDeSalida, tipoDeMarca } from '../dominio/etiquetas'
import type { Animal } from '../dominio/tipos'
import { irA } from '../ruta'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { BotonPrincipal } from '../ui/Botones'
import { Encabezado } from '../ui/Encabezado'
import { FilaDeAnimal, type CategoriaVisual } from '../ui/FilaDeAnimal'
import { IconoBuscar } from '../ui/iconos'

/**
 * Quienes ya no están en el hato activo. La ficha y la historia siguen.
 * La búsqueda los encuentra por nombre o arete.
 */
export function Salidas() {
  const salidas = useSalidas()
  const pesos = usePesosConocidos()
  const [busqueda, setBusqueda] = useState('')
  const porKilos = useMemo(() => ultimosKilos(pesos.data?.pesos ?? []), [pesos.data])

  const animales = useMemo(() => salidas.data?.animales ?? [], [salidas.data])
  const visibles = useMemo(() => {
    const limpio = normalizar(busqueda)
    if (limpio === '') {
      return animales
    }
    return animales.filter((animal) => coincide(animal, limpio))
  }, [animales, busqueda])

  if (salidas.isPending) {
    return (
      <main className="pantalla">
        <Cargando que="Trayendo las salidas…" />
      </main>
    )
  }

  if (salidas.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={salidas.error} />
        <BotonPrincipal alTocar={() => void salidas.refetch()}>Volver a intentar</BotonPrincipal>
      </main>
    )
  }

  const total = animales.length

  return (
    <main className="pantalla pantalla--hato">
      <Encabezado
        etiqueta="MI RANCHO"
        titulo="Salidas"
        subtitulo={
          total === 0
            ? 'Nadie ha salido del hato'
            : `${String(total)} ${total === 1 ? 'animal dado de baja' : 'animales dados de baja'}`
        }
        alRegresar={() => {
          irA({ nombre: 'hato' })
        }}
        etiquetaRegresar="Regresar al hato"
      />

      {total === 0 ? (
        <section className="vacio">
          <h2 className="vacio__titulo">No hay salidas</h2>
          <p>Cuando un animal se da de baja, aparece aquí con el motivo y la fecha. La ficha no se borra.</p>
        </section>
      ) : (
        <>
          <div className="ui-buscador">
            <IconoBuscar />
            <label className="ui-sr" htmlFor="buscar-salidas">
              Buscar en salidas
            </label>
            <input
              id="buscar-salidas"
              className="ui-buscador__entrada"
              type="search"
              value={busqueda}
              placeholder="Buscar por nombre o arete"
              onChange={(evento) => {
                setBusqueda(evento.target.value)
              }}
            />
          </div>

          {visibles.length === 0 ? (
            <section className="vacio">
              <h2 className="vacio__titulo">Ningún animal coincide</h2>
              <p>Revisa cómo se escribe.</p>
            </section>
          ) : (
            <ul className="hato__lista">
              {visibles.map((animal) => (
                <li key={animal.id}>
                  <FilaDeSalida animal={animal} kilos={porKilos.get(animal.id) ?? null} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}

function FilaDeSalida({
  animal,
  kilos,
}: {
  readonly animal: Animal
  readonly kilos: string | null
}) {
  const arete = areteVigente(animal)
  const salida = animal.salida
  const motivo = salida === null ? 'Sin motivo' : motivoDeSalida(salida.motivo)
  const fecha = salida === null ? 'Sin fecha' : diaLegible(salida.fecha)

  return (
    <FilaDeAnimal
      nombre={nombreVisible(animal)}
      detalle={`${motivo} · se supo el ${fecha}${
        arete === null ? '' : ` · ${tipoDeMarca(arete.tipo)} ${arete.valor}`
      }`}
      peso={kilos === null ? '—' : kilosLegibles(kilos)}
      ganancia="Salió"
      tono="revisar"
      categoria={categoriaVisual(animal.categoria)}
      miniaturaId={animal.foto?.miniaturaId ?? null}
      alTocar={() => {
        irA({ nombre: 'ficha', animalId: animal.id })
      }}
    />
  )
}

function categoriaVisual(categoria: string): CategoriaVisual {
  switch (categoria) {
    case 'calf':
      return 'calf'
    case 'cow':
      return 'cow'
    case 'bull':
      return 'bull'
    case 'other':
      return 'other'
    default:
      return 'unknown'
  }
}
