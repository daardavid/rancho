import type { RegistrarSesion } from '@rancho/api-contracts'
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import { useHato } from '../api/hato'
import { ErrorDeApi } from '../api/http'
import { useRegistrarPesaje, useUltimaSesion } from '../api/pesajes'
import { coincide, normalizar, nombreVisible } from '../dominio/animal'
import {
  borrarBorrador,
  guardarBorrador,
  leerBorrador,
  type BorradorDePesaje,
  type CalidadBorrador,
  type FilaBorrador,
} from '../dominio/borrador'
import { hoyEnElRancho } from '../dominio/fechas'
import { CALIDADES, categoria, tipoDeMarca } from '../dominio/etiquetas'
import { revisarKilos } from '../dominio/kilos'
import type { Animal } from '../dominio/tipos'
import { irA } from '../ruta'
import { AvisoDeError, BotonGrande, Cargando } from '../ui/Avisos'
import { FotoDeLaBascula } from '../ui/FotoDeLaBascula'
import {
  CampoDeArea,
  CampoDeFecha,
  CampoDeSeleccion,
  CampoDeTexto,
  Seccion,
} from '../ui/Campos'

/**
 * Una vuelta por la báscula, de una sola sentada ([UX-07](../../../../../docs/product/ux-principles.md)).
 *
 * La sesión ya viene armada con los animales de la vuelta anterior como
 * esperados, porque casi siempre son los mismos ([UX-06](../../../../../docs/product/ux-principles.md)).
 * El dueño solo escribe los kilos de los que pasaron, marca «no se pesó» a los
 * que se esperaban y no pasaron, y agrega o quita los que hagan falta. Todo se
 * manda en un solo comando, con un solo botón.
 *
 * Dos cosas se cuidan aquí porque cuestan caro si se pierden:
 *
 * 1. **Nada escrito se pierde al recargar.** El borrador vive en el celular
 *    ([borrador.ts](../dominio/borrador.ts)) con el id de la sesión y el id del
 *    comando ya generados.
 * 2. **Un reintento no duplica.** Esos dos ids se generan una vez, al empezar
 *    el borrador, y no cambian aunque se caiga la señal o se recargue la
 *    pantalla: la API devuelve la sesión que ya guardó en vez de crear otra.
 */
