import type { FilaDeCrecimiento } from '@rancho/api-contracts'
import { useMemo, useState } from 'react'

import { useHato, useResumenDelHato } from '../api/hato'
import { areteVigente, coincide, normalizar, nombreVisible } from '../dominio/animal'
import { diaLegible, diasLegibles, kilosLegibles } from '../dominio/fechas'
import { categoria, tipoDeMarca } from '../dominio/etiquetas'
import type { Animal } from '../dominio/tipos'
import { irA } from '../ruta'
import { AvisoDeError, BotonGrande, Cargando } from '../ui/Avisos'

/**
 * El hato: los animales activos con nombre o seña, el arete puesto, la
 * categoría y el último peso.
 *
 * La búsqueda corre sobre lo que ya está en pantalla. El hato son unas 21
 * cabezas hoy: traerlo completo y filtrar en el celular responde al instante y
 * encuentra también los aretes anteriores, que la ficha ya trae con su
 * historia.
 */
export function Hato() {
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

  const visibles = useMemo(() => {
    const animales = hato.data?.animales ?? []
    const limpio = normalizar(busqueda)
    if (limpio === '') {
      return animales
    }
    return animales.filter((animal) => coincide(animal, limpio))
  }, [hato.data, busqueda])

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
        <BotonGrande alTocar={() => void hato.refetch()}>Volver a intentar</BotonGrande>
      </main>
    )
  }

  const total = hato.data.animales.length

  return (
    <main className="pantalla">
      <header className="encabezado encabezado--con-accion">
        <div>
          <p className="saludo">RANCHO</p>
          <h1>Hato</h1>
          <p className="subtitulo">
            {total === 0
              ? 'Todavía no hay animales'
              : `${total} ${total === 1 ? 'animal activo' : 'animales activos'}`}
          </p>
        </div>
        <div className="encabezado__acciones">
          <button
            type="button"
            className="boton boton--principal boton--compacto"
            onClick={() => {
              irA({ nombre: 'pesaje' })
            }}
          >
            Pesaje
          </button>
          <button
            type="button"
            className="boton boton--secundario boton--compacto"
            onClick={() => {
              irA({ nombre: 'alta' })
            }}
          >
            Dar de alta
          </button>
        </div>
      </header>

      {total === 0 ? (
        <section className="vacio">
          <h2 className="vacio__titulo">Empieza con el primer animal</h2>
          <p>
            Da de alta un animal con lo que sepas. Si no sabes algo, déjalo en «No sé»: puedes
            completarlo después.
          </p>
          <BotonGrande
            alTocar={() => {
              irA({ nombre: 'alta' })
            }}
          >
            Dar de alta el primer animal
          </BotonGrande>
        </section>
      ) : (
        <>
          <div className="campo">
            <label className="campo__etiqueta" htmlFor="buscar">
              Buscar
            </label>
            <input
              id="buscar"
              className="campo__entrada"
              type="search"
              value={busqueda}
              placeholder="Nombre, seña o arete"
              onChange={(evento) => {
                setBusqueda(evento.target.value)
              }}
            />
            <p className="campo__ayuda">También encuentra un arete que ya se cambió.</p>
          </div>

          {resumen.isError ? (
            <p className="campo__ayuda" role="status">
              No se pudo traer el último peso. La lista sigue; vuelve a abrir la pantalla para
              intentarlo otra vez.
            </p>
          ) : null}

          {visibles.length === 0 ? (
            <section className="vacio">
              <h2 className="vacio__titulo">Ningún animal coincide</h2>
              <p>
                Revisa cómo se escribe. Si el animal es nuevo, dalo de alta con el botón de arriba.
              </p>
            </section>
          ) : (
            <ul className="lista">
              {visibles.map((animal) => (
                <li key={animal.id}>
                  <FilaDeHato animal={animal} fila={porAnimal.get(animal.id)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}

function FilaDeHato({
  animal,
  fila,
}: {
  readonly animal: Animal
  readonly fila: FilaDeCrecimiento | undefined
}) {
  const arete = areteVigente(animal)
  const ultimo = fila?.ultimoPeso ?? null
  const dias = ultimo === null ? null : (fila?.diasDesdeElUltimoPesaje ?? null)

  return (
    <button
      type="button"
      className="fila"
      onClick={() => {
        irA({ nombre: 'ficha', animalId: animal.id })
      }}
    >
      <span className="fila__nombre">{nombreVisible(animal)}</span>
      <span className="fila__datos">
        <span className="fila__arete">
          {arete === null ? 'Sin arete puesto' : `${tipoDeMarca(arete.tipo)} ${arete.valor}`}
        </span>
        <span aria-hidden="true"> · </span>
        <span>{categoria(animal.categoria)}</span>
      </span>
      <span className="fila__peso">
        {ultimo === null
          ? 'Sin peso todavía'
          : `${kilosLegibles(ultimo.kilos)} · ${diaLegible(ultimo.fecha)}`}
        {dias === null ? null : <span className="fila__dias"> · {diasLegibles(dias)}</span>}
        {fila?.fueHuecoEnLaUltimaSesion === true ? (
          <span className="fila__hueco"> No se pesó en la última</span>
        ) : null}
      </span>
    </button>
  )
}
