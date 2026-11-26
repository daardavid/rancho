import type { AnotarDiagnostico, DiagnosticoConHistoria, HistorialDeCria, PartoDeCria } from '@rancho/api-contracts'
import { useRef, useState } from 'react'

import { useAnotarDiagnostico, useCorregirDiagnostico, useHistorialDeCria } from '../api/cria'
import { nombreVisible } from '../dominio/animal'
import {
  RESULTADOS_DE_PRENEZ,
  campoDeDiagnostico,
  motivoDeInferencia,
  opcionesElegibles,
  resultadoDePrenez,
} from '../dominio/etiquetas'
import { diaLegible, hoyEnElRancho, instanteLegible } from '../dominio/fechas'
import { esConflictoDeVersion } from '../dominio/mensajes'
import { AvisoDeError } from '../ui/Avisos'
import { useEnfocarAviso } from '../ui/enfocar'
import { BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { CampoDeArea, CampoDeFecha, CampoDeTexto } from '../ui/Campos'
import { Desplegable } from '../ui/Desplegable'
import { Mosaicos } from '../ui/Mosaicos'
import { Segmentado } from '../ui/Segmentado'
import { rutaAHash } from '../ruta'

const RESULTADOS = opcionesElegibles(RESULTADOS_DE_PRENEZ)
const VISTO = [
  { valor: 'si', texto: 'Sí se vio' },
  { valor: 'no', texto: 'No se vio' },
  { valor: 'no_se', texto: 'No sé' },
]
const LARGO_DE_QUIEN = 200
const LARGO_DE_NOTA = 2000

/**
 * «Cría» en la ficha de una vaca, o de una hembra que ya tiene crías.
 *
 * Los partos salen de la filiación. Los días se leen ya calculados: esta
 * pantalla no los guarda ni les pone un color. Un parto sin fecha se dice y
 * no entra a la cuenta.
 */

type AnimalDeCria = {
  readonly id: string
  readonly nombre: string | null
  readonly sexo: string
  readonly categoria: string
  readonly activo: boolean
}

export function CriaDelAnimal({ animal }: { readonly animal: AnimalDeCria }) {
  const esMacho = animal.sexo === 'male' || animal.categoria === 'bull'
  const esVaca =
    animal.categoria === 'cow' ||
    (animal.sexo === 'female' && animal.categoria !== 'calf' && animal.categoria !== 'bull')
  const historial = useHistorialDeCria(animal.id, !esMacho)
  const [anotando, setAnotando] = useState(false)

  if (esMacho) {
    return null
  }

  const hayHistoria =
    (historial.data?.partos.length ?? 0) > 0 || (historial.data?.diagnosticos.length ?? 0) > 0
  if (!esVaca && !hayHistoria && !historial.isError) {
    return null
  }

  return (
    <section className="ficha__seccion">
      <h2 className="ficha__titulo">Cría</h2>
      {historial.isPending ? <p className="campo__ayuda">Trayendo la cría…</p> : null}
      {historial.isError ? (
        <p className="campo__ayuda" role="status">
          No se pudo traer la cría. Vuelve a abrir la ficha para intentarlo otra vez.
        </p>
      ) : null}
      {historial.data === undefined ? null : (
        <Historia
          historial={historial.data}
          puedeAnotar={animal.activo}
          anotando={anotando}
          nombre={nombreVisible(animal)}
          alAnotar={() => {
            setAnotando(true)
          }}
          alCerrar={() => {
            setAnotando(false)
          }}
        />
      )}
    </section>
  )
}

function Historia({
  historial,
  puedeAnotar,
  anotando,
  nombre,
  alAnotar,
  alCerrar,
}: {
  readonly historial: HistorialDeCria
  readonly puedeAnotar: boolean
  readonly anotando: boolean
  readonly nombre: string
  readonly alAnotar: () => void
  readonly alCerrar: () => void
}) {
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null)

  if (anotando) {
    return (
      <FormularioDeDiagnostico
        animales={[historial.animalId]}
        nombreDelGrupo={nombre}
        alGuardar={alCerrar}
        alCancelar={alCerrar}
      />
    )
  }

  return (
    <>
      <p className="campo__ayuda">{textoDeDias(historial)}</p>
      {historial.partosSinFecha === 0 ? null : (
        <p className="campo__ayuda">
          {historial.partosSinFecha === 1
            ? 'Hay un parto sin fecha: no entra al cálculo de días.'
            : `Hay ${historial.partosSinFecha} partos sin fecha: no entran al cálculo de días.`}
        </p>
      )}
      {historial.partos.length === 0 ? null : (
        <ul className="lista lista--planas">
          {historial.partos.map((parto) => (
            <PartoEnLaFicha key={parto.criaId} parto={parto} historial={historial} />
          ))}
        </ul>
      )}

      <h3 className="inicio__grupo">Diagnóstico de preñez</h3>
      {historial.diagnosticos.length === 0 ? (
        <p className="campo__ayuda">Sin diagnóstico.</p>
      ) : (
        <ul className="lista lista--planas">
          {historial.diagnosticos.map((diagnostico, indice) => (
            <li key={diagnostico.id}>
              {indice === 0 ? <p className="campo__ayuda">Último</p> : null}
              <DiagnosticoLeido
                diagnostico={diagnostico}
                corrigiendo={corrigiendo === diagnostico.id}
                alCorregir={() => {
                  setCorrigiendo(diagnostico.id)
                }}
                alCerrar={() => {
                  setCorrigiendo(null)
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {puedeAnotar ? (
        <BotonSecundario tono="tinta" alTocar={alAnotar}>
          Anotar diagnóstico
        </BotonSecundario>
      ) : (
        <p className="campo__ayuda">Ya salió del hato, así que no se le anota otro diagnóstico.</p>
      )}
    </>
  )
}

function PartoEnLaFicha({
  parto,
  historial,
}: {
  readonly parto: PartoDeCria
  readonly historial: HistorialDeCria
}) {
  const intervalo = historial.intervalos.find((item) => item.criaId === parto.criaId)
  const fecha =
    parto.fecha === null
      ? 'Sin fecha'
      : parto.precisionFecha === 'approximate'
        ? `${diaLegible(parto.fecha)}, aproximada`
        : diaLegible(parto.fecha)
  const certeza =
    parto.certezaMadre === 'observed'
      ? 'Madre vista'
      : `Madre inferida${parto.motivo === null ? '' : ` (${motivoDeInferencia(parto.motivo)})`}`

  return (
    <li>
      <p>
        <a href={rutaAHash({ nombre: 'ficha', animalId: parto.criaId })}>
          {parto.nombre ?? 'Sin nombre o seña'}
        </a>
      </p>
      <p className="campo__ayuda">
        {fecha} · {certeza}
      </p>
      {intervalo === undefined ? null : (
        <p className="campo__ayuda">{textoDeIntervalo(intervalo.dias)} desde el parto anterior con fecha.</p>
      )}
    </li>
  )
}

function DiagnosticoLeido({
  diagnostico,
  corrigiendo,
  alCorregir,
  alCerrar,
}: {
  readonly diagnostico: DiagnosticoConHistoria
  readonly corrigiendo: boolean
  readonly alCorregir: () => void
  readonly alCerrar: () => void
}) {
  return (
    <>
      <p>
        {resultadoDePrenez(diagnostico.resultado)} · {diaLegible(diagnostico.fecha)}
      </p>
      <p className="campo__ayuda">
        {diagnostico.reportedBy === null ? 'No se anotó quién lo dijo.' : `Lo dijo ${diagnostico.reportedBy}.`}{' '}
        {fraseDeVisto(diagnostico.vioAlAnimal)}
      </p>
      {diagnostico.nota === null ? null : <p className="campo__ayuda">{diagnostico.nota}</p>}
      {corrigiendo ? (
        <CorreccionDeDiagnostico diagnostico={diagnostico} alCancelar={alCerrar} alGuardar={alCerrar} />
      ) : (
        <button type="button" className="enlace" onClick={alCorregir}>
          Corregir este diagnóstico
        </button>
      )}
      {diagnostico.correcciones.length === 0 ? null : (
        <ul className="lista lista--planas">
          {diagnostico.correcciones.map((correccion, indice) => (
            <li key={`${correccion.campo}-${correccion.correctedAt}-${indice}`}>
              <p className="campo__ayuda">
                {campoDeDiagnostico(correccion.campo)}: antes decía «
                {textoAnterior(correccion.campo, correccion.valorAnterior)}»
              </p>
              <p className="campo__ayuda">Por qué: {correccion.motivo}</p>
              <p className="campo__ayuda">{instanteLegible(correccion.correctedAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/**
 * Anotar un diagnóstico. Ni el resultado ni «¿Se vio al animal?» vienen
 * marcados: si no se eligen, no se guarda.
 */
export function FormularioDeDiagnostico({
  animales,
  nombreDelGrupo,
  alGuardar,
  alCancelar,
}: {
  readonly animales: readonly string[]
  readonly nombreDelGrupo: string
  readonly alGuardar: () => void
  readonly alCancelar: () => void
}) {
  const [resultado, setResultado] = useState('')
  const [fecha, setFecha] = useState(() => hoyEnElRancho())
  const [quien, setQuien] = useState('')
  const [nota, setNota] = useState('')
  const [vioAlAnimal, setVioAlAnimal] = useState('')
  const anotar = useAnotarDiagnostico()
  const pendiente = useRef<{ contenido: string; cuerpo: AnotarDiagnostico } | null>(null)
  const seccion = useRef<HTMLElement>(null)
  useEnfocarAviso(seccion, anotar.isError)

  const resultadoElegido = resultadoDe(resultado)
  const visto = vistoDelFormulario(vioAlAnimal)
  const falta = resultadoElegido === null || visto === undefined || animales.length === 0

  const guardar = (): void => {
    if (falta || resultadoElegido === null || visto === undefined || anotar.isPending) {
      return
    }
    const quienLimpio = quien.trim()
    const notaLimpia = nota.trim()
    const contenido = JSON.stringify({
      fecha,
      resultado: resultadoElegido,
      reportedBy: quienLimpio === '' ? null : quienLimpio,
      nota: notaLimpia === '' ? null : notaLimpia,
      vioAlAnimal: visto,
      animales: [...animales].sort(),
    })
    if (pendiente.current === null || pendiente.current.contenido !== contenido) {
      pendiente.current = {
        contenido,
        cuerpo: {
          commandId: crypto.randomUUID(),
          fecha,
          resultado: resultadoElegido,
          reportedBy: quienLimpio === '' ? null : quienLimpio,
          nota: notaLimpia === '' ? null : notaLimpia,
          vioAlAnimal: visto,
          animales: animales.map((animalId) => ({ animalId, diagnosticoId: crypto.randomUUID() })),
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
      <h3 className="ficha__titulo">Diagnóstico · {nombreDelGrupo}</h3>
      <p className="campo__ayuda">
        Preñada, vacía o no sé. Elige el resultado y si se vio al animal: no viene marcado, y si
        no lo eliges no se guarda. No es un calendario.
      </p>
      <Mosaicos etiqueta="Resultado" opciones={RESULTADOS} valor={resultado} alElegir={setResultado} />
      <CampoDeFecha etiqueta="¿Cuándo?" valor={fecha} alCambiar={setFecha} />
      <CampoDeTexto
        etiqueta="Quién lo dijo"
        valor={quien}
        alCambiar={setQuien}
        maxLength={LARGO_DE_QUIEN}
        ayuda="Opcional. El trabajador o quien la revisó. Si no se sabe, se deja vacío."
      />
      <Segmentado
        etiqueta="¿Se vio al animal?"
        opciones={VISTO}
        valor={vioAlAnimal}
        alElegir={setVioAlAnimal}
      />
      <p className="campo__ayuda">
        Solo «Sí se vio» cuenta como que se le vio ese día. «No sé» no cuenta.
      </p>
      <Desplegable titulo="Nota" resumen="opcional">
        <CampoDeArea etiqueta="Nota" valor={nota} alCambiar={setNota} maxLength={LARGO_DE_NOTA} />
      </Desplegable>
      {anotar.isError ? <AvisoDeError error={anotar.error} /> : null}
      <BotonPrincipal alTocar={guardar} deshabilitado={falta || anotar.isPending}>
        {anotar.isPending ? 'Guardando…' : 'Guardar diagnóstico'}
      </BotonPrincipal>
      <BotonSecundario alTocar={alCancelar} deshabilitado={anotar.isPending}>
        Cancelar
      </BotonSecundario>
    </section>
  )
}

function CorreccionDeDiagnostico({
  diagnostico,
  alGuardar,
  alCancelar,
}: {
  readonly diagnostico: DiagnosticoConHistoria
  readonly alGuardar: () => void
  readonly alCancelar: () => void
}) {
  const [resultado, setResultado] = useState<string>(diagnostico.resultado)
  const [fecha, setFecha] = useState(diagnostico.fecha)
  const [quien, setQuien] = useState(diagnostico.reportedBy ?? '')
  const [nota, setNota] = useState(diagnostico.nota ?? '')
  const [vioAlAnimal, setVioAlAnimal] = useState(valorDeVisto(diagnostico.vioAlAnimal))
  const [motivo, setMotivo] = useState('')
  const corregir = useCorregirDiagnostico(diagnostico.id, diagnostico.animalId)
  const pendiente = useRef<{ contenido: string; cuerpo: Parameters<typeof corregir.mutate>[0] } | null>(
    null,
  )
  const formulario = useRef<HTMLFormElement>(null)
  useEnfocarAviso(formulario, corregir.isError)

  if (esConflictoDeVersion(corregir.error)) {
    return (
      <div className="aviso aviso--ojo" role="alert">
        <p>Alguien más cambió este diagnóstico mientras lo tenías abierto. No se guardó nada.</p>
        <BotonSecundario alTocar={alCancelar}>Cerrar y ver el diagnóstico</BotonSecundario>
      </div>
    )
  }

  const guardar = (): void => {
    const resultadoElegido = resultadoDe(resultado)
    if (resultadoElegido === null || motivo.trim() === '' || corregir.isPending) {
      return
    }
    const quienLimpio = quien.trim()
    const notaLimpia = nota.trim()
    const capturado = {
      version: diagnostico.version,
      motivo: motivo.trim(),
      resultado: resultadoElegido,
      fecha,
      reportedBy: quienLimpio === '' ? null : quienLimpio,
      nota: notaLimpia === '' ? null : notaLimpia,
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

  return (
    <form
      ref={formulario}
      className="formulario"
      onSubmit={(evento) => {
        evento.preventDefault()
        guardar()
      }}
    >
      <Mosaicos etiqueta="Resultado" opciones={RESULTADOS} valor={resultado} alElegir={setResultado} />
      <CampoDeFecha etiqueta="¿Cuándo?" valor={fecha} alCambiar={setFecha} />
      <CampoDeTexto
        etiqueta="Quién lo dijo"
        valor={quien}
        alCambiar={setQuien}
        maxLength={LARGO_DE_QUIEN}
      />
      <Segmentado
        etiqueta="¿Se vio al animal?"
        opciones={VISTO}
        valor={vioAlAnimal}
        alElegir={setVioAlAnimal}
      />
      <CampoDeArea etiqueta="Nota" valor={nota} alCambiar={setNota} maxLength={LARGO_DE_NOTA} />
      <CampoDeArea
        etiqueta="¿Por qué se corrige?"
        valor={motivo}
        alCambiar={setMotivo}
        maxLength={LARGO_DE_NOTA}
      />
      {corregir.isError ? <AvisoDeError error={corregir.error} /> : null}
      <BotonPrincipal alTocar={guardar} deshabilitado={motivo.trim() === '' || corregir.isPending}>
        {corregir.isPending ? 'Guardando…' : 'Guardar corrección'}
      </BotonPrincipal>
      <BotonSecundario alTocar={alCancelar} deshabilitado={corregir.isPending}>
        Cancelar
      </BotonSecundario>
    </form>
  )
}

function textoDeDias(historial: HistorialDeCria): string {
  const dias = historial.diasDesdeElUltimoParto
  if (dias === null) {
    return historial.partos.length === 0
      ? 'Sin parto registrado.'
      : 'No se pueden contar los días: los partos anotados no tienen fecha.'
  }
  if (dias < 0) {
    return 'La fecha del último parto es posterior a hoy.'
  }
  if (dias === 0) {
    return 'Último parto con fecha: hoy.'
  }
  if (dias === 1) {
    return '1 día desde el último parto con fecha.'
  }
  return `${dias} días desde el último parto con fecha.`
}

function textoDeIntervalo(dias: number): string {
  if (dias === 1) {
    return '1 día'
  }
  return `${dias} días`
}

function fraseDeVisto(visto: boolean | null): string {
  if (visto === true) {
    return 'Dice que se vio al animal.'
  }
  if (visto === false) {
    return 'No dice que se viera al animal.'
  }
  return 'No se sabe si se vio al animal.'
}

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

function resultadoDe(valor: string): 'prenada' | 'vacia' | 'no_se' | null {
  if (valor === 'prenada' || valor === 'vacia' || valor === 'no_se') {
    return valor
  }
  return null
}

function textoAnterior(campo: string, valor: string | null): string {
  if (valor === null) {
    return 'no se anotó'
  }
  if (campo === 'fecha') {
    return diaLegible(valor)
  }
  if (campo === 'resultado' || campo === 'vioAlAnimal') {
    if (valor === 'si') {
      return 'Sí se vio'
    }
    if (valor === 'no') {
      return 'No se vio'
    }
    if (valor === 'no_se') {
      return campo === 'resultado' ? 'No sé' : 'No sé'
    }
    return resultadoDePrenez(valor)
  }
  return valor
}
