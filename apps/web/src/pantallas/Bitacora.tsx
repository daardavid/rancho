import { useRef, useState } from 'react'
import type { NotaDeBitacoraConHistoria } from '@rancho/api-contracts'

import { useAnotarBitacora, useCorregirBitacora, useNotasDeBitacora } from '../api/bitacora'
import { usePotreros } from '../api/lugar'
import {
  PRECISIONES_DE_NOTA,
  TIPOS_DE_BITACORA,
  textoDePrecision,
  textoDeTipo,
} from '../dominio/bitacora'
import { diaLegible, instanteLegible } from '../dominio/fechas'
import { irA } from '../ruta'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { CampoDeArea, CampoDeFecha, CampoDeTexto } from '../ui/Campos'
import { Desplegable } from '../ui/Desplegable'
import { Encabezado } from '../ui/Encabezado'
import { FotoDeLaBascula, FotoVisible } from '../ui/FotoDeLaBascula'
import { Mosaicos } from '../ui/Mosaicos'
import { Pildoras } from '../ui/Pildoras'
import { Tarjeta } from '../ui/Tarjeta'

/**
 * Notas con fecha que no son de un animal: lluvia, quema, agua, una cerca.
 *
 * El tipo y si el día es exacto o aproximado empiezan sin elegir. Una fecha
 * aproximada no se guarda como exacta. Quién lo dijo no es un usuario.
 * `OQ-FIRE-001` y `OQ-ENV-001` siguen abiertas: la nota no mide la lluvia ni
 * explica la quema.
 */
