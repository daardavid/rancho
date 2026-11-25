import type { RegistrarSesion, SesionDePesaje } from '@rancho/api-contracts'
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import { useHato } from '../api/hato'
import { ErrorDeApi } from '../api/http'
import { useRegistrarPesaje, useUltimaSesion } from '../api/pesajes'
import { useSesion } from '../api/sesion'
import { coincide, normalizar, nombreVisible } from '../dominio/animal'
import {
  borrarBorrador,
  guardarBorrador,
  leerBorrador,
  type BorradorDePesaje,
  type CalidadBorrador,
  type FilaBorrador,
} from '../dominio/borrador'
import { diasEntre, diasLegibles, fechaDelPesaje, hoyEnElRancho, kilosLegibles } from '../dominio/fechas'
import { calidad, categoria, tipoDeMarca } from '../dominio/etiquetas'
import { compararConElAnterior, revisarKilos, type ComparacionDePeso } from '../dominio/kilos'
import type { Animal } from '../dominio/tipos'
import { irA } from '../ruta'
import { AvisoDeError, BotonGrande, Cargando } from '../ui/Avisos'
import { BarraDeAccion } from '../ui/BarraDeAccion'
import { BarraDeAvance } from '../ui/BarraDeAvance'
import { BotonPrincipal } from '../ui/Botones'
import { CampoDeArea, CampoDeTexto, Seccion } from '../ui/Campos'
import { CampoDeKilos } from '../ui/CampoDeKilos'
import { Encabezado } from '../ui/Encabezado'
import { FotoDeLaBascula } from '../ui/FotoDeLaBascula'
import { IconoAbajo, IconoCerrar, IconoMas, IconoPalomita, IconoReloj } from '../ui/iconos'
import { Segmentado } from '../ui/Segmentado'
import { Tarjeta } from '../ui/Tarjeta'

/**
 * Una vuelta por la báscula, de un animal a la vez
 * ([Pesaje](../../../../../docs/design/maqueta/Pesaje.dc.html)).
 *
 * La sesión ya viene armada con los de la vuelta anterior como esperados,
 * porque casi siempre son los mismos. El dueño escribe los kilos del que está
 * en la báscula, toma la foto con un toque y pasa al siguiente. Los ya
 * capturados quedan abajo, para reabrirlos si hay que corregir.
 *
 * Dos cosas se cuidan aquí porque cuestan caro si se pierden:
 *
 * 1. **Nada escrito se pierde al recargar.** El borrador vive en el celular
 *    con el id de la sesión y el id del comando ya generados.
 * 2. **Un reintento no duplica.** Esos dos ids se generan una vez y no cambian
 *    aunque se caiga la señal o se recargue: la API devuelve la sesión que ya
 *    guardó en vez de crear otra.
 *
 * La diferencia contra el peso anterior se calcula al vuelo, en gramos enteros.
 * No se guarda: es lo que el dueño ve mientras escribe, no un hecho nuevo.
 */
