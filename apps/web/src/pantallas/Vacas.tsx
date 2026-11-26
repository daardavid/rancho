import type { FilaDeKilosDestetados, FilaDeVaca } from '@rancho/api-contracts'
import { useState } from 'react'

import { useVacas } from '../api/cria'
import { useKilosDestetados } from '../api/destete'
import { resultadoDePrenez } from '../dominio/etiquetas'
import { diaLegible, kilosLegibles } from '../dominio/fechas'
import { rutaAHash } from '../ruta'
import { AvisoDeError } from '../ui/Avisos'
import { BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { FormularioDeDiagnostico } from './Cria'
import { EncabezadoDelRancho } from './EncabezadoDelRancho'

/**
 * Vacas por días desde el último parto.
 *
 * El orden y los grupos los trae la consulta. Aquí no se reordenan, no hay
 * umbral y no hay color según los días. Quien no tiene parto va aparte.
 */
export function Vacas() {
  const vacas = useVacas()
  const kilos = useKilosDestetados()
  const [eligiendo, setEligiendo] = useState(false)
  const [elegidas, setElegidas] = useState<readonly string[]>([])
  const [anotando, setAnotando] = useState(false)

  if (vacas.isPending) {
    return (
      <main className="pantalla">
        <p className="campo__ayuda">Trayendo las vacas…</p>
      </main>
    )
  }

  if (vacas.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={vacas.error} />
        <BotonPrincipal alTocar={() => void vacas.refetch()}>Volver a intentar</BotonPrincipal>
      </main>
    )
  }

  const datos = vacas.data
  const todas = [...datos.porUltimoParto, ...datos.partoSinFecha, ...datos.sinPartoRegistrado]
  const elegidasConNombre = todas.filter((fila) => elegidas.includes(fila.animalId))

  if (anotando && elegidasConNombre.length > 0) {
    const nombre =
      elegidasConNombre.length === 1
        ? (elegidasConNombre[0]?.nombre ?? 'Sin nombre o seña')
        : `${elegidasConNombre.length} vacas`
    return (
      <main className="pantalla">
        <EncabezadoDelRancho titulo="Vacas" subtitulo="Diagnóstico de preñez" />
        <FormularioDeDiagnostico
          animales={elegidasConNombre.map((fila) => fila.animalId)}
          nombreDelGrupo={nombre}
          alGuardar={() => {
            setAnotando(false)
            setEligiendo(false)
            setElegidas([])
          }}
          alCancelar={() => {
            setAnotando(false)
          }}
        />
      </main>
    )
  }

  const alternar = (animalId: string): void => {
    setElegidas((actual) =>
      actual.includes(animalId) ? actual.filter((id) => id !== animalId) : [...actual, animalId],
    )
  }

  return (
    <main className="pantalla">
      <EncabezadoDelRancho
        titulo="Vacas"
        subtitulo="Por días desde el último parto. Sin una meta de días."
      />
      <p className="campo__ayuda">
        Los días se cuentan desde el último parto con fecha. Un parto sin fecha no entra a la
        cuenta. No hay un color por los días.
      </p>

      {todas.length === 0 ? (
        <p className="campo__ayuda">Todavía no hay vacas en el hato.</p>
      ) : (
        <BotonSecundario
          alTocar={() => {
            setEligiendo(!eligiendo)
            setElegidas([])
          }}
        >
          {eligiendo ? 'Dejar de elegir' : 'Anotar diagnóstico a varias'}
        </BotonSecundario>
      )}
      {eligiendo && elegidas.length > 0 ? (
        <BotonPrincipal
          alTocar={() => {
            setAnotando(true)
          }}
        >
          Anotar a las elegidas
        </BotonPrincipal>
      ) : null}

      <Grupo
        titulo="Por días desde el último parto"
        filas={datos.porUltimoParto}
        vacio="Ninguna tiene un parto con fecha."
        eligiendo={eligiendo}
        elegidas={elegidas}
        alAlternar={alternar}
      />
      <Grupo
        titulo="Parto sin fecha"
        filas={datos.partoSinFecha}
        vacio="Ninguna tiene parto solo sin fecha."
        eligiendo={eligiendo}
        elegidas={elegidas}
        alAlternar={alternar}
      />
      <Grupo
        titulo="Sin parto registrado"
        filas={datos.sinPartoRegistrado}
        vacio="Todas las de la lista tienen algún parto anotado."
        eligiendo={eligiendo}
        elegidas={elegidas}
        alAlternar={alternar}
      />

      <KilosPorVaca
        filas={kilos.data?.porPromedio}
        cargando={kilos.isPending}
        error={kilos.isError}
      />
    </main>
  )
}

