import type { DesteteEnLaFicha } from '@rancho/api-contracts'
import { useRef, useState } from 'react'

import { useAnotarDestete, useCorregirDestete, useDestete } from '../api/destete'
import { textoDeCuando, textoDeEdad } from '../dominio/destete'
import { calidad } from '../dominio/etiquetas'
import { diaLegible, instanteLegible, kilosLegibles } from '../dominio/fechas'
import { revisarKilos } from '../dominio/kilos'
import { esConflictoDeVersion } from '../dominio/mensajes'
import { AvisoDeError } from '../ui/Avisos'
import { BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { CampoDeArea, CampoDeFecha, CampoDeTexto } from '../ui/Campos'
import { useEnfocarAviso } from '../ui/enfocar'
import { FotoDeLaBascula, FotoVisible } from '../ui/FotoDeLaBascula'
import { Segmentado } from '../ui/Segmentado'

const PRECISION = [
  { valor: 'exact', texto: 'Fecha exacta' },
  { valor: 'approximate', texto: 'Aproximada' },
  { valor: 'no_se', texto: 'No sé' },
]
const CALIDAD = [
  { valor: 'measured', texto: 'Medido' },
  { valor: 'observed', texto: 'Visto' },
  { valor: 'declared', texto: 'Me lo dijeron' },
]
const LARGO_DE_QUIEN = 200
const LARGO_DE_NOTA = 2000

type Precision = 'exact' | 'approximate' | 'no_se' | ''
type Calidad = 'measured' | 'observed' | 'declared' | ''

/**
 * Destete en la ficha de la cría, y el mismo formulario para varios animales
 * del hato. En el grupo no se pide peso: un solo número no es el peso de cada
 * uno. El destete no saca a nadie del hato.
 */
export function DesteteDelAnimal({
  animalId,
  puedeAnotar,
}: {
  readonly animalId: string
  readonly puedeAnotar: boolean
}) {
  const destete = useDestete(animalId)
  const [anotando, setAnotando] = useState(false)
  const [corrigiendo, setCorrigiendo] = useState(false)

  return (
    <section className="ficha__seccion">
      <h2 className="ficha__titulo">Destete</h2>
      {destete.isPending ? <p className="campo__ayuda">Trayendo el destete…</p> : null}
      {destete.isError ? (
        <p className="campo__ayuda" role="status">
          No se pudo traer el destete. Vuelve a abrir la ficha.
        </p>
      ) : null}
      {destete.data === undefined ? null : anotando ? (
        <FormularioDeDestete
          animales={[animalId]}
          nombreDelGrupo="esta cría"
          conPeso
          alGuardar={() => {
            setAnotando(false)
          }}
          alCancelar={() => {
            setAnotando(false)
          }}
        />
      ) : (
        <Lectura
          animalId={animalId}
          destete={destete.data.destete}
          puedeAnotar={puedeAnotar}
          corrigiendo={corrigiendo}
          alAnotar={() => {
            setAnotando(true)
          }}
          alCorregir={() => {
            setCorrigiendo(true)
          }}
          alCerrar={() => {
            setCorrigiendo(false)
          }}
        />
      )}
    </section>
  )
}

export function FormularioDeDestete({
  animales,
  nombreDelGrupo,
  conPeso,
  alGuardar,
  alCancelar,
}: {
  readonly animales: readonly string[]
  readonly nombreDelGrupo: string
  readonly conPeso: boolean
  readonly alGuardar: () => void
  readonly alCancelar: () => void
}) {
  const anotar = useAnotarDestete()
  const pendiente = useRef<{ contenido: string; cuerpo: Parameters<typeof anotar.mutate>[0] } | null>(
    null,
  )
  const [precision, setPrecision] = useState<Precision>('')
  const [fecha, setFecha] = useState('')
  const [fechaDelPeso, setFechaDelPeso] = useState('')
  const [nota, setNota] = useState('')
  const [quien, setQuien] = useState('')
  const [kilos, setKilos] = useState('')
  const [calidadElegida, setCalidadElegida] = useState<Calidad>('')
  const [evidenciaId, setEvidenciaId] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const seccion = useRef<HTMLElement>(null)
  useEnfocarAviso(seccion, anotar.isError)

  const faltaPrecision = precision === ''
  const pideFecha = precision === 'exact' || precision === 'approximate'
  const faltaFecha = pideFecha && fecha === ''
  const quierePeso = conPeso && kilos.trim() !== ''
  const kilosRevisados = quierePeso ? revisarKilos(kilos) : { ok: true as const }
  const faltaCalidad = quierePeso && calidadElegida === ''
  const faltaDiaDePeso = quierePeso && precision === 'no_se' && fechaDelPeso === ''
  const sinAnimales = animales.length === 0
  const faltaDatos =
    faltaPrecision ||
    faltaFecha ||
    faltaCalidad ||
    faltaDiaDePeso ||
    !kilosRevisados.ok ||
    sinAnimales

  const guardar = (): void => {
    if (faltaDatos || anotar.isPending || subiendo) {
      return
    }

    const contenido = JSON.stringify({
      precision,
      fecha: pideFecha ? fecha : null,
      nota: nota.trim(),
      quien: quien.trim(),
      kilos: quierePeso ? kilos.trim() : null,
      calidad: quierePeso ? calidadElegida : null,
      fechaDelPeso: quierePeso && precision === 'no_se' ? fechaDelPeso : null,
      evidenciaId: quierePeso ? evidenciaId : null,
      animales: [...animales].sort(),
    })

    enviar(contenido)
  }

  const enviar = (contenido: string): void => {
    if (pendiente.current !== null && pendiente.current.contenido === contenido) {
      anotar.mutate(pendiente.current.cuerpo, { onSuccess: alGuardar })
      return
    }

    const cuerpo = {
      commandId: crypto.randomUUID(),
      precisionFecha: precision as 'exact' | 'approximate' | 'no_se',
      fecha: pideFecha ? fecha : null,
      ...(nota.trim() === '' ? {} : { nota: nota.trim() }),
      ...(quien.trim() === '' ? {} : { reportedBy: quien.trim() }),
      ...(quierePeso && precision === 'no_se' ? { fechaDelPeso } : {}),
      animales: animales.map((animalId) => ({
        animalId,
        desteteId: crypto.randomUUID(),
        ...(quierePeso
          ? {
              peso: {
                id: crypto.randomUUID(),
                kilos: kilos.trim(),
                calidad: calidadElegida as 'measured' | 'observed' | 'declared',
                ...(evidenciaId === null ? {} : { evidenciaId }),
              },
            }
          : {}),
      })),
    }
    pendiente.current = { contenido, cuerpo }
    anotar.mutate(cuerpo, { onSuccess: alGuardar })
  }

  return (
    <section className="mover" ref={seccion}>
      <h2 className="ficha__titulo">Anotar destete · {nombreDelGrupo}</h2>
      <p className="campo__ayuda">
        El destete no saca a la cría del hato. Elige el día: exacto, aproximado o «No sé». No
        viene marcado.
      </p>
      {anotar.isError ? <AvisoDeError error={anotar.error} /> : null}

      <Segmentado
        etiqueta="¿Qué día se destetó?"
        opciones={PRECISION}
        valor={precision}
        alElegir={(valor) => {
          setPrecision(valor as Precision)
        }}
      />
      {pideFecha ? (
        <CampoDeFecha etiqueta="Día del destete" valor={fecha} alCambiar={setFecha} />
      ) : null}
      <CampoDeTexto
        etiqueta="¿Quién lo dijo?"
        valor={quien}
        alCambiar={setQuien}
        maxLength={LARGO_DE_QUIEN}
        ayuda="Si no se anotó, se queda en blanco. No es una cuenta."
      />
      <CampoDeArea
        etiqueta="Nota, si hace falta"
        valor={nota}
        alCambiar={setNota}
        maxLength={LARGO_DE_NOTA}
      />

      {conPeso ? (
        <>
          <CampoDeTexto
            etiqueta="Peso al destete, si se pesó"
            valor={kilos}
            alCambiar={setKilos}
            inputMode="decimal"
            ayuda="En kilos, con punto y hasta 3 decimales. Si no se pesó, déjalo en blanco: no se rellena."
            {...(kilos.trim() !== '' && !kilosRevisados.ok ? { error: kilosRevisados.motivo } : {})}
          />
          {quierePeso ? (
            <>
              <Segmentado
                etiqueta="¿Cómo se obtuvo el peso?"
                opciones={CALIDAD}
                valor={calidadElegida}
                alElegir={(valor) => {
                  setCalidadElegida(valor as Calidad)
                }}
              />
              {precision === 'no_se' ? (
                <CampoDeFecha
                  etiqueta="¿Qué día se pesó?"
                  valor={fechaDelPeso}
                  alCambiar={setFechaDelPeso}
                />
              ) : null}
              <FotoDeLaBascula
                evidenciaId={evidenciaId}
                alCambiar={setEvidenciaId}
                alOcuparse={setSubiendo}
              />
            </>
          ) : null}
        </>
      ) : (
        <p className="campo__ayuda">
          El peso se anota en la ficha de cada cría. Aquí no se copia un solo número a todas.
        </p>
      )}

      <div className="formulario__acciones">
        <BotonPrincipal alTocar={guardar} deshabilitado={faltaDatos || anotar.isPending || subiendo}>
          {anotar.isPending || subiendo ? 'Guardando…' : 'Guardar destete'}
        </BotonPrincipal>
        <BotonSecundario tono="tinta" alTocar={alCancelar} deshabilitado={anotar.isPending}>
          Cancelar
        </BotonSecundario>
      </div>
    </section>
  )
}

function Lectura({
  animalId,
  destete,
  puedeAnotar,
  corrigiendo,
  alAnotar,
  alCorregir,
  alCerrar,
}: {
  readonly animalId: string
  readonly destete: DesteteEnLaFicha | null
  readonly puedeAnotar: boolean
  readonly corrigiendo: boolean
  readonly alAnotar: () => void
  readonly alCorregir: () => void
  readonly alCerrar: () => void
}) {
  if (destete === null) {
    return (
      <>
        <p className="campo__ayuda">Sin destete anotado.</p>
        {puedeAnotar ? (
          <BotonSecundario tono="tinta" alTocar={alAnotar}>
            Anotar destete
          </BotonSecundario>
        ) : (
          <p className="campo__ayuda">Ya salió del hato. El destete, si se anota, no es una salida.</p>
        )}
      </>
    )
  }

  return (
    <>
      <p>{textoDeCuando(destete.fecha, destete.precisionFecha)}</p>
      <p className="campo__ayuda">
        {destete.peso === null
          ? 'Sin peso al destete.'
          : `${kilosLegibles(destete.peso.kilos)}, ${calidad(destete.peso.calidad)}.`}
      </p>
      <FotoVisible evidenciaId={destete.peso?.evidenciaId} />
      <p className="campo__ayuda">{textoDeEdad(destete.edad)}</p>
      <p className="campo__ayuda">
        {destete.reportedBy === null ? 'No se anotó quién lo dijo.' : `Lo dijo ${destete.reportedBy}.`}
      </p>
      {destete.nota === null ? null : <p className="campo__ayuda">{destete.nota}</p>}
      <p className="campo__ayuda">Sigue en el hato, salvo que tenga su propia salida.</p>
      {corrigiendo ? (
        <Correccion animalId={animalId} destete={destete} alCancelar={alCerrar} alGuardar={alCerrar} />
      ) : (
        <button type="button" className="enlace" onClick={alCorregir}>
          Corregir este destete
        </button>
      )}
      {destete.correcciones.length === 0 ? null : (
        <ul className="lista lista--planas">
          {destete.correcciones.map((correccion, indice) => (
            <li key={`${correccion.campo}-${correccion.correctedAt}-${indice}`}>
              <p className="campo__ayuda">
                {campo(correccion.campo)}: antes decía «{textoAnterior(correccion.campo, correccion.valorAnterior)}»
              </p>
              <p className="campo__ayuda">Por qué: {correccion.motivo}</p>
              <p className="campo__ayuda">{instanteLegible(correccion.correctedAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Correccion({
  animalId,
  destete,
  alGuardar,
  alCancelar,
}: {
  readonly animalId: string
  readonly destete: DesteteEnLaFicha
  readonly alGuardar: () => void
  readonly alCancelar: () => void
}) {
  const corregir = useCorregirDestete(destete.id, animalId)
  const comando = useRef<{ contenido: string; commandId: string } | null>(null)
  const [precision, setPrecision] = useState<Precision>(
    destete.precisionFecha === null ? 'no_se' : destete.precisionFecha,
  )
  const [fecha, setFecha] = useState(destete.fecha ?? '')
  const [nota, setNota] = useState(destete.nota ?? '')
  const [quien, setQuien] = useState(destete.reportedBy ?? '')
  const [motivo, setMotivo] = useState('')
  const seccion = useRef<HTMLElement>(null)
  useEnfocarAviso(seccion, corregir.isError)

  const pideFecha = precision === 'exact' || precision === 'approximate'
  const faltaDatos = motivo.trim() === '' || precision === '' || (pideFecha && fecha === '')
  const guardar = (): void => {
    if (faltaDatos || corregir.isPending) {
      return
    }
    const contenido = JSON.stringify({ precision, fecha, nota, quien, motivo: motivo.trim() })
    if (comando.current === null || comando.current.contenido !== contenido) {
      comando.current = { contenido, commandId: crypto.randomUUID() }
    }
    corregir.mutate(
      {
        commandId: comando.current.commandId,
        version: destete.version,
        motivo: motivo.trim(),
        precisionFecha: precision,
        fecha: pideFecha ? fecha : null,
        nota: nota.trim() === '' ? null : nota.trim(),
        reportedBy: quien.trim() === '' ? null : quien.trim(),
      },
      { onSuccess: alGuardar },
    )
  }

  return (
    <section ref={seccion}>
      {corregir.isError ? <AvisoDeError error={corregir.error} /> : null}
      {corregir.isError && esConflictoDeVersion(corregir.error) ? (
        <p className="campo__ayuda">Alguien lo cambió. Vuelve a abrir la ficha.</p>
      ) : null}
      <Segmentado
        etiqueta="Día del destete"
        opciones={PRECISION}
        valor={precision}
        alElegir={(valor) => {
          setPrecision(valor as Precision)
        }}
      />
      {pideFecha ? <CampoDeFecha etiqueta="Día" valor={fecha} alCambiar={setFecha} /> : null}
      <CampoDeTexto etiqueta="¿Quién lo dijo?" valor={quien} alCambiar={setQuien} maxLength={LARGO_DE_QUIEN} />
      <CampoDeArea etiqueta="Nota" valor={nota} alCambiar={setNota} maxLength={LARGO_DE_NOTA} />
      <CampoDeTexto etiqueta="¿Por qué se corrige?" valor={motivo} alCambiar={setMotivo} maxLength={LARGO_DE_NOTA} />
      <div className="formulario__acciones">
        <BotonPrincipal alTocar={guardar} deshabilitado={faltaDatos || corregir.isPending}>
          {corregir.isPending ? 'Guardando…' : 'Guardar corrección'}
        </BotonPrincipal>
        <BotonSecundario tono="tinta" alTocar={alCancelar} deshabilitado={corregir.isPending}>
          Cancelar
        </BotonSecundario>
      </div>
    </section>
  )
}

/** El valor anterior, en palabras del rancho. `null` es que no se había anotado. */
function textoAnterior(campoCorregido: string, valorAnterior: string | null): string {
  if (valorAnterior === null) {
    return 'no se anotó'
  }
  if (campoCorregido === 'fecha') {
    return diaLegible(valorAnterior)
  }
  if (campoCorregido === 'precision') {
    if (valorAnterior === 'exact') {
      return 'Fecha exacta'
    }
    if (valorAnterior === 'approximate') {
      return 'Aproximada'
    }
    if (valorAnterior === 'no_se') {
      return 'No sé'
    }
  }
  return valorAnterior
}

function campo(codigo: string): string {
  switch (codigo) {
    case 'fecha':
      return 'Día'
    case 'precision':
      return 'Precisión del día'
    case 'nota':
      return 'Nota'
    case 'reportedBy':
      return 'Quién lo dijo'
    default:
      return codigo
  }
}
