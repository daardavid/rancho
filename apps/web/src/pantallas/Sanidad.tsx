import type { AnotarSalud, NotaConHistoria } from '@rancho/api-contracts'
import { useRef, useState } from 'react'

import { useAnotarSalud, useCorregirNotaDeSalud, useNotasDeSalud } from '../api/salud'
import { diaLegible, hoyEnElRancho, instanteLegible } from '../dominio/fechas'
import { TIPOS_DE_NOTA, campoDeNota, opcionesElegibles, tipoDeNota } from '../dominio/etiquetas'
import { esConflictoDeVersion } from '../dominio/mensajes'
import { AvisoDeError } from '../ui/Avisos'
import { useEnfocarAviso } from '../ui/enfocar'
import { BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { CampoDeArea, CampoDeFecha, CampoDeTexto } from '../ui/Campos'
import { Desplegable } from '../ui/Desplegable'
import { FotoDeLaBascula, FotoVisible } from '../ui/FotoDeLaBascula'
import { Mosaicos } from '../ui/Mosaicos'
import { Segmentado } from '../ui/Segmentado'

const TIPOS = opcionesElegibles(TIPOS_DE_NOTA)
const VISTO = [
  { valor: 'si', texto: 'Sí se vio' },
  { valor: 'no', texto: 'No se vio' },
  { valor: 'no_se', texto: 'No sé' },
]

/** `undefined` es «todavía no elige». `null` es «No sé», que sí se guarda. */
function vistoDelFormulario(valor: string): boolean | null | undefined {
  if (valor === 'si') {
    return true
  }
  if (valor === 'no') {
    return false
  }
  if (valor === 'no_se') {
    return null
  }
  return undefined
}

function valorDeVisto(visto: boolean | null): string {
  if (visto === true) {
    return 'si'
  }
  if (visto === false) {
    return 'no'
  }
  return 'no_se'
}

function fraseDeVisto(visto: boolean | null): string {
  if (visto === true) {
    return 'La nota dice que se vio al animal.'
  }
  if (visto === false) {
    return 'La nota no dice que se viera al animal.'
  }
  return 'No se sabe si se vio al animal.'
}
/** El mismo tope que el contrato: el producto es un nombre, no un cuaderno. */
const LARGO_DEL_PRODUCTO = 200
/** Lo mismo que la nota de la ficha: un ancho de campo, no una regla del rancho. */
const LARGO_DEL_DETALLE = 2000

/**
 * «Anotar sanidad»: la vacuna, el medicamento, el baño o el problema visto para
 * un animal o para un grupo.
 *
 * Es la misma captura desde la ficha (un animal) y desde el hato (los elegidos):
 * un solo hecho con el mismo tipo, la misma fecha y el mismo producto, escrito
 * una vez por animal. No hay calendario, dosis, retiro ni flujo de veterinario
 * (`OQ-HEALTH-001`): esos campos no existen aquí.
 *
 * Ni el tipo ni «¿Se vio al animal?» vienen marcados. Si no se eligen, no se
 * guarda: la pantalla no decide «Vacuna» ni «No se vio». «No sé» es una
 * respuesta y no cuenta como observación.
 *
 * El `commandId` y los `notaId` se conservan entre intentos mientras el
 * contenido no cambie: si se cae la red después de que la API guardó, el
 * reintento es el mismo comando y el servidor devuelve lo guardado.
 */
export function FormularioDeSanidad({
  animales,
  nombreDelGrupo,
  alGuardar,
  alCancelar,
}: {
  readonly animales: readonly string[]
  /** Para el título: el nombre del animal, o cuántos van en el grupo. */
  readonly nombreDelGrupo: string
  readonly alGuardar: () => void
  readonly alCancelar: () => void
}) {
  const [tipo, setTipo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [fecha, setFecha] = useState(hoyEnElRancho())
  const [producto, setProducto] = useState('')
  const [evidenciaId, setEvidenciaId] = useState<string | null>(null)
  const [vioAlAnimal, setVioAlAnimal] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const anotar = useAnotarSalud()
  const pendiente = useRef<{ contenido: string; cuerpo: AnotarSalud } | null>(null)
  const seccion = useRef<HTMLElement>(null)
  useEnfocarAviso(seccion, anotar.isError)

  const tipoElegido = tipoDeNotaElegido(tipo)
  const faltaDetalle = detalle.trim() === ''
  const faltaTipo = tipoElegido === null
  const visto = vistoDelFormulario(vioAlAnimal)
  const faltaVisto = visto === undefined
  const sinAnimales = animales.length === 0

  const guardar = (): void => {
    if (
      faltaDetalle ||
      faltaTipo ||
      visto === undefined ||
      sinAnimales ||
      anotar.isPending ||
      subiendo
    ) {
      return
    }
    if (tipoElegido === null) {
      return
    }
    const limpio = detalle.trim()
    const conProducto = producto.trim()
    // Los ids de nota no entran en la huella: se acuñan una vez y se reusan
    // tal cual mientras el contenido sea el mismo.
    const contenido = JSON.stringify({
      tipo,
      detalle: limpio,
      fecha,
      producto: conProducto === '' ? null : conProducto,
      evidenciaId,
      vioAlAnimal: visto,
      animales: [...animales].sort(),
    })
    if (pendiente.current === null || pendiente.current.contenido !== contenido) {
      pendiente.current = {
        contenido,
        cuerpo: {
          commandId: crypto.randomUUID(),
          tipo: tipoElegido,
          detalle: limpio,
          fecha,
          ...(conProducto === '' ? {} : { producto: conProducto }),
          ...(evidenciaId === null ? {} : { evidenciaId }),
          vioAlAnimal: visto,
          animales: animales.map((animalId) => ({ animalId, notaId: crypto.randomUUID() })),
        },
      }
    }

    anotar.mutate(pendiente.current.cuerpo, {
      onSuccess: () => {
        pendiente.current = null
        alGuardar()
      },
    })
  }

  return (
    <section className="mover" ref={seccion}>
      <h2 className="ficha__titulo">Anotar sanidad · {nombreDelGrupo}</h2>
      <p className="campo__ayuda">
        Se anota qué se hizo o se vio, el día y el producto si se sabe. No es un calendario ni
        lleva dosis. Elige qué se anota y si se vio al animal: no viene marcado, y si no lo
        eliges no se guarda.
      </p>

      <Mosaicos etiqueta="¿Qué se anota?" opciones={TIPOS} valor={tipo} alElegir={setTipo} />

      <CampoDeArea
        etiqueta="¿Qué se hizo o se vio?"
        valor={detalle}
        alCambiar={setDetalle}
        maxLength={LARGO_DEL_DETALLE}
        ayuda="Por ejemplo: vacuna contra el ántrax en la manga, o se le vio una herida en la pata."
      />

      <CampoDeFecha etiqueta="¿Cuándo?" valor={fecha} alCambiar={setFecha} />

      <Segmentado
        etiqueta="¿Se vio al animal?"
        opciones={VISTO}
        valor={vioAlAnimal}
        alElegir={setVioAlAnimal}
      />
      <p className="campo__ayuda">
        Solo «Sí se vio» cuenta como que se le vio ese día. «No sé» no cuenta. Una nota no cambia
        su último pesaje.
      </p>

      <Desplegable titulo="Más datos" resumen="producto y foto">
        <CampoDeTexto
          etiqueta="Producto"
          valor={producto}
          alCambiar={setProducto}
          maxLength={LARGO_DEL_PRODUCTO}
          ayuda="Opcional. Si no se sabe cuál fue, se deja vacío."
        />
        <FotoDeLaBascula
          evidenciaId={evidenciaId}
          alCambiar={setEvidenciaId}
          alOcuparse={setSubiendo}
          etiqueta="Foto"
          alt="Foto de la nota de sanidad"
          ayuda="Opcional. El frasco, el animal o lo que se vio."
          ayudaAlQuitar="Si la quitas, deja de verse en la nota. La foto no se borra."
        />
      </Desplegable>

      {anotar.isError ? <AvisoDeError error={anotar.error} /> : null}

      <BotonPrincipal
        alTocar={guardar}
        deshabilitado={
          faltaDetalle || faltaTipo || faltaVisto || sinAnimales || anotar.isPending || subiendo
        }
      >
        {anotar.isPending ? 'Guardando…' : 'Anotar sanidad'}
      </BotonPrincipal>
      <BotonSecundario alTocar={alCancelar} deshabilitado={anotar.isPending}>
        Cancelar
      </BotonSecundario>
    </section>
  )
}

/**
 * La sección «Sanidad» de la ficha: las notas del animal en orden, cada una con
 * su corrección.
 *
 * Si nunca se le anotó nada se dice eso, no se deja vacío. Si la lectura falla
 * se dice que no se pudo traer, que es lo que pasó; no se afirma que no haya
 * notas.
 */
export function SanidadDelAnimal({
  animalId,
  puedeAnotar,
}: {
  readonly animalId: string
  /** Quien ya salió conserva las notas y no recibe otra. */
  readonly puedeAnotar: boolean
}) {
  const notas = useNotasDeSalud(animalId)
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null)

  return (
    <section className="ficha__seccion">
      <h2 className="ficha__titulo">Sanidad</h2>
      {notas.isPending ? <p className="campo__ayuda">Trayendo las notas de sanidad…</p> : null}
      {notas.isError ? (
        <p className="campo__ayuda" role="status">
          No se pudieron traer las notas de sanidad. Vuelve a abrir la ficha para intentarlo otra
          vez.
        </p>
      ) : null}
      {notas.data !== undefined && notas.data.notas.length === 0 ? (
        <p className="campo__ayuda">
          {puedeAnotar
            ? 'Todavía no se le anotó nada de sanidad. Se anota desde aquí o desde el hato, eligiendo varios animales.'
            : 'No se le anotó sanidad. Ya salió del hato, así que no se le anota otra.'}
        </p>
      ) : null}

      {notas.data !== undefined && notas.data.notas.length > 0 ? (
        <ul className="lista lista--planas">
          {[...notas.data.notas].reverse().map((nota) => (
            <li key={nota.id} className="nota-sanidad">
              <p className="nota-sanidad__tipo">{tipoDeNota(nota.tipo)}</p>
              <p className="nota-sanidad__detalle">{nota.detalle}</p>
              <p className="nota-sanidad__cuando">
                {diaLegible(nota.fecha)}
                {nota.producto === null ? '' : ` · ${nota.producto}`}
              </p>
              <p className="campo__ayuda">{fraseDeVisto(nota.vioAlAnimal)}</p>
              <FotoVisible evidenciaId={nota.evidenciaId} alt="Foto de la nota de sanidad" />
              {corrigiendo === nota.id ? (
                <CorreccionDeNota
                  nota={nota}
                  alCancelar={() => {
                    setCorrigiendo(null)
                  }}
                  alGuardar={() => {
                    setCorrigiendo(null)
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="enlace"
                  onClick={() => {
                    setCorrigiendo(nota.id)
                  }}
                >
                  Corregir esta nota
                </button>
              )}
              {nota.correcciones.length === 0 ? null : (
                <ul className="lista lista--planas">
                  {nota.correcciones.map((correccion, indice) => (
                    <li key={`${correccion.campo}-${correccion.correctedAt}-${indice}`} className="correccion">
                      <p className="correccion__campo">
                        {campoDeNota(correccion.campo)}: antes decía «{textoAnterior(correccion)}»
                      </p>
                      <p className="correccion__motivo">Por qué: {correccion.motivo}</p>
                      <p className="correccion__cuando">{instanteLegible(correccion.correctedAt)}</p>
                      {correccion.campo === 'evidencia' ? (
                        <FotoVisible evidenciaId={correccion.valorAnterior} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

/**
 * Corregir una nota. Lo anterior se queda en la historia con el motivo. Una
 * versión vieja se explica y se ofrece volver a abrir la ficha, como en la
 * corrección de un peso.
 */
function CorreccionDeNota({
  nota,
  alGuardar,
  alCancelar,
}: {
  readonly nota: NotaConHistoria
  readonly alGuardar: () => void
  readonly alCancelar: () => void
}) {
  const [tipo, setTipo] = useState<string>(nota.tipo)
  const [detalle, setDetalle] = useState(nota.detalle)
  const [fecha, setFecha] = useState(nota.fecha)
  const [producto, setProducto] = useState(nota.producto ?? '')
  const [evidenciaId, setEvidenciaId] = useState<string | null>(nota.evidenciaId)
  const [vioAlAnimal, setVioAlAnimal] = useState(valorDeVisto(nota.vioAlAnimal))
  const [motivo, setMotivo] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const corregir = useCorregirNotaDeSalud(nota.id, nota.animalId)
  const formulario = useRef<HTMLFormElement>(null)
  useEnfocarAviso(formulario, corregir.isError)
  const pendiente = useRef<{ contenido: string; cuerpo: Parameters<typeof corregir.mutate>[0] } | null>(
    null,
  )

  const conflicto = esConflictoDeVersion(corregir.error)
  const faltaMotivo = motivo.trim() === ''
  const faltaDetalle = detalle.trim() === ''

  const guardar = (): void => {
    if (faltaMotivo || faltaDetalle || corregir.isPending || subiendo) {
      return
    }
    const limpio = detalle.trim()
    const conProducto = producto.trim()
    // La huella es de lo capturado, sin el `commandId`: si nada cambió, el
    // reintento es el mismo comando.
    const capturado = {
      version: nota.version,
      motivo: motivo.trim(),
      tipo: tipoDe(tipo),
      detalle: limpio,
      fecha,
      producto: conProducto === '' ? null : conProducto,
      evidenciaId,
      vioAlAnimal: vistoDelFormulario(vioAlAnimal) ?? null,
    }
    const contenido = JSON.stringify(capturado)
    if (pendiente.current === null || pendiente.current.contenido !== contenido) {
      pendiente.current = {
        contenido,
        cuerpo: { ...capturado, commandId: crypto.randomUUID() },
      }
    }

    corregir.mutate(pendiente.current.cuerpo, {
      onSuccess: () => {
        pendiente.current = null
        alGuardar()
      },
    })
  }

  if (conflicto) {
    return (
      <div className="aviso aviso--ojo" role="alert">
        <p>Alguien más cambió esta nota mientras la tenías abierta. No se guardó nada.</p>
        <BotonSecundario alTocar={alCancelar}>Cerrar y ver la nota</BotonSecundario>
      </div>
    )
  }

  return (
    <form
      ref={formulario}
      className="formulario"
      onSubmit={(evento) => {
        evento.preventDefault()
        guardar()
      }}
    >
      <Mosaicos etiqueta="¿Qué se anota?" opciones={TIPOS} valor={tipo} alElegir={setTipo} />
      <CampoDeArea
        etiqueta="¿Qué se hizo o se vio?"
        valor={detalle}
        alCambiar={setDetalle}
        maxLength={LARGO_DEL_DETALLE}
      />
      <CampoDeFecha etiqueta="¿Cuándo?" valor={fecha} alCambiar={setFecha} />
      <Segmentado
        etiqueta="¿Se vio al animal?"
        opciones={VISTO}
        valor={vioAlAnimal}
        alElegir={setVioAlAnimal}
      />
      <CampoDeTexto
        etiqueta="Producto"
        valor={producto}
        alCambiar={setProducto}
        maxLength={LARGO_DEL_PRODUCTO}
      />
      <FotoDeLaBascula
        evidenciaId={evidenciaId}
        alCambiar={setEvidenciaId}
        alOcuparse={setSubiendo}
        etiqueta="Foto"
        alt="Foto de la nota de sanidad"
        ayuda="Opcional."
        ayudaAlQuitar="Si la quitas, deja de verse en la nota. La foto no se borra."
      />
      <CampoDeArea
        etiqueta="¿Por qué se corrige?"
        valor={motivo}
        alCambiar={setMotivo}
        ayuda="Obligatorio. Lo anterior se queda en la historia."
      />
      {corregir.isError ? <AvisoDeError error={corregir.error} /> : null}
      <BotonPrincipal
        tipo="submit"
        deshabilitado={faltaMotivo || faltaDetalle || corregir.isPending || subiendo}
      >
        {corregir.isPending ? 'Guardando…' : 'Guardar la corrección'}
      </BotonPrincipal>
      <BotonSecundario alTocar={alCancelar} deshabilitado={corregir.isPending}>
        Cancelar
      </BotonSecundario>
    </form>
  )
}

/** El valor anterior de la historia, en palabras. `null` es «no había». */
function textoAnterior(correccion: NotaConHistoria['correcciones'][number]): string {
  if (correccion.valorAnterior === null) {
    return 'nada'
  }
  if (correccion.campo === 'tipo') {
    return tipoDeNota(correccion.valorAnterior)
  }
  if (correccion.campo === 'fecha') {
    return diaLegible(correccion.valorAnterior)
  }
  if (correccion.campo === 'vioAlAnimal') {
    if (correccion.valorAnterior === 'si') {
      return 'sí se vio'
    }
    if (correccion.valorAnterior === 'no_se') {
      return 'no sé'
    }
    return 'no se vio'
  }
  if (correccion.campo === 'evidencia') {
    return 'tenía una foto'
  }
  return correccion.valorAnterior
}

function tipoDeNotaElegido(valor: string): AnotarSalud['tipo'] | null {
  if (
    valor === 'vacuna' ||
    valor === 'medicamento' ||
    valor === 'bano' ||
    valor === 'problema' ||
    valor === 'otro'
  ) {
    return valor
  }
  return null
}

function tipoDe(valor: string): AnotarSalud['tipo'] {
  return tipoDeNotaElegido(valor) ?? 'otro'
}
