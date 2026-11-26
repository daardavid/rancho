import { useRef, useState } from 'react'
import type { PendienteConHistoria, SujetoDePendiente } from '@rancho/api-contracts'

import { useHato } from '../api/hato'
import {
  useAnotarPendiente,
  useCambiarEstadoDePendiente,
  usePendientes,
} from '../api/bitacora'
import { useSesion } from '../api/sesion'
import { usePotreros } from '../api/lugar'
import { nombreVisible } from '../dominio/animal'
import { textoDeEstado } from '../dominio/bitacora'
import { diaLegible, instanteLegible } from '../dominio/fechas'
import { irA, rutaAHash } from '../ruta'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { CampoDeFecha, CampoDeTexto } from '../ui/Campos'
import { Encabezado } from '../ui/Encabezado'
import { Pildoras } from '../ui/Pildoras'
import { Tarjeta } from '../ui/Tarjeta'

/**
 * Pendientes que el dueño se pone a sí mismo.
 *
 * Marcar hecho no anota la vacuna ni ningún otro hecho: si fue eso, el atajo
 * lleva a sanidad y la nota se escribe ahí, aparte. No hay aviso fuera de la
 * app ni un pendiente que la app invente.
 */
export function Pendientes() {
  const pendientes = usePendientes()
  const [anotando, setAnotando] = useState(false)

  if (pendientes.isPending) {
    return (
      <main className="pantalla pantalla--pestana">
        <Cargando que="Trayendo los pendientes…" />
      </main>
    )
  }

  if (pendientes.isError) {
    return (
      <main className="pantalla pantalla--pestana">
        <AvisoDeError error={pendientes.error} />
        <BotonPrincipal alTocar={() => void pendientes.refetch()}>Volver a intentar</BotonPrincipal>
      </main>
    )
  }

  const lista = pendientes.data.pendientes
  const porHacer = lista.filter((pendiente) => pendiente.estado === 'pendiente')
  const otros = lista.filter((pendiente) => pendiente.estado !== 'pendiente')

  return (
    <main className="pantalla pantalla--pestana">
      <Encabezado
        etiqueta="MI RANCHO"
        titulo="Pendientes"
        subtitulo={
          porHacer.length === 0
            ? 'Nada pendiente'
            : porHacer.length === 1
              ? '1 por hacer'
              : `${String(porHacer.length)} por hacer`
        }
        alRegresar={() => {
          irA({ nombre: 'inicio' })
        }}
        etiquetaRegresar="Regresar al inicio"
      />

      <p className="campo__ayuda">
        Lo que te pones tú, con el día en que toca. Marcarlo hecho no anota la vacuna: si fue
        eso, se anota en sanidad.
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
            setAnotando(true)
          }}
        >
          Anotar un pendiente
        </BotonPrincipal>
      )}

      <section aria-label="Por hacer">
        <h2 className="ficha__titulo">Por hacer</h2>
        {porHacer.length === 0 ? (
          <p className="inicio__vacio">No hay pendientes abiertos.</p>
        ) : (
          <ul className="lista lista--planas">
            {porHacer.map((pendiente) => (
              <li key={pendiente.id}>
                <Tarjeta>
                  <FichaDePendiente pendiente={pendiente} />
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>

      {otros.length === 0 ? null : (
        <section aria-label="Ya no están pendientes">
          <h2 className="ficha__titulo">Ya no están pendientes</h2>
          <ul className="lista lista--planas">
            {otros.map((pendiente) => (
              <li key={pendiente.id}>
                <Tarjeta>
                  <FichaDePendiente pendiente={pendiente} />
                </Tarjeta>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function FichaDePendiente({ pendiente }: { readonly pendiente: PendienteConHistoria }) {
  const sesion = useSesion()
  const cambiar = useCambiarEstadoDePendiente(pendiente.id)
  /**
   * Mismo estado ⇒ mismo comando. «Ya no aplica» después de un «Hecho» que
   * falló es otro envío: el servidor rechaza el mismo comando con otro cuerpo.
   */
  const envio = useRef<{ contenido: string; commandId: string } | null>(null)
  const quien =
    pendiente.estadoPor === sesion.data?.cuentaId ? 'Tú' : 'Otra cuenta de este rancho'
  const atajo = atajoDeSanidad(pendiente.sujeto)

  async function marcar(estado: 'hecho' | 'ya_no_aplica' | 'pendiente') {
    const contenido = JSON.stringify({ version: pendiente.version, estado })
    if (envio.current === null || envio.current.contenido !== contenido) {
      envio.current = { contenido, commandId: crypto.randomUUID() }
    }
    try {
      await cambiar.mutateAsync({
        commandId: envio.current.commandId,
        version: pendiente.version,
        estado,
      })
      envio.current = null
    } catch {
      // El aviso de la mutación se pinta abajo. El comando se queda para el reintento.
    }
  }

  return (
    <article>
      <p>
        <strong>{pendiente.texto}</strong>
      </p>
      <p className="campo__ayuda">
        {textoDeEstado(pendiente.estado)} · {diaLegible(pendiente.fecha)} · {quien},{' '}
        {instanteLegible(pendiente.estadoEn)}
      </p>
      <p className="campo__ayuda">{textoDeSujeto(pendiente.sujeto)}</p>
      {pendiente.estado === 'hecho' ? (
        <p className="campo__ayuda">
          Marcarlo hecho no anota la vacuna ni el medicamento.{' '}
          <a href={atajo}>Si fue eso, anótalo en sanidad</a>.
        </p>
      ) : null}
      {cambiar.isError ? <AvisoDeError error={cambiar.error} /> : null}
      <div className="formulario">
        {pendiente.estado === 'pendiente' ? (
          <>
            <BotonPrincipal
              deshabilitado={cambiar.isPending}
              alTocar={() => {
                void marcar('hecho')
              }}
            >
              Hecho
            </BotonPrincipal>
            <BotonSecundario
              deshabilitado={cambiar.isPending}
              alTocar={() => {
                void marcar('ya_no_aplica')
              }}
            >
              Ya no aplica
            </BotonSecundario>
          </>
        ) : (
          <BotonSecundario
            deshabilitado={cambiar.isPending}
            alTocar={() => {
              void marcar('pendiente')
            }}
          >
            Volver a pendiente
          </BotonSecundario>
        )}
      </div>
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
  const anotar = useAnotarPendiente()
  const hato = useHato()
  const potreros = usePotreros()
  /**
   * Mismo contenido ⇒ mismo comando y mismo id. Si se cambia el texto, el día
   * o de quién es, el reintento lleva otro comando.
   */
  const alta = useRef<{ contenido: string; commandId: string; id: string } | null>(null)
  const [texto, setTexto] = useState('')
  const [fecha, setFecha] = useState('')
  const [clase, setClase] = useState<'ninguno' | 'animal' | 'grupo' | 'potrero'>('ninguno')
  const [animalId, setAnimalId] = useState('')
  const [grupo, setGrupo] = useState<readonly string[]>([])
  const [potreroId, setPotreroId] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  const animales = hato.data?.animales ?? []

  async function guardar() {
    if (texto.trim() === '') {
      setAviso('Escribe el pendiente.')
      return
    }
    if (fecha === '') {
      setAviso('Elige el día en que toca.')
      return
    }
    const sujeto = sujetoDe(clase, animalId, grupo, potreroId)
    if (sujeto === null) {
      setAviso(
        clase === 'grupo'
          ? 'Un grupo son dos o más animales. Si es uno solo, elige «Un animal».'
          : 'Elige de quién es, o déjalo en «No es de un animal ni de un potrero».',
      )
      return
    }
    setAviso(null)
    const cuerpo = { texto: texto.trim(), fecha, sujeto }
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
        ...cuerpo,
      })
      alta.current = null
      alGuardar()
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
      <CampoDeTexto etiqueta="Qué hay que hacer" valor={texto} alCambiar={setTexto} />
      <CampoDeFecha
        etiqueta="Día en que toca"
        valor={fecha}
        alCambiar={setFecha}
        ayuda="Ese día, y los que ya pasaron, aparecen en Inicio mientras siga pendiente."
      />
      <Pildoras
        etiqueta="De quién es"
        opciones={[
          { valor: 'ninguno', texto: 'No es de un animal ni de un potrero' },
          { valor: 'animal', texto: 'Un animal' },
          { valor: 'grupo', texto: 'Un grupo' },
          { valor: 'potrero', texto: 'Un potrero' },
        ]}
        valor={clase}
        alElegir={(valor) => {
          if (valor === 'ninguno' || valor === 'animal' || valor === 'grupo' || valor === 'potrero') {
            setClase(valor)
          }
        }}
      />
      {clase === 'animal' ? (
        <label className="campo">
          <span className="campo__etiqueta">Animal</span>
          <select
            className="campo__entrada"
            value={animalId}
            onChange={(evento) => {
              setAnimalId(evento.target.value)
            }}
          >
            <option value="">Elige un animal</option>
            {animales.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {nombreVisible(animal)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {clase === 'grupo' ? (
        <div className="ui-pildoras" role="group" aria-label="Animales del grupo">
          {animales.map((animal) => {
            const activo = grupo.includes(animal.id)
            return (
              <button
                key={animal.id}
                type="button"
                className={activo ? 'ui-pildora ui-pildora--activa' : 'ui-pildora'}
                aria-pressed={activo}
                onClick={() => {
                  setGrupo(
                    activo ? grupo.filter((id) => id !== animal.id) : [...grupo, animal.id],
                  )
                }}
              >
                {nombreVisible(animal)}
              </button>
            )
          })}
        </div>
      ) : null}
      {clase === 'potrero' ? (
        <label className="campo">
          <span className="campo__etiqueta">Potrero</span>
          <select
            className="campo__entrada"
            value={potreroId}
            onChange={(evento) => {
              setPotreroId(evento.target.value)
            }}
          >
            <option value="">Elige un potrero</option>
            {(potreros.data?.potreros ?? []).map((potrero) => (
              <option key={potrero.id} value={potrero.id}>
                {potrero.nombre ?? 'Sin nombre'}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {aviso === null ? null : (
        <p className="aviso" role="alert">
          {aviso}
        </p>
      )}
      {anotar.isError ? <AvisoDeError error={anotar.error} /> : null}
      <BotonPrincipal tipo="submit" deshabilitado={anotar.isPending}>
        {anotar.isPending ? 'Guardando…' : 'Guardar pendiente'}
      </BotonPrincipal>
      <BotonSecundario alTocar={alCancelar}>Cancelar</BotonSecundario>
    </form>
  )
}

function sujetoDe(
  clase: 'ninguno' | 'animal' | 'grupo' | 'potrero',
  animalId: string,
  grupo: readonly string[],
  potreroId: string,
): SujetoDePendiente | null {
  if (clase === 'ninguno') {
    return { clase: 'ninguno' }
  }
  if (clase === 'animal') {
    return animalId === '' ? null : { clase: 'animal', animalId }
  }
  if (clase === 'potrero') {
    return potreroId === '' ? null : { clase: 'potrero', potreroId }
  }
  if (grupo.length < 2) {
    return null
  }
  return { clase: 'grupo', animalIds: [...grupo] }
}

function textoDeSujeto(sujeto: SujetoDePendiente): string {
  switch (sujeto.clase) {
    case 'ninguno':
      return 'No es de un animal ni de un potrero.'
    case 'animal':
      return 'De un animal.'
    case 'grupo':
      return `De un grupo de ${String(sujeto.animalIds.length)} animales.`
    case 'potrero':
      return 'De un potrero.'
  }
}

function atajoDeSanidad(sujeto: SujetoDePendiente): string {
  if (sujeto.clase === 'animal') {
    return rutaAHash({ nombre: 'ficha', animalId: sujeto.animalId })
  }
  return rutaAHash({ nombre: 'hato', modo: 'sanidad' })
}
