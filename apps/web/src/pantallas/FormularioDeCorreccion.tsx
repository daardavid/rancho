import type { CorregirAnimal } from '@rancho/api-contracts'
import { useRef, useState } from 'react'

import { useCorregirAnimal } from '../api/hato'
import { esConflictoDeVersion } from '../dominio/mensajes'
import { CATEGORIAS, PARTICIPACIONES, SEXOS, TENENCIAS } from '../dominio/etiquetas'
import type { FichaCompleta } from '../dominio/tipos'
import { AvisoDeError, BotonGrande } from '../ui/Avisos'
import { CampoDeArea, CampoDeOpciones, CampoDeTexto } from '../ui/Campos'

/**
 * Corregir la ficha.
 *
 * Corregir es normal ([UX-05](../../../../../docs/product/ux-principles.md)):
 * se cambia el dato equivocado y se dice por qué. Lo que estaba no se borra: la
 * API guarda el valor anterior, quién lo cambió y cuándo, y la ficha lo enseña
 * abajo en la historia de correcciones.
 *
 * Si alguien más cambió la ficha mientras esta pantalla estaba abierta, la API
 * responde `version_conflict` y no guarda nada. La pantalla lo dice en palabras
 * y ofrece recargar para ver lo último antes de volver a corregir
 * ([UX-17](../../../../../docs/product/ux-principles.md)).
 */
export function FormularioDeCorreccion({
  ficha,
  alRecargar,
  alGuardar,
}: {
  readonly ficha: FichaCompleta
  readonly alRecargar: () => void
  readonly alGuardar: () => void
}) {
  const [nombre, setNombre] = useState(ficha.nombre ?? '')
  const [sexo, setSexo] = useState<string>(ficha.sexo)
  const [categoria, setCategoria] = useState<string>(ficha.categoria)
  const [detalleCategoria, setDetalleCategoria] = useState(ficha.detalleCategoria ?? '')
  const [tenencia, setTenencia] = useState<string>(ficha.tenencia)
  const [participacion, setParticipacion] = useState<string>(ficha.participacionEconomica)
  const [notaDelArreglo, setNotaDelArreglo] = useState(ficha.notaDelArreglo ?? '')
  const [nota, setNota] = useState(ficha.nota ?? '')
  const [motivo, setMotivo] = useState('')

  const corregir = useCorregirAnimal(ficha.id)
  /** El id se reusa mientras el envío no salga bien y el motivo no cambie. */
  const comandos = useRef<{ id: string; contenido: string } | null>(null)

  const conflicto = esConflictoDeVersion(corregir.error)
  const faltaMotivo = motivo.trim() === ''

  const enviar = (evento: React.FormEvent<HTMLFormElement>): void => {
    evento.preventDefault()
    if (faltaMotivo || corregir.isPending) {
      return
    }

    const cambios = construirCambios({
      nombre,
      sexo,
      categoria,
      detalleCategoria,
      tenencia,
      participacion,
      notaDelArreglo,
      nota,
    })

    const cuerpo: Omit<CorregirAnimal, 'commandId'> = {
      version: ficha.version,
      motivo: motivo.trim(),
      ...cambios,
    }

    // Mismo motivo y mismos datos ⇒ mismo comando. Si el dueño cambia algo
    // entre intentos, es otro comando y hace falta otro id.
    const contenido = JSON.stringify(cuerpo)
    if (comandos.current === null || comandos.current.contenido !== contenido) {
      comandos.current = { id: crypto.randomUUID(), contenido }
    }

    corregir.mutate(
      { commandId: comandos.current.id, ...cuerpo },
      {
        onSuccess: () => {
          comandos.current = null
          setMotivo('')
          // La versión que tenía abierta ya no sirve: la corrección la subió.
          // Se cierra el formulario para que la pantalla vuelva a leer la ficha
          // en vez de que la segunda corrección choque contra sí misma.
          alGuardar()
        },
      },
    )
  }

  if (conflicto) {
    return (
      <div className="aviso aviso--ojo" role="alert">
        <p className="aviso__titulo">Alguien más cambió esta ficha mientras la tenías abierta.</p>
        <p className="aviso__quehacer">
          Tu corrección no se guardó y no se perdió nada de lo que había. Recarga la ficha para ver
          lo último y vuelve a escribir el cambio si todavía hace falta.
        </p>
        <BotonGrande alTocar={alRecargar}>Recargar la ficha</BotonGrande>
      </div>
    )
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <CampoDeTexto
        etiqueta="Nombre o seña"
        valor={nombre}
        alCambiar={setNombre}
        ayuda="Déjalo vacío si el animal no tiene nombre o seña."
      />
      <CampoDeOpciones etiqueta="Sexo" opciones={SEXOS} valor={sexo} alCambiar={setSexo} />
      <CampoDeOpciones
        etiqueta="Categoría"
        opciones={CATEGORIAS}
        valor={categoria}
        alCambiar={setCategoria}
      />
      {categoria === 'other' ? (
        <CampoDeTexto
          etiqueta="¿Cuál?"
          valor={detalleCategoria}
          alCambiar={setDetalleCategoria}
        />
      ) : null}
      <CampoDeOpciones
        etiqueta="¿De quién es?"
        opciones={TENENCIAS}
        valor={tenencia}
        alCambiar={setTenencia}
      />
      {tenencia === 'a_la_parte' ? (
        <CampoDeArea
          etiqueta="Nota del arreglo"
          valor={notaDelArreglo}
          alCambiar={setNotaDelArreglo}
          ayuda="En tus palabras. No se calcula ninguna parte."
        />
      ) : null}
      <CampoDeOpciones
        etiqueta="Participación económica"
        opciones={PARTICIPACIONES}
        valor={participacion}
        alCambiar={setParticipacion}
      />
      <CampoDeArea etiqueta="Nota" valor={nota} alCambiar={setNota} />

      <CampoDeArea
        etiqueta="¿Por qué se corrige?"
        valor={motivo}
        alCambiar={setMotivo}
        ayuda="Obligatorio. Sirve para entender después qué pasó."
        maxLength={2000}
      />

      {corregir.isError ? <AvisoDeError error={corregir.error} /> : null}

      <BotonGrande tipo="submit" deshabilitado={faltaMotivo || corregir.isPending}>
        {corregir.isPending ? 'Guardando…' : 'Guardar corrección'}
      </BotonGrande>
    </form>
  )
}

