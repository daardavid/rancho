import type { AsignarLugar, FilaDeCrecimiento } from '@rancho/api-contracts'
import { useMemo, useRef, useState } from 'react'

import { useHato, useResumenDelHato, useSalidas } from '../api/hato'
import { useAsignarLugar, useLugares, usePotreros, useRegistrarPotrero } from '../api/lugar'
import { usePesosConocidos, useUltimaSesion } from '../api/pesajes'
import { areteVigente, coincide, normalizar, nombreVisible } from '../dominio/animal'
import { diaLegible, diasLegibles, hoyEnElRancho, kilosLegibles } from '../dominio/fechas'
import {
  CATEGORIAS,
  categoria as nombreDeCategoria,
  motivoDeSalida,
  tipoDeMarca,
} from '../dominio/etiquetas'
import { ultimosKilos } from '../dominio/ultimoPeso'
import { etiquetaDeGanancia, type TonoDeGanancia } from '../dominio/revision'
import type { Animal } from '../dominio/tipos'
import { irA, rutaAHash } from '../ruta'
import { Aviso } from '../ui/Aviso'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { BotonFlotante, BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { CampoDeArea, CampoDeFecha, CampoDeTexto } from '../ui/Campos'
import { Desplegable } from '../ui/Desplegable'
import { FilaDeAnimal, type CategoriaVisual } from '../ui/FilaDeAnimal'
import { Filtros } from '../ui/Filtros'
import { IconoBascula, IconoBuscar, IconoMas } from '../ui/iconos'
import { Mosaicos } from '../ui/Mosaicos'
import { EncabezadoDelRancho } from './EncabezadoDelRancho'
import { FormularioDeDestete } from './Destete'
import { FormularioDeSanidad } from './Sanidad'
import { TarjetaDelPrimerAnimal } from './TarjetaDelPrimerAnimal'

/**
 * Valores del filtro de lugar que no son ids de potrero. Van con un texto fijo
 * para que no puedan chocar con un id de verdad.
 */
const SIN_FILTRO_DE_POTRERO = 'cualquiera'
const SIN_LUGAR = 'sin-lugar'
/**
 * «No sé» en los dos sentidos que usa el rancho: el destino de un movimiento y
 * el filtro del hato. Es el mismo valor y quiere decir lo mismo.
 */
const DESCONOCIDO = 'no-se'

/** El mismo tope que el del contrato: quién lo dijo es un origen, no un cuaderno. */
const LARGO_DE_QUIEN_LO_DIJO = 200

/**
 * El hato: cuántos animales hay, quién va bien, a quién revisar y quién no se
 * pesó, en una sola pantalla ([Hato](../../../../../docs/design/maqueta/Hato.dc.html)).
 *
 * La búsqueda corre sobre lo que ya está en pantalla. El hato son unas 21
 * cabezas hoy: traerlo completo y filtrar en el celular responde al instante y
 * encuentra también los aretes anteriores, que la ficha ya trae con su
 * historia.
 *
 * La ganancia no se calcula aquí: viene calculada del servidor como texto y la
 * pantalla solo decide la etiqueta con la regla de «Revisar primero» de
 * [INC-003](../../../../../docs/product/increments/INC-003-rediseno.md)
 * ([`revision.ts`](../dominio/revision.ts)). El intervalo anterior viaja en la
 * fila para ver si bajó contra su propia vuelta previa. No hay meta de
 * ganancia del rancho y ninguna se inventa.
 *
 * Una sola acción por pantalla: el «+» da de alta, el menú guarda «Salir» y el
 * botón flotante registra el pesaje. «Salir» vive solo en el menú de esta
 * pantalla; el resto de las pantallas conservan su barra de sesión hasta que
 * les toque su rediseño.
 */
export function Hato({ modoInicial = null }: { readonly modoInicial?: 'sanidad' | 'destete' | null }) {
  const hato = useHato()
  const resumen = useResumenDelHato()
  const todosLosPotreros = usePotreros()
  const lugares = useLugares()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [filtroDePotrero, setFiltroDePotrero] = useState(SIN_FILTRO_DE_POTRERO)
  /**
   * El modo de selección del hato. Tocar varias filas sirve para dos capturas
   * distintas —mover a un potrero o anotar sanidad—, pero solo hay un modo a la
   * vez: una acción por pantalla.
   *
   * Inicio puede llegar con el modo de sanidad ya encendido (`#/hato/sanidad`):
   * es el mismo modo, solo se ahorra el toque de buscarlo.
   */
  const [modo, setModo] = useState<'mover' | 'sanidad' | 'destete' | null>(modoInicial)
  const [sanidadGuardada, setSanidadGuardada] = useState(false)
  const [desteteGuardado, setDesteteGuardado] = useState(false)
  const [elegidos, setElegidos] = useState<readonly string[]>([])
  const buscando = normalizar(busqueda) !== ''
  // Sin activos hay que saber si alguien ya salió: «no hay animales» sería
  // mentira, y la búsqueda es la forma de encontrarlo desde esta pantalla.
  const sinActivos = hato.isSuccess && (hato.data?.animales.length ?? 0) === 0
  const salidas = useSalidas(buscando || sinActivos)
  const pesosDeSalida = usePesosConocidos({ habilitada: buscando || sinActivos })
  const kilosDeSalida = useMemo(
    () => ultimosKilos(pesosDeSalida.data?.pesos ?? []),
    [pesosDeSalida.data],
  )

  const porAnimal = useMemo(() => {
    const mapa = new Map<string, FilaDeCrecimiento>()
    for (const fila of resumen.data?.animales ?? []) {
      mapa.set(fila.animalId, fila)
    }
    return mapa
  }, [resumen.data])

  const animales = useMemo(() => hato.data?.animales ?? [], [hato.data])
  const filas = resumen.data?.animales ?? []
  const huecos = filas.filter((fila) => fila.fueHuecoEnLaUltimaSesion)

  // La fecha del aviso es la de la vuelta donde se esperaba a los que faltaron.
  // Es una consulta, no un dato derivado: la sesión más reciente del rancho.
  const ultimaSesion = useUltimaSesion({ habilitada: huecos.length > 0 })

  const conteos = useMemo(() => contarPorCategoria(animales), [animales])
  const filtros = useMemo(() => opcionesDeFiltro(conteos), [conteos])

  /**
   * El potrero vigente de cada animal. Los que no tienen asignación no aparecen
   * en el mapa: su filtro es «Sin lugar», no un potrero inventado.
   */
  const porAnimalPotrero = useMemo(() => {
    const mapa = new Map<string, string | null>()
    for (const fila of lugares.data?.animales ?? []) {
      mapa.set(fila.animalId, fila.potreroId)
    }
    return mapa
  }, [lugares.data])

  const opcionesDePotrero = useMemo(
    () => opcionesDeFiltroPorPotrero(todosLosPotreros.data?.potreros ?? [], animales.length),
    [todosLosPotreros.data, animales.length],
  )

  const visibles = useMemo(() => {
    const limpio = normalizar(busqueda)
    return animales.filter((animal) => {
      if (!pasaElFiltro(animal, filtro)) {
        return false
      }
      if (!pasaElFiltroDePotrero(animal.id, filtroDePotrero, porAnimalPotrero)) {
        return false
      }
      return limpio === '' || coincide(animal, limpio)
    })
  }, [animales, busqueda, filtro, filtroDePotrero, porAnimalPotrero])

  const salidasVisibles = useMemo(() => {
    const limpio = normalizar(busqueda)
    if (limpio === '') {
      return []
    }
    return (salidas.data?.animales ?? []).filter((animal) => coincide(animal, limpio))
  }, [salidas.data, busqueda])

  if (hato.isPending) {
    return (
      <main className="pantalla">
        <Cargando que="Trayendo el hato…" />
      </main>
    )
  }

  if (hato.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={hato.error} />
        <BotonPrincipal alTocar={() => void hato.refetch()}>Volver a intentar</BotonPrincipal>
      </main>
    )
  }

  const total = animales.length
  const vacio = total === 0
  const haySalidas = (salidas.data?.animales.length ?? 0) > 0
  const mirandoSalidas = sinActivos && salidas.isLoading
  const salidasSinVer = sinActivos && salidas.isError
  const buscandoSalidas = buscando && salidas.isLoading
  const subtituloVacio = mirandoSalidas
    ? 'Viendo el hato…'
    : salidasSinVer
      ? 'No se pudo ver si hay salidas'
      : haySalidas
        ? 'En el hato activo no queda nadie'
        : 'Todavía no hay animales'

  return (
    <main className="pantalla pantalla--hato">
      <EncabezadoDelRancho
        titulo="Hato"
        subtitulo={subtituloDelHato(total, subtituloVacio, resumen.data === undefined ? null : textoDelUltimoPesaje(resumen.data.animales))}
        acciones={
          // En el hato vacío de verdad el alta se ofrece una sola vez, en la
          // tarjeta. Si ya hubo salidas, el «+» sigue siendo el alta y la
          // búsqueda encuentra a quien salió.
          !vacio || haySalidas
            ? [
                {
                  etiqueta: 'Dar de alta un animal',
                  icono: <IconoMas />,
                  href: rutaAHash({ nombre: 'alta' }),
                  destacado: true,
                },
              ]
            : []
        }
      />

      {mirandoSalidas ? (
        <Cargando que="Viendo el hato…" />
      ) : salidasSinVer ? (
        <>
          <AvisoDeError error={salidas.error} />
          <BotonPrincipal alTocar={() => void salidas.refetch()}>Volver a intentar</BotonPrincipal>
        </>
      ) : vacio && !haySalidas ? (
        <TarjetaDelPrimerAnimal />
      ) : (
        <>
          <div className="ui-buscador">
            <IconoBuscar />
            <label className="ui-sr" htmlFor="buscar">
              Buscar
            </label>
            <input
              id="buscar"
              className="ui-buscador__entrada"
              type="search"
              value={busqueda}
              placeholder="Buscar por nombre o arete"
              onChange={(evento) => {
                setBusqueda(evento.target.value)
              }}
            />
          </div>

          {vacio ? (
            <p className="campo__ayuda">
              En el hato activo no queda nadie. Escribe un nombre para encontrarlo entre las
              salidas.
            </p>
          ) : (
            <>
              <div className="hato__filtros">
                <Filtros
                  etiqueta="Filtrar el hato"
                  opciones={filtros}
                  valor={filtro}
                  alElegir={setFiltro}
                />
              </div>

              {opcionesDePotrero.length <= 1 ? null : (
                <div className="hato__filtros">
                  <Filtros
                    etiqueta="Filtrar por potrero"
                    opciones={opcionesDePotrero}
                    valor={filtroDePotrero}
                    alElegir={setFiltroDePotrero}
                  />
                </div>
              )}
            </>
          )}

          {vacio || huecos.length === 0 ? null : (
            <div className="hato__aviso">
              <Aviso
                titulo={
                  huecos.length === 1
                    ? '1 animal no se pesó'
                    : `${String(huecos.length)} animales no se pesaron`
                }
                {...(ultimaSesion.data == null
                  ? {}
                  : { detalle: `En la vuelta del ${diaLegible(ultimaSesion.data.fecha)}` })}
                enlace={{ texto: 'Ver', href: '#/crecimiento' }}
              />
            </div>
          )}

          {resumen.isError ? (
            <p className="campo__ayuda hato__sin-peso" role="status">
              No se pudo traer el último peso. La lista sigue; vuelve a abrir la pantalla para
              intentarlo otra vez.
            </p>
          ) : null}

          {buscando && salidas.isError ? (
            <p className="campo__ayuda" role="status">
              No se pudieron ver las salidas. Esta búsqueda no las incluye.
            </p>
          ) : null}

          {(buscando || filtro !== 'todos' || filtroDePotrero !== SIN_FILTRO_DE_POTRERO) &&
          visibles.length === 0 &&
          salidasVisibles.length === 0 &&
          !buscandoSalidas ? (
            <section className="vacio">
              <h2 className="vacio__titulo">Ningún animal coincide</h2>
              <p>Revisa cómo se escribe o cambia el filtro.</p>
            </section>
          ) : null}

          {vacio ? null : (
            <div className="hato__modo">
              {modo === 'mover' ? (
                <p className="campo__ayuda" role="status">
                  Elige los animales y toca «Mover a…». La lista deja de abrir fichas mientras
                  eliges.
                </p>
              ) : modo === 'sanidad' ? (
                <p className="campo__ayuda" role="status">
                  Elige los animales y toca «Anotar sanidad». La nota se escribe una vez por cada
                  uno.
                </p>
              ) : modo === 'destete' ? (
                <p className="campo__ayuda" role="status">
                  Elige las crías y toca «Anotar destete». El destete no las saca del hato. El
                  peso, si se pesó, se anota en la ficha de cada una.
                </p>
              ) : (
                <>
                  <BotonSecundario
                    tono="tinta"
                    alTocar={() => {
                      setSanidadGuardada(false)
                      setElegidos([])
                      setModo('mover')
                    }}
                  >
                    Mover animales a un potrero
                  </BotonSecundario>
                  <BotonSecundario
                    tono="tinta"
                    alTocar={() => {
                      setSanidadGuardada(false)
                      setElegidos([])
                      setModo('sanidad')
                    }}
                  >
                    Anotar sanidad a varios animales
                  </BotonSecundario>
                  <BotonSecundario
                    tono="tinta"
                    alTocar={() => {
                      setDesteteGuardado(false)
                      setElegidos([])
                      setModo('destete')
                    }}
                  >
                    Anotar destete a varios
                  </BotonSecundario>
                </>
              )}
            </div>
          )}

          {sanidadGuardada ? (
            <p className="aviso aviso--bien" role="status">
              Notas de sanidad guardadas. Cada animal tiene la suya.
            </p>
          ) : null}

          {desteteGuardado ? (
            <p className="aviso aviso--bien" role="status">
              Destete guardado. Siguen en el hato.
            </p>
          ) : null}

          {visibles.length === 0 ? null : (
            <ul className="hato__lista">
              {visibles.map((animal) => (
                <li key={animal.id}>
                  <FilaDeHato
                    animal={animal}
                    fila={porAnimal.get(animal.id)}
                    {...(modo === null
                      ? {}
                      : {
                          seleccion: {
                            marcado: elegidos.includes(animal.id),
                            nombreAccesible: `Elegir a ${nombreVisible(animal)}`,
                            alCambiar: (marcado: boolean) => {
                              setElegidos((actuales) =>
                                marcado
                                  ? [...actuales, animal.id]
                                  : actuales.filter((id) => id !== animal.id),
                              )
                            },
                          },
                        })}
                  />
                </li>
              ))}
            </ul>
          )}

          {modo === 'mover' && !vacio ? (
            <MoverA
              potreros={todosLosPotreros.data?.potreros ?? []}
              elegidos={elegidos}
              alCerrar={() => {
                setModo(null)
                setElegidos([])
              }}
              alGuardar={() => {
                setModo(null)
                setElegidos([])
                void hato.refetch()
                void lugares.refetch()
                void todosLosPotreros.refetch()
              }}
            />
          ) : null}

          {modo === 'destete' && !vacio ? (
            <FormularioDeDestete
              animales={elegidos}
              nombreDelGrupo={
                elegidos.length === 0
                  ? 'elige las crías'
                  : elegidos.length === 1
                    ? '1 cría'
                    : `${String(elegidos.length)} crías`
              }
              conPeso={false}
              alGuardar={() => {
                setModo(null)
                setElegidos([])
                setDesteteGuardado(true)
              }}
              alCancelar={() => {
                setModo(null)
                setElegidos([])
                setDesteteGuardado(false)
              }}
            />
          ) : null}

          {modo === 'sanidad' && !vacio ? (
            <FormularioDeSanidad
              animales={elegidos}
              nombreDelGrupo={
                elegidos.length === 0
                  ? 'elige los animales'
                  : elegidos.length === 1
                    ? '1 animal'
                    : `${String(elegidos.length)} animales`
              }
              alGuardar={() => {
                setModo(null)
                setElegidos([])
                setSanidadGuardada(true)
              }}
              alCancelar={() => {
                setModo(null)
                setElegidos([])
                setSanidadGuardada(false)
              }}
            />
          ) : null}

          {salidasVisibles.length === 0 ? null : (
            <section className="ficha__seccion">
              <h2 className="ficha__titulo">Salidas</h2>
              <ul className="hato__lista">
                {salidasVisibles.map((animal) => (
                  <li key={animal.id}>
                    <FilaDeSalidaEnElHato
                      animal={animal}
                      kilos={kilosDeSalida.get(animal.id) ?? null}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {vacio || modo !== null ? null : (
            <BotonFlotante icono={<IconoBascula />} href="#/pesaje">
              Registrar pesaje
            </BotonFlotante>
          )}
        </>
      )}

      {/* «Mover a…» desde el hato, con varios animales elegidos a la vez. */}
    </main>
  )
}

/**
 * «Mover a…»: el potrero de destino y el día desde el que vale.
 *
 * Es una captura que escribe una asignación por animal, no una observación.
 * «No sé» es un destino válido y viene como opción, no escondido. El día se
 * propone con el de hoy en el rancho y se puede cambiar: un movimiento anotado
 * tarde no es un movimiento de hoy.
 *
 * «¿Quién lo dijo?» es aparte de la nota: es el trabajador o el canal por el que
 * llegó el aviso, no la cuenta que lo registra ni un comentario suelto.
 *
 * El `commandId` y los `asignacionId` se conservan entre intentos mientras el
 * contenido no cambie: si se cae la red después de que la API guardó, el
 * reintento es el mismo comando y el servidor devuelve lo guardado en vez de
 * mover dos veces. Si el dueño cambia algo, es otro comando y hacen falta ids
 * nuevos.
 */
function MoverA({
  potreros,
  elegidos,
  alGuardar,
  alCerrar,
}: {
  readonly potreros: readonly { readonly id: string; readonly nombre: string | null }[]
  readonly elegidos: readonly string[]
  readonly alGuardar: () => void
  readonly alCerrar: () => void
}) {
  const [destino, setDestino] = useState<string>(DESCONOCIDO)
  const [desde, setDesde] = useState(hoyEnElRancho())
  const [nota, setNota] = useState('')
  const [quienLoDijo, setQuienLoDijo] = useState('')
  const [creandoPotrero, setCreandoPotrero] = useState(false)
  /**
   * El potrero que se acaba de crear aquí. Se usa mientras la lista del rancho
   * no vuelve, para que el destino quede marcado y el botón diga su nombre en
   * vez de «un potrero».
   */
  const [creado, setCreado] = useState<{ readonly id: string; readonly nombre: string | null } | null>(
    null,
  )
  const mover = useAsignarLugar()
  const faltanAnimales = elegidos.length === 0
  const pendiente = useRef<{ contenido: string; cuerpo: AsignarLugar } | null>(null)
  const disponibles =
    creado === null || potreros.some((potrero) => potrero.id === creado.id)
      ? potreros
      : [...potreros, creado]
  const destinoElegido =
    destino === DESCONOCIDO ? null : (disponibles.find((potrero) => potrero.id === destino) ?? null)

  const guardar = (): void => {
    if (faltanAnimales || mover.isPending) {
      return
    }
    const limpio = nota.trim()
    const quien = quienLoDijo.trim()
    // Los ids de asignación no entran en la huella: se acuñan una vez y se
    // reusan tal cual mientras el contenido sea el mismo.
    const contenido = JSON.stringify({
      potreroId: destino === DESCONOCIDO ? null : destino,
      desde,
      nota: limpio === '' ? null : limpio,
      reportedBy: quien === '' ? null : quien,
      animales: elegidos,
    })
    if (pendiente.current === null || pendiente.current.contenido !== contenido) {
      pendiente.current = {
        contenido,
        cuerpo: {
          commandId: crypto.randomUUID(),
          potreroId: destino === DESCONOCIDO ? null : destino,
          desde,
          ...(limpio === '' ? {} : { nota: limpio }),
          ...(quien === '' ? {} : { reportedBy: quien }),
          animales: elegidos.map((animalId) => ({
            animalId,
            asignacionId: crypto.randomUUID(),
          })),
        },
      }
    }

    mover.mutate(pendiente.current.cuerpo, {
      onSuccess: () => {
        pendiente.current = null
        alGuardar()
      },
    })
  }

  return (
    <section className="mover">
      <h2 className="ficha__titulo">
        {faltanAnimales
          ? 'Mover a…'
          : elegidos.length === 1
            ? 'Mover 1 animal a…'
            : `Mover ${String(elegidos.length)} animales a…`}
      </h2>
      <p className="campo__ayuda">
        Se anota dónde se les espera desde ese día. No quiere decir que alguien los haya visto:
        no cambia su último pesaje.
      </p>

      {potreros.length === 0 ? (
        <p className="campo__ayuda" role="status">
          Todavía no hay potreros anotados. Se puede crear uno aquí mismo, o dejar el destino en
          «No sé».
        </p>
      ) : null}

      <Mosaicos
        etiqueta="¿A qué potrero?"
        opciones={[
          ...disponibles.map((potrero) => ({
            valor: potrero.id,
            texto: potrero.nombre ?? 'Sin nombre',
          })),
          { valor: DESCONOCIDO, texto: 'No sé' },
        ]}
        valor={destino}
        alElegir={setDestino}
      />

      {creandoPotrero ? (
        <FormularioDePotreroNuevo
          alCancelar={() => {
            setCreandoPotrero(false)
          }}
          alCrear={(potrero) => {
            setCreandoPotrero(false)
            setCreado(potrero)
            // El potrero recién creado queda elegido: el dueño lo creó para
            // mover a los animales ahí, no para volver a buscarlo en la lista.
            setDestino(potrero.id)
          }}
        />
      ) : (
        <BotonSecundario
          tono="tinta"
          alTocar={() => {
            setCreandoPotrero(true)
          }}
        >
          Crear un potrero nuevo
        </BotonSecundario>
      )}

      <CampoDeFecha etiqueta="¿Desde cuándo?" valor={desde} alCambiar={setDesde} />

      <Desplegable titulo="Más datos" resumen="nota y quién lo dijo">
        <CampoDeArea
          etiqueta="Nota"
          valor={nota}
          alCambiar={setNota}
          ayuda="Opcional. Si no hay nada más que anotar, se deja vacía."
        />
        <CampoDeTexto
          etiqueta="¿Quién lo dijo?"
          valor={quienLoDijo}
          alCambiar={setQuienLoDijo}
          maxLength={LARGO_DE_QUIEN_LO_DIJO}
          ayuda="Opcional. Por ejemplo el vaquero o el canal por el que se supo. No es tu cuenta."
        />
      </Desplegable>

      {mover.isError ? <AvisoDeError error={mover.error} /> : null}

      <BotonPrincipal alTocar={guardar} deshabilitado={faltanAnimales || mover.isPending}>
        {mover.isPending ? 'Guardando…' : textoDelBotonDeMover(elegidos.length, destino, destinoElegido)}
      </BotonPrincipal>
      <BotonSecundario alTocar={alCerrar} deshabilitado={mover.isPending}>
        Cancelar
      </BotonSecundario>
    </section>
  )
}

/**
 * El botón final dice el destino: «Mover 2 a Potrero Norte».
 *
 * Con «No sé» lo dice tal cual, porque también es un destino. Un potrero sin
 * nombre no se inventa: se dice que no tiene nombre. El artículo se contrae
 * como se habla («al Zapote», «a la Esperanza»), sin cambiar el nombre.
 */
function textoDelBotonDeMover(
  cuantos: number,
  destino: string,
  potreroElegido: { readonly nombre: string | null } | null,
): string {
  if (cuantos === 0) {
    return 'Mover a…'
  }
  const cuantosTexto = cuantos === 1 ? 'Mover 1' : `Mover ${String(cuantos)}`
  if (destino === DESCONOCIDO) {
    return `${cuantosTexto} a «No sé»`
  }
  if (potreroElegido === null) {
    return `${cuantosTexto} a un potrero`
  }
  if (potreroElegido.nombre === null) {
    return `${cuantosTexto} a un potrero sin nombre`
  }
  return `${cuantosTexto} ${aDonde(potreroElegido.nombre)}`
}

/** «al Zapote», «a la Esperanza», «a Potrero Norte». No se toca el nombre. */
function aDonde(nombre: string): string {
  if (nombre.startsWith('El ')) {
    return `al ${nombre.slice(3)}`
  }
  if (nombre.startsWith('La ')) {
    return `a la ${nombre.slice(3)}`
  }
  if (nombre.startsWith('Los ')) {
    return `a los ${nombre.slice(4)}`
  }
  if (nombre.startsWith('Las ')) {
    return `a las ${nombre.slice(4)}`
  }
  return `a ${nombre}`
}

/**
 * Crear un potrero desde «Mover a…», sin salir al menú ni perder la selección.
 *
 * Es el mismo comando que la pantalla Potreros y el mismo `id`/`commandId`
 * mientras el contenido no cambie: un reintento por mala señal devuelve el
 * potrero que la API ya guardó en vez de crear otro.
 */
function FormularioDePotreroNuevo({
  alCrear,
  alCancelar,
}: {
  readonly alCrear: (potrero: { readonly id: string; readonly nombre: string | null }) => void
  readonly alCancelar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const crear = useRegistrarPotrero()
  const pendiente = useRef<{ contenido: string; commandId: string; id: string } | null>(null)

  const guardar = (): void => {
    if (crear.isPending) {
      return
    }
    const limpio = nombre.trim()
    const cuerpo = limpio === '' ? {} : { nombre: limpio }
    const contenido = JSON.stringify(cuerpo)
    if (pendiente.current === null || pendiente.current.contenido !== contenido) {
      pendiente.current = {
        contenido,
        commandId: crypto.randomUUID(),
        id: crypto.randomUUID(),
      }
    }
    const ids = pendiente.current
    crear.mutate(
      { commandId: ids.commandId, id: ids.id, ...cuerpo },
      {
        onSuccess: (potrero) => {
          pendiente.current = null
          alCrear({ id: potrero.id, nombre: potrero.nombre })
        },
      },
    )
  }

  return (
    <form
      className="formulario potrero-nuevo"
      onSubmit={(evento) => {
        evento.preventDefault()
        guardar()
      }}
    >
      <CampoDeTexto
        etiqueta="Nombre del potrero nuevo"
        valor={nombre}
        alCambiar={setNombre}
        maxLength={200}
        ayuda="Como le dice el rancho. Si todavía no tiene nombre, se puede dejar vacío."
      />
      {crear.isError ? <AvisoDeError error={crear.error} /> : null}
      <BotonPrincipal tipo="submit" deshabilitado={crear.isPending}>
        {crear.isPending ? 'Guardando…' : 'Agregar potrero'}
      </BotonPrincipal>
      <BotonSecundario alTocar={alCancelar} deshabilitado={crear.isPending}>
        Cancelar
      </BotonSecundario>
    </form>
  )
}

/**
 * El subtítulo del hato. Mientras el resumen no llegó (cargando o error) no se
 * afirma nada del último pesaje: una consulta que falló no es «no hay pesajes».
 */
function subtituloDelHato(
  total: number,
  subtituloVacio: string,
  ultimoPesaje: string | null,
): string {
  if (total === 0) {
    return subtituloVacio
  }
  const conUltimoPesaje = ultimoPesaje === null ? '' : ` · ${ultimoPesaje}`
  return `${String(total)} ${total === 1 ? 'animal activo' : 'animales activos'}${conUltimoPesaje}`
}

/** Una fila del hato con lo que la API ya sabe: aquí no se calcula ningún peso. */
function FilaDeHato({
  animal,
  fila,
  seleccion,
}: {
  readonly animal: Animal
  readonly fila: FilaDeCrecimiento | undefined
  /** En modo de mover varios: la fila se toca entera y deja de abrir la ficha. */
  readonly seleccion?: {
    readonly marcado: boolean
    readonly nombreAccesible: string
    readonly alCambiar: (marcado: boolean) => void
  }
}) {
  const arete = areteVigente(animal)
  const ultimo = fila?.ultimoPeso ?? null
  const ganancia: { readonly tono: TonoDeGanancia; readonly texto: string } =
    fila === undefined
      ? { tono: 'sinDatos', texto: 'Sin pesajes' }
      : etiquetaDeGanancia(fila, fila.intervaloAnterior)

  return (
    <FilaDeAnimal
      nombre={nombreVisible(animal)}
      detalle={`${nombreDeCategoria(animal.categoria)} · ${
        arete === null ? 'sin arete' : `${tipoDeMarca(arete.tipo)} ${arete.valor}`
      }`}
      peso={ultimo === null ? '—' : kilosLegibles(ultimo.kilos)}
      ganancia={ganancia.texto}
      tono={ganancia.tono}
      categoria={categoriaVisual(animal.categoria)}
      miniaturaId={animal.foto?.miniaturaId ?? null}
      {...(seleccion === undefined ? {} : { seleccion })}
      {...(seleccion === undefined
        ? {
            alTocar: () => {
              irA({ nombre: 'ficha', animalId: animal.id, desde: 'hato' })
            },
          }
        : {})}
    />
  )
}

/** Un animal dado de baja que la búsqueda del hato sí puede encontrar. */
function FilaDeSalidaEnElHato({
  animal,
  kilos,
}: {
  readonly animal: Animal
  readonly kilos: string | null
}) {
  const salida = animal.salida
  const motivo = salida === null ? 'Salió' : motivoDeSalida(salida.motivo)
  const fecha = salida === null ? '' : ` · ${diaLegible(salida.fecha)}`

  return (
    <FilaDeAnimal
      nombre={nombreVisible(animal)}
      detalle={`${motivo}${fecha}`}
      peso={kilos === null ? '—' : kilosLegibles(kilos)}
      ganancia="Salió"
      tono="revisar"
      categoria={categoriaVisual(animal.categoria)}
      miniaturaId={animal.foto?.miniaturaId ?? null}
      alTocar={() => {
        irA({ nombre: 'ficha', animalId: animal.id, desde: 'hato' })
      }}
    />
  )
}

/**
 * Los conteos se hacen sobre el hato completo, no sobre lo que dejó la
 * búsqueda: el número de la píldora dice cuántos animales hay de esa categoría.
 */
function contarPorCategoria(animales: readonly Animal[]): ReadonlyMap<string, number> {
  const conteos = new Map<string, number>()
  for (const animal of animales) {
    conteos.set(animal.categoria, (conteos.get(animal.categoria) ?? 0) + 1)
  }
  return conteos
}

/**
 * «Todos» siempre, y después solo las categorías que tienen animales. Se usa el
 * nombre del dominio de cada categoría: «No sé» es una categoría válida del
 * rancho y se filtra con su propio nombre, no se mete en «Otras».
 */
function opcionesDeFiltro(
  conteos: ReadonlyMap<string, number>,
): readonly { readonly valor: string; readonly texto: string }[] {
  const opciones = [{ valor: 'todos', texto: `Todos ${String(sumar(conteos))}` }]
  const enPlural: Record<string, string> = {
    calf: 'Becerros',
    cow: 'Vacas',
    bull: 'Toros',
    other: 'Otras',
    unknown: 'No sé',
  }

  for (const categoria of CATEGORIAS) {
    const cuantos = conteos.get(categoria.codigo) ?? 0
    const etiqueta = enPlural[categoria.codigo]
    if (cuantos > 0 && etiqueta !== undefined) {
      opciones.push({ valor: categoria.codigo, texto: `${etiqueta} ${String(cuantos)}` })
    }
  }

  return opciones
}

function sumar(conteos: ReadonlyMap<string, number>): number {
  let total = 0
  for (const cuantos of conteos.values()) {
    total += cuantos
  }
  return total
}

function pasaElFiltro(animal: Animal, filtro: string): boolean {
  return filtro === 'todos' || animal.categoria === filtro
}

/** «Todos», «Sin lugar» y un botón por potrero con cuántos animales se esperan. */
function opcionesDeFiltroPorPotrero(
  potreros: readonly {
    readonly id: string
    readonly nombre: string | null
    readonly esperados: number
  }[],
  total: number,
): readonly { readonly valor: string; readonly texto: string }[] {
  if (potreros.length === 0) {
    return []
  }
  return [
    { valor: SIN_FILTRO_DE_POTRERO, texto: `Cualquier lugar ${String(total)}` },
    ...potreros.map((potrero) => ({
      valor: potrero.id,
      texto: `${potrero.nombre ?? 'Sin nombre'} ${String(potrero.esperados)}`,
    })),
    { valor: SIN_LUGAR, texto: 'Sin lugar' },
    { valor: DESCONOCIDO, texto: 'No sé' },
  ]
}

/**
 * El filtro por potrero usa la asignación vigente. Un animal sin asignación es
 * «Sin lugar»: no se le inventa un potrero. Una asignación «No sé» es otra
 * cosa y se filtra aparte.
 */
function pasaElFiltroDePotrero(
  animalId: string,
  filtro: string,
  vigentes: ReadonlyMap<string, string | null>,
): boolean {
  if (filtro === SIN_FILTRO_DE_POTRERO) {
    return true
  }
  const vigente = vigentes.get(animalId)
  if (filtro === SIN_LUGAR) {
    return vigente === undefined
  }
  if (filtro === DESCONOCIDO) {
    return vigente === null
  }
  return vigente === filtro
}

function categoriaVisual(categoria: string): CategoriaVisual {
  switch (categoria) {
    case 'calf':
      return 'calf'
    case 'cow':
      return 'cow'
    case 'bull':
      return 'bull'
    case 'other':
      return 'other'
    default:
      return 'unknown'
  }
}

/**
 * «Hace cuánto fue el último pesaje» del hato entero: el mínimo de los días que
 * cada animal tiene desde su último peso. Sin ningún peso se dice, no se deja
 * en blanco ni se inventa una fecha.
 */
function textoDelUltimoPesaje(filas: readonly FilaDeCrecimiento[]): string {
  let menosDias: number | null = null
  for (const fila of filas) {
    const dias = fila.diasDesdeElUltimoPesaje
    if (dias === null) {
      continue
    }
    if (menosDias === null || dias < menosDias) {
      menosDias = dias
    }
  }
  if (menosDias === null) {
    return 'sin pesajes todavía'
  }
  return `último pesaje ${diasLegibles(menosDias)}`
}
