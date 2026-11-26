import type { LugaresDelHato, PotrerosDelRancho } from '@rancho/api-contracts'
import { useRef, useState } from 'react'

import { useFicha, useHato } from '../api/hato'
import { useAsignarLugar, useLugares, usePotreros } from '../api/lugar'
import { useRegistrarNacimiento } from '../api/nacimientos'
import { coincide, nombreVisible, normalizar, puedeSerMadre } from '../dominio/animal'
import {
  MOTIVOS_DE_LA_MADRE,
  PRECISIONES_DE_FECHA,
  SEXOS,
  TENENCIAS,
  categoria,
  opcionesElegibles,
  tenencia as textoDeTenencia,
  tipoDeMarca,
} from '../dominio/etiquetas'
import { hoyEnElRancho } from '../dominio/fechas'
import type { Animal, FichaCompleta } from '../dominio/tipos'
import { irA } from '../ruta'
import { Miniatura } from '../ui/Miniatura'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { useEnfocarAviso } from '../ui/enfocar'
import { BarraDeAccion } from '../ui/BarraDeAccion'
import { BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { CampoDeArea, CampoDeFecha, CampoDeTexto } from '../ui/Campos'
import { Desplegable } from '../ui/Desplegable'
import { Encabezado } from '../ui/Encabezado'
import { Pildoras } from '../ui/Pildoras'
import { Segmentado } from '../ui/Segmentado'
import { IconoCerrar } from '../ui/iconos'

/**
 * Registrar un nacimiento.
 *
 * Un solo envío crea la cría y la filiación. Si se abrió desde la ficha de
 * una vaca, ella viene elegida, pero la certeza no: hay que decir si se la
 * vio, si queda inferida o si no se sabe. El padre tampoco viene marcado.
 * La tenencia y el potrero de la madre se proponen; no se escriben hasta
 * aceptar. Una madre a la parte propone «Dueño: no sé».
 */

const OPCIONES_DE_SEXO = opcionesElegibles(SEXOS)
const OPCIONES_DE_FECHA = opcionesElegibles(PRECISIONES_DE_FECHA)
const OPCIONES_DE_TENENCIA = opcionesElegibles(TENENCIAS)
const OPCIONES_DE_MOTIVO = opcionesElegibles(MOTIVOS_DE_LA_MADRE)
const CERTEZA_DE_MADRE = [
  { valor: 'observed', texto: 'La vi' },
  { valor: 'inferred', texto: 'Inferida' },
  { valor: 'unknown', texto: 'No sé' },
]

type CertezaMadre = 'observed' | 'inferred' | 'unknown'
type CertezaEnBorrador = CertezaMadre | ''
type MotivoMadre = 'parto_visto' | 'dicho_de_trabajador' | 'otro'
type ModoPadre = '' | 'unknown' | 'unico_toro' | 'observed' | 'inferred'
type Precision = 'exact' | 'approximate' | 'unknown'
type Tenencia = 'ranch' | 'a_la_parte' | 'third_party' | 'unknown'
type Lado = {
  readonly certeza: CertezaMadre
  readonly animalId: string | null
  readonly motivo: 'parto_visto' | 'dicho_de_trabajador' | 'unico_toro' | 'otro' | null
}

type Borrador = {
  readonly fecha: string
  readonly precision: Precision
  readonly sexo: 'female' | 'male' | 'unknown'
  readonly madreId: string | null
  readonly certezaMadre: CertezaEnBorrador
  readonly motivoMadre: MotivoMadre | ''
  readonly modoPadre: ModoPadre
  readonly motivoPadre: MotivoMadre | ''
  readonly nombre: string
  readonly arete: string
  readonly tenencia: Tenencia
  readonly nota: string
  /** La propuesta de la madre no se escribe hasta este sí. */
  readonly propuestaAceptada: boolean
  readonly escribirLugar: boolean
  readonly potreroAceptado: string | null
}

type Envio = {
  readonly contenido: string
  readonly commandId: string
  readonly id: string
  readonly filiacionId: string
  readonly marcaId: string
}

export function Nacimiento({ madreId }: { readonly madreId: string | null }) {
  if (madreId === null) {
    return <FormularioDeNacimiento madre={null} />
  }
  return <NacimientoDesdeLaFicha madreId={madreId} />
}

function NacimientoDesdeLaFicha({ madreId }: { readonly madreId: string }) {
  const ficha = useFicha(madreId)

  if (ficha.isPending) {
    return (
      <main className="pantalla">
        <Cargando que="Trayendo la vaca…" />
      </main>
    )
  }

  if (ficha.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={ficha.error} />
      </main>
    )
  }

  return <FormularioDeNacimiento madre={ficha.data} />
}

