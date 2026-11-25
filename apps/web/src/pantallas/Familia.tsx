import { useRef, useState } from 'react'

import type { Familia as FamiliaLeida } from '@rancho/api-contracts'

import { useHato } from '../api/hato'
import { useCorregirFiliacion, useFamilia } from '../api/nacimientos'
import { nombreVisible, puedeRegistrarNacimiento, puedeSerMadre } from '../dominio/animal'
import { diaLegible, instanteLegible } from '../dominio/fechas'
import {
  MOTIVOS_DE_LA_MADRE,
  PRECISIONES_DE_FECHA,
  certezaDeFiliacion,
  motivoDeInferencia,
  opcionesElegibles,
} from '../dominio/etiquetas'
import type { Animal, FichaCompleta } from '../dominio/tipos'
import { irA } from '../ruta'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { BotonSecundario } from '../ui/Botones'
import { CampoDeArea, CampoDeFecha, CampoDeTexto } from '../ui/Campos'
import { Desplegable } from '../ui/Desplegable'
import { Pildoras } from '../ui/Pildoras'
import { Segmentado } from '../ui/Segmentado'

/**
 * Madre, padre y crías de la ficha, con la historia de correcciones debajo.
 *
 * La filiación no es un dato de la ficha: corregirla no cambia el nombre, el
 * sexo ni la tenencia. Lo que estaba queda en la historia.
 */

const OPCIONES_DE_FECHA = opcionesElegibles(PRECISIONES_DE_FECHA)
const OPCIONES_DE_MOTIVO = opcionesElegibles(MOTIVOS_DE_LA_MADRE)

type Lado = {
  readonly certeza: 'observed' | 'inferred' | 'unknown'
  readonly animalId: string | null
  readonly motivo: 'parto_visto' | 'dicho_de_trabajador' | 'unico_toro' | 'otro' | null
}
type MotivoMadre = 'parto_visto' | 'dicho_de_trabajador' | 'otro'
type ModoPadre = 'unknown' | 'unico_toro' | 'observed' | 'inferred' | 'actual'
type Opcion = { readonly id: string; readonly nombre: string | null }

export function Familia({ animal }: { readonly animal: FichaCompleta }) {
  const familia = useFamilia(animal.id)
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [guardado, setGuardado] = useState(false)

  return (
    <section className="ficha__seccion">
      <h2 className="ficha__titulo">Familia</h2>
      {puedeRegistrarNacimiento(animal) ? (
        <BotonSecundario
          tono="tinta"
          alTocar={() => {
            irA({ nombre: 'nacimiento', madreId: animal.id })
          }}
        >
          Registrar nacimiento
        </BotonSecundario>
      ) : null}

      {familia.isPending ? <Cargando que="Trayendo la familia…" /> : null}
      {familia.isError ? <AvisoDeError error={familia.error} /> : null}

      {familia.data === undefined ? null : (
        <Contenido
          animalId={animal.id}
          familia={familia.data}
          corrigiendo={corrigiendo}
          guardado={guardado}
          alCorregir={() => {
            setGuardado(false)
            setCorrigiendo(true)
          }}
          alCancelar={() => {
            setCorrigiendo(false)
          }}
          alGuardar={() => {
            setCorrigiendo(false)
            setGuardado(true)
          }}
        />
      )}
    </section>
  )
}