export function Bitacora() {
  const notas = useNotasDeBitacora()
  const potreros = usePotreros()
  const [anotando, setAnotando] = useState(false)
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null)

  if (notas.isPending) {
    return (
      <main className="pantalla pantalla--pestana">
        <Cargando que="Trayendo la bitácora…" />
      </main>
    )
  }

  if (notas.isError) {
    return (
      <main className="pantalla pantalla--pestana">
        <AvisoDeError error={notas.error} />
        <BotonPrincipal alTocar={() => void notas.refetch()}>Volver a intentar</BotonPrincipal>
      </main>
    )
  }

  const lista = notas.data.notas
  const listaDePotreros = potreros.data?.potreros

  return (
    <main className="pantalla pantalla--pestana">
      <Encabezado
        etiqueta="MI RANCHO"
        titulo="Bitácora"
        subtitulo={
          lista.length === 0
            ? 'Todavía no hay notas'
            : `${String(lista.length)} ${lista.length === 1 ? 'nota' : 'notas'}`
        }
        alRegresar={() => {
          irA({ nombre: 'inicio' })
        }}
        etiquetaRegresar="Regresar al inicio"
      />

      <p className="campo__ayuda">
        Lo que no es de un animal: lluvia, una quema, el agua, una cerca. No es una nota de
        sanidad y no mide la lluvia.
      </p>

      {anotando ? (
        <Formulario
          alGuardar={() => {
            setAnotando(false)
          }}
          alCancelar={() => {
            setAnotando(false)
          }}
        />
      ) : (
        <BotonPrincipal
          alTocar={() => {
            setCorrigiendo(null)
            setAnotando(true)
          }}
        >
          Anotar en la bitácora
        </BotonPrincipal>
      )}

      {lista.length === 0 ? (
        <p className="inicio__vacio">Cuando pase algo que no es de un animal, se anota aquí.</p>
      ) : (
        <ul className="lista lista--planas">
          {lista.map((nota) => (
            <li key={nota.id}>
              <Tarjeta>
                <Nota
                  nota={nota}
                  potreros={listaDePotreros}
                  corrigiendo={corrigiendo === nota.id}
                  alCorregir={setCorrigiendo}
                />
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

function Nota({
  nota,
  potreros,
  corrigiendo,
  alCorregir,
}: {
  readonly nota: NotaDeBitacoraConHistoria
  readonly potreros: readonly PotreroConNombre[] | undefined
  readonly corrigiendo: boolean
  readonly alCorregir: (id: string | null) => void
}) {
  const dia = diaLegible(nota.fecha)
  const precision = textoDePrecision(nota.precision)
  const nombreDelPotrero =
    nota.potreroId === null ? null : nombreDePotrero(potreros, nota.potreroId)
  return (
    <article>
      <p>
        <strong>{textoDeTipo(nota.tipo)}</strong>
        {' · '}
        {dia}
        {nota.precision === 'approximate' ? ', aproximada' : `, ${precision}`}
      </p>
      <p>{nota.texto}</p>
      {nombreDelPotrero === null ? null : (
        <p className="campo__ayuda">Potrero: {nombreDelPotrero}</p>
      )}
      {nota.reportedBy === null ? null : (
        <p className="campo__ayuda">Lo dijo {nota.reportedBy}</p>
      )}
      <FotoVisible evidenciaId={nota.evidenciaId} alt="Foto de la nota" />
      {corrigiendo ? (
        <Correccion
          nota={nota}
          alCerrar={() => {
            alCorregir(null)
          }}
        />
      ) : (
        <button
          type="button"
          className="enlace"
          onClick={() => {
            alCorregir(nota.id)
          }}
        >
          Corregir esta nota
        </button>
      )}
      {nota.correcciones.length === 0 ? null : (
        <ul className="lista lista--planas">
          {nota.correcciones.map((correccion, indice) => (
            <li key={`${correccion.campo}-${correccion.correctedAt}-${String(indice)}`}>
              <p className="correccion__campo">
                {`${campoDeBitacora(correccion.campo)}: antes decía «${textoAnteriorDeBitacora(correccion.campo, correccion.valorAnterior, potreros)}»`}
              </p>
              <p className="correccion__motivo">Por qué: {correccion.motivo}</p>
              <p className="correccion__cuando">{instanteLegible(correccion.correctedAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function Formulario({
  alGuardar,
  alCancelar,
}: {
  readonly alGuardar: () => void
  readonly alCancelar: () => void
}) {
  const anotar = useAnotarBitacora()
  const potreros = usePotreros()
  /**
   * Mismo contenido ⇒ mismo comando y mismo id de nota. Si el dato cambia
   * antes de reintentar, se acuñan otros: el servidor no acepta el mismo
   * comando con otro cuerpo.
   */
  const alta = useRef<{ contenido: string; commandId: string; id: string } | null>(null)
  const [tipo, setTipo] = useState('')
  const [precision, setPrecision] = useState('')
  const [fecha, setFecha] = useState('')
  const [texto, setTexto] = useState('')
  const [quien, setQuien] = useState('')
  const [potreroId, setPotreroId] = useState('')
  const [evidenciaId, setEvidenciaId] = useState<string | null>(null)
  const [fotoOcupada, setFotoOcupada] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  async function guardar() {
    if (
      tipo !== 'lluvia' &&
      tipo !== 'quema' &&
      tipo !== 'agua' &&
      tipo !== 'cerca' &&
      tipo !== 'otro'
    ) {
      setAviso('Elige de qué es la nota. No hay un tipo puesto de antemano.')
      return
    }
    if (precision !== 'exact' && precision !== 'approximate') {
      setAviso('Elige si la fecha es exacta o aproximada.')
      return
    }
    if (fecha === '') {
      setAviso('Elige el día.')
      return
    }
    if (texto.trim() === '') {
      setAviso('Escribe qué pasó.')
      return
    }
    const tipoElegido = tipo
    const precisionElegida = precision
    setAviso(null)
    const cuerpo = {
      tipo: tipoElegido,
      precision: precisionElegida,
      fecha,
      texto: texto.trim(),
      reportedBy: quien.trim() === '' ? null : quien.trim(),
      potreroId: potreroId === '' ? null : potreroId,
      evidenciaId,
    }
    const contenido = JSON.stringify(cuerpo)
    if (alta.current === null || alta.current.contenido !== contenido) {
      alta.current = {
        contenido,
        commandId: crypto.randomUUID(),
        id: crypto.randomUUID(),
      }
    }
    try {
      await anotar.mutateAsync({
        commandId: alta.current.commandId,
        id: alta.current.id,
        tipo: tipoElegido,
        precision: precisionElegida,
        fecha,
        texto: cuerpo.texto,
        reportedBy: cuerpo.reportedBy,
        potreroId: cuerpo.potreroId,
        evidenciaId,
      })
      alta.current = null
      alGuardar()
    } catch {
      // El aviso de la mutación se pinta abajo. El comando se queda para el reintento.
    }
  }

  const listaDePotreros = potreros.data?.potreros ?? []

  return (
    <form
      className="formulario"
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar()
      }}
    >
      <Mosaicos
        etiqueta="De qué es"
        opciones={TIPOS_DE_BITACORA.map((opcion) => ({ valor: opcion.codigo, texto: opcion.texto }))}
        valor={tipo}
        alElegir={setTipo}
      />
      <CampoDeArea
        etiqueta="Qué pasó"
        valor={texto}
        alCambiar={setTexto}
        ayuda="Con las palabras del rancho."
      />
      <Pildoras
        etiqueta="La fecha"
        opciones={PRECISIONES_DE_NOTA.map((opcion) => ({
          valor: opcion.codigo,
          texto: opcion.texto,
        }))}
        valor={precision}
        alElegir={setPrecision}
      />
      <CampoDeFecha
        etiqueta={precision === 'approximate' ? 'Día aproximado' : 'Día'}
        valor={fecha}
        alCambiar={setFecha}
        ayuda="Si es aproximada, no se guarda como exacta."
      />
      <CampoDeTexto
        etiqueta="Quién lo dijo"
        valor={quien}
        alCambiar={setQuien}
        ayuda="Si no se sabe, déjalo vacío. No es un usuario de la app."
      />
      <label className="campo">
        <span className="campo__etiqueta">Potrero</span>
        <select
          className="campo__entrada"
          value={potreroId}
          onChange={(evento) => {
            setPotreroId(evento.target.value)
          }}
        >
          <option value="">No es de un potrero</option>
          {listaDePotreros.map((potrero) => (
            <option key={potrero.id} value={potrero.id}>
              {potrero.nombre ?? 'Sin nombre'}
            </option>
          ))}
        </select>
      </label>
      <Desplegable titulo="Foto" resumen="opcional">
        <FotoDeLaBascula
          evidenciaId={evidenciaId}
          alCambiar={setEvidenciaId}
          alOcuparse={setFotoOcupada}
          etiqueta="Foto"
          ayuda="Opcional. No convierte la nota en un dato medido."
          alt="Foto de la nota"
          ayudaAlQuitar="Si la quitas, deja de verse en la nota. La foto no se borra."
        />
      </Desplegable>
      {aviso === null ? null : (
        <p className="aviso" role="alert">
          {aviso}
        </p>
      )}
      {anotar.isError ? <AvisoDeError error={anotar.error} /> : null}
      <BotonPrincipal tipo="submit" deshabilitado={anotar.isPending || fotoOcupada}>
        {fotoOcupada ? 'Esperando la foto…' : anotar.isPending ? 'Guardando…' : 'Guardar nota'}
      </BotonPrincipal>
      <BotonSecundario alTocar={alCancelar}>Cancelar</BotonSecundario>
    </form>
  )
}

function Correccion({
  nota,
  alCerrar,
}: {
  readonly nota: NotaDeBitacoraConHistoria
  readonly alCerrar: () => void
}) {
  const corregir = useCorregirBitacora(nota.id)
  /** Mismo contenido ⇒ mismo comando. Si se cambia un dato, el reintento es otro. */
  const envio = useRef<{ contenido: string; commandId: string } | null>(null)
  const [tipo, setTipo] = useState<string>(nota.tipo)
  const [precision, setPrecision] = useState<string>(nota.precision)
  const [fecha, setFecha] = useState(nota.fecha)
  const [texto, setTexto] = useState(nota.texto)
  const [motivo, setMotivo] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  async function guardar() {
    if (motivo.trim() === '') {
      setAviso('Escribe por qué se corrige.')
      return
    }
    if (
      tipo !== 'lluvia' &&
      tipo !== 'quema' &&
      tipo !== 'agua' &&
      tipo !== 'cerca' &&
      tipo !== 'otro'
    ) {
      setAviso('Elige de qué es la nota.')
      return
    }
    if (precision !== 'exact' && precision !== 'approximate') {
      setAviso('Elige si la fecha es exacta o aproximada.')
      return
    }
    if (fecha === '' || texto.trim() === '') {
      setAviso('El día y el texto no pueden quedar vacíos.')
      return
    }
    const tipoElegido = tipo
    const precisionElegida = precision
    const textoNuevo = texto.trim()
    const hayCambio =
      tipoElegido !== nota.tipo ||
      precisionElegida !== nota.precision ||
      fecha !== nota.fecha ||
      textoNuevo !== nota.texto
    if (!hayCambio) {
      setAviso('Cambia al menos un dato, o cancela.')
      return
    }
    setAviso(null)
    const cuerpo = {
      version: nota.version,
      motivo: motivo.trim(),
      ...(tipoElegido === nota.tipo ? {} : { tipo: tipoElegido }),
      ...(precisionElegida === nota.precision ? {} : { precision: precisionElegida }),
      ...(fecha === nota.fecha ? {} : { fecha }),
      ...(textoNuevo === nota.texto ? {} : { texto: textoNuevo }),
    }
    const contenido = JSON.stringify(cuerpo)
    if (envio.current === null || envio.current.contenido !== contenido) {
      envio.current = { contenido, commandId: crypto.randomUUID() }
    }
    try {
      await corregir.mutateAsync({
        commandId: envio.current.commandId,
        version: nota.version,
        motivo: cuerpo.motivo,
        ...(tipoElegido === nota.tipo ? {} : { tipo: tipoElegido }),
        ...(precisionElegida === nota.precision ? {} : { precision: precisionElegida }),
        ...(fecha === nota.fecha ? {} : { fecha }),
        ...(textoNuevo === nota.texto ? {} : { texto: textoNuevo }),
      })
      envio.current = null
      alCerrar()
    } catch {
      // El aviso de la mutación se pinta abajo. El comando se queda para el reintento.
    }
  }

  return (
    <form
      className="formulario"
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar()
      }}
    >
      <Mosaicos
        etiqueta="De qué es"
        opciones={TIPOS_DE_BITACORA.map((opcion) => ({ valor: opcion.codigo, texto: opcion.texto }))}
        valor={tipo}
        alElegir={setTipo}
      />
      <CampoDeArea etiqueta="Qué pasó" valor={texto} alCambiar={setTexto} />
      <Pildoras
        etiqueta="La fecha"
        opciones={PRECISIONES_DE_NOTA.map((opcion) => ({
          valor: opcion.codigo,
          texto: opcion.texto,
        }))}
        valor={precision}
        alElegir={setPrecision}
      />
      <CampoDeFecha
        etiqueta={precision === 'approximate' ? 'Día aproximado' : 'Día'}
        valor={fecha}
        alCambiar={setFecha}
      />
      <CampoDeTexto
        etiqueta="Por qué se corrige"
        valor={motivo}
        alCambiar={setMotivo}
        ayuda="Lo que estaba mal se queda en la historia."
      />
      {aviso === null ? null : (
        <p className="aviso" role="alert">
          {aviso}
        </p>
      )}
      {corregir.isError ? <AvisoDeError error={corregir.error} /> : null}
      <BotonPrincipal tipo="submit" deshabilitado={corregir.isPending}>
        {corregir.isPending ? 'Guardando…' : 'Guardar corrección'}
      </BotonPrincipal>
      <BotonSecundario alTocar={alCerrar}>Cancelar</BotonSecundario>
    </form>
  )
}

type PotreroConNombre = { readonly id: string; readonly nombre: string | null }

/** El nombre que el rancho le dice al potrero. Sin la lista todavía, no se inventa. */
function nombreDePotrero(
  potreros: readonly PotreroConNombre[] | undefined,
  id: string,
): string | null {
  if (potreros === undefined) {
    return null
  }
  const potrero = potreros.find((item) => item.id === id)
  if (potrero === undefined || potrero.nombre === null) {
    return 'Sin nombre'
  }
  return potrero.nombre
}

/** El campo de la historia, en palabras del rancho. El código no se muestra. */
function campoDeBitacora(campo: string): string {
  switch (campo) {
    case 'tipo':
      return 'Tipo'
    case 'texto':
      return 'Qué pasó'
    case 'fecha':
      return 'Día'
    case 'precision':
      return 'Precisión'
    case 'potrero':
      return 'Potrero'
    case 'reportedBy':
      return 'Quién lo dijo'
    case 'evidencia':
      return 'Foto'
    default:
      return campo
  }
}

/** El valor anterior, sin códigos ni el id de una foto o de un potrero. */
function textoAnteriorDeBitacora(
  campo: string,
  valorAnterior: string | null,
  potreros: readonly PotreroConNombre[] | undefined,
): string {
  if (valorAnterior === null) {
    return 'no había'
  }
  if (campo === 'tipo') {
    return textoDeTipo(valorAnterior)
  }
  if (campo === 'precision') {
    return textoDePrecision(valorAnterior)
  }
  if (campo === 'fecha') {
    return diaLegible(valorAnterior)
  }
  if (campo === 'potrero') {
    return nombreDePotrero(potreros, valorAnterior) ?? 'Sin nombre'
  }
  if (campo === 'evidencia') {
    return 'tenía una foto'
  }
  return valorAnterior
}
