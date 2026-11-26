import type { CorregirSalida, RegistrarSalida } from '@rancho/api-contracts'
import { useRef, useState, type FormEvent } from 'react'

import { useCorregirSalida, useRegistrarSalida } from '../api/hato'
import { MOTIVOS_DE_SALIDA, motivoDeSalida, opcionesElegibles } from '../dominio/etiquetas'
import { diaLegible, hoyEnElRancho } from '../dominio/fechas'
import { esConflictoDeVersion } from '../dominio/mensajes'
import type { FichaCompleta } from '../dominio/tipos'
import { AvisoDeError } from '../ui/Avisos'
import { BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { CampoDeArea, CampoDeFecha } from '../ui/Campos'
import { Desplegable } from '../ui/Desplegable'
import { FotoDeLaBascula } from '../ui/FotoDeLaBascula'
import { Mosaicos } from '../ui/Mosaicos'

const MOTIVOS = opcionesElegibles(MOTIVOS_DE_SALIDA)

/**
 * Dar de baja, o corregir una salida equivocada.
 *
 * La confirmación es esta pantalla: dice que deja el hato activo y que la
 * ficha se queda. No pide precio, reposición ni parte. «No sé» es un motivo
 * válido y viene elegido, igual que en el alta.
 */
export function FormularioDeSalida({
  ficha,
  alRecargar,
  alGuardar,
  alCancelar,
}: {
  readonly ficha: FichaCompleta
  readonly alRecargar: () => void
  /** `true` solo cuando esta guardada deshizo la salida y el animal volvió. */
  readonly alGuardar: (volvio: boolean) => void
  readonly alCancelar: () => void
}) {
  const salida = ficha.salida
  const [motivoSalida, setMotivoSalida] = useState<string>(salida?.motivo ?? 'unknown')
  const [fecha, setFecha] = useState(salida?.fecha ?? hoyEnElRancho())
  const [nota, setNota] = useState(salida?.nota ?? '')
  const [evidenciaId, setEvidenciaId] = useState<string | null>(salida?.evidenciaId ?? null)
  const [motivo, setMotivo] = useState('')
  const [volver, setVolver] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  const registrar = useRegistrarSalida(ficha.id)
  const corregir = useCorregirSalida(ficha.id)
  const comando = salida === null ? registrar : corregir
  const comandos = useRef<{ id: string; contenido: string } | null>(null)

  const conflicto = esConflictoDeVersion(comando.error)
  const faltaMotivo = salida !== null && motivo.trim() === ''

  const enviar = (evento: FormEvent<HTMLFormElement>): void => {
    evento.preventDefault()
    if (faltaMotivo || comando.isPending || subiendo) {
      return
    }

    const cuerpo = cuerpoDe({
      version: ficha.version,
      motivoSalida,
      fecha,
      nota,
      evidenciaId,
      motivo,
      volver,
      esBaja: salida === null,
    })
    if (cuerpo === null) {
      return
    }

    const contenido = JSON.stringify(cuerpo)
    if (comandos.current === null || comandos.current.contenido !== contenido) {
      comandos.current = { id: crypto.randomUUID(), contenido }
    }

    const volvio = salida !== null && volver
    const alListo = (): void => {
      comandos.current = null
      alGuardar(volvio)
    }
    if (salida === null && esAlta(cuerpo)) {
      registrar.mutate({ ...cuerpo, commandId: comandos.current.id }, { onSuccess: alListo })
      return
    }
    if (salida !== null && !esAlta(cuerpo)) {
      corregir.mutate({ ...cuerpo, commandId: comandos.current.id }, { onSuccess: alListo })
    }
  }

  if (conflicto) {
    return (
      <div className="aviso aviso--ojo" role="alert">
        <p>Alguien más cambió esta ficha mientras la tenías abierta. No se guardó nada.</p>
        <BotonPrincipal alTocar={alRecargar}>Recargar la ficha</BotonPrincipal>
      </div>
    )
  }

  const titulo = salida === null ? 'Dar de baja' : volver ? 'Volver al hato' : 'Corregir la salida'
  const explicacion =
    salida === null
      ? 'Deja de aparecer en el hato y en el pesaje. La ficha, los aretes y los pesos se quedan.'
      : volver
        ? `Va a volver al hato activo. La salida (${motivoDeSalida(salida.motivo)}, se supo el ${diaLegible(salida.fecha)}) queda en la historia.`
        : 'Se corrige lo que quedó mal. Lo que estaba no se borra.'

  return (
    <form className="formulario" onSubmit={enviar}>
      <p className="campo__ayuda">{explicacion}</p>

      {salida !== null && volver ? null : (
        <>
          <Mosaicos
            etiqueta="¿Por qué sale?"
            opciones={MOTIVOS}
            valor={motivoSalida}
            alElegir={setMotivoSalida}
          />
          <CampoDeFecha
            etiqueta="¿Cuándo se supo?"
            valor={fecha}
            alCambiar={setFecha}
            ayuda="El día en que se supo, no hace falta la hora."
          />
          <Desplegable titulo="Más datos" resumen="nota y foto">
            <CampoDeArea
              etiqueta="Nota"
              valor={nota}
              alCambiar={setNota}
              ayuda="Opcional. Si no hay nada que anotar, se deja vacía."
            />
            <FotoDeLaBascula
              evidenciaId={evidenciaId}
              alCambiar={setEvidenciaId}
              alOcuparse={setSubiendo}
              etiqueta="Foto"
              alt="Foto de la salida"
              ayuda="Opcional. Es evidencia de la salida. No la convierte en un dato medido."
              ayudaAlQuitar="Si la quitas, deja de verse en la salida. La foto no se borra."
            />
          </Desplegable>
        </>
      )}

      {salida === null ? null : (
        <CampoDeArea
          etiqueta="¿Por qué se corrige?"
          valor={motivo}
          alCambiar={setMotivo}
          ayuda="Obligatorio. Sirve para entender después qué pasó."
        />
      )}

      {comando.isError && !conflicto ? <AvisoDeError error={comando.error} /> : null}

      <BotonPrincipal tipo="submit" deshabilitado={comando.isPending || subiendo || faltaMotivo}>
        {comando.isPending ? 'Guardando…' : titulo}
      </BotonPrincipal>
      <BotonSecundario alTocar={alCancelar} deshabilitado={comando.isPending}>
        Cancelar
      </BotonSecundario>
      {salida === null ? null : (
        <BotonSecundario
          tono="tinta"
          alTocar={() => {
            setVolver(!volver)
          }}
          deshabilitado={comando.isPending}
        >
          {volver ? 'Corregir el motivo' : 'Volver a dejarlo activo'}
        </BotonSecundario>
      )}
    </form>
  )
}

function cuerpoDe(entrada: {
  readonly version: number
  readonly motivoSalida: string
  readonly fecha: string
  readonly nota: string
  readonly evidenciaId: string | null
  readonly motivo: string
  readonly volver: boolean
  readonly esBaja: boolean
}): Omit<RegistrarSalida, 'commandId'> | Omit<CorregirSalida, 'commandId'> | null {
  if (entrada.esBaja) {
    const nota = entrada.nota.trim()
    return {
      version: entrada.version,
      motivo: motivoDe(entrada.motivoSalida),
      fecha: entrada.fecha,
      ...(nota === '' ? {} : { nota }),
      ...(entrada.evidenciaId === null ? {} : { evidenciaId: entrada.evidenciaId }),
    }
  }

  if (entrada.volver) {
    return {
      version: entrada.version,
      motivo: entrada.motivo.trim(),
      activo: true,
    }
  }

  const nota = entrada.nota.trim()
  return {
    version: entrada.version,
    motivo: entrada.motivo.trim(),
    motivoDeSalida: motivoDe(entrada.motivoSalida),
    fecha: entrada.fecha,
    nota: nota === '' ? null : nota,
    evidenciaId: entrada.evidenciaId,
  }
}

function esAlta(
  cuerpo: Omit<RegistrarSalida, 'commandId'> | Omit<CorregirSalida, 'commandId'>,
): cuerpo is Omit<RegistrarSalida, 'commandId'> {
  return !('activo' in cuerpo) && !('motivoDeSalida' in cuerpo)
}

function motivoDe(valor: string): RegistrarSalida['motivo'] {
  if (
    valor === 'sale' ||
    valor === 'death' ||
    valor === 'confirmed_missing' ||
    valor === 'other' ||
    valor === 'unknown'
  ) {
    return valor
  }
  return 'unknown'
}