function Contenido({
  animalId,
  familia,
  corrigiendo,
  guardado,
  alCorregir,
  alCancelar,
  alGuardar,
}: {
  readonly animalId: string
  readonly familia: FamiliaLeida
  readonly corrigiendo: boolean
  readonly guardado: boolean
  readonly alCorregir: () => void
  readonly alCancelar: () => void
  readonly alGuardar: () => void
}) {
  const hato = useHato()
  const animales = hato.data?.animales ?? []
  const filiacion = familia.filiacion
  const vacia = filiacion === null && familia.crias.length === 0

  if (corrigiendo && filiacion !== null) {
    return (
      <Correccion
        animalId={animalId}
        familia={familia}
        animales={animales}
        alCancelar={alCancelar}
        alGuardar={alGuardar}
      />
    )
  }

  return (
    <>
      {guardado ? (
        <p className="aviso aviso--bien" role="status">
          Corrección guardada. La certeza anterior quedó en la historia.
        </p>
      ) : null}
      {vacia ? <p className="campo__ayuda">Todavía no hay madre, padre ni crías anotadas.</p> : null}
      {filiacion === null ? null : (
        <dl className="datos">
          <Dato etiqueta="Nació" valor={textoDeFecha(filiacion.fechaNacimiento, filiacion.precisionFecha)} />
          <Dato
            etiqueta="Madre"
            valor={textoDeLado(
              filiacion.madre,
              familia.madre === null ? null : nombreVisible(familia.madre),
              'la',
            )}
          />
          <Dato
            etiqueta="Padre"
            valor={textoDeLado(
              filiacion.padre,
              familia.padre === null ? null : nombreVisible(familia.padre),
              'lo',
            )}
          />
          {filiacion.nota === null ? null : <Dato etiqueta="Nota" valor={filiacion.nota} />}
        </dl>
      )}
      {familia.crias.length === 0 ? null : (
        <ul className="lista lista--planas">
          {familia.crias.map((cria) => (
            <li key={`${cria.animal.id}-${cria.como}`} className="arete">
              <button
                type="button"
                className="enlace"
                onClick={() => {
                  irA({ nombre: 'ficha', animalId: cria.animal.id })
                }}
              >
                {nombreVisible(cria.animal)}
              </button>
              <span className="arete__estado">
                {cria.como === 'madre' ? 'Como madre' : 'Como padre'} · {certezaDeFiliacion(cria.certeza)}
                {cria.motivo === null ? '' : ` (${motivoDeInferencia(cria.motivo)})`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {filiacion === null ? null : (
        <>
          <BotonSecundario tono="tinta" alTocar={alCorregir}>
            Corregir filiación
          </BotonSecundario>
          <Desplegable
            titulo="Historia de la filiación"
            resumen={
              filiacion.correcciones.length === 0
                ? 'sin correcciones'
                : `${String(filiacion.correcciones.length)} ${filiacion.correcciones.length === 1 ? 'corrección' : 'correcciones'}`
            }
          >
            {filiacion.correcciones.length === 0 ? (
              <p className="campo__ayuda">Nadie ha corregido la filiación.</p>
            ) : (
              <ul className="lista lista--planas">
                {filiacion.correcciones.map((correccion, indice) => (
                  <li key={`${correccion.correctedAt}-${indice}`} className="correccion">
                    <p className="correccion__campo">
                      Madre: antes{' '}
                      {textoDeLado(
                        correccion.madre,
                        nombreDe(correccion.madre.animalId, animales, familia.referidos),
                        'la',
                      )}
                    </p>
                    <p className="correccion__campo">
                      Padre: antes{' '}
                      {textoDeLado(
                        correccion.padre,
                        nombreDe(correccion.padre.animalId, animales, familia.referidos),
                        'lo',
                      )}
                    </p>
                    {correccion.fechaNacimiento === null || correccion.precisionFecha === null ? null : (
                      <p className="correccion__campo">
                        Nació: antes{' '}
                        {textoDeFecha(correccion.fechaNacimiento, correccion.precisionFecha)}
                      </p>
                    )}
                    {correccion.nota === null ? null : (
                      <p className="correccion__campo">Nota: antes {correccion.nota}</p>
                    )}
                    <p className="correccion__motivo">Por qué: {correccion.motivo}</p>
                    <p className="correccion__cuando">{instanteLegible(correccion.correctedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Desplegable>
        </>
      )}
    </>
  )
}

function Correccion({
  animalId,
  familia,
  animales,
  alCancelar,
  alGuardar,
}: {
  readonly animalId: string
  readonly familia: FamiliaLeida
  readonly animales: readonly Animal[]
  readonly alCancelar: () => void
  readonly alGuardar: () => void
}) {
  const filiacion = familia.filiacion
  const corregir = useCorregirFiliacion(animalId)
  const envio = useRef<{ contenido: string; commandId: string } | null>(null)
  const toros = animales.filter((animal) => animal.categoria === 'bull')
  const toro = toros.length === 1 ? toros[0] : undefined
  const padreInicial = modoDePadre(filiacion?.padre ?? ladoVacio(), toro?.id)

  const [motivo, setMotivo] = useState('')
  const [nota, setNota] = useState(filiacion?.nota ?? '')
  const [precision, setPrecision] = useState<'exact' | 'approximate' | 'unknown'>(
    filiacion?.precisionFecha ?? 'unknown',
  )
  const [fecha, setFecha] = useState(filiacion?.fechaNacimiento ?? '')
  const [madreId, setMadreId] = useState(filiacion?.madre.animalId ?? '')
  const [certezaMadre, setCertezaMadre] = useState<'observed' | 'inferred' | 'unknown' | ''>(
    filiacion?.madre.certeza ?? 'unknown',
  )
  const [motivoMadre, setMotivoMadre] = useState<MotivoMadre | ''>(motivoMadreDe(filiacion?.madre.motivo))
  const [modoPadre, setModoPadre] = useState<ModoPadre>(padreInicial.modo)
  const [motivoPadre, setMotivoPadre] = useState<MotivoMadre | ''>(padreInicial.motivo)
  const [aviso, setAviso] = useState<string | null>(null)

  if (filiacion === null) {
    return null
  }

  const madres = opcionesDeMadre(animales, familia.madre)

  const guardar = (): void => {
    if (corregir.isPending) {
      return
    }
    const limpio = motivo.trim()
    if (limpio === '') {
      setAviso('Escribe por qué se corrige.')
      return
    }
    if (precision !== 'unknown' && fecha === '') {
      setAviso('Elige el día o marca la fecha en «No sé».')
      return
    }
    if (madreId !== '' && certezaMadre === '') {
      setAviso('Di si viste a la madre, si la inferiste o si no sabes.')
      return
    }
    const madre = ladoMadre(madreId, certezaMadre, motivoMadre)
    if (typeof madre === 'string') {
      setAviso(madre)
      return
    }
    const padre = ladoPadre(modoPadre, motivoPadre, toro?.id, filiacion.padre)
    if (typeof padre === 'string') {
      setAviso(padre)
      return
    }

    const cuerpo = {
      version: filiacion.version,
      motivo: limpio,
      fechaNacimiento: precision === 'unknown' ? null : fecha,
      precisionFecha: precision === 'unknown' ? null : precision,
      madre,
      padre,
      nota: nota.trim() === '' ? null : nota.trim(),
    }
    const clave = JSON.stringify(cuerpo)
    if (envio.current === null || envio.current.contenido !== clave) {
      envio.current = { contenido: clave, commandId: crypto.randomUUID() }
    }
    corregir.mutate({ commandId: envio.current.commandId, ...cuerpo }, { onSuccess: alGuardar })
  }

  return (
    <form
      className="formulario"
      onSubmit={(evento) => {
        evento.preventDefault()
        guardar()
      }}
    >
      <p className="campo__ayuda">
        Se corrige quién es la madre o el padre. El nombre, el sexo y la tenencia de la cría no se
        tocan.
      </p>
      <CampoDeTexto etiqueta="Por qué se corrige" valor={motivo} alCambiar={setMotivo} maxLength={2000} />
      <Segmentado
        etiqueta="Fecha de nacimiento"
        opciones={OPCIONES_DE_FECHA}
        valor={precision}
        alElegir={(valor) => {
          setPrecision(valor as 'exact' | 'approximate' | 'unknown')
        }}
      />
      {precision === 'unknown' ? null : <CampoDeFecha etiqueta="Día" valor={fecha} alCambiar={setFecha} />}
      <label className="campo">
        <span className="campo__etiqueta">Madre</span>
        <select
          className="campo__entrada"
          value={madreId}
          onChange={(evento) => {
            const id = evento.target.value
            setMadreId(id)
            // Elegir madre no es decir que se la vio. La certeza queda en blanco
            // hasta que alguien la marque; «No sé» en el desplegable es no saber quién es.
            setCertezaMadre(id === '' ? 'unknown' : certezaMadre === 'unknown' ? '' : certezaMadre)
          }}
        >
          <option value="">No sé</option>
          {madres.map((opcion) => (
            <option key={opcion.id} value={opcion.id}>
              {opcion.nombre ?? 'Sin nombre o seña'}
            </option>
          ))}
        </select>
      </label>
      {madreId === '' ? null : (
        <Segmentado
          etiqueta="Certeza de la madre"
          opciones={[
            { valor: 'observed', texto: 'La vi' },
            { valor: 'inferred', texto: 'Inferida' },
            { valor: 'unknown', texto: 'No sé' },
          ]}
          valor={certezaMadre}
          alElegir={(valor) => {
            const certeza = valor as 'observed' | 'inferred' | 'unknown'
            setCertezaMadre(certeza)
            if (certeza === 'unknown') {
              setMadreId('')
            }
          }}
        />
      )}
      {certezaMadre === 'inferred' ? (
        <Pildoras
          etiqueta="Por qué queda inferida"
          opciones={OPCIONES_DE_MOTIVO}
          valor={motivoMadre}
          alElegir={(valor) => {
            setMotivoMadre(valor as MotivoMadre)
          }}
        />
      ) : null}
      <PadreDeCorreccion
        toro={toro}
        hayVarios={toros.length > 1}
        modo={modoPadre}
        motivo={motivoPadre}
        padreActual={textoDeLado(
          filiacion.padre,
          familia.padre === null ? null : nombreVisible(familia.padre),
          'lo',
        )}
        alElegirModo={setModoPadre}
        alElegirMotivo={setMotivoPadre}
      />
      <CampoDeArea etiqueta="Nota" valor={nota} alCambiar={setNota} maxLength={2000} />
      {aviso === null ? null : (
        <p className="aviso aviso--ojo" role="alert">
          {aviso}
        </p>
      )}
      {corregir.isError ? <AvisoDeError error={corregir.error} /> : null}
      <BotonSecundario tono="verde" alTocar={guardar}>
        {corregir.isPending ? 'Guardando…' : 'Guardar corrección'}
      </BotonSecundario>
      <BotonSecundario tono="tinta" alTocar={alCancelar}>
        Cancelar
      </BotonSecundario>
    </form>
  )
}

function PadreDeCorreccion({
  toro,
  hayVarios,
  modo,
  motivo,
  padreActual,
  alElegirModo,
  alElegirMotivo,
}: {
  readonly toro: Animal | undefined
  readonly hayVarios: boolean
  readonly modo: ModoPadre
  readonly motivo: MotivoMadre | ''
  readonly padreActual: string
  readonly alElegirModo: (modo: ModoPadre) => void
  readonly alElegirMotivo: (motivo: MotivoMadre) => void
}) {
  if (toro === undefined) {
    return (
      <>
        <p className="campo__ayuda">Padre ahora: {padreActual}.</p>
        <Pildoras
          etiqueta="Padre"
          opciones={[
            { valor: 'actual', texto: 'Dejarlo como está' },
            { valor: 'unknown', texto: 'No sé' },
          ]}
          valor={modo === 'actual' || modo === 'unknown' ? modo : 'actual'}
          alElegir={(valor) => {
            alElegirModo(valor as ModoPadre)
          }}
        />
        <p className="campo__ayuda">
          {hayVarios
            ? 'Hay más de un toro. Único toro no se ofrece: no es paternidad segura.'
            : 'No hay un toro activo para inferir al padre.'}
        </p>
      </>
    )
  }

  return (
    <>
      <Pildoras
        etiqueta="Padre"
        opciones={[
          { valor: 'unknown', texto: 'No sé' },
          { valor: 'unico_toro', texto: `Inferido: único toro (${nombreVisible(toro)})` },
          { valor: 'observed', texto: 'Lo vi' },
          { valor: 'inferred', texto: 'Inferido por otro motivo' },
          ...(modo === 'actual' ? [{ valor: 'actual', texto: 'Dejarlo como está' }] : []),
        ]}
        valor={modo}
        alElegir={(valor) => {
          alElegirModo(valor as ModoPadre)
        }}
      />
      <p className="campo__ayuda">
        «Inferido: único toro» no lo marca como padre seguro. Ahora: {padreActual}.
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

function opcionesDeMadre(
  animales: readonly Animal[],
  actual: FamiliaLeida['madre'],
): Opcion[] {
  const lista: Opcion[] = animales
    .filter((animal) => puedeSerMadre(animal))
    .map((animal) => ({ id: animal.id, nombre: animal.nombre }))
  if (actual !== null && !lista.some((opcion) => opcion.id === actual.id)) {
    lista.unshift({ id: actual.id, nombre: actual.nombre })
  }
  return lista
}

function modoDePadre(padre: Lado, toroId: string | undefined): { modo: ModoPadre; motivo: MotivoMadre | '' } {
  if (padre.certeza === 'unknown') {
    return { modo: 'unknown', motivo: '' }
  }
  if (toroId !== undefined && padre.animalId === toroId) {
    if (padre.motivo === 'unico_toro') {
      return { modo: 'unico_toro', motivo: '' }
    }
    if (padre.certeza === 'observed') {
      return { modo: 'observed', motivo: '' }
    }
    if (padre.motivo === 'parto_visto' || padre.motivo === 'dicho_de_trabajador' || padre.motivo === 'otro') {
      return { modo: 'inferred', motivo: padre.motivo }
    }
  }
  return { modo: 'actual', motivo: '' }
}

function motivoMadreDe(motivo: string | null | undefined): MotivoMadre | '' {
  if (motivo === 'parto_visto' || motivo === 'dicho_de_trabajador' || motivo === 'otro') {
    return motivo
  }
  return ''
}

function ladoVacio(): Lado {
  return { certeza: 'unknown', animalId: null, motivo: null }
}

function ladoMadre(madreId: string, certeza: string, motivo: MotivoMadre | ''): Lado | string {
  if (madreId === '' || certeza === 'unknown') {
    return ladoVacio()
  }
  if (certeza === 'observed') {
    return { certeza: 'observed', animalId: madreId, motivo: null }
  }
  if (motivo === '') {
    return 'Di por qué la madre queda inferida.'
  }
  return { certeza: 'inferred', animalId: madreId, motivo }
}

function ladoPadre(
  modo: ModoPadre,
  motivo: MotivoMadre | '',
  toroId: string | undefined,
  actual: Lado,
): Lado | string {
  if (modo === 'actual') {
    return actual
  }
  if (modo === 'unknown' || toroId === undefined) {
    return ladoVacio()
  }
  if (modo === 'unico_toro') {
    return { certeza: 'inferred', animalId: toroId, motivo: 'unico_toro' }
  }
  if (modo === 'observed') {
    return { certeza: 'observed', animalId: toroId, motivo: null }
  }
  if (motivo === '') {
    return 'Di por qué el padre queda inferido.'
  }
  return { certeza: 'inferred', animalId: toroId, motivo }
}

function textoDeFecha(fecha: string | null, precision: string | null): string {
  if (fecha === null || precision === null) {
    return 'No sé'
  }
  const dia = diaLegible(fecha)
  return precision === 'approximate' ? `${dia}, aproximada` : dia
}

function textoDeLado(lado: Lado, nombre: string | null, visto: 'la' | 'lo'): string {
  if (lado.certeza === 'unknown') {
    return 'No sé'
  }
  const quien = nombre ?? 'un animal'
  if (lado.certeza === 'observed') {
    return `${visto === 'la' ? 'La vi' : 'Lo vi'} · ${quien}`
  }
  const motivo = lado.motivo === null ? 'sin motivo' : motivoDeInferencia(lado.motivo)
  return `${visto === 'la' ? 'Inferida' : 'Inferido'} (${motivo}) · ${quien}`
}

function nombreDe(
  animalId: string | null,
  animales: readonly Animal[],
  referidos: readonly { readonly id: string; readonly nombre: string | null }[],
): string | null {
  if (animalId === null) {
    return null
  }
  // La familia ya resolvió a quien la historia cita, aunque ya no esté activo.
  // El hato solo entra si ese id no vino en la lectura.
  const referido = referidos.find((animal) => animal.id === animalId)
  if (referido !== undefined) {
    return nombreVisible(referido)
  }
  const animal = animales.find((candidato) => candidato.id === animalId)
  return animal === undefined ? null : nombreVisible(animal)
}

function Dato({ etiqueta, valor }: { readonly etiqueta: string; readonly valor: string }) {
  return (
    <div className="dato">
      <dt className="dato__etiqueta">{etiqueta}</dt>
      <dd className="dato__valor">{valor}</dd>
    </div>
  )
}
