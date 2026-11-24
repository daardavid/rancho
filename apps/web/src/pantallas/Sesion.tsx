import type { SesionDePesaje } from '@rancho/api-contracts'
import { useState } from 'react'

import { useHato } from '../api/hato'
import { useSesion, useUltimaSesion } from '../api/pesajes'
import { nombreVisible } from '../dominio/animal'
import { diaLegible, instanteLegible, kilosLegibles } from '../dominio/fechas'
import { calidad } from '../dominio/etiquetas'
import type { Animal } from '../dominio/tipos'
import { irA } from '../ruta'
import { AvisoDeError, BotonGrande, Cargando } from '../ui/Avisos'
import { FotoVisible } from '../ui/FotoDeLaBascula'
import { CorreccionDePeso } from './CorreccionDePeso'

/**
 * Una sesión de pesaje ya guardada, con lo que se capturó.
 *
 * Sirve para dos cosas: ver qué se asentó después de guardar, y corregir un
 * peso mal anotado sin salir de la sesión. Corregir aquí o desde la ficha es lo
 * mismo: es el mismo comando y deja la misma historia.
 *
 * Una fila que no se pesó se ve como hueco, no como error ni como baja del
 * animal. Un hueco de una vuelta no dice nada del resto del hato.
 */
export function Sesion({ sesionId }: { readonly sesionId: string }) {
  const sesion = useSesion(sesionId)
  const ultima = useUltimaSesion()
  const hato = useHato()
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null)

  if (sesion.isPending) {
    return (
      <main className="pantalla">
        <Cargando que="Trayendo la sesión…" />
      </main>
    )
  }

  if (sesion.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={sesion.error} />
        <BotonGrande alTocar={() => void sesion.refetch()}>Volver a intentar</BotonGrande>
        <BotonGrande
          secundario
          alTocar={() => {
            irA({ nombre: 'hato' })
          }}
        >
          Regresar al hato
        </BotonGrande>
      </main>
    )
  }

  const guardada = sesion.data
  const porAnimal = new Map((hato.data?.animales ?? []).map((animal) => [animal.id, animal]))
  const pesados = guardada.filas.filter((fila) => fila.resultado === 'pesado').length
  const huecos = guardada.filas.length - pesados

  // Si esta es la última sesión del rancho, la siguiente vuelta se arma con
  // estos mismos animales. Se ofrece el atajo, no se navega solo.
  const esLaUltima = ultima.data?.id === guardada.id

  return (
    <main className="pantalla">
      <header className="encabezado">
        <p className="saludo">
          <button
            type="button"
            className="enlace"
            onClick={() => {
              irA({ nombre: 'hato' })
            }}
          >
            ← Hato
          </button>
        </p>
        <h1>Pesaje del {diaLegible(guardada.fecha)}</h1>
        <p className="subtitulo">
          {pesados === 1 ? '1 pesado' : `${String(pesados)} pesados`}
          {huecos === 0 ? '' : huecos === 1 ? ' · 1 no se pesó' : ` · ${String(huecos)} no se pesaron`}
        </p>
      </header>

      <section className="seccion">
        <h2 className="seccion__titulo">Lo que se asentó</h2>
        <ul className="lista lista--planas">
          {guardada.filas.map((fila) => (
            <li key={fila.id}>
              <FilaDeSesionGuardada
                fila={fila}
                animal={porAnimal.get(fila.animalId)}
                corrigiendo={corrigiendo === fila.id}
                alCorregir={() => setCorrigiendo(fila.id)}
                alTerminar={() => {
                  setCorrigiendo(null)
                  void sesion.refetch()
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">Cómo quedó anotado</h2>
        <dl className="datos">
          <Dato etiqueta="Se registró" valor={instanteLegible(guardada.recordedAt)} />
          <Dato
            etiqueta="Quién pasó los números"
            valor={guardada.reportedBy ?? 'No se anotó'}
          />
          {guardada.nota === null ? null : <Dato etiqueta="Nota" valor={guardada.nota} />}
        </dl>
      </section>

      {esLaUltima ? (
        <BotonGrande
          alTocar={() => {
            irA({ nombre: 'pesaje' })
          }}
        >
          Pesaje de otra vuelta
        </BotonGrande>
      ) : null}
      <BotonGrande secundario alTocar={() => irA({ nombre: 'hato' })}>
        Regresar al hato
      </BotonGrande>
    </main>
  )
}

function FilaDeSesionGuardada({
  fila,
  animal,
  corrigiendo,
  alCorregir,
  alTerminar,
}: {
  readonly fila: SesionDePesaje['filas'][number]
  readonly animal: Animal | undefined
  readonly corrigiendo: boolean
  readonly alCorregir: () => void
  readonly alTerminar: () => void
}) {
  const nombre = animal === undefined ? 'Animal que ya no está en el hato' : nombreVisible(animal)

  if (corrigiendo && fila.resultado === 'pesado') {
    return (
      <div className="peso">
        <span className="peso__kilos">{nombre}</span>
        <CorreccionDePeso
          peso={{
            id: fila.id,
            kilos: fila.kilos,
            calidad: fila.calidad,
            version: fila.version,
            evidenciaId: fila.evidenciaId ?? null,
          }}
          nombreDelAnimal={nombre}
          alCancelar={() => {
            alTerminar()
          }}
          alGuardar={alTerminar}
        />
      </div>
    )
  }

  return (
    <div className="peso">
      <span className="peso__kilos">{nombre}</span>
      {fila.resultado === 'hueco' ? (
        <span className="peso__hueco">No se pesó</span>
      ) : (
        <>
          <span>{kilosLegibles(fila.kilos)}</span>
          <span className="peso__calidad">{calidad(fila.calidad)}</span>
          <FotoVisible evidenciaId={fila.evidenciaId} />
          <span className="peso__intervalo">
            <button type="button" className="enlace" onClick={alCorregir}>
              Corregir este peso
            </button>
          </span>
        </>
      )}
    </div>
  )
}

function Dato({ etiqueta, valor }: { readonly etiqueta: string; readonly valor: string }) {
  return (
    <div className="dato">
      <dt className="dato__etiqueta">{etiqueta}</dt>
      <dd className="dato__valor">{valor}</dd>
    </div>
  )
}
