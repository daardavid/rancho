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
  const [anotando, setAnotando] = useState(false)
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null)

  if (notas.isPending) {
    return (
      <main className="pantalla">
        <Cargando que="Trayendo la bitácora…" />
      </main>
    )
  }

  if (notas.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={notas.error} />
        <BotonPrincipal alTocar={() => void notas.refetch()}>Volver a intentar</BotonPrincipal>
      </main>
    )
  }

  const lista = notas.data.notas

  return (
    <main className="pantalla">
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
        <ul className="inicio__lista">
          {lista.map((nota) => (
            <li key={nota.id}>
              <Nota nota={nota} corrigiendo={corrigiendo === nota.id} alCorregir={setCorrigiendo} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

function Nota({
  nota,
  corrigiendo,
  alCorregir,
}: {
  readonly nota: NotaDeBitacoraConHistoria
  readonly corrigiendo: boolean
  readonly alCorregir: (id: string | null) => void
}) {
  const dia = diaLegible(nota.fecha)
  const precision = textoDePrecision(nota.precision)
  return (
    <article>
      <p>
        <strong>{textoDeTipo(nota.tipo)}</strong>
        {' · '}
        {dia}
        {nota.precision === 'approximate' ? ', aproximada' : `, ${precision}`}
      </p>
      <p>{nota.texto}</p>
      {nota.reportedBy === null ? null : <p className="inicio__meta">Lo dijo {nota.reportedBy}</p>}
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
                Antes, {correccion.campo}:{' '}
                {correccion.valorAnterior === null ? 'no había' : `«${correccion.valorAnterior}»`}
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
  const comando = useRef(crypto.randomUUID())
  const notaId = useRef(crypto.randomUUID())
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
    setAviso(null)
    try {
      await anotar.mutateAsync({
        commandId: comando.current,
        id: notaId.current,
        tipo,
        precision,
        fecha,
        texto: texto.trim(),
        ...(quien.trim() === '' ? { reportedBy: null } : { reportedBy: quien.trim() }),
        ...(potreroId === '' ? { potreroId: null } : { potreroId }),
        ...(evidenciaId === null ? { evidenciaId: null } : { evidenciaId }),
      })
      comando.current = crypto.randomUUID()
      notaId.current = crypto.randomUUID()
      alGuardar()
    } catch {
      // El aviso de la mutación se pinta abajo.
    }
  }

  const listaDePotreros = potreros.data?.potreros ?? []

  return (
    <form
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
  const comando = useRef(crypto.randomUUID())
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
    const textoNuevo = texto.trim()
    const hayCambio =
      tipo !== nota.tipo ||
      precision !== nota.precision ||
      fecha !== nota.fecha ||
      textoNuevo !== nota.texto
    if (!hayCambio) {
      setAviso('Cambia al menos un dato, o cancela.')
      return
    }
    setAviso(null)
    try {
      await corregir.mutateAsync({
        commandId: comando.current,
        version: nota.version,
        motivo: motivo.trim(),
        ...(tipo === nota.tipo ? {} : { tipo }),
        ...(precision === nota.precision ? {} : { precision }),
        ...(fecha === nota.fecha ? {} : { fecha }),
        ...(textoNuevo === nota.texto ? {} : { texto: textoNuevo }),
      })
      alCerrar()
    } catch {
      // El aviso de la mutación se pinta abajo.
    }
  }

  return (
    <form
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