function FormularioDeNacimiento({ madre }: { readonly madre: FichaCompleta | null }) {
  const hato = useHato()
  const lugares = useLugares()
  const potreros = usePotreros()
  const registrar = useRegistrarNacimiento()
  const asignar = useAsignarLugar()
  const preseleccion = madre !== null && puedeSerMadre(madre) ? madre.id : null
  const [borrador, setBorrador] = useState<Borrador>({
    fecha: '',
    precision: 'unknown',
    sexo: 'unknown',
    madreId: preseleccion,
    certezaMadre: '',
    motivoMadre: '',
    modoPadre: '',
    motivoPadre: '',
    nombre: '',
    arete: '',
    tenencia: 'unknown',
    nota: '',
    propuestaAceptada: false,
    escribirLugar: false,
    potreroAceptado: null,
  })
  const [aviso, setAviso] = useState<string | null>(null)
  // El texto del aviso no cambia si se vuelve a enviar el mismo error. El
  // contador sí, y así el foco regresa al aviso aunque la cadena sea la misma.
  const [intentosDeValidacion, setIntentosDeValidacion] = useState(0)
  const formulario = useRef<HTMLFormElement>(null)
  const señalDeAviso =
    aviso ?? (registrar.isError ? 'registrar' : asignar.isError ? 'lugar' : null)
  useEnfocarAviso(
    formulario,
    señalDeAviso === null ? null : `${señalDeAviso}:${String(intentosDeValidacion)}`,
  )
  const envio = useRef<Envio | null>(null)
  const lugarEnvio = useRef<{ contenido: string; commandId: string; asignacionId: string } | null>(null)
  /**
   * Si el parto ya se guardó y el potrero falló, el reintento no crea otra cría
   * ni usa lo que el formulario cambió después.
   */
  const criaRegistrada = useRef<{
    animalId: string
    aceptoLugar: boolean
    potreroAceptado: string | null
    desde: string
  } | null>(null)

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
      </main>
    )
  }

  const animales = hato.data.animales
  const madres = madresElegibles(animales, madre)
  const toros = animales.filter((animal) => animal.categoria === 'bull')
  const toroUnico = toros.length === 1 ? toros[0] : undefined
  const madreElegida =
    madres.find((animal) => animal.id === borrador.madreId) ??
    (madre !== null && madre.id === borrador.madreId ? madre : null)
  const aLaParte = madreElegida?.tenencia === 'a_la_parte'
  const lugarDeMadre =
    madreElegida === null
      ? null
      : lugarDeLaMadre(
          madreElegida.id,
          lugares.data,
          potreros.data,
          potreros.isPending,
          potreros.isError,
        )

  const cambiar = (cambios: Partial<Borrador>): void => {
    setAviso(null)
    setBorrador((actual) => ({ ...actual, ...cambios }))
  }

  const asignarLugarDeLaCria = (guardada: NonNullable<typeof criaRegistrada.current>): void => {
    if (!guardada.aceptoLugar) {
      irA({ nombre: 'ficha', animalId: guardada.animalId })
      return
    }
    const { animalId, potreroAceptado, desde } = guardada
    const clave = JSON.stringify({ animalId, potreroAceptado, desde })
    if (lugarEnvio.current === null || lugarEnvio.current.contenido !== clave) {
      lugarEnvio.current = {
        contenido: clave,
        commandId: crypto.randomUUID(),
        asignacionId: crypto.randomUUID(),
      }
    }
    const pendiente = lugarEnvio.current
    asignar.mutate(
      {
        commandId: pendiente.commandId,
        potreroId: potreroAceptado,
        desde,
        animales: [{ animalId, asignacionId: pendiente.asignacionId }],
      },
      {
        onSuccess: () => {
          irA({ nombre: 'ficha', animalId })
        },
      },
    )
  }

  const guardar = (): void => {
    if (registrar.isPending || asignar.isPending) {
      return
    }
    const armado = armar(borrador, toroUnico, aLaParte === true)
    if (armado.aviso !== null) {
      setAviso(armado.aviso)
      setIntentosDeValidacion((actual) => actual + 1)
      return
    }
    if (criaRegistrada.current !== null) {
      asignarLugarDeLaCria(criaRegistrada.current)
      return
    }
    const aceptoLugar = borrador.propuestaAceptada && borrador.escribirLugar
    const potreroAceptado = borrador.potreroAceptado
    const desde =
      borrador.precision === 'unknown' || borrador.fecha === '' ? hoyEnElRancho() : borrador.fecha

    // El arete no viaja en el cuerpo: se añade como marca. Si solo cambia el
    // arete antes de reintentar, es otro comando; si no, se reutiliza el mismo.
    const clave = JSON.stringify({ cuerpo: armado.cuerpo, arete: armado.arete ?? null })
    if (envio.current === null || envio.current.contenido !== clave) {
      envio.current = {
        contenido: clave,
        commandId: crypto.randomUUID(),
        id: crypto.randomUUID(),
        filiacionId: crypto.randomUUID(),
        marcaId: crypto.randomUUID(),
      }
    }
    const ids = envio.current
    registrar.mutate(
      {
        commandId: ids.commandId,
        id: ids.id,
        filiacionId: ids.filiacionId,
        ...armado.cuerpo,
        ...(armado.arete === undefined
          ? {}
          : { marca: { marcaId: ids.marcaId, tipo: 'siniiga' as const, valor: armado.arete } }),
      },
      {
        onSuccess: (nacimiento) => {
          const guardada = {
            animalId: nacimiento.animal.id,
            aceptoLugar,
            potreroAceptado,
            desde,
          }
          criaRegistrada.current = guardada
          asignarLugarDeLaCria(guardada)
        },
      },
    )
  }

  return (
    <main className="pantalla pantalla--alta">
      <Encabezado
        titulo="Nacimiento"
        subtitulo="La cría y quiénes son sus padres, en un solo paso."
        compacto
        acciones={[
          {
            etiqueta: 'Cerrar',
            icono: <IconoCerrar />,
            alTocar: () => {
              irA(madre === null ? { nombre: 'hato' } : { nombre: 'ficha', animalId: madre.id })
            },
          },
        ]}
      />

      <form
        ref={formulario}
        className="formulario alta"
        onSubmit={(evento) => {
          evento.preventDefault()
          guardar()
        }}
      >
        <Segmentado
          etiqueta="Fecha de nacimiento"
          opciones={OPCIONES_DE_FECHA}
          valor={borrador.precision}
          alElegir={(precision) => {
            cambiar({ precision: precision as Precision })
          }}
        />
        {borrador.precision === 'unknown' ? null : (
          <CampoDeFecha
            etiqueta={borrador.precision === 'exact' ? 'Día del parto' : 'Día aproximado'}
            valor={borrador.fecha}
            alCambiar={(fecha) => {
              cambiar({ fecha })
            }}
            ayuda="Si no la sabes, vuelve a «No sé». Una fecha aproximada no se guarda como exacta."
          />
        )}

        <Segmentado
          etiqueta="Sexo"
          opciones={OPCIONES_DE_SEXO}
          valor={borrador.sexo}
          alElegir={(sexo) => {
            cambiar({ sexo: sexo as Borrador['sexo'] })
          }}
        />

        <Madre
          madres={madres}
          madreId={borrador.certezaMadre === 'unknown' ? '' : (borrador.madreId ?? '')}
          certeza={borrador.certezaMadre}
          motivo={borrador.motivoMadre}
          alElegirMadre={(id) => {
            if (id === '') {
              cambiar({
                madreId: null,
                certezaMadre: 'unknown',
                motivoMadre: '',
                ...sinPropuesta(),
              })
              return
            }
            cambiar({
              madreId: id,
              certezaMadre:
                borrador.certezaMadre === 'unknown' || borrador.certezaMadre === ''
                  ? ''
                  : borrador.certezaMadre,
              ...sinPropuesta(),
            })
          }}
          alElegirCerteza={(certeza) => {
            if (certeza === 'unknown') {
              cambiar({
                certezaMadre: 'unknown',
                madreId: null,
                motivoMadre: '',
                ...sinPropuesta(),
              })
              return
            }
            cambiar({ certezaMadre: certeza })
          }}
          alElegirMotivo={(motivo) => {
            cambiar({ motivoMadre: motivo })
          }}
        />

        {madreElegida === null || lugarDeMadre === null ? null : (
          <PropuestaDeLaMadre
            tenencia={madreElegida.tenencia}
            lugar={lugarDeMadre}
            lugaresPendientes={lugares.isPending}
            lugaresConError={lugares.isError}
            potrerosPendientes={potreros.isPending}
            potrerosConError={potreros.isError}
            aceptada={borrador.propuestaAceptada}
            alAceptar={() => {
              cambiar({
                propuestaAceptada: true,
                tenencia: tenenciaPropuesta(madreElegida.tenencia),
                escribirLugar: lugarDeMadre.hayAsignacion,
                potreroAceptado: lugarDeMadre.potreroId,
              })
            }}
          />
        )}

        <Padre
          toro={toroUnico}
          hayVarios={toros.length > 1}
          modo={borrador.modoPadre}
          motivo={borrador.motivoPadre}
          alElegirModo={(modo) => {
            cambiar({ modoPadre: modo, motivoPadre: '' })
          }}
          alElegirMotivo={(motivo) => {
            cambiar({ motivoPadre: motivo })
          }}
        />

        <div className="alta__fila">
          <CampoDeTexto
            etiqueta="Nombre o seña"
            valor={borrador.nombre}
            alCambiar={(nombre) => {
              cambiar({ nombre })
            }}
            marcador="Sin nombre"
          />
          <CampoDeTexto
            etiqueta="Arete SINIIGA"
            valor={borrador.arete}
            alCambiar={(arete) => {
              cambiar({ arete })
            }}
            inputMode="numeric"
            marcador="Sin arete"
            maxLength={80}
          />
        </div>

        <Desplegable titulo="Más datos" resumen="tenencia y nota">
          {aLaParte ? (
            <p className="campo__ayuda">
              La madre está a la parte. El reparto de la cría no está definido, así que el dueño
              se queda en «no sé» y no se copia «a la parte».
            </p>
          ) : (
            <Pildoras
              etiqueta="¿De quién es la cría?"
              opciones={OPCIONES_DE_TENENCIA}
              valor={borrador.tenencia}
              alElegir={(tenencia) => {
                cambiar({ tenencia: tenencia as Tenencia })
              }}
            />
          )}
          <CampoDeArea
            etiqueta="Nota"
            valor={borrador.nota}
            alCambiar={(nota) => {
              cambiar({ nota })
            }}
            ayuda="Lo que se sepa del parto, en tus palabras."
            maxLength={2000}
          />
        </Desplegable>

        {aviso === null ? null : (
          <p className="aviso aviso--ojo" role="alert">
            {aviso}
          </p>
        )}
        {registrar.isError ? <AvisoDeError error={registrar.error} /> : null}
        {asignar.isError ? <AvisoDeError error={asignar.error} /> : null}
      </form>

      <BarraDeAccion anclaje="ventana" sobreLaNavegacion>
        <BotonPrincipal deshabilitado={registrar.isPending || asignar.isPending} alTocar={guardar}>
          {registrar.isPending || asignar.isPending ? 'Guardando…' : 'Registrar nacimiento'}
        </BotonPrincipal>
      </BarraDeAccion>
    </main>
  )
}