type Borrador = {
  readonly nombre: string
  readonly sexo: string
  readonly categoria: string
  readonly detalleCategoria: string
  readonly tenencia: string
  readonly participacion: string
  readonly notaDelArreglo: string
  readonly nota: string
}

/**
 * Arma el cuerpo con el estado completo del formulario. El módulo de la ficha
 * compara contra lo guardado y solo entra a la historia lo que de verdad
 * cambió; un campo que quedó igual no ensucia la historia de correcciones.
 *
 * Un texto vacío viaja como `null` (borrar), no como cadena vacía: el contrato
 * no acepta un texto que solo tenga espacios.
 */
function construirCambios(borrador: Borrador): Omit<CorregirAnimal, 'commandId' | 'version' | 'motivo'> {
  const texto = (valor: string): string | null => {
    const recortado = valor.trim()
    return recortado === '' ? null : recortado
  }

  return {
    nombre: texto(borrador.nombre),
    sexo: borrador.sexo as 'female' | 'male' | 'unknown',
    categoria: borrador.categoria as 'calf' | 'cow' | 'bull' | 'other' | 'unknown',
    ...(borrador.categoria === 'other'
      ? { detalleCategoria: texto(borrador.detalleCategoria) }
      : {}),
    tenencia: borrador.tenencia as 'ranch' | 'a_la_parte' | 'third_party' | 'unknown',
    participacionEconomica: borrador.participacion as 'known' | 'partially_known' | 'unknown',
    // La nota del arreglo solo se toca cuando la tenencia es «a la parte». Si
    // la tenencia cambia, la nota se queda como estaba: no se borra un dato del
    // rancho porque el campo dejó de mostrarse.
    ...(borrador.tenencia === 'a_la_parte'
      ? { notaDelArreglo: texto(borrador.notaDelArreglo) }
      : {}),
    nota: texto(borrador.nota),
  }
}