export function Pesaje() {
  const hato = useHato()
  const ultima = useUltimaSesion()
  const sesion = useSesion()

  /**
   * Quién está capturando. `App` solo pinta esta pantalla con la sesión ya
   * resuelta, así que aquí se sabe; la cadena vacía es solo un respaldo y no
   * coincide con ningún borrador.
   */
  const cuentaId = sesion.data?.cuentaId ?? ''

  /**
   * Lo que había guardado en el celular al abrir la pantalla, si algo había.
   *
   * Se recalcula solo cuando cambia la cuenta. `App` no pinta esta pantalla
   * hasta tener la sesión, así que la cuenta ya se conoce al montar; el `useMemo`
   * cubre el caso raro de que llegue un instante después, sin pisar el borrador
   * de esta cuenta con uno nuevo.
   */
  const guardado = useMemo(() => leerBorrador(cuentaId), [cuentaId])
  /** Lo que el dueño ha tocado en esta visita. `null` es «todavía no toca nada». */
  const [cambiado, setCambiado] = useState<BorradorDePesaje | null>(null)

  const esperados = useMemo(() => {
    if (ultima.data === null || ultima.data === undefined) {
      return []
    }
    return ultima.data.filas.map((fila) => fila.animalId)
  }, [ultima.data])

  const anteriores = useMemo(() => pesosAnteriores(ultima.data), [ultima.data])

  /**
   * La propuesta se arma una sola vez, cuando ya se sabe qué animales había en
   * la vuelta anterior. Sin vuelta anterior no se propone a nadie: el rancho no
   * ha pesado todavía y no se inventa qué animales se esperaban.
   *
   * `useMemo` y no un efecto: los ids se generan aquí y no pueden cambiar en
   * cada repintado, o un reintento mandaría otro comando.
   */
  const propuesto = useMemo(() => {
    // Sin cuenta no se propone nada: un borrador con `cuentaId` vacío no sería
    // de nadie y, al guardarse, pisaría el de la cuenta que sí estaba.
    if (cuentaId === '' || guardado !== null || hato.isPending || ultima.isPending) {
      return null
    }
    return nuevoBorrador(cuentaId, ultima.isError ? [] : esperados)
  }, [guardado, cuentaId, hato.isPending, ultima.isPending, ultima.isError, esperados])

  // Un borrador guardado manda sobre la propuesta: es lo último que el dueño
  // escribió, posiblemente a media captura.
  const borrador = cambiado ?? guardado ?? propuesto

  // A cada cambio se guarda el borrador. Es barato y es lo que salva la captura
  // si el celular se apaga o el dueño cierra la pestaña sin querer.
  useEffect(() => {
    // Un borrador sin cuenta no se guarda: todavía no se sabe de quién es, y
    // lo que hubiera en el celular no se toca hasta saberlo.
    if (borrador !== null && borrador.cuentaId !== '') {
      guardarBorrador(borrador)
    }
  }, [borrador])

  if (borrador === null) {
    return (
      <main className="pantalla">
        <Cargando que="Armando la sesión de pesaje…" />
      </main>
    )
  }

  if (hato.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={hato.error} />
        <BotonGrande alTocar={() => void hato.refetch()}>Volver a intentar</BotonGrande>
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

  const animales = hato.data?.animales ?? []
  const porAnimal = new Map(animales.map((animal) => [animal.id, animal]))

  // Una fila esperada cuyo animal ya no está en el hato no se propone, pero
  // tampoco se borra a escondidas: se enseña sin nombre para que el dueño
  // decida qué hacer con ella.
  return (
    <EditorDeSesion
      borrador={borrador}
      cuentaId={cuentaId}
      animales={animales}
      porAnimal={porAnimal}
      anteriores={anteriores}
      huboVueltaAnterior={ultima.data !== null && ultima.data !== undefined}
      alCambiar={setCambiado}
    />
  )
}

type PesoAnterior = { readonly kilos: string; readonly fecha: string }

const OPCIONES_DE_CALIDAD = [
  { valor: 'measured', texto: 'Báscula' },
  { valor: 'observed', texto: 'Visto' },
  { valor: 'declared', texto: 'Me lo dijeron' },
] as const

function EditorDeSesion({
  borrador,
  cuentaId,
  animales,
  porAnimal,
  anteriores,
  huboVueltaAnterior,
  alCambiar,
}: {
  readonly borrador: BorradorDePesaje
  readonly cuentaId: string
  readonly animales: readonly Animal[]
  readonly porAnimal: ReadonlyMap<string, Animal>
  readonly anteriores: ReadonlyMap<string, PesoAnterior>
  readonly huboVueltaAnterior: boolean
  readonly alCambiar: Dispatch<SetStateAction<BorradorDePesaje | null>>
}) {
  const registrar = useRegistrarPesaje()
  const [busqueda, setBusqueda] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [masDatos, setMasDatos] = useState(borrador.nota !== '' || borrador.reportedBy !== '')
  const [intentado, setIntentado] = useState(false)
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(0)
  const [elegida, setElegida] = useState<string | null>(null)
  const [cerrada, setCerrada] = useState(false)
  const [ancla, setAncla] = useState<HTMLDivElement | null>(null)

  const filas = borrador.filas
  const conteo = contarFilas(filas)
  const sinFilas = filas.length === 0
  // El turno se queda en el animal que se está escribiendo. Si solo se
  // derivara del primer pendiente, el primer kilo válido lo sacaría de la
  // tarjeta y el siguiente dígito caería en otro becerro.
  const turnoVigente = elegida !== null && filas.some((fila) => fila.id === elegida)
  const activaId = cerrada ? null : turnoVigente ? elegida : (filas.find(esPendiente)?.id ?? null)
  if (!cerrada && activaId !== elegida) {
    setElegida(activaId)
  }
  const activa = activaId === null ? undefined : filas.find((fila) => fila.id === activaId)
  const resto = filas.filter((fila) => fila.id !== activaId)

  const sugeridos = useMemo(() => {
    const enLaSesion = new Set(filas.map((fila) => fila.animalId))
    const limpio = normalizar(busqueda)
    return animales.filter(
      (animal) => !enLaSesion.has(animal.id) && (limpio === '' || coincide(animal, limpio)),
    )
  }, [animales, filas, busqueda])

  // La foto termina de subir después de que el dueño ya siguió capturando.
  // El cambio se aplica al borrador de ahora: si se usara el de cuando se
  // eligió el archivo, se borrarían los kilos escritos mientras tanto.
  const borradorVigente = useRef(borrador)
  useEffect(() => {
    borradorVigente.current = borrador
  }, [borrador])

  const cambiarFila = (id: string, cambios: Partial<FilaBorrador>): void => {
    alCambiar((actual) => {
      const base = actual ?? borradorVigente.current
      return {
        ...base,
        filas: base.filas.map((fila) => {
          if (fila.id !== id) {
            return fila
          }
          // Una foto que llega tarde no revive un renglón quitado ni un hueco.
          if ('evidenciaId' in cambios && fila.resultado !== 'pesado') {
            return fila
          }
          return { ...fila, ...cambios }
        }),
      }
    })
  }

  const quitarFila = (id: string): void => {
    const quedan = filas.filter((fila) => fila.id !== id)
    const proxima = quedan.find(esPendiente)?.id ?? null
    setElegida(proxima)
    setCerrada(proxima === null)
    alCambiar((actual) => {
      const base = actual ?? borradorVigente.current
      return { ...base, filas: base.filas.filter((fila) => fila.id !== id) }
    })
  }

  const agregarAnimal = (animalId: string): void => {
    const fila = filaNueva(animalId)
    setBusqueda('')
    setBuscando(false)
    setCerrada(false)
    setElegida(fila.id)
    alCambiar((actual) => {
      const base = actual ?? borradorVigente.current
      return { ...base, filas: [...base.filas, fila] }
    })
  }

  const marcarHueco = (id: string): void => {
    const comoQuedaran = filas.map((fila) =>
      fila.id === id ? { ...fila, resultado: 'hueco' as const, kilos: '', evidenciaId: null } : fila,
    )
    const proxima = siguientePendiente(comoQuedaran, id)
    setElegida(proxima)
    setCerrada(proxima === null)
    alCambiar((actual) => {
      const base = actual ?? borradorVigente.current
      return {
        ...base,
        filas: base.filas.map((fila) =>
          fila.id === id ? { ...fila, resultado: 'hueco', kilos: '', evidenciaId: null } : fila,
        ),
      }
    })
  }

  const alSiguiente = (): void => {
    if (activaId === null) {
      return
    }
    const actual = filas.find((fila) => fila.id === activaId)
    const proxima = siguientePendiente(filas, activaId)
    if (proxima !== null) {
      setCerrada(false)
      setElegida(proxima)
      return
    }
    if (actual !== undefined && !esPendiente(actual)) {
      setCerrada(true)
      setElegida(null)
    }
  }

  const abrir = (id: string): void => {
    setCerrada(false)
    setElegida(id)
  }

  const enviar = (evento: React.FormEvent<HTMLFormElement>): void => {
    evento.preventDefault()
    setIntentado(true)
    if (registrar.isPending || subiendoFoto > 0) {
      return
    }
    const primeraInvalida = filas.find(esPendiente)
    if (primeraInvalida !== undefined) {
      setCerrada(false)
      setElegida(primeraInvalida.id)
      return
    }
    if (sinFilas || faltaFecha(borrador.fecha)) {
      return
    }

    // Siempre el mismo `commandId` y el mismo `id` del borrador. Un reintento
    // —con o sin recarga en medio— es el mismo comando, así que la API devuelve
    // la sesión guardada en vez de crear otra.
    registrar.mutate(cuerpoDeLaSesion(borrador), {
      onSuccess: (sesion) => {
        borrarBorrador()
        irA({ nombre: 'sesion', sesionId: sesion.id })
      },
    })
  }

  const choqueDeIdempotencia =
    registrar.error instanceof ErrorDeApi && registrar.error.codigo === 'idempotency_mismatch'

  const alTecla = (evento: React.KeyboardEvent<HTMLFormElement>): void => {
    if (
      evento.key !== 'Enter' ||
      evento.target instanceof HTMLButtonElement ||
      evento.target instanceof HTMLTextAreaElement
    ) {
      return
    }
    evento.preventDefault()
    if (evento.target instanceof HTMLInputElement && evento.target.inputMode === 'decimal') {
      alSiguiente()
    }
  }

  return (
    <main className="pantalla pantalla--pesaje">
      <form className="pesaje__cuerpo" onSubmit={enviar} onKeyDown={alTecla}>
        <Encabezado
          titulo="Pesaje"
          etiquetaRegresar="Regresar al hato"
          alRegresar={() => {
            irA({ nombre: 'hato' })
          }}
          subtitulo={
            <FechaDelPesaje
              valor={borrador.fecha}
              alCambiar={(fecha) => {
                alCambiar({ ...borrador, fecha })
              }}
            />
          }
        />
        {intentado && faltaFecha(borrador.fecha) ? (
          <p className="campo__error" role="alert">
            Escoge el día en que se pesó.
          </p>
        ) : null}

        {sinFilas ? null : (
          <div className="pesaje__avance">
            <Avance pesados={conteo.pesados} huecos={conteo.huecos} faltan={conteo.faltan} total={filas.length} />
          </div>
        )}

        {sinFilas ? (
          <div className="vacio">
            <p className="vacio__titulo">Todavía no hay animales en la sesión.</p>
            <p>
              {huboVueltaAnterior
                ? 'Quitaste todos los de la vuelta anterior. Busca abajo los que sí pasaron.'
                : 'Todavía no hay una vuelta anterior que proponer. Busca abajo los animales que pasaron.'}
            </p>
          </div>
        ) : null}

        {activa === undefined ? null : (
          <div className="pesaje__tarjeta pesaje__renglon">
            <Tarjeta activa>
              <TarjetaActiva
                fila={activa}
                animal={porAnimal.get(activa.animalId)}
                anterior={anteriores.get(activa.animalId)}
                fecha={borrador.fecha}
                intentado={intentado}
                ancla={setAncla}
                alCambiar={(cambios) => {
                  cambiarFila(activa.id, cambios)
                }}
                alQuitar={() => {
                  quitarFila(activa.id)
                }}
                alHueco={() => {
                  marcarHueco(activa.id)
                }}
                alSiguiente={alSiguiente}
                alAbrirFoto={() => {
                  abrirFoto(activa.id)
                }}
              />
            </Tarjeta>
          </div>
        )}

        {resto.length === 0 ? null : (
          <ul className="pesaje__lista">
            {resto.map((fila) => (
              <li key={fila.id}>
                <FilaCompacta
                  fila={fila}
                  animal={porAnimal.get(fila.animalId)}
                  comparacion={comparacionDe(fila, anteriores, borrador.fecha)}
                  alAbrir={() => {
                    abrir(fila.id)
                  }}
                />
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="pesaje__agregar"
          onClick={() => {
            setBuscando((actual) => !actual)
          }}
        >
          <IconoMas tamano={18} />
          Agregar otro animal
        </button>

        {buscando ? (
          <div className="pesaje__extra">
            <CampoDeTexto
              etiqueta="Buscar"
              valor={busqueda}
              alCambiar={setBusqueda}
              ayuda="Por nombre, seña o arete."
            />
            {sugeridos.length === 0 ? (
              <p className="campo__ayuda">
                {animales.length === 0
                  ? 'Todavía no hay animales en el hato. Dalos de alta primero.'
                  : 'Ningún animal coincide o ya está en la sesión.'}
              </p>
            ) : (
              <ul className="pesaje__lista">
                {sugeridos.map((animal) => (
                  <li key={animal.id}>
                    <button
                      type="button"
                      className="pesaje__sugerido"
                      onClick={() => {
                        agregarAnimal(animal.id)
                      }}
                    >
                      <span className="pesaje__sugerido-nombre">+ {nombreVisible(animal)}</span>
                      <span className="pesaje__sugerido-datos">{datosDelAnimal(animal)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {masDatos ? (
          <Seccion titulo="Si hace falta">
            <CampoDeTexto
              etiqueta="¿Quién te pasó los números?"
              valor={borrador.reportedBy}
              alCambiar={(reportedBy) => {
                alCambiar({ ...borrador, reportedBy })
              }}
              ayuda="El nombre de quien estaba en la báscula. Si no sabes, déjalo vacío."
              maxLength={200}
            />
            <CampoDeArea
              etiqueta="Nota de la sesión"
              valor={borrador.nota}
              alCambiar={(nota) => {
                alCambiar({ ...borrador, nota })
              }}
              ayuda="Por ejemplo, si hubo que sacar a un animal de la manga."
            />
          </Seccion>
        ) : (
          <BotonGrande
            secundario
            alTocar={() => {
              setMasDatos(true)
            }}
          >
            Agregar quién reportó o una nota
          </BotonGrande>
        )}

        {choqueDeIdempotencia ? (
          <div className="aviso aviso--ojo" role="alert">
            <p className="aviso__titulo">Esta vuelta ya se había guardado con otros datos.</p>
            <p className="aviso__quehacer">
              El primer intento sí llegó al rancho. Lo que está en pantalla ahora no se guardó otra
              vez, para no asentar dos veces los mismos pesos. Abre la sesión guardada para
              revisarla y corregir ahí lo que haga falta, con su motivo.
            </p>
            <BotonGrande
              alTocar={() => {
                // La vuelta ya está en el rancho: el borrador ya no sirve y no
                // debe reaparecer la próxima vez que se abra el pesaje.
                borrarBorrador()
                irA({ nombre: 'sesion', sesionId: borrador.sesionId })
              }}
            >
              Abrir la sesión guardada
            </BotonGrande>
          </div>
        ) : registrar.isError ? (
          <AvisoDeError error={registrar.error} />
        ) : null}

        {registrar.isError && !choqueDeIdempotencia ? (
          <p className="campo__ayuda">
            Lo que escribiste sigue aquí, aunque recargues la pantalla. Vuelve a tocar «Guardar
            pesaje» cuando haya señal: es el mismo envío, no se duplica.
          </p>
        ) : null}

        {/*
          Descartar la vuelta a medias. Va al final y pide un segundo toque: es
          lo único de esta pantalla que tira trabajo, y el dueño tiene que
          querer hacerlo.
        */}
        {confirmandoDescarte ? (
          <div className="aviso aviso--ojo" role="alert">
            <p className="aviso__titulo">¿Tirar esta vuelta a medias?</p>
            <p className="aviso__quehacer">
              Se borra lo que llevas capturado en este celular. Lo que ya se guardó en el rancho no
              se toca.
            </p>
            <BotonGrande
              alTocar={() => {
                borrarBorrador()
                alCambiar(nuevoBorrador(cuentaId, []))
                setElegida(null)
                setCerrada(false)
                setIntentado(false)
                setConfirmandoDescarte(false)
                registrar.reset()
              }}
            >
              Sí, empezar de cero
            </BotonGrande>
            <BotonGrande
              secundario
              alTocar={() => {
                setConfirmandoDescarte(false)
              }}
            >
              Seguir capturando
            </BotonGrande>
          </div>
        ) : (
          <button
            type="button"
            className="enlace"
            onClick={() => {
              setConfirmandoDescarte(true)
            }}
          >
            Empezar una vuelta nueva
          </button>
        )}

        <div className="pesaje__fotos">
          {filas.map((fila) =>
            fila.resultado === 'pesado' ? (
              <FotoDeLaBascula
                key={fila.id}
                evidenciaId={fila.evidenciaId}
                idDelCampo={idDeLaFoto(fila.id)}
                ancla={fila.id === activaId ? ancla : null}
                alCambiar={(evidenciaId) => {
                  cambiarFila(fila.id, { evidenciaId })
                }}
                alOcuparse={(ocupada) => {
                  setSubiendoFoto((cantidad) => cantidad + (ocupada ? 1 : -1))
                }}
              />
            ) : null,
          )}
        </div>

        <BarraDeAccion
          anclaje="ventana"
          sobreLaNavegacion
          nota="Se guarda en el celular mientras capturas"
        >
          <BotonPrincipal
            tipo="submit"
            deshabilitado={registrar.isPending || subiendoFoto > 0}
          >
            {registrar.isPending
              ? 'Guardando…'
              : subiendoFoto > 0
                ? 'Subiendo la foto…'
                : `Guardar pesaje (${String(conteo.pesados)})`}
          </BotonPrincipal>
        </BarraDeAccion>
      </form>
    </main>
  )
}

function FechaDelPesaje({
  valor,
  alCambiar,
}: {
  readonly valor: string
  readonly alCambiar: (fecha: string) => void
}) {
  return (
    <div className="pesaje__fecha">
      <span aria-hidden="true">{fechaDelPesaje(valor)}</span>
      <IconoAbajo tamano={14} />
      <input
        className="pesaje__fecha-input"
        type="date"
        aria-label="¿Cuándo se pesó?"
        value={valor}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
      />
    </div>
  )
}

function SelectorDeCalidad({
  valor,
  comparacion,
  alElegir,
}: {
  readonly valor: CalidadBorrador
  readonly comparacion: ComparacionDePeso | null
  readonly alElegir: (calidad: CalidadBorrador) => void
}) {
  const [abierta, setAbierta] = useState(false)

  return (
    <div className="pesaje__meta">
      <div className="pesaje__diferencia">
        {comparacion === null ? <span /> : (
          <span className="pesaje__pill">{textoDeLaComparacion(comparacion)}</span>
        )}
        <button
          type="button"
          className="pesaje__calidad"
          aria-expanded={abierta}
          onClick={() => {
            setAbierta((actual) => !actual)
          }}
        >
          {calidad(valor)}
          <IconoAbajo tamano={12} />
        </button>
      </div>
      {abierta ? (
        <Segmentado
          etiqueta="¿Cómo se obtuvo?"
          opciones={OPCIONES_DE_CALIDAD}
          valor={valor}
          alElegir={(elegida) => {
            if (esCalidad(elegida)) {
              alElegir(elegida)
            }
          }}
        />
      ) : null}
    </div>
  )
}

function TarjetaActiva({
  fila,
  animal,
  anterior,
  fecha,
  intentado,
  ancla,
  alCambiar,
  alQuitar,
  alHueco,
  alSiguiente,
  alAbrirFoto,
}: {
  readonly fila: FilaBorrador
  readonly animal: Animal | undefined
  readonly anterior: PesoAnterior | undefined
  readonly fecha: string
  readonly intentado: boolean
  readonly ancla: (nodo: HTMLDivElement | null) => void
  readonly alCambiar: (cambios: Partial<FilaBorrador>) => void
  readonly alQuitar: () => void
  readonly alHueco: () => void
  readonly alSiguiente: () => void
  readonly alAbrirFoto: () => void
}) {
  const nombre = nombreDe(animal)
  const revision = revisarKilos(fila.kilos)
  const error =
    intentado && fila.resultado === 'pesado' && !revision.ok ? revision.motivo : undefined
  const dias = anterior === undefined ? null : diasEntre(anterior.fecha, fecha)
  const comparacion =
    fila.resultado === 'pesado' && revision.ok && anterior !== undefined
      ? compararConElAnterior(fila.kilos, anterior.kilos, dias ?? -1)
      : null

  return (
    <>
      <div className="pesaje__animal">
        <span className="pesaje__nombre">{nombre}</span>
        <button type="button" className="enlace" onClick={alQuitar}>
          Quitar
        </button>
      </div>
      {anterior === undefined ? null : <p className="pesaje__antes">{textoDeAntes(anterior, fecha)}</p>}

      {fila.resultado === 'hueco' ? (
        <div className="renglon__hueco">
          <p className="renglon__hueco-texto">No se pesó.</p>
          <button
            type="button"
            className="enlace"
            onClick={() => {
              alCambiar({ resultado: 'pesado' })
            }}
          >
            Sí se pesó
          </button>
        </div>
      ) : (
        <>
          <CampoDeKilos
            key={`kilos-${fila.id}`}
            etiqueta={`Kilos de ${nombre}`}
            valor={fila.kilos}
            enfocar
            {...(error === undefined ? {} : { error })}
            alCambiar={(kilos) => {
              alCambiar({ kilos })
            }}
            alTomarFoto={alAbrirFoto}
          />
          <div ref={ancla} />
          <SelectorDeCalidad
            key={`calidad-${fila.id}`}
            valor={fila.calidad}
            comparacion={comparacion}
            alElegir={(elegida) => {
              alCambiar({ calidad: elegida })
            }}
          />
          <div className="pesaje__acciones">
            <button type="button" className="pesaje__no" onClick={alHueco}>
              No se pesó
            </button>
            <button type="button" className="pesaje__siguiente" onClick={alSiguiente}>
              Siguiente
            </button>
          </div>
        </>
      )}
    </>
  )
}

function FilaCompacta({
  fila,
  animal,
  comparacion,
  alAbrir,
}: {
  readonly fila: FilaBorrador
  readonly animal: Animal | undefined
  readonly comparacion: ComparacionDePeso | null
  readonly alAbrir: () => void
}) {
  const nombre = nombreDe(animal)
  const pesado = fila.resultado === 'pesado' && revisarKilos(fila.kilos).ok
  const hueco = fila.resultado === 'hueco'
  const estado = hueco ? 'No se pesó' : pesado ? (comparacion?.diferencia ?? '') : 'Falta'
  const peso = pesado ? kilosLegibles(fila.kilos) : ''
  const tono = hueco ? 'hueco' : pesado ? 'pesado' : 'falta'

  return (
    <button
      type="button"
      className={tono === 'falta' ? 'pesaje__fila pesaje__fila--falta pesaje__renglon' : 'pesaje__fila pesaje__renglon'}
      onClick={alAbrir}
    >
      <span className={`pesaje__icono pesaje__icono--${tono}`} aria-hidden="true">
        {tono === 'pesado' ? <IconoPalomita /> : tono === 'hueco' ? <IconoCerrar tamano={16} /> : <IconoReloj />}
      </span>
      <span className="pesaje__fila-nombre">{nombre}</span>
      {estado === '' ? null : <span className="pesaje__fila-estado">{estado}</span>}
      {peso === '' ? null : <span className="pesaje__fila-peso">{peso}</span>}
    </button>
  )
}

/**
 * El cuerpo de «registrar sesión», armado desde el borrador.
 *
 * Los kilos viajan tal como se escribieron, solo sin espacios: no se convierten
 * a `number` ni se reformatean. La API los vuelve a leer con aritmética entera.
 * Un hueco no lleva kilos ni calidad.
 */
function cuerpoDeLaSesion(borrador: BorradorDePesaje): RegistrarSesion {
  const nota = borrador.nota.trim()
  const reportedBy = borrador.reportedBy.trim()

  return {
    commandId: borrador.commandId,
    id: borrador.sesionId,
    fecha: borrador.fecha,
    filas: borrador.filas.map((fila) =>
      fila.resultado === 'hueco'
        ? { id: fila.id, animalId: fila.animalId, resultado: 'hueco' }
        : {
            id: fila.id,
            animalId: fila.animalId,
            resultado: 'pesado',
            kilos: fila.kilos.trim(),
            calidad: fila.calidad,
            ...(fila.evidenciaId === null ? {} : { evidenciaId: fila.evidenciaId }),
          },
    ),
    ...(nota === '' ? {} : { nota }),
    ...(reportedBy === '' ? {} : { reportedBy }),
  }
}

/**
 * Un borrador nuevo. Los dos ids —la sesión y el comando— se generan aquí, una
 * sola vez, y viven en el borrador: mientras no se guarde con éxito, cualquier
 * reintento manda los mismos.
 *
 * `esperados` son los animales de la vuelta anterior. Se proponen como filas
 * vacías, listas para que el dueño escriba los kilos que le pasaron. La fecha
 * viene con hoy en el rancho y se puede cambiar.
 */
function nuevoBorrador(cuentaId: string, esperados: readonly string[]): BorradorDePesaje {
  return {
    version: 2,
    cuentaId,
    fecha: hoyEnElRancho(),
    nota: '',
    reportedBy: '',
    sesionId: crypto.randomUUID(),
    commandId: crypto.randomUUID(),
    filas: esperados.map(filaNueva),
  }
}

function filaNueva(animalId: string): FilaBorrador {
  return {
    id: crypto.randomUUID(),
    animalId,
    resultado: 'pesado',
    kilos: '',
    calidad: 'measured',
    evidenciaId: null,
  }
}

function faltaFecha(fecha: string): boolean {
  return !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
}

function datosDelAnimal(animal: Animal): string {
  const puesto = animal.marcas.find((marca) => marca.estado === 'active')
  const arete =
    puesto === undefined ? 'Sin arete puesto' : `${tipoDeMarca(puesto.tipo)} ${puesto.valor}`
  return `${arete} · ${categoria(animal.categoria)}`
}

function nombreDe(animal: Animal | undefined): string {
  return animal === undefined ? 'Animal que ya no está en el hato' : nombreVisible(animal)
}

/** El último peso de cada animal en la vuelta anterior. Un hueco no es un peso. */
function pesosAnteriores(sesion: SesionDePesaje | null | undefined): ReadonlyMap<string, PesoAnterior> {
  const mapa = new Map<string, PesoAnterior>()
  if (sesion === null || sesion === undefined) {
    return mapa
  }
  for (const fila of sesion.filas) {
    if (fila.resultado === 'pesado') {
      mapa.set(fila.animalId, { kilos: fila.kilos, fecha: sesion.fecha })
    }
  }
  return mapa
}

function esPendiente(fila: FilaBorrador): boolean {
  return fila.resultado === 'pesado' && !revisarKilos(fila.kilos).ok
}

/** El siguiente que todavía no tiene kilos, después de `desdeId`, dando la vuelta. */
function siguientePendiente(filas: readonly FilaBorrador[], desdeId: string): string | null {
  const indice = filas.findIndex((fila) => fila.id === desdeId)
  if (indice < 0) {
    return filas.find(esPendiente)?.id ?? null
  }
  for (let paso = 1; paso < filas.length; paso += 1) {
    const fila = filas[(indice + paso) % filas.length]
    if (fila !== undefined && esPendiente(fila)) {
      return fila.id
    }
  }
  return null
}

function contarFilas(filas: readonly FilaBorrador[]): {
  pesados: number
  huecos: number
  faltan: number
} {
  let pesados = 0
  let huecos = 0
  let faltan = 0
  for (const fila of filas) {
    if (fila.resultado === 'hueco') {
      huecos += 1
    } else if (revisarKilos(fila.kilos).ok) {
      pesados += 1
    } else {
      faltan += 1
    }
  }
  return { pesados, huecos, faltan }
}

function Avance({
  pesados,
  huecos,
  faltan,
  total,
}: {
  readonly pesados: number
  readonly huecos: number
  readonly faltan: number
  readonly total: number
}) {
  const detalle = detalleDeAvance(huecos, faltan)
  return (
    <BarraDeAvance
      texto={`${String(pesados)} de ${String(total)} pesados`}
      {...(detalle === undefined ? {} : { detalle })}
      pesados={pesados}
      sinPeso={huecos}
      total={total}
    />
  )
}

function detalleDeAvance(huecos: number, faltan: number): string | undefined {
  const partes: string[] = []
  if (huecos === 1) {
    partes.push('1 no se pesó')
  } else if (huecos > 1) {
    partes.push(`${String(huecos)} no se pesaron`)
  }
  if (faltan === 1) {
    partes.push('1 falta')
  } else if (faltan > 1) {
    partes.push(`${String(faltan)} faltan`)
  }
  if (partes.length === 0) {
    return undefined
  }
  return partes.join(' · ')
}

function comparacionDe(
  fila: FilaBorrador,
  anteriores: ReadonlyMap<string, PesoAnterior>,
  fecha: string,
): ComparacionDePeso | null {
  if (fila.resultado !== 'pesado' || !revisarKilos(fila.kilos).ok) {
    return null
  }
  const anterior = anteriores.get(fila.animalId)
  if (anterior === undefined) {
    return null
  }
  const dias = diasEntre(anterior.fecha, fecha)
  return compararConElAnterior(fila.kilos, anterior.kilos, dias ?? -1)
}

function textoDeAntes(anterior: PesoAnterior, fecha: string): string {
  const peso = `Antes: ${kilosLegibles(anterior.kilos)}`
  const dias = diasEntre(anterior.fecha, fecha)
  if (dias === null || dias < 0) {
    return peso
  }
  return `${peso} · ${diasLegibles(dias)}`
}

function textoDeLaComparacion(comparacion: ComparacionDePeso): string {
  if (comparacion.porDia === null) {
    return comparacion.diferencia
  }
  return `${comparacion.diferencia} · ${comparacion.porDia}`
}

function esCalidad(valor: string): valor is CalidadBorrador {
  return valor === 'measured' || valor === 'observed' || valor === 'declared'
}

function idDeLaFoto(filaId: string): string {
  return `foto-${filaId}`
}

function abrirFoto(filaId: string): void {
  const campo = document.getElementById(idDeLaFoto(filaId))
  if (campo instanceof HTMLInputElement) {
    campo.click()
  }
}
