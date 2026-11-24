import { AUSENCIA_DE_FOTO, type Peso } from '@rancho/api-contracts'
import { useState } from 'react'

import { useFicha, usePesos } from '../api/hato'
import { usePesosConHistoria } from '../api/pesajes'
import { areteVigente, nombreVisible } from '../dominio/animal'
import { diaLegible, instanteLegible, kilosLegibles } from '../dominio/fechas'
import {
  campoDeFicha,
  categoria,
  calidad,
  participacion,
  sexo,
  tenencia,
  tipoDeMarca,
  valorDeFicha,
} from '../dominio/etiquetas'
import type { FichaCompleta } from '../dominio/tipos'
import { irA } from '../ruta'
import { AvisoDeError, BotonGrande, Cargando } from '../ui/Avisos'
import { BotonSecundario } from '../ui/Botones'
import { Desplegable } from '../ui/Desplegable'
import { Encabezado } from '../ui/Encabezado'
import { Etiqueta, type TonoDeEtiqueta } from '../ui/Etiqueta'
import { FotoVisible } from '../ui/FotoDeLaBascula'
import { Aretes } from './Aretes'
import { CorreccionDePeso } from './CorreccionDePeso'
import { FormularioDeCorreccion } from './FormularioDeCorreccion'
import { GraficaDePesos } from './GraficaDePesos'

/**
 * La ficha del animal ([Guía visual](../../../../../docs/design/guia-visual.md)).
 *
 * Arriba el nombre, el arete puesto y las etiquetas de lo que se sabe; después
 * sus pesos, que es lo que se viene a ver; y al final, plegados, los aretes con
 * su historia y la historia de correcciones. Lo que casi no se consulta no
 * ocupa la primera pantalla.
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

  const animal = ficha.data
  const ultimoPeso = pesos.data?.ultimoPesaje ?? null
  const arete = areteVigente(animal)
  const correccionesDePeso = new Map((historia.data?.pesos ?? []).map((peso) => [peso.id, peso]))

  return (
    <main className="pantalla pantalla--ficha">
      <Encabezado
        titulo={nombreVisible(animal)}
        subtitulo={
          ultimoPeso === null
            ? 'Todavía no tiene ningún peso'
            : `Último peso: ${kilosLegibles(ultimoPeso.kilos)} el ${diaLegible(ultimoPeso.fecha)}`
        }
        alRegresar={() => {
          irA({ nombre: 'hato' })
        }}
        etiquetaRegresar="Regresar al hato"
      />

      <div className="ficha__etiquetas">
        <Etiqueta tono={tonoDeCategoria(animal.categoria)}>{categoria(animal.categoria)}</Etiqueta>
        <Etiqueta tono={animal.tenencia === 'unknown' ? 'sinDatos' : 'bien'}>
          {tenencia(animal.tenencia)}
        </Etiqueta>
        {arete === null ? (
          <Etiqueta tono="sinDatos">Sin arete</Etiqueta>
        ) : (
          <Etiqueta tono="sinDatos">
            {tipoDeMarca(arete.tipo)} {arete.valor}
          </Etiqueta>
        )}
        {animal.activo ? null : <Etiqueta tono="revisar">Inactivo</Etiqueta>}
      </div>

      {corrigiendo ? (
        <section className="ficha__seccion">
          <h2 className="ficha__titulo">Corregir la ficha</h2>
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
        </section>
      ) : (
        <>
          {guardado ? (
            <p className="aviso aviso--bien" role="status">
              Corrección guardada. El valor anterior quedó en la historia.
            </p>
          ) : null}

          <section className="ficha__seccion">
            <h2 className="ficha__titulo">Pesos</h2>
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
                    <div className="peso__fila">
                      <span className="peso__kilos">{kilosLegibles(punto.kilos)}</span>
                      <span className="peso__fecha">{diaLegible(punto.fecha)}</span>
                    </div>
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
          </section>

          <section className="ficha__seccion">
            <h2 className="ficha__titulo">Qué se sabe</h2>
            <Datos animal={animal} />
            <BotonSecundario
              tono="tinta"
              alTocar={() => {
                setGuardado(false)
                setCorrigiendo(true)
              }}
            >
              Corregir la ficha
            </BotonSecundario>
          </section>

          <div className="ficha__plegables">
            <Desplegable
              titulo="Aretes"
              resumen={`${String(animal.marcas.length)} ${animal.marcas.length === 1 ? 'registro' : 'registros'}`}
            >
              <Aretes animalId={animal.id} marcas={animal.marcas} />
            </Desplegable>

            <Desplegable
              titulo="Historia de correcciones"
              resumen={
                animal.correcciones.length === 0
                  ? 'sin correcciones'
                  : `${String(animal.correcciones.length)} ${animal.correcciones.length === 1 ? 'corrección' : 'correcciones'}`
              }
            >
              {animal.correcciones.length === 0 ? (
                <p className="campo__ayuda">Nadie ha corregido esta ficha.</p>
              ) : (
                <ul className="lista lista--planas">
                  {animal.correcciones.map((correccion, indice) => (
                    <li
                      key={`${correccion.campo}-${correccion.correctedAt}-${indice}`}
                      className="correccion"
                    >
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
            </Desplegable>

            <Desplegable
              titulo="Huecos de pesaje"
              resumen={
                pesos.data === undefined || pesos.data.huecos.length === 0
                  ? 'ninguno'
                  : String(pesos.data.huecos.length)
              }
            >
              {pesos.data === undefined || pesos.data.huecos.length === 0 ? (
                <p className="campo__ayuda">En ninguna vuelta se le esperó y se quedó sin pesar.</p>
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
            </Desplegable>
          </div>
        </>
      )}
    </main>
  )
}

/** El color del avatar de la lista, para que la ficha se lea igual que el hato. */
function tonoDeCategoria(codigo: string): TonoDeEtiqueta {
  if (codigo === 'calf' || codigo === 'cow' || codigo === 'bull') {
    return 'bien'
  }
  return 'sinDatos'
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
                {textoAnterior(correccion.campo, correccion.valorAnterior)}»
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
        <Dato etiqueta="Nota del arreglo" valor={animal.notaDelArreglo ?? 'Sin nota'} />
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
