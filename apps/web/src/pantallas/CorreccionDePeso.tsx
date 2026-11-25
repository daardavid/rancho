import type { Peso } from '@rancho/api-contracts'
import { useRef, useState } from 'react'

import { useCorregirPeso } from '../api/pesajes'
import { kilosLegibles } from '../dominio/fechas'
import { calidad } from '../dominio/etiquetas'
import { kilosNormales, kilosParaEditar, revisarKilos } from '../dominio/kilos'
import { esConflictoDeVersion } from '../dominio/mensajes'
import { AvisoDeError } from '../ui/Avisos'
import { BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { CampoDeArea, CampoDeTexto } from '../ui/Campos'
import { FotoDeLaBascula } from '../ui/FotoDeLaBascula'
import { Segmentado } from '../ui/Segmentado'

/**
 * Lo que hace falta para corregir un peso: su id, lo que dice hoy y su versión.
 *
 * No se pide el `Peso` completo porque la fila de una sesión guardada y el peso
 * de la lectura con historia traen cosas distintas; los dos tienen esto. Lo que
 * llega es el hecho guardado, nunca un valor derivado.
 */
export type PesoCorregible = Pick<Peso, 'id' | 'kilos' | 'calidad' | 'version' | 'evidenciaId'>

/** Las tres calidades, con el nombre que usa el pesaje: se elige con un toque. */
const OPCIONES_DE_CALIDAD = [
  { valor: 'measured', texto: 'Báscula' },
  { valor: 'observed', texto: 'Visto' },
  { valor: 'declared', texto: 'Me lo dijeron' },
] as const

/**
 * Corregir un peso ya asentado, con motivo.
 *
 * Corregir es normal ([UX-05](../../../../../docs/product/ux-principles.md)): se
 * cambia el número mal anotado o la calidad, se dice por qué y se guarda. Lo que
 * había no se pierde: la API guarda el valor anterior, quién lo cambió y cuándo,
 * y la ficha lo enseña en la historia de cada peso.
 *
 * Se manda la `version` que se tiene abierta. Si alguien más corrigió ese peso
 * mientras esta pantalla estaba abierta, la API contesta `version_conflict` y no
 * guarda nada; la pantalla lo explica y ofrece recargar antes de volver a
 * escribir el cambio ([UX-17](../../../../../docs/product/ux-principles.md)).
 *
 * El peso no pasa por `number` en ningún momento: se compara como texto
 * normalizado para no mandar una corrección que no cambia nada
 * ([`kilosNormales`](../dominio/kilos.ts)).
 */
export function CorreccionDePeso({
  peso,
  nombreDelAnimal,
  alCancelar,
  alGuardar,
}: {
  readonly peso: PesoCorregible
  readonly nombreDelAnimal: string
  readonly alCancelar: () => void
  readonly alGuardar: () => void
}) {
  const [kilos, setKilos] = useState(kilosParaEditar(peso.kilos))
  const [calidadDelPeso, setCalidadDelPeso] = useState<string>(peso.calidad)
  const [fotoId, setFotoId] = useState<string | null>(peso.evidenciaId ?? null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [motivo, setMotivo] = useState('')

  const corregir = useCorregirPeso(peso.id)
  /** El id se reusa mientras el envío no salga bien y el contenido no cambie. */
  const comandos = useRef<{ id: string; contenido: string } | null>(null)

  const revision = revisarKilos(kilos)
  const cambioKilos = revision.ok && kilosNormales(kilos) !== peso.kilos
  const cambioCalidad = calidadDelPeso !== peso.calidad
  const cambioFoto = fotoId !== (peso.evidenciaId ?? null)
  const faltaMotivo = motivo.trim() === ''
  const sinCambios = !cambioKilos && !cambioCalidad && !cambioFoto

  const conflicto = esConflictoDeVersion(corregir.error)

  const enviar = (evento: React.FormEvent<HTMLFormElement>): void => {
    evento.preventDefault()
    if (faltaMotivo || sinCambios || !revision.ok || corregir.isPending || subiendoFoto) {
      return
    }

    const cuerpo = {
      version: peso.version,
      motivo: motivo.trim(),
      // La clave solo viaja si ese campo de verdad cambió: la API compara
      // contra lo guardado y no se manda un valor igual.
      ...(cambioKilos ? { kilos: kilos.trim() } : {}),
      ...(cambioCalidad ? { calidad: calidadDelPeso as 'measured' | 'observed' | 'declared' } : {}),
      ...(cambioFoto ? { evidenciaId: fotoId } : {}),
    }

    const contenido = JSON.stringify(cuerpo)
    if (comandos.current === null || comandos.current.contenido !== contenido) {
      comandos.current = { id: crypto.randomUUID(), contenido }
    }

    corregir.mutate(
      { commandId: comandos.current.id, ...cuerpo },
      {
        onSuccess: () => {
          comandos.current = null
          alGuardar()
        },
      },
    )
  }

  if (conflicto) {
    return (
      <div className="aviso aviso--ojo" role="alert">
        <p className="aviso__titulo">Alguien más corrigió este peso mientras lo tenías abierto.</p>
        <p className="aviso__quehacer">
          No se guardó tu corrección y no se perdió nada de lo que había. Vuelve a abrir el peso
          para ver lo último y escribe el cambio otra vez si todavía hace falta.
        </p>
        <BotonPrincipal alTocar={alCancelar}>Volver a ver el peso</BotonPrincipal>
      </div>
    )
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <p className="campo__ayuda">
        {nombreDelAnimal}: antes decía {kilosLegibles(peso.kilos)} y {calidad(peso.calidad)}. Lo
        anterior queda en la historia.
      </p>

      <CampoDeTexto
        etiqueta="Kilos"
        valor={kilos}
        alCambiar={setKilos}
        inputMode="decimal"
        maxLength={16}
        {...(revision.ok ? {} : { error: revision.motivo })}
        ayuda="Con punto y hasta 3 decimales. Por ejemplo 351.5"
      />

      <Segmentado
        etiqueta="¿Cómo se obtuvo?"
        opciones={OPCIONES_DE_CALIDAD}
        valor={calidadDelPeso}
        alElegir={setCalidadDelPeso}
      />

      <FotoDeLaBascula
        evidenciaId={fotoId}
        alCambiar={setFotoId}
        alOcuparse={setSubiendoFoto}
      />

      <CampoDeArea
        etiqueta="¿Por qué se corrige?"
        valor={motivo}
        alCambiar={setMotivo}
        ayuda="Obligatorio. Sirve para entender después qué pasó."
        maxLength={2000}
      />

      {sinCambios && motivo.trim() !== '' ? (
        <p className="campo__ayuda" role="status">
          Todavía no cambiaste el peso, la calidad ni la foto.
        </p>
      ) : null}

      {corregir.isError ? <AvisoDeError error={corregir.error} /> : null}

      <BotonPrincipal
        tipo="submit"
        deshabilitado={faltaMotivo || sinCambios || !revision.ok || corregir.isPending || subiendoFoto}
      >
        {corregir.isPending ? 'Guardando…' : subiendoFoto ? 'Subiendo la foto…' : 'Guardar corrección'}
      </BotonPrincipal>

      <BotonSecundario alTocar={alCancelar}>Cancelar</BotonSecundario>
    </form>
  )
}
