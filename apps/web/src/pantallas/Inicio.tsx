import type { AnimalDelInicio, AnimalSinVerse, CambioDelPeriodo } from '@rancho/api-contracts'
import { useState } from 'react'

import { useInicio } from '../api/inicio'
import { categoria } from '../dominio/etiquetas'
import { diaLegible, diaMas, hoyEnElRancho } from '../dominio/fechas'
import { haceCuantosDias } from '../dominio/observacion'
import { rutaAHash } from '../ruta'
import { AvisoDeError, BotonGrande, Cargando } from '../ui/Avisos'
import { CampoDeFecha } from '../ui/Campos'
import { Encabezado } from '../ui/Encabezado'
import { Resumen, type TarjetaDeResumen } from '../ui/Resumen'

/**
 * La revisión del periodo ([TGT-GOV-001](../../../../docs/architecture/domain-boundaries.md),
 * en lo que esta pantalla ya puede leer).
 *
 * Arriba los activos y lo que cambió desde el día que se elija. Abajo lo que
 * hay que mirar: huecos de la última vuelta, quien no tiene lugar, quien no
 * tiene observación y el resto ordenado por los días sin verse. No hay un
 * límite inventado: entran todos. Lo que no se sabe se queda vacío.
 */

export function Inicio() {
  const [desde, setDesde] = useState(() => diaMas(hoyEnElRancho(), -7))
  const inicio = useInicio(desde)

  if (inicio.isPending) {
    return (
      <main className="pantalla">
        <Cargando que="Armando el inicio…" />
      </main>
    )
  }

  if (inicio.isError) {
    return (
      <main className="pantalla">
        <Encabezado titulo="Inicio" />
        <AvisoDeError error={inicio.error} />
        <BotonGrande alTocar={() => void inicio.refetch()}>Volver a intentar</BotonGrande>
      </main>
    )
  }

  const datos = inicio.data
  const revisar = datos.paraRevisar

  return (
    <main className="pantalla">
      <Encabezado titulo="Inicio" subtitulo="Lo que cambió y lo que hay que revisar." />

      <CampoDeFecha
        etiqueta="Desde"
        valor={desde}
        alCambiar={(dia) => {
          if (dia !== '') {
            setDesde(dia)
          }
        }}
        ayuda="Por omisión, los últimos 7 días. El día de hoy entra."
      />

      <section className="ficha__seccion" aria-label="Activos">
        <h2 className="ficha__titulo">Activos</h2>
        {datos.activosPorCategoria.length === 0 ? (
          <p className="inicio__vacio">No hay animales activos.</p>
        ) : (
          <Resumen
            tarjetas={datos.activosPorCategoria.map(
              (fila): TarjetaDeResumen => ({
                etiqueta: categoria(fila.categoria),
                valor: String(fila.cantidad),
                detalle: fila.categoria === 'unknown' ? 'Sin categoría' : 'En el hato',
                tono: fila.categoria === 'unknown' ? 'neutro' : 'principal',
              }),
            )}
          />
        )}
      </section>

      <section className="ficha__seccion" aria-label="En este periodo">
        <h2 className="ficha__titulo">En este periodo</h2>
        <p className="inicio__vacio">
          Del {diaLegible(datos.desde)} al {diaLegible(datos.hoy)}.
        </p>
        <Resumen
          tarjetas={[
            cuenta('Nacimientos', datos.cambios.nacimientos.length, 'Con fecha'),
            cuenta('Salidas', datos.cambios.salidas.length, 'Se supo en estos días'),
            cuenta('Pesajes', datos.cambios.pesajes, 'Animales pesados'),
            cuenta('Notas', datos.cambios.notasDeSanidad, 'De sanidad'),
          ]}
        />
        {datos.cambios.nacimientosSinFecha === 0 ? null : (
          <p className="inicio__vacio">
            {datos.cambios.nacimientosSinFecha === 1
              ? 'Hay 1 nacimiento sin fecha. No entra en la cuenta.'
              : `Hay ${datos.cambios.nacimientosSinFecha} nacimientos sin fecha. No entran en la cuenta.`}
          </p>
        )}
        <section aria-label="Nacimientos">
          <h3 className="inicio__grupo">Nacimientos</h3>
          {datos.cambios.nacimientos.length === 0 ? (
            <p className="inicio__vacio">Ninguno con fecha en este periodo.</p>
          ) : (
            <ListaCambios cambios={datos.cambios.nacimientos} />
          )}
        </section>
        <section aria-label="Salidas">
          <h3 className="inicio__grupo">Salidas</h3>
          {datos.cambios.salidas.length === 0 ? (
            <p className="inicio__vacio">Ninguna en este periodo.</p>
          ) : (
            <ListaCambios cambios={datos.cambios.salidas} />
          )}
        </section>
      </section>

      <section className="ficha__seccion" aria-label="Para revisar">
        <h2 className="ficha__titulo">Para revisar</h2>

        <h3 className="inicio__grupo">Huecos de la última vuelta</h3>
        {revisar.fechaDeLaUltimaVuelta === null ? (
          <p className="inicio__vacio">Todavía no hay una vuelta de pesaje.</p>
        ) : revisar.huecosDeLaUltimaVuelta.length === 0 ? (
          <p className="inicio__vacio">
            La última vuelta, del {diaLegible(revisar.fechaDeLaUltimaVuelta)}, no dejó huecos.
          </p>
        ) : (
          <Lista animales={revisar.huecosDeLaUltimaVuelta} />
        )}

        <h3 className="inicio__grupo">Sin lugar asignado</h3>
        {revisar.sinLugar.length === 0 ? (
          <p className="inicio__vacio">Nadie está sin una asignación.</p>
        ) : (
          <Lista animales={revisar.sinLugar} />
        )}

        {revisar.lugarDesconocido.length === 0 ? null : (
          <>
            <h3 className="inicio__grupo">Lugar desconocido</h3>
            <p className="inicio__vacio">Se anotó «No sé». No es un potrero.</p>
            <Lista animales={revisar.lugarDesconocido} />
          </>
        )}

        <h3 className="inicio__grupo">Sin observación</h3>
        {revisar.sinObservacion.length === 0 ? (
          <p className="inicio__vacio">Todos tienen un pesaje o una nota en la que se les vio.</p>
        ) : (
          <Lista animales={revisar.sinObservacion} />
        )}

        <section aria-label="Días sin verse">
          <h3 className="inicio__grupo">Días sin verse</h3>
          <p className="inicio__vacio">Sin un límite: se ordenan por los días, de más a menos.</p>
          {revisar.porDiasSinVerse.length === 0 ? (
            <p className="inicio__vacio">Nadie tiene una observación todavía.</p>
          ) : (
            <ul className="inicio__lista">
              {revisar.porDiasSinVerse.map((animal) => (
                <li key={animal.animalId}>
                  <a
                    href={rutaAHash({ nombre: 'ficha', animalId: animal.animalId })}
                    aria-label={`${nombreDe(animal)}, ${detalleDeDias(animal)}`}
                  >
                    <span>{nombreDe(animal)}</span>
                    <span className="inicio__meta">{detalleDeDias(animal)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  )
}

function cuenta(etiqueta: string, cantidad: number, detalle: string): TarjetaDeResumen {
  return {
    etiqueta,
    valor: String(cantidad),
    detalle,
    tono: 'neutro',
  }
}

function ListaCambios({ cambios }: { readonly cambios: readonly CambioDelPeriodo[] }) {
  return (
    <ul className="inicio__lista">
      {cambios.map((animal) => (
        <li key={animal.animalId}>
          <a
            href={rutaAHash({ nombre: 'ficha', animalId: animal.animalId })}
            aria-label={`${nombreDe(animal)}, ${diaLegible(animal.fecha)}`}
          >
            <span>{nombreDe(animal)}</span>
            <span className="inicio__meta">{diaLegible(animal.fecha)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function Lista({ animales }: { readonly animales: readonly AnimalDelInicio[] }) {
  return (
    <ul className="inicio__lista">
      {animales.map((animal) => (
        <li key={animal.animalId}>
          <a
            href={rutaAHash({ nombre: 'ficha', animalId: animal.animalId })}
            aria-label={`${nombreDe(animal)}, ${categoria(animal.categoria)}`}
          >
            <span>{nombreDe(animal)}</span>
            <span className="inicio__meta">{categoria(animal.categoria)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function nombreDe(animal: AnimalDelInicio): string {
  return animal.nombre ?? 'Sin nombre o seña'
}

function detalleDeDias(animal: AnimalSinVerse): string {
  const evento =
    animal.origen === 'pesaje'
      ? 'pesaje'
      : animal.origen === 'nacimiento'
        ? 'nacimiento'
        : 'nota de sanidad'
  return `${haceCuantosDias(animal.dias)} · ${evento}`
}
