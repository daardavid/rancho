import { useRef, useState } from 'react'

import { usePonerMarca, useRegistrarAnimal } from '../api/hato'
import {
  CATEGORIAS,
  PARTICIPACIONES,
  SEXOS,
  TENENCIAS,
  opcionesElegibles,
} from '../dominio/etiquetas'
import { mensajeDeError } from '../dominio/mensajes'
import { irA } from '../ruta'
import { AvisoDeError } from '../ui/Avisos'
import { useEnfocarAviso } from '../ui/enfocar'
import { BarraDeAccion } from '../ui/BarraDeAccion'
import { BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { CampoDeArea, CampoDeTexto } from '../ui/Campos'
import { Desplegable } from '../ui/Desplegable'
import { Encabezado } from '../ui/Encabezado'
import { Mosaicos } from '../ui/Mosaicos'
import { Pildoras } from '../ui/Pildoras'
import { Segmentado } from '../ui/Segmentado'
import { IconoCerrar } from '../ui/iconos'

/**
 * Dar de alta un animal ([Alta](../../../../../docs/design/maqueta/Alta.dc.html)).
 *
 * Corto por decisión, no por prisa: lo único que se crea es la identidad
 * interna del animal, y todo lo demás puede quedar en «No sé» con un toque
 * ([UX-03](../../../../../docs/product/ux-principles.md),
 * [UX-04](../../../../../docs/product/ux-principles.md)). Las preguntas ya
 * vienen contestadas con «No sé», así que quien no sabe algo —o no lo tiene a
 * mano— no pelea con el formulario ni ve un error.
 *
 * El arete es su propio registro, con su propia historia de cambios, y el
 * comando del alta no lo lleva. Por eso son dos comandos: primero la ficha y
 * después el arete, cada uno con su id. Los dos son idempotentes, así que un
 * reintento —de uno o de los dos— no duplica nada: la API devuelve lo que ya
 * guardó.
 *
 * «Guardar y dar de alta otro» es lo que hace corto capturar un lote. La regla
 * es una sola para todos los campos, y se ve en la prueba:
 *
 * - **Se limpia** lo que identifica a este animal: el nombre o seña y el arete.
 * - **Se conserva** lo que es del lote: el tipo, el sexo, la tenencia, la
 *   participación económica, el detalle de «Otra» y la nota del arreglo. Antes
 *   el sexo se reiniciaba y los demás no; ahora todos siguen la misma regla.
 * - **La nota libre** se limpia: es de este animal, no del lote.
 */

/** «Otra» no es un mosaico: su texto vive en «Más datos». */
const TIPOS_DE_ANIMAL = opcionesElegibles(CATEGORIAS.filter((fila) => fila.codigo !== 'other'))
const OPCIONES_DE_SEXO = opcionesElegibles(SEXOS)
const OPCIONES_DE_TENENCIA = opcionesElegibles(TENENCIAS)
const OPCIONES_DE_PARTICIPACION = opcionesElegibles(PARTICIPACIONES)

type Borrador = {
  readonly nombre: string
  readonly arete: string
  readonly categoria: string
  readonly detalleCategoria: string
  readonly sexo: string
  readonly tenencia: string
  readonly participacion: string
  readonly notaDelArreglo: string
  readonly nota: string
}

const EN_BLANCO: Borrador = {
  nombre: '',
  arete: '',
  categoria: 'unknown',
  detalleCategoria: '',
  sexo: 'unknown',
  tenencia: 'unknown',
  participacion: 'unknown',
  notaDelArreglo: '',
  nota: '',
}

type Envio = {
  readonly commandId: string
  readonly id: string
}

type ComandoDelArete = {
  readonly id: string
  readonly markId: string
  readonly contenido: string
}

export function Alta() {
  const [borrador, setBorrador] = useState<Borrador>(EN_BLANCO)
  const [guardado, setGuardado] = useState<string | null>(null)

  const registrar = useRegistrarAnimal()
  const ponerArete = usePonerMarca()

  /**
   * Los ids del animal y de su comando se generan juntos, una sola vez, y se
   * reusan mientras el envío no salga bien. Reintentar por mala señal manda el
   * mismo cuerpo con el mismo id: la API devuelve el animal que ya guardó en
   * vez de crear otro.
   */
  const envio = useRef<Envio | null>(null)
  const formulario = useRef<HTMLFormElement>(null)
  useEnfocarAviso(formulario, registrar.isError || (registrar.isSuccess && ponerArete.isError))

  /**
   * El comando del arete, con la huella de su contenido.
   *
   * El arete es otro comando y tiene sus propios ids. Se reusan mientras el
   * contenido sea el mismo: un reintento no pone dos aretes, y si alguien
   * corrige el número después de un fallo, es otro comando.
   */
  const envioDelArete = useRef<ComandoDelArete | null>(null)

  /**
   * El animal que ya quedó guardado cuando el arete falló.
   *
   * Con el id en la mano, reintentar manda solo el arete. Volver a mandar el
   * comando del alta sería inútil y peligroso: si mientras tanto se corrigió
   * el nombre, el mismo id con otro contenido es `idempotency_mismatch`.
   */
  const animalGuardado = useRef<string | null>(null)

  const cambiando = registrar.isPending || ponerArete.isPending

  const cambiar = (cambios: Partial<Borrador>): void => {
    setGuardado(null)
    setBorrador((actual) => ({ ...actual, ...cambios }))
  }

  /**
   * Un toque en un mosaico descarta el texto de «Otra categoría»: son la misma
   * respuesta y solo una puede estar puesta.
   *
   * Vaca propone Hembra y Toro propone Macho: el sexo se ve marcado en su
   * pregunta y se puede cambiar antes de guardar. Es una propuesta, no un
   * hecho: si el dueño no la cambia, la guardó él al verla puesta. Becerro,
   * «Otra» y «No sé» no proponen nada y dejan el sexo como esté.
   */
  const elegirTipo = (tipo: string): void => {
    cambiar({ categoria: tipo, detalleCategoria: '', ...sexoPropuesto(tipo) })
  }

  /**
   * Escribir en «Otra categoría» escoge «Otra»: así el detalle nunca viaja
   * pegado a una categoría que no lo admite, y borrarlo vuelve a «No sé».
   */
  const escribirOtra = (texto: string): void => {
    cambiar({ detalleCategoria: texto, categoria: texto.trim() === '' ? 'unknown' : 'other' })
  }

  const guardar = (darDeAltaOtro: boolean): void => {
    if (cambiando) {
      return
    }
    setGuardado(null)

    const textoNombre = limpiar(borrador.nombre)
    const textoArete = limpiar(borrador.arete)
    const textoDetalle =
      borrador.categoria === 'other' ? limpiar(borrador.detalleCategoria) : undefined
    const textoArreglo =
      borrador.tenencia === 'a_la_parte' ? limpiar(borrador.notaDelArreglo) : undefined
    const textoNota = limpiar(borrador.nota)

    /** El alta terminó: o se abre la ficha, o el formulario queda listo para el siguiente. */
    const terminar = (animalId: string): void => {
      envio.current = null
      envioDelArete.current = null
      animalGuardado.current = null
      registrar.reset()
      ponerArete.reset()

      if (!darDeAltaOtro) {
        irA({ nombre: 'ficha', animalId })
        return
      }

      // La regla es la misma para todos los campos: se conserva lo que es del
      // lote y se limpia lo que identifica a este animal.
      const conservado = {
        categoria: borrador.categoria,
        detalleCategoria: borrador.categoria === 'other' ? borrador.detalleCategoria : '',
        sexo: borrador.sexo,
        tenencia: borrador.tenencia,
        participacion: borrador.participacion,
        notaDelArreglo: borrador.tenencia === 'a_la_parte' ? borrador.notaDelArreglo : '',
      }
      setBorrador({ ...EN_BLANCO, ...conservado })
      setGuardado(textoNombre ?? 'el animal')
    }

    /** El arete, ya con el id del animal que la API confirmó. */
    const ponerElArete = (animalId: string, valor: string): void => {
      const contenido = `${animalId}|${valor}`
      if (envioDelArete.current === null || envioDelArete.current.contenido !== contenido) {
        envioDelArete.current = { id: crypto.randomUUID(), markId: crypto.randomUUID(), contenido }
      }
      const arete = envioDelArete.current
      ponerArete.mutate(
        {
          animalId,
          cuerpo: {
            commandId: arete.id,
            marcaId: arete.markId,
            tipo: 'siniiga',
            valor,
          },
        },
        { onSuccess: () => terminar(animalId) },
      )
    }

    /*
      El animal ya está guardado y lo que falló fue el arete. Se reintenta solo
      el arete: el alta no se vuelve a mandar.
    */
    const yaGuardado = animalGuardado.current
    if (yaGuardado !== null) {
      if (textoArete === undefined) {
        terminar(yaGuardado)
        return
      }
      ponerElArete(yaGuardado, textoArete)
      return
    }

    envio.current ??= { commandId: crypto.randomUUID(), id: crypto.randomUUID() }
    const ids = envio.current

    registrar.mutate(
      {
        commandId: ids.commandId,
        id: ids.id,
        ...(textoNombre === undefined ? {} : { nombre: textoNombre }),
        sexo: borrador.sexo as 'female' | 'male' | 'unknown',
        categoria: borrador.categoria as 'calf' | 'cow' | 'bull' | 'other' | 'unknown',
        ...(textoDetalle === undefined ? {} : { detalleCategoria: textoDetalle }),
        tenencia: borrador.tenencia as 'ranch' | 'a_la_parte' | 'third_party' | 'unknown',
        participacionEconomica: borrador.participacion as 'known' | 'partially_known' | 'unknown',
        ...(textoArreglo === undefined ? {} : { notaDelArreglo: textoArreglo }),
        ...(textoNota === undefined ? {} : { nota: textoNota }),
      },
      {
        onSuccess: (ficha) => {
          if (textoArete === undefined) {
            terminar(ficha.id)
            return
          }
          animalGuardado.current = ficha.id
          ponerElArete(ficha.id, textoArete)
        },
      },
    )
  }

  /**
   * El animal quedó guardado y el arete no. Se dice en palabras: volver a tocar
   * «Guardar» reintenta el arete sin crear un segundo animal.
   */
  const faltaElArete = registrar.isSuccess && ponerArete.isError

  return (
    <main className="pantalla pantalla--alta">
      <Encabezado
        titulo="Nuevo animal"
        subtitulo="Llena lo que sepas. Lo demás, después."
        compacto
        acciones={[
          {
            etiqueta: 'Cerrar',
            icono: <IconoCerrar />,
            alTocar: () => {
              irA({ nombre: 'hato' })
            },
          },
        ]}
      />

      <form
        ref={formulario}
        className="formulario alta"
        onSubmit={(evento) => {
          evento.preventDefault()
          guardar(false)
        }}
      >
        {guardado === null ? null : (
          <p className="aviso aviso--bien" role="status">
            Se guardó {guardado}. Ahora el siguiente.
          </p>
        )}

        <div className="alta__fila">
          <CampoDeTexto
            etiqueta="Nombre o seña"
            valor={borrador.nombre}
            alCambiar={(nombre) => {
              cambiar({ nombre })
            }}
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

        <Mosaicos
          etiqueta="¿Qué es?"
          opciones={TIPOS_DE_ANIMAL}
          valor={borrador.categoria}
          alElegir={elegirTipo}
        />

        <Segmentado
          etiqueta="Sexo"
          opciones={OPCIONES_DE_SEXO}
          valor={borrador.sexo}
          alElegir={(sexo) => {
            cambiar({ sexo })
          }}
        />

        <Pildoras
          etiqueta="¿De quién es?"
          opciones={OPCIONES_DE_TENENCIA}
          valor={borrador.tenencia}
          alElegir={(tenencia) => {
            cambiar({ tenencia })
          }}
        />

        <Desplegable titulo="Más datos" resumen="otra categoría, participación, notas">
          <CampoDeTexto
            etiqueta="Otra categoría"
            valor={borrador.detalleCategoria}
            alCambiar={escribirOtra}
            marcador="Si no es becerro, vaca ni toro"
            ayuda="Lo que escribas aquí se guarda como «Otra», con su texto."
            maxLength={200}
          />

          <Segmentado
            etiqueta="Participación económica"
            opciones={OPCIONES_DE_PARTICIPACION}
            valor={borrador.participacion}
            alElegir={(participacion) => {
              cambiar({ participacion })
            }}
          />

          {borrador.tenencia === 'a_la_parte' ? (
            <CampoDeArea
              etiqueta="Nota del arreglo"
              valor={borrador.notaDelArreglo}
              alCambiar={(notaDelArreglo) => {
                cambiar({ notaDelArreglo })
              }}
              ayuda="Lo que se sepa del arreglo, en tus palabras. No se calcula ninguna parte."
            />
          ) : null}

          <CampoDeArea
            etiqueta="Nota"
            valor={borrador.nota}
            alCambiar={(nota) => {
              cambiar({ nota })
            }}
            ayuda="Cualquier cosa que convenga recordar de este animal."
          />
        </Desplegable>

        {faltaElArete ? (
          <div className="aviso aviso--ojo" role="alert">
            <p className="aviso__titulo">El animal sí se guardó. El arete no.</p>
            <p className="aviso__quehacer">
              {mensajeDeError(ponerArete.error).quePaso} Podrías corregirlo desde la ficha del
              animal. Si fue la señal, vuelve a tocar «Guardar»: es el mismo envío y no se
              duplica el animal.
            </p>
            <p className="aviso__codigo">Código: {mensajeDeError(ponerArete.error).codigo}</p>
          </div>
        ) : null}

        {registrar.isError ? <AvisoDeError error={registrar.error} /> : null}
      </form>

      <BarraDeAccion anclaje="ventana" sobreLaNavegacion>
        <BotonPrincipal
          deshabilitado={cambiando}
          alTocar={() => {
            guardar(false)
          }}
        >
          {cambiando ? 'Guardando…' : 'Guardar'}
        </BotonPrincipal>
        <BotonSecundario
          deshabilitado={cambiando}
          alTocar={() => {
            guardar(true)
          }}
        >
          Guardar y dar de alta otro
        </BotonSecundario>
      </BarraDeAccion>
    </main>
  )
}

function limpiar(texto: string): string | undefined {
  const recortado = texto.trim()
  return recortado === '' ? undefined : recortado
}

/**
 * Lo que el tipo propone en el sexo, si propone algo.
 *
 * Vaca implica hembra y Toro implica macho en el vocabulario del rancho, pero
 * es una propuesta: queda marcada y se puede cambiar. Un becerro puede ser
 * hembra o macho, así que no propone nada.
 */
function sexoPropuesto(tipo: string): { readonly sexo?: string } {
  if (tipo === 'cow') {
    return { sexo: 'female' }
  }
  if (tipo === 'bull') {
    return { sexo: 'male' }
  }
  return {}
}