function KilosPorVaca({
  filas,
  cargando,
  error,
}: {
  readonly filas: readonly FilaDeKilosDestetados[] | undefined
  readonly cargando: boolean
  readonly error: boolean
}) {
  return (
    <section className="ficha__seccion">
      <h2 className="ficha__titulo">Kilos destetados por vaca</h2>
      <p className="campo__ayuda">
        Promedio de las crías destetadas que sí tienen peso. La madre inferida se cuenta aparte.
        No hay ajuste a 205 días ni una meta.
      </p>
      {cargando ? <p className="campo__ayuda">Trayendo los kilos…</p> : null}
      {error ? (
        <p className="campo__ayuda" role="status">
          No se pudieron traer los kilos destetados.
        </p>
      ) : null}
      {filas === undefined ? null : filas.length === 0 ? (
        <p className="campo__ayuda">Ninguna vaca tiene una cría destetada con peso.</p>
      ) : (
        <ul className="lista lista--planas">
          {filas.map((fila) => (
            <li key={fila.animalId}>
              <p>
                <a href={rutaAHash({ nombre: 'ficha', animalId: fila.animalId })}>
                  {fila.nombre ?? 'Sin nombre o seña'}
                </a>
                {fila.activo ? null : ' · Ya salió. El destete se queda.'}
              </p>
              <p className="campo__ayuda">{lineaDe('Madre vista', fila.observadas)}</p>
              <p className="campo__ayuda">{lineaDe('Madre inferida', fila.inferidas)} Se cuentan aparte.</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function lineaDe(
  etiqueta: string,
  resumen: FilaDeKilosDestetados['observadas'],
): string {
  if (resumen.conPeso === 0) {
    return `${etiqueta}: ninguna con peso.`
  }
  const cuantas = resumen.conPeso === 1 ? '1 cría' : `${resumen.conPeso} crías`
  const sinPeso =
    resumen.sinPeso === 0
      ? ''
      : resumen.sinPeso === 1
        ? ' 1 sin peso, no se rellena.'
        : ` ${resumen.sinPeso} sin peso, no se rellenan.`
  return `${etiqueta}: promedio ${kilosLegibles(resumen.promedio)}, total ${kilosLegibles(resumen.total)}, ${cuantas}.${sinPeso}`
}

function Grupo({
  titulo,
  filas,
  vacio,
  eligiendo,
  elegidas,
  alAlternar,
}: {
  readonly titulo: string
  readonly filas: readonly FilaDeVaca[]
  readonly vacio: string
  readonly eligiendo: boolean
  readonly elegidas: readonly string[]
  readonly alAlternar: (animalId: string) => void
}) {
  return (
    <section className="ficha__seccion">
      <h2 className="ficha__titulo">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="campo__ayuda">{vacio}</p>
      ) : (
        <ul className="lista lista--planas" aria-label={titulo}>
          {filas.map((fila) => (
            <li key={fila.animalId} className="vacas__fila">
              {eligiendo ? (
                <label>
                  <input
                    type="checkbox"
                    checked={elegidas.includes(fila.animalId)}
                    onChange={() => {
                      alAlternar(fila.animalId)
                    }}
                  />{' '}
                  Elegir
                </label>
              ) : null}
              <a href={rutaAHash({ nombre: 'ficha', animalId: fila.animalId })}>
                {fila.nombre ?? 'Sin nombre o seña'}
                {fila.diasDesdeElUltimoParto === null ? '' : ` · ${textoDeDias(fila.diasDesdeElUltimoParto)}`}
              </a>
              <p className="campo__ayuda">{textoDeFila(fila)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function textoDeDias(dias: number): string {
  if (dias < 0) {
    return 'fecha posterior a hoy'
  }
  if (dias === 0) {
    return 'hoy'
  }
  if (dias === 1) {
    return '1 día'
  }
  return `${dias} días`
}

function textoDeFila(fila: FilaDeVaca): string {
  const parto =
    fila.fechaDelUltimoParto === null
      ? fila.partosSinFecha > 0
        ? 'Parto sin fecha'
        : 'Sin parto registrado'
      : `Último parto ${diaLegible(fila.fechaDelUltimoParto)}`
  const extra =
    fila.fechaDelUltimoParto !== null && fila.partosSinFecha > 0
      ? ' También hay parto sin fecha, que no entra a la cuenta.'
      : ''
  const diagnostico =
    fila.ultimoDiagnostico === null
      ? 'Sin diagnóstico'
      : `${resultadoDePrenez(fila.ultimoDiagnostico.resultado)} (${diaLegible(fila.ultimoDiagnostico.fecha)})`
  return `${parto}.${extra} ${diagnostico}.`
}
