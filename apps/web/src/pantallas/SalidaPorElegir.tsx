import type { FilaDeCrecimiento } from '@rancho/api-contracts'
import { useMemo, useState } from 'react'

import { useHato, useResumenDelHato } from '../api/hato'
import { areteVigente, coincide, normalizar, nombreVisible } from '../dominio/animal'
import { categoria, tipoDeMarca } from '../dominio/etiquetas'
import { kilosLegibles } from '../dominio/fechas'
import { irA } from '../ruta'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { Encabezado } from '../ui/Encabezado'
import { FilaDeAnimal, type CategoriaVisual } from '../ui/FilaDeAnimal'
import { IconoBuscar } from '../ui/iconos'

/**
 * «Salida» desde Inicio: elegir a quién se le da de baja.
 *
 * La baja se captura en la ficha del animal, que es donde vive el comando con
 * su versión, su motivo y su historia. Esta pantalla solo elige a quién: abre la
 * ficha con el formulario ya desplegado (`#/animal/<id>/salida`), así el dueño
 * no tiene que buscarlo entre sus secciones ni se inventa una segunda captura.
 *
 * Solo se listan los activos. Quien ya salió se corrige desde Salidas.
 */
export function SalidaPorElegir() {
  const hato = useHato()
  const resumen = useResumenDelHato()
  const [busqueda, setBusqueda] = useState('')

  const porAnimal = useMemo(() => {
    const mapa = new Map<string, FilaDeCrecimiento>()
    for (const fila of resumen.data?.animales ?? []) {
      mapa.set(fila.animalId, fila)
    }
    return mapa
  }, [resumen.data])

  const animales = useMemo(() => hato.data?.animales ?? [], [hato.data])
  const visibles = useMemo(() => {
    const limpio = normalizar(busqueda)
    if (limpio === '') {
      return animales
    }
    return animales.filter((animal) => coincide(animal, limpio))
  }, [animales, busqueda])

  if (hato.isPending) {
    return (
      <main className="pantalla">
        <Cargando que="Trayendo el hato…" />
      </main>
    )
  }

  if (hato.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={hato.error} />
      </main>
    )
  }

  const volverAlInicio = (): void => {
    irA({ nombre: 'inicio' })
  }

  return (
    <main className="pantalla pantalla--hato">
      <Encabezado
        etiqueta="MI RANCHO"
        titulo="Salida"
        subtitulo={
          animales.length === 0
            ? 'Todavía no hay animales en el hato'
            : 'Elige el animal que sale del hato'
        }
        alRegresar={volverAlInicio}
        etiquetaRegresar="Regresar a Inicio"
      />

      {animales.length === 0 ? (
        <section className="vacio">
          <h2 className="vacio__titulo">Todavía no hay animales</h2>
          <p>Da de alta el primero para poder registrar una salida.</p>
        </section>
      ) : (
        <>
          <div className="ui-buscador">
            <IconoBuscar />
            <label className="ui-sr" htmlFor="buscar-salida">
              Buscar
            </label>
            <input
              id="buscar-salida"
              className="ui-buscador__entrada"
              type="search"
              value={busqueda}
              placeholder="Buscar por nombre o arete"
              onChange={(evento) => {
                setBusqueda(evento.target.value)
              }}
            />
          </div>

          {resumen.isError ? (
            <p className="campo__ayuda hato__sin-peso" role="status">
              No se pudo traer el último peso. La lista sigue; vuelve a abrir la pantalla para
              intentarlo otra vez.
            </p>
          ) : null}

          {visibles.length === 0 ? (
            <section className="vacio">
              <h2 className="vacio__titulo">Ningún animal coincide</h2>
              <p>Revisa cómo se escribe.</p>
            </section>
          ) : (
            <ul className="hato__lista">
              {visibles.map((animal) => {
                const arete = areteVigente(animal)
                const ultimo = porAnimal.get(animal.id)?.ultimoPeso ?? null
                return (
                  <li key={animal.id}>
                    <FilaDeAnimal
                      nombre={nombreVisible(animal)}
                      detalle={`${categoria(animal.categoria)} · ${
                        arete === null ? 'sin arete' : `${tipoDeMarca(arete.tipo)} ${arete.valor}`
                      }`}
                      peso={ultimo === null ? '—' : kilosLegibles(ultimo.kilos)}
                      ganancia="Dar de baja"
                      tono="sinDatos"
                      categoria={categoriaVisual(animal.categoria)}
                      miniaturaId={animal.foto?.miniaturaId ?? null}
                      alTocar={() => {
                        irA({ nombre: 'ficha', animalId: animal.id, abrirSalida: true, desde: 'inicio' })
                      }}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </main>
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