function Madre({
  madres,
  madreId,
  certeza,
  motivo,
  alElegirMadre,
  alElegirCerteza,
  alElegirMotivo,
}: {
  readonly madres: readonly Animal[]
  readonly madreId: string
  readonly certeza: CertezaEnBorrador
  readonly motivo: MotivoMadre | ''
  readonly alElegirMadre: (id: string) => void
  readonly alElegirCerteza: (certeza: CertezaMadre) => void
  readonly alElegirMotivo: (motivo: MotivoMadre) => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const elegida = madres.find((animal) => animal.id === madreId) ?? null
  const limpio = normalizar(busqueda)
  // Con el buscador vacío no se abre una lista larga: se escribe algo y se
  // elige. La madre que ya venía de la ficha se ve elegida arriba.
  const encontradas =
    limpio === '' ? [] : madres.filter((animal) => coincide(animal, limpio))

  return (
    <>
      <div className="campo">
        <p className="campo__etiqueta" id="madre-etiqueta">
          Madre
        </p>
        <p className="campo__ayuda">
          Se busca por nombre, seña o arete, como en el pesaje. Solo salen las hembras activas y
          las que tienen el sexo en «No sé».
        </p>
        {elegida === null ? (
          <BuscarMadre
            valor={busqueda}
            alCambiar={setBusqueda}
            encontradas={encontradas}
            alElegir={(id) => {
              setBusqueda('')
              alElegirMadre(id)
            }}
          />
        ) : (
          <div className="eleccion">
            <span className="eleccion__quien">
              <Miniatura id={elegida.foto?.miniaturaId} />
              <span className="eleccion__nombre">{nombreVisible(elegida)}</span>
            </span>
            <button
              type="button"
              className="enlace"
              onClick={() => {
                alElegirMadre('')
              }}
            >
              Quitar
            </button>
          </div>
        )}
        {elegida === null && limpio !== '' && encontradas.length === 0 ? (
          <p className="campo__ayuda" role="status">
            Ninguna hembra activa coincide. Revisa cómo se escribe o déjala en «No sé».
          </p>
        ) : null}
      </div>

      {/* La certeza es de una madre concreta: sin madre no hay nada que
          asegurar. Se vuelve a «No sé» quitando la madre con «Quitar». */}
      {madreId === '' ? null : (
        <Segmentado
          etiqueta="Certeza de la madre"
          opciones={CERTEZA_DE_MADRE}
          valor={certeza}
          alElegir={(valor) => {
            alElegirCerteza(valor as CertezaMadre)
          }}
        />
      )}
      {certeza === 'inferred' && madreId !== '' ? (
        <Pildoras
          etiqueta="Por qué queda inferida"
          opciones={OPCIONES_DE_MOTIVO}
          valor={motivo}
          alElegir={(valor) => {
            alElegirMotivo(valor as MotivoMadre)
          }}
        />
      ) : null}
    </>
  )
}

/**
 * El buscador de la madre: un campo y la lista de las que coinciden.
 *
 * Un botón por hembra, con su arete y su categoría, para reconocerla sin abrir
 * la ficha. El nombre accesible es el nombre y los datos, no el id.
 */
function BuscarMadre({
  valor,
  alCambiar,
  encontradas,
  alElegir,
}: {
  readonly valor: string
  readonly alCambiar: (valor: string) => void
  readonly encontradas: readonly Animal[]
  readonly alElegir: (id: string) => void
}) {
  return (
    <div className="madre__buscador">
      <CampoDeTexto
        etiqueta="Buscar la madre"
        valor={valor}
        alCambiar={alCambiar}
        ayuda="Por nombre, seña o arete."
      />
      {encontradas.length === 0 ? null : (
        <ul className="pesaje__lista">
          {encontradas.map((animal) => (
            <li key={animal.id}>
              <button
                type="button"
                className="pesaje__sugerido"
                onClick={() => {
                  alElegir(animal.id)
                }}
              >
                <Miniatura id={animal.foto?.miniaturaId} />
                <span className="pesaje__sugerido-texto">
                  <span className="pesaje__sugerido-nombre">{nombreVisible(animal)}</span>
                  <span className="pesaje__sugerido-datos">{datosDeLaMadre(animal)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** El arete puesto y la categoría, para distinguir dos vacas con nombre parecido. */
function datosDeLaMadre(animal: Animal): string {
  const puesto = animal.marcas.find((marca) => marca.estado === 'active')
  const arete =
    puesto === undefined ? 'Sin arete puesto' : `${tipoDeMarca(puesto.tipo)} ${puesto.valor}`
  return `${arete} · ${categoria(animal.categoria)}`
}

function Padre({
  toro,
  hayVarios,
  modo,
  motivo,
  alElegirModo,
  alElegirMotivo,
}: {
  readonly toro: Animal | undefined
  readonly hayVarios: boolean
  readonly modo: ModoPadre
  readonly motivo: MotivoMadre | ''
  readonly alElegirModo: (modo: ModoPadre) => void
  readonly alElegirMotivo: (motivo: MotivoMadre) => void
}) {
  if (toro === undefined) {
    return (
      <p className="campo__ayuda">
        {hayVarios
          ? 'Hay más de un toro activo. El padre se deja en «No sé»: único toro no aplica.'
          : 'No hay un toro activo. El padre se deja en «No sé».'}
      </p>
    )
  }

  const nombre = nombreVisible(toro)
  return (
    <>
      <Pildoras
        etiqueta="Padre"
        opciones={[
          { valor: 'unknown', texto: 'No sé' },
          { valor: 'unico_toro', texto: `Inferido: único toro (${nombre})` },
          { valor: 'observed', texto: 'Lo vi' },
          { valor: 'inferred', texto: 'Inferido por otro motivo' },
        ]}
        valor={modo}
        alElegir={(valor) => {
          alElegirModo(valor as ModoPadre)
        }}
      />
      <p className="campo__ayuda">
        «Inferido: único toro» no lo marca como padre seguro. Hay un solo toro activo: {nombre}.
      </p>
      {modo === 'inferred' ? (
        <Pildoras
          etiqueta="Por qué queda inferido"
          opciones={OPCIONES_DE_MOTIVO}
          valor={motivo}
          alElegir={(valor) => {
            alElegirMotivo(valor as MotivoMadre)
          }}
        />
      ) : null}
    </>
  )
}

/**
 * Las madres que ofrece el buscador. Si se abrió desde la ficha de una vaca,
 * ella va primero aunque su sexo no se haya anotado: el dueño ya la eligió al
 * entrar por su ficha. Un animal que no puede ser madre no entra ni así.
 */
function madresElegibles(animales: readonly Animal[], preseleccion: FichaCompleta | null): Animal[] {
  const lista = animales.filter((animal) => puedeSerMadre(animal))
  if (
    preseleccion === null ||
    !puedeSerMadre(preseleccion) ||
    lista.some((animal) => animal.id === preseleccion.id)
  ) {
    return lista
  }
  return [preseleccion, ...lista]
}

function armar(
  borrador: Borrador,
  toro: Animal | undefined,
  aLaParte: boolean,
):
  | { readonly aviso: string; readonly cuerpo?: undefined; readonly arete?: undefined }
  | {
      readonly aviso: null
      readonly arete: string | undefined
      readonly cuerpo: {
        readonly fechaNacimiento: string | null
        readonly precisionFecha: 'exact' | 'approximate' | null
        readonly sexo: Borrador['sexo']
        readonly tenencia: Tenencia
        readonly madre: Lado
        readonly padre: Lado
        readonly nombre?: string
        readonly nota?: string
      }
    } {
  if (borrador.precision !== 'unknown' && borrador.fecha === '') {
    return { aviso: 'Elige el día o marca la fecha en «No sé».' }
  }
  if (borrador.madreId !== null && borrador.certezaMadre === '') {
    return { aviso: 'Di si viste a la madre, si la inferiste o si no sabes.' }
  }
  if (toro !== undefined && borrador.modoPadre === '') {
    return { aviso: 'Di si viste al padre, si es el único toro o si no sabes.' }
  }

  const madre = ladoDeMadre(borrador)
  if (typeof madre === 'string') {
    return { aviso: madre }
  }
  const padre = ladoDePadre(borrador, toro)
  if (typeof padre === 'string') {
    return { aviso: padre }
  }

  const nombre = limpiar(borrador.nombre)
  const nota = limpiar(borrador.nota)
  const arete = limpiar(borrador.arete)

  return {
    aviso: null,
    arete,
    cuerpo: {
      fechaNacimiento: borrador.precision === 'unknown' ? null : borrador.fecha,
      precisionFecha: borrador.precision === 'unknown' ? null : borrador.precision,
      sexo: borrador.sexo,
      tenencia: aLaParte ? 'unknown' : borrador.tenencia,
      madre,
      padre,
      ...(nombre === undefined ? {} : { nombre }),
      ...(nota === undefined ? {} : { nota }),
    },
  }
}

function ladoDeMadre(borrador: Borrador): Lado | string {
  if (borrador.madreId === null || borrador.certezaMadre === '' || borrador.certezaMadre === 'unknown') {
    return { certeza: 'unknown', animalId: null, motivo: null }
  }
  if (borrador.certezaMadre === 'observed') {
    return { certeza: 'observed', animalId: borrador.madreId, motivo: null }
  }
  if (borrador.motivoMadre === '') {
    return 'Di por qué la madre queda inferida.'
  }
  return { certeza: 'inferred', animalId: borrador.madreId, motivo: borrador.motivoMadre }
}

function ladoDePadre(borrador: Borrador, toro: Animal | undefined): Lado | string {
  if (borrador.modoPadre === '' || borrador.modoPadre === 'unknown' || toro === undefined) {
    return { certeza: 'unknown', animalId: null, motivo: null }
  }
  if (borrador.modoPadre === 'unico_toro') {
    return { certeza: 'inferred', animalId: toro.id, motivo: 'unico_toro' }
  }
  if (borrador.modoPadre === 'observed') {
    return { certeza: 'observed', animalId: toro.id, motivo: null }
  }
  if (borrador.motivoPadre === '') {
    return 'Di por qué el padre queda inferido.'
  }
  return { certeza: 'inferred', animalId: toro.id, motivo: borrador.motivoPadre }
}

function limpiar(texto: string): string | undefined {
  const recortado = texto.trim()
  return recortado === '' ? undefined : recortado
}

function sinPropuesta(): Pick<Borrador, 'propuestaAceptada' | 'escribirLugar' | 'potreroAceptado' | 'tenencia'> {
  return {
    propuestaAceptada: false,
    escribirLugar: false,
    potreroAceptado: null,
    tenencia: 'unknown',
  }
}

type LugarDeLaMadre = {
  readonly hayAsignacion: boolean
  readonly potreroId: string | null
  readonly texto: string | null
}

function lugarDeLaMadre(
  madreId: string,
  lugares: LugaresDelHato | undefined,
  potreros: PotrerosDelRancho | undefined,
  potrerosPendientes: boolean,
  potrerosConError: boolean,
): LugarDeLaMadre {
  const fila = lugares?.animales.find((animal) => animal.animalId === madreId)
  if (fila === undefined) {
    return { hayAsignacion: false, potreroId: null, texto: null }
  }
  if (fila.potreroId === null) {
    return { hayAsignacion: true, potreroId: null, texto: 'Lugar: no sé' }
  }
  // El id ya se sabe. El nombre solo se afirma cuando la lista de potreros llegó.
  if (potrerosPendientes || potrerosConError) {
    return { hayAsignacion: true, potreroId: fila.potreroId, texto: null }
  }
  const nombre = potreros?.potreros.find((potrero) => potrero.id === fila.potreroId)?.nombre
  return {
    hayAsignacion: true,
    potreroId: fila.potreroId,
    texto: nombre ?? 'Potrero sin nombre',
  }
}

function tenenciaPropuesta(valor: string): Tenencia {
  if (valor === 'ranch' || valor === 'third_party') {
    return valor
  }
  return 'unknown'
}

function textoDelDueno(valor: string): string {
  if (valor === 'a_la_parte' || valor === 'unknown') {
    return 'Dueño: no sé'
  }
  return textoDeTenencia(valor)
}

function PropuestaDeLaMadre({
  tenencia,
  lugar,
  lugaresPendientes,
  lugaresConError,
  potrerosPendientes,
  potrerosConError,
  aceptada,
  alAceptar,
}: {
  readonly tenencia: string
  readonly lugar: LugarDeLaMadre
  readonly lugaresPendientes: boolean
  readonly lugaresConError: boolean
  readonly potrerosPendientes: boolean
  readonly potrerosConError: boolean
  readonly aceptada: boolean
  readonly alAceptar: () => void
}) {
  const dueno = textoDelDueno(tenencia)
  const texto =
    lugar.texto === null ? `¿Va con su madre? ${dueno}` : `¿Va con su madre? ${dueno} · ${lugar.texto}`

  return (
    <div className="aviso">
      <p>{aceptada ? `Va con su madre. Al registrar se anota: ${texto.replace('¿Va con su madre? ', '')}` : texto}</p>
      {lugaresConError ? (
        <p className="campo__ayuda">
          No se pudo traer el potrero de la madre. Si aceptas, se anota el dueño y no el lugar.
        </p>
      ) : null}
      {potrerosConError && lugar.potreroId !== null ? (
        <p className="campo__ayuda">No se pudo traer el nombre del potrero.</p>
      ) : null}
      {aceptada ? null : (
        <BotonSecundario alTocar={alAceptar} deshabilitado={lugaresPendientes || potrerosPendientes}>
          Va con su madre
        </BotonSecundario>
      )}
    </div>
  )
}
