import { AUSENCIA_DE_FOTO, type Peso } from '@rancho/api-contracts'
import { useState } from 'react'

import { useFicha, usePesos } from '../api/hato'
import { usePesosConHistoria } from '../api/pesajes'
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
import { FotoVisible } from '../ui/FotoDeLaBascula'
import { Seccion } from '../ui/Campos'
import { Aretes } from './Aretes'
import { CorreccionDePeso } from './CorreccionDePeso'
import { FormularioDeCorreccion } from './FormularioDeCorreccion'
import { GraficaDePesos } from './GraficaDePesos'

/**
 * La ficha del animal: qué se sabe, sus aretes con su historia, la historia de
 * sus correcciones y sus pesos.
 *
 * Los pesos se leen de la vista de crecimiento para la serie y la ganancia del
 * intervalo (R-06), y de la lectura con historia (`/weights`) para corregir:
 * esa trae el `version` del peso y el valor anterior de cada corrección. Son
 * dos lecturas de los mismos hechos, no dos hechos.
 *
 * Corregir un peso desde aquí y desde la sesión es lo mismo: el mismo comando y
 * la misma historia. Lo que estaba no se borra.
 */
export function Ficha({ animalId }: { readonly animalId: string }) {
  const ficha = useFicha(animalId)
  const pesos = usePesos(animalId)
  const historia = usePesosConHistoria(animalId)
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [pesoACorregir, setPesoACorregir] = useState<string | null>(null)
  const [pesoGuardado, setPesoGuardado] = useState(false)

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
  const ultimoPeso = pesos.data?.ultimoPesaje ?? null
  const correccionesDePeso = new Map(
    (historia.data?.pesos ?? []).map((peso) => [peso.id, peso]),
  )

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
          {ultimoPeso === null
            ? ''
            : ` · ${kilosLegibles(ultimoPeso.kilos)} el ${diaLegible(ultimoPeso.fecha)}`}
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
              <GraficaDePesos pesos={pesos.data.pesos} />
            ) : null}
            {pesos.data !== undefined && pesos.data.pesos.length > 0 ? (
              <ul className="lista lista--planas">
                {[...pesos.data.pesos].reverse().map((punto) => (
                  <li key={punto.pesoId} className="peso">
                    <span className="peso__kilos">{kilosLegibles(punto.kilos)}</span>
                    <span className="peso__fecha">{diaLegible(punto.fecha)}</span>
                    <span className="peso__calidad">{calidad(punto.calidad)}</span>
                    <FotoVisible evidenciaId={correccionesDePeso.get(punto.pesoId)?.evidenciaId} />
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
                    <PesoConCorreccion
                      peso={correccionesDePeso.get(punto.pesoId)}
                      nombreDelAnimal={nombreVisible(animal)}
                      corrigiendo={pesoACorregir === punto.pesoId}
                      alCorregir={() => {
                        setPesoGuardado(false)
                        setPesoACorregir(punto.pesoId)
                      }}
                      alCancelar={() => setPesoACorregir(null)}
                      alGuardar={() => {
                        setPesoACorregir(null)
                        setPesoGuardado(true)
                        void pesos.refetch()
                        void historia.refetch()
                      }}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
            {pesoGuardado ? (
              <p className="aviso aviso--bien" role="status">
                Corrección del peso guardada. Lo anterior quedó en la historia.
              </p>
            ) : null}
          </Seccion>

          <Seccion titulo="Huecos de pesaje">
            {pesos.data === undefined || pesos.data.huecos.length === 0 ? (
              <p className="campo__ayuda">
                En ninguna vuelta se le esperó y se quedó sin pesar.
              </p>
            ) : (
              <ul className="lista lista--planas">
                {pesos.data.huecos.map((hueco) => (
                  <li key={hueco.sesionId} className="arete">
                    <span className="arete__valor">Se esperaba y no se pesó</span>
                    <span className="arete__estado">{diaLegible(hueco.fecha)}</span>
                    <span className="arete__acciones">
                      <button
                        type="button"
                        className="enlace"
                        onClick={() => {
                          irA({ nombre: 'sesion', sesionId: hueco.sesionId })
                        }}
                      >
                        Ver la sesión
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>
        </>
      )}
    </main>
  )
}

/**
 * Un peso de la serie con su corrección y su historia.
 *
 * La corrección se abre con el `Peso` que trae la lectura con historia, porque
 * es la que lleva el `version` del peso. Corregir a ciegas con la versión de la
 * serie (que no la trae con la misma semántica de corrección) es justo lo que
 * provoca un `version_conflict` falso.
 */
function PesoConCorreccion({
  peso,
  nombreDelAnimal,
  corrigiendo,
  alCorregir,
  alCancelar,
  alGuardar,
}: {
  readonly peso: Peso | undefined
  readonly nombreDelAnimal: string
  readonly corrigiendo: boolean
  readonly alCorregir: () => void
  readonly alCancelar: () => void
  readonly alGuardar: () => void
}) {
  if (corrigiendo && peso !== undefined) {
    return (
      <CorreccionDePeso
        peso={peso}
        nombreDelAnimal={nombreDelAnimal}
        alCancelar={alCancelar}
        alGuardar={alGuardar}
      />
    )
  }

  return (
    <>
      {peso === undefined ? null : (
        <span className="peso__intervalo">
          <button type="button" className="enlace" onClick={alCorregir}>
            Corregir este peso
          </button>
        </span>
      )}
      {peso === undefined || peso.correcciones.length === 0 ? null : (
        <ul className="lista lista--planas">
          {peso.correcciones.map((correccion, indice) => (
            <li key={`${correccion.campo}-${correccion.correctedAt}-${indice}`} className="correccion">
              <p className="correccion__campo">
                {etiquetaDeCampo(correccion.campo)}: antes decía «
                {textoAnterior(correccion.campo, correccion.valorAnterior)}
                »
              </p>
              <p className="correccion__motivo">Por qué: {correccion.motivo}</p>
              <p className="correccion__cuando">{instanteLegible(correccion.correctedAt)}</p>
              {correccion.campo === 'evidencia' ? (
                <FotoVisible evidenciaId={correccion.valorAnterior} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function etiquetaDeCampo(campo: string): string {
  if (campo === 'kilos') {
    return 'Kilos'
  }
  if (campo === 'evidencia') {
    return 'Foto de la báscula'
  }
  return 'Cómo se obtuvo'
}

function textoAnterior(campo: string, valor: string): string {
  if (campo === 'kilos') {
    return kilosLegibles(valor)
  }
  if (campo === 'evidencia') {
    return valor === AUSENCIA_DE_FOTO ? 'no tenía foto' : 'tenía una foto'
  }
  return calidad(valor)
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
