import { useRef, useState } from 'react'

import { usePotreros, useRegistrarPotrero, useCorregirPotrero } from '../api/lugar'
import { esConflictoDeVersion } from '../dominio/mensajes'
import { irA } from '../ruta'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { CampoDeArea, CampoDeTexto } from '../ui/Campos'
import { Desplegable } from '../ui/Desplegable'
import { Encabezado } from '../ui/Encabezado'
import { Etiqueta } from '../ui/Etiqueta'
import { IconoMas } from '../ui/iconos'
import { Tarjeta } from '../ui/Tarjeta'

const LARGO_DEL_NOMBRE = 200

/**
 * Los potreros del rancho y cuántos animales se esperan en cada uno.
 *
 * Un potrero es una referencia: un nombre que el rancho usa. No hay hectáreas,
 * carga animal, agua ni mapa, y la pantalla no dice que los potreros cubran el
 * rancho: solo dice en cuál se espera a cuánta gente del hato.
 *
 * «Sin lugar» y «No sé» son dos huecos distintos y se muestran aparte: uno es
 * un animal que nunca se movió en la app; el otro, uno que sí se movió y el
 * rancho no sabe dónde está.
 */
export function Potreros() {
  const potreros = usePotreros()
  const [creando, setCreando] = useState(false)
  const [renombrando, setRenombrando] = useState<string | null>(null)

  if (potreros.isPending) {
    return (
      <main className="pantalla">
        <Cargando que="Trayendo los potreros…" />
      </main>
    )
  }

  if (potreros.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={potreros.error} />
        <BotonPrincipal alTocar={() => void potreros.refetch()}>Volver a intentar</BotonPrincipal>
      </main>
    )
  }

  const lista = potreros.data.potreros
  const sinLugar = potreros.data.sinAsignacion
  const desconocidos = potreros.data.desconocidos

  return (
    <main className="pantalla pantalla--hato">
      <Encabezado
        etiqueta="MI RANCHO"
        titulo="Potreros"
        subtitulo={
          lista.length === 0
            ? 'Todavía no hay potreros anotados'
            : `${String(lista.length)} ${lista.length === 1 ? 'potrero' : 'potreros'}`
        }
        alRegresar={() => {
          irA({ nombre: 'hato' })
        }}
        etiquetaRegresar="Regresar al hato"
        acciones={
          // Una sola acción por pantalla: en la lista vacía la invitación es la
          // tarjeta, y el «+» aparece cuando ya hay potreros que agregar.
          lista.length === 0
            ? []
            : [
                {
                  etiqueta: 'Agregar un potrero',
                  icono: <IconoMas />,
                  alTocar: () => {
                    setRenombrando(null)
                    setCreando(!creando)
                  },
                  destacado: true,
                },
              ]
        }
      />

      <p className="campo__ayuda">
        Aquí se anota dónde se espera a cada animal. No es un mapa ni dice cuántas hectáreas
        tiene cada potrero.
      </p>

      {creando ? (
        <section className="tarjeta-seccion">
          <h2 className="ficha__titulo">Nuevo potrero</h2>
          <FormularioDePotrero
            alCancelar={() => {
              setCreando(false)
            }}
            alRecargar={() => {
              setCreando(false)
              void potreros.refetch()
            }}
            alGuardar={() => {
              setCreando(false)
              void potreros.refetch()
            }}
          />
        </section>
      ) : null}

      {lista.length === 0 ? (
        <Tarjeta>
          <h2 className="vacio__titulo">Empieza con un potrero</h2>
          <p className="vacio__texto">
            Con el nombre que le dice el rancho basta. Si todavía no tiene nombre, se puede anotar
            sin él y ponerle nombre después.
          </p>
          {creando ? null : (
            <BotonPrincipal
              alTocar={() => {
                setCreando(true)
              }}
            >
              Agregar el primer potrero
            </BotonPrincipal>
          )}
        </Tarjeta>
      ) : (
        <ul className="hato__lista">
          {lista.map((potrero) => (
            <li key={potrero.id}>
              <Tarjeta>
                <div className="potrero__fila">
                  <div className="potrero__texto">
                    <p className="potrero__nombre">{potrero.nombre ?? 'Sin nombre'}</p>
                    <p className="potrero__detalle">{textoDeEsperados(potrero.esperados)}</p>
                    {potrero.nota === null ? null : (
                      <p className="potrero__nota">{potrero.nota}</p>
                    )}
                  </div>
                  <Etiqueta tono={potrero.esperados === 0 ? 'sinDatos' : 'bien'}>
                    {String(potrero.esperados)}
                  </Etiqueta>
                </div>
                <div className="potrero__acciones">
                  <button
                    type="button"
                    className="enlace"
                    onClick={() => {
                      setCreando(false)
                      setRenombrando(renombrando === potrero.id ? null : potrero.id)
                    }}
                  >
                    {renombrando === potrero.id ? 'Cerrar' : 'Cambiar el nombre o la nota'}
                  </button>
                </div>
                {renombrando === potrero.id ? (
                  <FormularioDePotrero
                    potrero={potrero}
                    alCancelar={() => {
                      setRenombrando(null)
                    }}
                    alRecargar={() => {
                      setRenombrando(null)
                      void potreros.refetch()
                    }}
                    alGuardar={() => {
                      setRenombrando(null)
                      void potreros.refetch()
                    }}
                  />
                ) : null}
                {potrero.correcciones.length === 0 ? null : (
                  <Desplegable
                    titulo="Cómo se llamaba"
                    resumen={
                      potrero.correcciones.length === 1
                        ? '1 cambio'
                        : `${String(potrero.correcciones.length)} cambios`
                    }
                  >
                    <ul className="lista lista--planas">
                      {potrero.correcciones.map((correccion, indice) => (
                        <li key={`${correccion.campo}-${correccion.correctedAt}-${indice}`} className="correccion">
                          <p className="correccion__campo">
                            {correccion.campo === 'nombre' ? 'Nombre' : 'Nota'}: antes decía «
                            {correccion.valorAnterior ?? 'sin dato'}»
                          </p>
                          <p className="correccion__motivo">Por qué: {correccion.motivo}</p>
                        </li>
                      ))}
                    </ul>
                  </Desplegable>
                )}
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}

      <section className="ficha__seccion">
        <h2 className="ficha__titulo">Quiénes no tienen lugar</h2>
        <ul className="lista lista--planas">
          <li className="potrero__hueco">
            <span className="potrero__nombre">
              {sinLugar === 0
                ? 'Todos los animales activos ya se movieron alguna vez'
                : textoDeSinLugar(sinLugar)}
            </span>
            {sinLugar === 0 ? null : (
              <span className="campo__ayuda">
                Nunca se les anotó un potrero. En el hato se pueden elegir y mover.
              </span>
            )}
          </li>
          <li className="potrero__hueco">
            <span className="potrero__nombre">
              {desconocidos === 0
                ? 'Nadie está con lugar desconocido'
                : textoDeDesconocidos(desconocidos)}
            </span>
            {desconocidos === 0 ? null : (
              <span className="campo__ayuda">
                Se movieron y se anotó «No sé»: no se sabe dónde se les espera.
              </span>
            )}
          </li>
        </ul>
        <BotonSecundario
          tono="tinta"
          alTocar={() => {
            irA({ nombre: 'hato' })
          }}
        >
          Mover animales desde el hato
        </BotonSecundario>
      </section>
    </main>
  )
}

type PotreroEnPantalla = {
  readonly id: string
  readonly nombre: string | null
  readonly nota: string | null
  readonly version: number
}

/**
 * Crear o renombrar. Es el mismo formulario porque es el mismo dato: el nombre
 * que el rancho usa. Renombrar guarda el anterior en la historia.
 *
 * El `commandId` y el `id` del potrero nuevo se conservan entre intentos
 * mientras el contenido no cambie: si la red se cae después de que la API
 * guardó, el reintento es el mismo comando y el servidor devuelve el potrero
 * guardado en vez de crear otro. Si se renombra y alguien más ya cambió el
 * potrero, la API responde `version_conflict` y aquí se explica y se ofrece
 * recargar la lista (UX-17), como en la corrección de la ficha.
 */
function FormularioDePotrero({
  potrero,
  alGuardar,
  alRecargar,
  alCancelar,
}: {
  readonly potrero?: PotreroEnPantalla
  readonly alGuardar: () => void
  readonly alRecargar: () => void
  readonly alCancelar: () => void
}) {
  const [nombre, setNombre] = useState(potrero?.nombre ?? '')
  const [nota, setNota] = useState(potrero?.nota ?? '')
  const [motivo, setMotivo] = useState('')
  const crear = useRegistrarPotrero()
  const corregir = useCorregirPotrero(potrero?.id ?? '')
  const comando = potrero === undefined ? crear : corregir
  const faltaMotivo = potrero !== undefined && motivo.trim() === ''
  const pendiente = useRef<{ contenido: string; commandId: string; id: string } | null>(null)

  const conflicto = esConflictoDeVersion(corregir.error)

  const guardar = (): void => {
    const limpio = nombre.trim()
    const conNota = nota.trim()
    if (potrero === undefined) {
      const cuerpo = {
        ...(limpio === '' ? {} : { nombre: limpio }),
        ...(conNota === '' ? {} : { nota: conNota }),
      }
      const contenido = JSON.stringify(cuerpo)
      if (pendiente.current === null || pendiente.current.contenido !== contenido) {
        pendiente.current = {
          contenido,
          commandId: crypto.randomUUID(),
          id: crypto.randomUUID(),
        }
      }
      crear.mutate(
        { commandId: pendiente.current.commandId, id: pendiente.current.id, ...cuerpo },
        {
          onSuccess: () => {
            pendiente.current = null
            alGuardar()
          },
        },
      )
      return
    }
    const cuerpo = {
      version: potrero.version,
      motivo: motivo.trim(),
      nombre: limpio === '' ? null : limpio,
      nota: conNota === '' ? null : conNota,
    }
    const contenido = JSON.stringify(cuerpo)
    if (pendiente.current === null || pendiente.current.contenido !== contenido) {
      pendiente.current = {
        contenido,
        commandId: crypto.randomUUID(),
        id: potrero.id,
      }
    }
    corregir.mutate(
      { commandId: pendiente.current.commandId, ...cuerpo },
      {
        onSuccess: () => {
          pendiente.current = null
          alGuardar()
        },
      },
    )
  }

  if (conflicto) {
    return (
      <div className="aviso aviso--ojo" role="alert">
        <p className="aviso__titulo">Alguien más cambió este potrero mientras lo tenías abierto.</p>
        <p className="aviso__quehacer">
          Tu cambio no se guardó y no se perdió nada de lo que había. Recarga la lista para ver lo
          último y vuelve a escribir el cambio si todavía hace falta.
        </p>
        <BotonPrincipal alTocar={alRecargar}>Recargar los potreros</BotonPrincipal>
      </div>
    )
  }

  return (
    <form
      className="formulario"
      onSubmit={(evento) => {
        evento.preventDefault()
        if (comando.isPending || faltaMotivo) {
          return
        }
        guardar()
      }}
    >
      <CampoDeTexto
        etiqueta="Nombre del potrero"
        valor={nombre}
        alCambiar={setNombre}
        maxLength={LARGO_DEL_NOMBRE}
        ayuda="Como le dice el rancho. Si todavía no tiene nombre, se deja vacío."
      />
      <CampoDeArea
        etiqueta="Nota"
        valor={nota}
        alCambiar={setNota}
        ayuda="Opcional. Sirve para reconocerlo después."
      />
      {potrero === undefined ? null : (
        <CampoDeArea
          etiqueta="¿Por qué se cambia?"
          valor={motivo}
          alCambiar={setMotivo}
          ayuda="Obligatorio. El nombre anterior se queda en la historia."
        />
      )}
      {comando.isError ? <AvisoDeError error={comando.error} /> : null}
      <BotonPrincipal tipo="submit" deshabilitado={comando.isPending || faltaMotivo}>
        {comando.isPending ? 'Guardando…' : potrero === undefined ? 'Agregar potrero' : 'Guardar el cambio'}
      </BotonPrincipal>
      <BotonSecundario alTocar={alCancelar} deshabilitado={comando.isPending}>
        Cancelar
      </BotonSecundario>
    </form>
  )
}

function textoDeEsperados(cuantos: number): string {
  if (cuantos === 0) {
    return 'No se espera a nadie aquí'
  }
  return cuantos === 1 ? 'Se espera 1 animal' : `Se esperan ${String(cuantos)} animales`
}

function textoDeSinLugar(cuantos: number): string {
  return cuantos === 1 ? '1 animal no tiene lugar' : `${String(cuantos)} animales sin lugar`
}

function textoDeDesconocidos(cuantos: number): string {
  return cuantos === 1
    ? '1 animal está con lugar desconocido'
    : `${String(cuantos)} animales con lugar desconocido`
}
