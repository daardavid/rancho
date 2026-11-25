import { useRef, useState } from 'react'

import { useFicha, useHato } from '../api/hato'
import { useRegistrarNacimiento } from '../api/nacimientos'
import { nombreVisible, puedeSerMadre } from '../dominio/animal'
import {
  MOTIVOS_DE_LA_MADRE,
  PRECISIONES_DE_FECHA,
  SEXOS,
  TENENCIAS,
  opcionesElegibles,
} from '../dominio/etiquetas'
import type { Animal, FichaCompleta } from '../dominio/tipos'
import { irA } from '../ruta'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { BarraDeAccion } from '../ui/BarraDeAccion'
import { BotonPrincipal } from '../ui/Botones'
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
 * una vaca, ella viene elegida y «La vi» es el punto de partida: «No sé» está
 * al lado y no se ve como error. Si hay un solo toro activo se ofrece
 * «Inferido: único toro» sin marcarlo.
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
type MotivoMadre = 'parto_visto' | 'dicho_de_trabajador' | 'otro'
type ModoPadre = 'unknown' | 'unico_toro' | 'observed' | 'inferred'
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
  readonly certezaMadre: CertezaMadre
  readonly motivoMadre: MotivoMadre | ''
  readonly modoPadre: ModoPadre
  readonly motivoPadre: MotivoMadre | ''
  readonly nombre: string
  readonly arete: string
  readonly tenencia: Tenencia
  readonly nota: string
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
  const registrar = useRegistrarNacimiento()
  const preseleccion = madre !== null && puedeSerMadre(madre) ? madre.id : null
  const [borrador, setBorrador] = useState<Borrador>({
    fecha: '',
    precision: 'unknown',
    sexo: 'unknown',
    madreId: preseleccion,
    certezaMadre: preseleccion === null ? 'unknown' : 'observed',
    motivoMadre: '',
    modoPadre: 'unknown',
    motivoPadre: '',
    nombre: '',
    arete: '',
    tenencia: 'unknown',
    nota: '',
  })
  const [aviso, setAviso] = useState<string | null>(null)
  const envio = useRef<Envio | null>(null)

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

  const cambiar = (cambios: Partial<Borrador>): void => {
    setAviso(null)
    setBorrador((actual) => ({ ...actual, ...cambios }))
  }

  const guardar = (): void => {
    if (registrar.isPending) {
      return
    }
    const armado = armar(borrador, toroUnico, aLaParte === true)
    if (armado.aviso !== null) {
      setAviso(armado.aviso)
      return
    }

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
          irA({ nombre: 'ficha', animalId: nacimiento.animal.id })
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
              cambiar({ madreId: null, certezaMadre: 'unknown', motivoMadre: '' })
              return
            }
            cambiar({
              madreId: id,
              certezaMadre: borrador.certezaMadre === 'unknown' ? 'observed' : borrador.certezaMadre,
            })
          }}
          alElegirCerteza={(certeza) => {
            if (certeza === 'unknown') {
              cambiar({ certezaMadre: 'unknown', madreId: null, motivoMadre: '' })
              return
            }
            cambiar({ certezaMadre: certeza })
          }}
          alElegirMotivo={(motivo) => {
            cambiar({ motivoMadre: motivo })
          }}
        />

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
              La madre está a la parte. La cría queda en «No sé»: todavía no se sabe cómo se
              reparte.
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
      </form>

      <BarraDeAccion anclaje="ventana" sobreLaNavegacion>
        <BotonPrincipal deshabilitado={registrar.isPending} alTocar={guardar}>
          {registrar.isPending ? 'Guardando…' : 'Registrar nacimiento'}
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
  readonly certeza: CertezaMadre
  readonly motivo: MotivoMadre | ''
  readonly alElegirMadre: (id: string) => void
  readonly alElegirCerteza: (certeza: CertezaMadre) => void
  readonly alElegirMotivo: (motivo: MotivoMadre) => void
}) {
  return (
    <>
      <label className="campo">
        <span className="campo__etiqueta">Madre</span>
        <select
          className="campo__entrada"
          value={madreId}
          onChange={(evento) => {
            alElegirMadre(evento.target.value)
          }}
        >
          <option value="">No sé</option>
          {madres.map((animal) => (
            <option key={animal.id} value={animal.id}>
              {nombreVisible(animal)}
            </option>
          ))}
        </select>
      </label>
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

function madresElegibles(animales: readonly Animal[], preseleccion: FichaCompleta | null): Animal[] {
  const lista = animales.filter((animal) => puedeSerMadre(animal))
  if (preseleccion !== null && puedeSerMadre(preseleccion) && !lista.some((animal) => animal.id === preseleccion.id)) {
    return [preseleccion, ...lista]
  }
  return lista
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
  if (borrador.madreId === null || borrador.certezaMadre === 'unknown') {
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
  if (borrador.modoPadre === 'unknown' || toro === undefined) {
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
