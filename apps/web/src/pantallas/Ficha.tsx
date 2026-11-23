import { useState } from 'react'

import { useFicha, usePesos } from '../api/hato'
import { nombreVisible } from '../dominio/animal'
import { diaLegible, instanteLegible, kilosLegibles } from '../dominio/fechas'
import {
  campoDeFicha,
  categoria,
  calidad,
  participacion,
  sexo,
  tenencia,
  valorDeFicha,
} from '../dominio/etiquetas'
import type { FichaCompleta } from '../dominio/tipos'
import { irA } from '../ruta'
import { AvisoDeError, BotonGrande, Cargando } from '../ui/Avisos'
import { Seccion } from '../ui/Campos'
import { Aretes } from './Aretes'
import { FormularioDeCorreccion } from './FormularioDeCorreccion'

/**
 * La ficha del animal: qué se sabe, sus aretes con su historia, la historia de
 * sus correcciones y sus pesos.
 *
 * Los pesos se leen de la vista de crecimiento (R-06). Están aquí solo para
 * mirarlos: capturar y corregir un peso es R-08 y no se adelanta.
 */
export function Ficha({ animalId }: { readonly animalId: string }) {
  const ficha = useFicha(animalId)
  const pesos = usePesos(animalId)
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [guardado, setGuardado] = useState(false)

  if (ficha.isPending) {
    return (
      <main className="pantalla">
        <Cargando que="Trayendo la ficha…" />
      </main>
    )
  }

  if (ficha.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={ficha.error} />
        <BotonGrande alTocar={() => void ficha.refetch()}>Volver a intentar</BotonGrande>
        <BotonGrande secundario alTocar={() => { irA({ nombre: 'hato' }) }}>
          Regresar al hato
        </BotonGrande>
      </main>
    )
  }

  const animal = ficha.data

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
        <h1>{nombreVisible(animal)}</h1>
        <p className="subtitulo">
          {categoria(animal.categoria)}
          {animal.activo ? '' : ' · Inactivo'}
        </p>
      </header>

      {corrigiendo ? (
        <Seccion titulo="Corregir la ficha">
          <FormularioDeCorreccion
            ficha={animal}
            alRecargar={() => {
              setCorrigiendo(false)
              void ficha.refetch()
            }}
            alGuardar={() => {
              setCorrigiendo(false)
              setGuardado(true)
            }}
          />
        </Seccion>
      ) : (
        <>
          {guardado ? (
            <p className="aviso aviso--bien" role="status">
              Corrección guardada. El valor anterior quedó en la historia.
            </p>
          ) : null}

          <Seccion titulo="Qué se sabe">
            <Datos animal={animal} />
            <BotonGrande
              secundario
              alTocar={() => {
                setGuardado(false)
                setCorrigiendo(true)
              }}
            >
              Corregir la ficha
            </BotonGrande>
          </Seccion>

          <Seccion titulo="Aretes">
            <Aretes animalId={animal.id} marcas={animal.marcas} />
          </Seccion>

          <Seccion titulo="Historia de correcciones">
            {animal.correcciones.length === 0 ? (
              <p className="campo__ayuda">Nadie ha corregido esta ficha.</p>
            ) : (
              <ul className="lista lista--planas">
                {animal.correcciones.map((correccion, indice) => (
                  <li key={`${correccion.campo}-${correccion.correctedAt}-${indice}`} className="correccion">
                    <p className="correccion__campo">
                      {campoDeFicha(correccion.campo)}: antes decía «
                      {valorDeFicha(correccion.campo, correccion.valorAnterior)}»
                    </p>
                    <p className="correccion__motivo">Por qué: {correccion.motivo}</p>
                    <p className="correccion__cuando">{instanteLegible(correccion.correctedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>

          <Seccion titulo="Pesos">
            {pesos.isPending ? <p className="campo__ayuda">Trayendo los pesos…</p> : null}
            {pesos.isError ? (
              <p className="campo__ayuda">No se pudieron traer los pesos. Vuelve a abrir la ficha.</p>
            ) : null}
            {pesos.data !== undefined && pesos.data.pesos.length === 0 ? (
              <p className="campo__ayuda">
                Todavía no tiene ningún peso. En la siguiente vuelta por la báscula se registra.
              </p>
            ) : null}
            {pesos.data !== undefined && pesos.data.pesos.length > 0 ? (
              <ul className="lista lista--planas">
                {[...pesos.data.pesos].reverse().map((punto) => (
                  <li key={punto.pesoId} className="peso">
                    <span className="peso__kilos">{kilosLegibles(punto.kilos)}</span>
                    <span className="peso__fecha">{diaLegible(punto.fecha)}</span>
                    <span className="peso__calidad">{calidad(punto.calidad)}</span>
                    {punto.intervalo === null ? null : (
                      <span className="peso__intervalo">
                        Desde el {diaLegible(punto.intervalo.fechaPrevia)}:{' '}
                        {kilosLegibles(punto.intervalo.kilosGanados)}
                        {punto.intervalo.kilosPorDia === null
                          ? ''
                          : ` · ${kilosLegibles(punto.intervalo.kilosPorDia)} por día`}
                        {punto.intervalo.incluyeCalidadNoMedida
                          ? ' · incluye un peso que no se midió'
                          : ''}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </Seccion>
        </>
      )}
    </main>
  )
}

function Datos({ animal }: { readonly animal: FichaCompleta }) {
  return (
    <dl className="datos">
      <Dato etiqueta="Nombre o seña" valor={animal.nombre ?? 'Sin nombre o seña'} />
      <Dato etiqueta="Sexo" valor={sexo(animal.sexo)} />
      <Dato
        etiqueta="Categoría"
        valor={
          animal.detalleCategoria === null
            ? categoria(animal.categoria)
            : `${categoria(animal.categoria)} (${animal.detalleCategoria})`
        }
      />
      <Dato etiqueta="¿De quién es?" valor={tenencia(animal.tenencia)} />
      <Dato
        etiqueta="Participación económica"
        valor={participacion(animal.participacionEconomica)}
      />
      {animal.tenencia === 'a_la_parte' ? (
        <Dato
          etiqueta="Nota del arreglo"
          valor={animal.notaDelArreglo ?? 'Sin nota'}
        />
      ) : null}
      {animal.nota === null ? null : <Dato etiqueta="Nota" valor={animal.nota} />}
      <Dato etiqueta="Registrado" valor={instanteLegible(animal.recordedAt)} />
    </dl>
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