export function Pesaje() {
  const hato = useHato()
  const ultima = useUltimaSesion()

  /** Lo que había guardado en el celular al abrir la pantalla, si algo había. */
  const [guardado] = useState(() => leerBorrador())
  /** Lo que el dueño ha tocado en esta visita. `null` es «todavía no toca nada». */
  const [cambiado, setCambiado] = useState<BorradorDePesaje | null>(null)

  const esperados = useMemo(() => {
    if (ultima.data === null || ultima.data === undefined) {
      return []
    }
    return ultima.data.filas.map((fila) => fila.animalId)
  }, [ultima.data])

  /**
   * La propuesta se arma una sola vez, cuando ya se sabe qué animales había en
   * la vuelta anterior. Sin vuelta anterior no se propone a nadie: el rancho no
   * ha pesado todavía y no se inventa qué animales se esperaban.
   *
   * `useMemo` y no un efecto: los ids se generan aquí y no pueden cambiar en
   * cada repintado, o un reintento mandaría otro comando.
   */
  const propuesto = useMemo(() => {
    if (guardado !== null || hato.isPending || ultima.isPending) {
      return null
    }
    return nuevoBorrador(ultima.isError ? [] : esperados)
  }, [guardado, hato.isPending, ultima.isPending, ultima.isError, esperados])

  // Un borrador guardado manda sobre la propuesta: es lo último que el dueño
  // escribió, posiblemente a media captura.
  const borrador = cambiado ?? guardado ?? propuesto

  // A cada cambio se guarda el borrador. Es barato y es lo que salva la captura
  // si el celular se apaga o el dueño cierra la pestaña sin querer.
  useEffect(() => {
    if (borrador !== null) {
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
      animales={animales}
      porAnimal={porAnimal}
      huboVueltaAnterior={ultima.data !== null && ultima.data !== undefined}
      alCambiar={setCambiado}
    />
  )
}

function EditorDeSesion({
  borrador,
  animales,
  porAnimal,
  huboVueltaAnterior,
  alCambiar,
}: {
  readonly borrador: BorradorDePesaje
  readonly animales: readonly Animal[]
  readonly porAnimal: ReadonlyMap<string, Animal>
  readonly huboVueltaAnterior: boolean
  readonly alCambiar: Dispatch<SetStateAction<BorradorDePesaje | null>>
}) {
  const registrar = useRegistrarPesaje()
  const [busqueda, setBusqueda] = useState('')
  const [masDatos, setMasDatos] = useState(borrador.nota !== '' || borrador.reportedBy !== '')
  const [intentado, setIntentado] = useState(false)
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(0)

  const filas = borrador.filas
  const capturados = filas.filter(
    (fila) => fila.resultado === 'hueco' || revisarKilos(fila.kilos).ok,
  )
  const faltan = filas.filter(
    (fila) => fila.resultado === 'pesado' && !revisarKilos(fila.kilos).ok,
  )
  const sinFilas = filas.length === 0

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
    alCambiar({ ...borrador, filas: filas.filter((fila) => fila.id !== id) })
  }

  const agregarAnimal = (animalId: string): void => {
    setBusqueda('')
    alCambiar({
      ...borrador,
      filas: [...filas, filaNueva(animalId)],
    })
  }

  const marcarFaltantesComoNoPesados = (): void => {
    alCambiar({
      ...borrador,
      filas: filas.map((fila) =>
        fila.resultado === 'pesado' && !revisarKilos(fila.kilos).ok
          ? { ...fila, resultado: 'hueco' }
          : fila,
      ),
    })
  }

  const enviar = (evento: React.FormEvent<HTMLFormElement>): void => {
    evento.preventDefault()
    setIntentado(true)
    if (
      registrar.isPending ||
      subiendoFoto > 0 ||
      sinFilas ||
      faltan.length > 0 ||
      faltaFecha(borrador.fecha)
    ) {
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

  return (
    <main className="pantalla">
      <header className="encabezado">
        <p className="saludo">Pesaje</p>
        <h1>La vuelta por la báscula</h1>
        <p className="subtitulo">
          {sinFilas
            ? 'Agrega los animales que pasaron por la báscula.'
            : `${String(filas.length)} ${filas.length === 1 ? 'animal' : 'animales'} · ${String(
                capturados.length,
              )} ${capturados.length === 1 ? 'capturado' : 'capturados'}`}
        </p>
      </header>

      <form className="formulario" onSubmit={enviar}>
        <CampoDeFecha
          etiqueta="¿Cuándo se pesó?"
          valor={borrador.fecha}
          alCambiar={(fecha) => alCambiar({ ...borrador, fecha })}
          ayuda="Viene con hoy. Cámbialo si la vuelta fue otro día."
        />
        {intentado && faltaFecha(borrador.fecha) ? (
          <p className="campo__error" role="alert">
            Escoge el día en que se pesó.
          </p>
        ) : null}

        <Seccion titulo="Los animales de esta vuelta">
          {sinFilas ? (
            <div className="vacio">
              <p className="vacio__titulo">Todavía no hay animales en la sesión.</p>
              <p>
                {huboVueltaAnterior
                  ? 'Quitaste todos los de la vuelta anterior. Busca abajo los que sí pasaron.'
                  : 'Todavía no hay una vuelta anterior que proponer. Busca abajo los animales que pasaron.'}
              </p>
            </div>
          ) : (
            <ul className="lista lista--planas">
              {filas.map((fila) => (
                <li key={fila.id}>
                  <RenglonDePesaje
                    fila={fila}
                    animal={porAnimal.get(fila.animalId)}
                    intentado={intentado}
                    alCambiar={(cambios) => cambiarFila(fila.id, cambios)}
                    alQuitar={() => quitarFila(fila.id)}
                    alOcuparse={(ocupada) => {
                      setSubiendoFoto((cantidad) => cantidad + (ocupada ? 1 : -1))
                    }}
                  />
                </li>
              ))}
            </ul>
          )}

          {faltan.length > 0 ? (
            <div className="vacio">
              <p className="vacio__titulo">
                {faltan.length === 1
                  ? 'Falta 1 por capturar'
                  : `Faltan ${String(faltan.length)} por capturar`}
              </p>
              <p>
                Escribe los kilos de cada uno, o marca «no se pesó» a los que se esperaban y no
                pasaron.
              </p>
              {faltan.length > 1 ? (
                <BotonGrande secundario alTocar={marcarFaltantesComoNoPesados}>
                  Los que faltan no se pesaron
                </BotonGrande>
              ) : null}
            </div>
          ) : null}
        </Seccion>

        <Seccion titulo="Agregar un animal">
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
            <ul className="lista lista--planas">
              {sugeridos.map((animal) => (
                <li key={animal.id}>
                  <button
                    type="button"
                    className="fila"
                    onClick={() => {
                      agregarAnimal(animal.id)
                    }}
                  >
                    <span className="fila__nombre">+ {nombreVisible(animal)}</span>
                    <span className="fila__datos">{datosDelAnimal(animal)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Seccion>

        {masDatos ? (
          <Seccion titulo="Si hace falta">
            <CampoDeTexto
              etiqueta="¿Quién te pasó los números?"
              valor={borrador.reportedBy}
              alCambiar={(reportedBy) => alCambiar({ ...borrador, reportedBy })}
              ayuda="El nombre de quien estaba en la báscula. Si no sabes, déjalo vacío."
              maxLength={200}
            />
            <CampoDeArea
              etiqueta="Nota de la sesión"
              valor={borrador.nota}
              alCambiar={(nota) => alCambiar({ ...borrador, nota })}
              ayuda="Por ejemplo, si hubo que sacar a un animal de la manga."
            />
          </Seccion>
        ) : (
          <BotonGrande secundario alTocar={() => setMasDatos(true)}>
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

        <BotonGrande tipo="submit" deshabilitado={registrar.isPending || subiendoFoto > 0}>
          {registrar.isPending
            ? 'Guardando…'
            : subiendoFoto > 0
              ? 'Subiendo la foto…'
              : sinFilas
                ? 'Todavía no hay nada que guardar'
                : 'Guardar la sesión'}
        </BotonGrande>

        {registrar.isError && !choqueDeIdempotencia ? (
          <p className="campo__ayuda">
            Lo que escribiste sigue aquí, aunque recargues la pantalla. Vuelve a tocar «Guardar la
            sesión» cuando haya señal: es el mismo envío, no se duplica.
          </p>
        ) : null}

        <BotonGrande
          secundario
          alTocar={() => {
            irA({ nombre: 'hato' })
          }}
        >
          Regresar al hato
        </BotonGrande>

        {/*
          Descartar la vuelta a medias. Va al final y pide un segundo toque: es
          lo único de esta pantalla que tira trabajo, y el dueño tiene que
          querer hacerlo ([UX-15](../../../../../docs/product/ux-principles.md)).
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
                alCambiar(nuevoBorrador([]))
                setIntentado(false)
                setConfirmandoDescarte(false)
                registrar.reset()
              }}
            >
              Sí, empezar de cero
            </BotonGrande>
            <BotonGrande secundario alTocar={() => setConfirmandoDescarte(false)}>
              Seguir capturando
            </BotonGrande>
          </div>
        ) : (
          <button
            type="button"
            className="enlace"
            onClick={() => setConfirmandoDescarte(true)}
          >
            Empezar una vuelta nueva
          </button>
        )}
      </form>
    </main>
  )
}

function RenglonDePesaje({
  fila,
  animal,
  intentado,
  alCambiar,
  alQuitar,
  alOcuparse,
}: {
  readonly fila: FilaBorrador
  readonly animal: Animal | undefined
  readonly intentado: boolean
  readonly alCambiar: (cambios: Partial<FilaBorrador>) => void
  readonly alQuitar: () => void
  readonly alOcuparse: (ocupada: boolean) => void
}) {
  const revision = revisarKilos(fila.kilos)
  const error =
    intentado && fila.resultado === 'pesado' && !revision.ok ? revision.motivo : undefined

  return (
    <div className="renglon">
      <div className="renglon__encabezado">
        <span className="renglon__nombre">
          {animal === undefined ? 'Animal que ya no está en el hato' : nombreVisible(animal)}
        </span>
        <span className="renglon__quitar">
          <button type="button" className="enlace" onClick={alQuitar}>
            Quitar
          </button>
        </span>
      </div>
      {animal === undefined ? null : (
        <span className="renglon__datos">{datosDelAnimal(animal)}</span>
      )}

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
        <div className="renglon__captura">
          <CampoDeTexto
            etiqueta="Kilos"
            valor={fila.kilos}
            alCambiar={(kilos) => alCambiar({ kilos })}
            inputMode="decimal"
            maxLength={16}
            {...(error === undefined ? {} : { error })}
          />
          <CampoDeSeleccion
            etiqueta="¿Cómo se obtuvo?"
            opciones={CALIDADES}
            valor={fila.calidad}
            alCambiar={(calidad) => alCambiar({ calidad: calidad as CalidadBorrador })}
          />
          <FotoDeLaBascula
            evidenciaId={fila.evidenciaId}
            alCambiar={(evidenciaId) => alCambiar({ evidenciaId })}
            alOcuparse={alOcuparse}
          />
          <BotonGrande
            secundario
            alTocar={() => alCambiar({ resultado: 'hueco', kilos: '', evidenciaId: null })}
          >
            No se pesó
          </BotonGrande>
        </div>
      )}
    </div>
  )
}

/**
 * El cuerpo de «registrar sesión», armado desde el borrador.
 *
 * Los kilos viajan tal como se escribieron, solo sin espacios: no se convierten
 * a `number` ni se reformatean. La API los vuelve a leer con aritmética entera.
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
function nuevoBorrador(esperados: readonly string[]): BorradorDePesaje {
  return {
    version: 1,
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
