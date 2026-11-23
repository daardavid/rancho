import type { FilaDeCrecimiento } from '@rancho/api-contracts'
import { useMemo } from 'react'

import { useResumenDelHato } from '../api/hato'
import { ordenarCrecimiento } from '../dominio/crecimiento'
import { diaLegible, diasLegibles, kilosLegibles } from '../dominio/fechas'
import { categoria } from '../dominio/etiquetas'
import { irA } from '../ruta'
import { AvisoDeError, BotonGrande, Cargando } from '../ui/Avisos'

/**
 * El crecimiento del hato, en una tabla.
 *
 * El orden no es alfabético ni por nombre: primero los que no se pesaron en la
 * última vuelta, después la menor ganancia por día
 * ([ordenarCrecimiento](../dominio/crecimiento.ts)). Es a quién hay que mirar,
 * no un listado. Un animal sin dos pesajes no tiene ganancia que comparar y va
 * al final: no es un mal resultado, es un dato que todavía falta.
 *
 * La ganancia la calcula la API sobre `numeric`; aquí no se resta ningún peso.
 * Los kilos se leen como texto, igual que se guardaron.
 */
export function Crecimiento() {
  const resumen = useResumenDelHato()

  const filas = useMemo(
    () => ordenarCrecimiento(resumen.data?.animales ?? []),
    [resumen.data],
  )

  if (resumen.isPending) {
    return (
      <main className="pantalla">
        <Cargando que="Trayendo el crecimiento del hato…" />
      </main>
    )
  }

  if (resumen.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={resumen.error} />
        <BotonGrande alTocar={() => void resumen.refetch()}>Volver a intentar</BotonGrande>
        <BotonGrande secundario alTocar={() => irA({ nombre: 'hato' })}>
          Regresar al hato
        </BotonGrande>
      </main>
    )
  }

  const huecos = filas.filter((fila) => fila.fueHuecoEnLaUltimaSesion).length
  const conGanancia = filas.filter((fila) => fila.ultimoIntervalo !== null).length

  return (
    <main className="pantalla">
      <header className="encabezado">
        <p className="saludo">Crecimiento</p>
        <h1>Quién va bien y quién va atrás</h1>
        <p className="subtitulo">
          {filas.length === 0
            ? 'Todavía no hay pesajes que comparar'
            : `${String(filas.length)} con historia · ${String(conGanancia)} con ganancia para comparar`}
        </p>
      </header>

      {filas.length === 0 ? (
        <section className="vacio">
          <h2 className="vacio__titulo">Empieza con la primera vuelta por la báscula</h2>
          <p>
            Cuando haya dos pesajes del mismo animal, aquí aparece cuánto ganó en el intervalo. Los
            que se esperaban y no se pesaron también se ven, para que no se pierdan.
          </p>
          <BotonGrande alTocar={() => irA({ nombre: 'pesaje' })}>Registrar un pesaje</BotonGrande>
        </section>
      ) : (
        <>
          <section className="seccion">
            {huecos > 0 ? (
              <p className="campo__ayuda">
                {huecos === 1
                  ? '1 animal se esperaba en la última vuelta y no se pesó. Va primero.'
                  : `${String(huecos)} animales se esperaban en la última vuelta y no se pesaron. Van primero.`}
              </p>
            ) : null}

            <table className="tabla">
              <caption className="tabla__leyenda">
                Primero los que no se pesaron, después la menor ganancia por día.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Animal</th>
                  <th scope="col">Último peso</th>
                  <th scope="col">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <FilaDeLaTabla key={fila.animalId} fila={fila} />
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <BotonGrande alTocar={() => irA({ nombre: 'pesaje' })}>Registrar un pesaje</BotonGrande>
      <BotonGrande secundario alTocar={() => irA({ nombre: 'hato' })}>
        Regresar al hato
      </BotonGrande>
    </main>
  )
}

function FilaDeLaTabla({ fila }: { readonly fila: FilaDeCrecimiento }) {
  const nombre = fila.nombre ?? 'Sin nombre o seña'
  const intervalo = fila.ultimoIntervalo

  return (
    <tr
      className={fila.fueHuecoEnLaUltimaSesion ? 'tabla__fila tabla__fila--hueco' : 'tabla__fila'}
    >
      <td>
        <button
          type="button"
          className="enlace"
          onClick={() => irA({ nombre: 'ficha', animalId: fila.animalId })}
        >
          {nombre}
        </button>
        <span className="tabla__detalle">{categoria(fila.categoria)}</span>
        {fila.fueHuecoEnLaUltimaSesion ? (
          <span className="tabla__hueco"> No se pesó en la última</span>
        ) : null}
      </td>
      <td>
        {fila.ultimoPeso === null ? (
          <span className="tabla__detalle">Sin peso todavía</span>
        ) : (
          <>
            <span>{kilosLegibles(fila.ultimoPeso.kilos)}</span>
            <span className="tabla__detalle">
              {diaLegible(fila.ultimoPeso.fecha)}
              {fila.diasDesdeElUltimoPesaje === null
                ? ''
                : ` · ${diasLegibles(fila.diasDesdeElUltimoPesaje)}`}
            </span>
          </>
        )}
      </td>
      <td>
        {intervalo === null ? (
          <span className="tabla__detalle">Falta otro pesaje</span>
        ) : (
          <>
            <span>
              {kilosLegibles(intervalo.kilosGanados)}
              {intervalo.kilosPorDia === null
                ? ''
                : ` · ${kilosLegibles(intervalo.kilosPorDia)} por día`}
            </span>
            <span className="tabla__detalle">En {String(intervalo.dias)} días</span>
            {intervalo.incluyeCalidadNoMedida ? (
              <span className="tabla__ojo"> Incluye un peso que no se midió</span>
            ) : null}
          </>
        )}
      </td>
    </tr>
  )
}
