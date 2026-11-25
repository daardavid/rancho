import type { FilaDeCrecimiento } from '@rancho/api-contracts'
import { useMemo } from 'react'

import { useResumenDelHato } from '../api/hato'
import { anchoDeBarra, mayorKilosPorDia, ordenarCrecimiento } from '../dominio/crecimiento'
import { diaDeVuelta, numeroLegible } from '../dominio/fechas'
import { lecturaDeCrecimiento, type LecturaDeCrecimiento } from '../dominio/revision'
import { irA } from '../ruta'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { BotonPrincipal } from '../ui/Botones'
import { Resumen } from '../ui/Resumen'
import { EncabezadoDelRancho } from './EncabezadoDelRancho'

/**
 * Cómo va la última vuelta y a quién revisar
 * ([Crecimiento](../../../../../docs/design/maqueta/Crecimiento.dc.html)).
 *
 * La media, los pesados y la fecha los calcula el servidor. Aquí no se promedia
 * ningún kilo: el número de la tarjeta es el texto que llegó. «Revisar primero»
 * usa la regla de INC-003 sobre los datos de cada animal; no hay meta de
 * ganancia. La barra solo compara contra el mayor kilos por día del hato.
 */
export function Crecimiento() {
  const resumen = useResumenDelHato()

  const ordenadas = useMemo(
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
        <BotonPrincipal alTocar={() => void resumen.refetch()}>Volver a intentar</BotonPrincipal>
      </main>
    )
  }

  const datos = resumen.data
  const mayor = mayorKilosPorDia(datos.animales)
  const tarjetas = ordenadas.map((fila) => ({
    fila,
    lectura: lecturaDeCrecimiento(fila),
  }))
  const revisar = tarjetas.filter((tarjeta) => tarjeta.lectura.lugar === 'revisar')
  const bien = tarjetas.filter((tarjeta) => tarjeta.lectura.lugar === 'bien')
  const media = datos.gananciaMediaKilosPorDia

  return (
    <main className="pantalla pantalla--crecimiento">
      <EncabezadoDelRancho
        titulo="Crecimiento"
        subtitulo={
          datos.fechaDeLaUltimaVuelta === null
            ? 'Todavía no hay una vuelta de pesaje'
            : `Última vuelta: ${diaDeVuelta(datos.fechaDeLaUltimaVuelta)}`
        }
      />

      {ordenadas.length === 0 ? (
        <section className="vacio">
          <h2 className="vacio__titulo">Registra el primer pesaje</h2>
          <p>Cuando haya una vuelta por la báscula, aquí se ve cómo va y a quién revisar.</p>
          <BotonPrincipal alTocar={() => irA({ nombre: 'pesaje' })}>Registrar un pesaje</BotonPrincipal>
        </section>
      ) : (
        <>
          <Resumen
            tarjetas={[
              {
                etiqueta: 'Ganancia media',
                valor: media === null ? '—' : numeroLegible(media),
                detalle: 'kg por día',
                tono: 'principal',
              },
              {
                etiqueta: 'Pesados',
                valor: `${String(datos.pesadosEnLaUltimaVuelta)} / ${String(datos.esperadosEnLaUltimaVuelta)}`,
                detalle: 'en la vuelta',
                tono: 'neutro',
              },
              {
                etiqueta: 'Van atrás',
                valor: String(revisar.length),
                detalle: 'revisar',
                tono: 'aviso',
              },
            ]}
          />

          {revisar.length === 0 ? null : (
            <section className="crecimiento__seccion" aria-label="Revisar primero">
              <h2>Revisar primero</h2>
              <ul className="crecimiento__lista">
                {revisar.map((tarjeta) => (
                  <li key={tarjeta.fila.animalId}>
                    <TarjetaDeAnimal fila={tarjeta.fila} lectura={tarjeta.lectura} mayor={mayor} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {bien.length === 0 ? null : (
            <section className="crecimiento__seccion" aria-label="Van bien">
              <h2>Van bien</h2>
              <ul className="crecimiento__lista">
                {bien.map((tarjeta) => (
                  <li key={tarjeta.fila.animalId}>
                    <TarjetaDeAnimal fila={tarjeta.fila} lectura={tarjeta.lectura} mayor={mayor} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  )
}

function TarjetaDeAnimal({
  fila,
  lectura,
  mayor,
}: {
  readonly fila: FilaDeCrecimiento
  readonly lectura: LecturaDeCrecimiento
  readonly mayor: string | null
}) {
  const ancho = anchoDeBarra(lectura.kilosPorDia, mayor)
  const nombre = fila.nombre ?? 'Sin nombre o seña'

  return (
    <article className="crecimiento__tarjeta">
      <div className="crecimiento__cabeza">
        <button
          type="button"
          className="crecimiento__nombre"
          onClick={() => irA({ nombre: 'ficha', animalId: fila.animalId })}
        >
          {nombre}
        </button>
        <span className={`crecimiento__valor crecimiento__valor--${lectura.tono}`}>{lectura.valor}</span>
      </div>
      <div className="crecimiento__pista" aria-hidden="true">
        <span
          className={`crecimiento__tramo crecimiento__tramo--${lectura.tono === 'revisar' ? 'revisar' : 'bien'}`}
          style={{ width: `${String(ancho)}%` }}
        />
      </div>
      {lectura.nota === null ? null : <p className="crecimiento__nota">{lectura.nota}</p>}
    </article>
  )
}
