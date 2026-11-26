import { useState } from 'react'

import { useTendencias } from '../api/tendencias'
import {
  animalesParaGraficar,
  hayPesoNoMedido,
  nombreDeAnimal,
  notaSinFecha,
  textoDeMeses,
  textoDeVueltas,
} from '../dominio/tendencias'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { BotonPrincipal } from '../ui/Botones'
import { Encabezado } from '../ui/Encabezado'
import { GraficaDeMeses, GraficaDePesos, GraficaDeVueltas } from './tendencias/Lienzo'

/**
 * Las tres lecturas del dueño. Nada de aquí se guarda.
 *
 * El código de las gráficas vive en este módulo: la aplicación lo descarga
 * solo cuando se abre la pantalla.
 */
export function Tendencias() {
  const consulta = useTendencias()

  if (consulta.isPending) {
    return (
      <main className="pantalla">
        <Cargando que="Trayendo las tendencias…" />
      </main>
    )
  }

  if (consulta.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={consulta.error} />
        <BotonPrincipal alTocar={() => void consulta.refetch()}>Volver a intentar</BotonPrincipal>
      </main>
    )
  }

  return <Lectura datos={consulta.data} />
}

function Lectura({ datos }: { readonly datos: NonNullable<ReturnType<typeof useTendencias>['data']> }) {
  return (
    <main className="pantalla pantalla--tendencias">
      <Encabezado
        etiqueta="MI RANCHO"
        titulo="Tendencias"
        subtitulo="Se calculan al verlas. Nada se guarda."
      />
      <Pesos series={datos.series} />
      <Vueltas vueltas={datos.vueltas} />
      <Meses
        meses={datos.meses}
        nacimientosSinFecha={datos.nacimientosSinFecha}
        salidasSinFecha={datos.salidasSinFecha}
      />
    </main>
  )
}

function Pesos({ series }: { readonly series: NonNullable<ReturnType<typeof useTendencias>['data']>['series'] }) {
  const [elegidos, setElegidos] = useState<readonly string[]>([])
  const plan = animalesParaGraficar(series, elegidos)
  const noMedido = hayPesoNoMedido(plan.animales)

  return (
    <section className="tendencias__bloque" aria-label="Peso en el tiempo">
      <h2>Peso en el tiempo</h2>
      {series.length === 0 ? null : (
        <div className="tendencias__animales" role="group" aria-label="Animales">
          {series.map((serie) => {
            const activo = elegidos.includes(serie.animalId)
            return (
              <button
                key={serie.animalId}
                type="button"
                className={activo ? 'tendencias__animal tendencias__animal--activo' : 'tendencias__animal'}
                aria-pressed={activo}
                onClick={() => {
                  setElegidos((actual) =>
                    actual.includes(serie.animalId)
                      ? actual.filter((id) => id !== serie.animalId)
                      : [...actual, serie.animalId],
                  )
                }}
              >
                {nombreDeAnimal(serie.nombre)}
                {serie.activo ? '' : ' · salió'}
              </button>
            )
          })}
        </div>
      )}
      {plan.avisos.map((aviso) => (
        <p key={aviso} className="tendencias__vacio">
          {aviso}
        </p>
      ))}
      {plan.animales.length === 0 ? null : (
        <GraficaDePesos
          animales={plan.animales}
          etiqueta={`Peso de ${String(plan.animales.length)} ${plan.animales.length === 1 ? 'animal' : 'animales'}`}
        />
      )}
      {noMedido ? (
        <p className="tendencias__nota">El punto hueco es un peso que no se midió en la báscula.</p>
      ) : null}
      {plan.animales.length === 0 ? null : (
        <p className="tendencias__nota">
          Punto lleno: medido en la báscula. Punto hueco ámbar: visto, no medido. Punto hueco gris: me lo
          dijeron.
        </p>
      )}
    </section>
  )
}

function Vueltas({
  vueltas,
}: {
  readonly vueltas: NonNullable<ReturnType<typeof useTendencias>['data']>['vueltas']
}) {
  const texto = textoDeVueltas(vueltas)

  return (
    <section className="tendencias__bloque" aria-label="Ganancia media por vuelta">
      <h2>Ganancia media por vuelta</h2>
      <p className="tendencias__nota">Kilos por día, de un peso al siguiente. Igual que en Crecimiento.</p>
      {texto === null ? (
        <GraficaDeVueltas vueltas={vueltas} etiqueta="Ganancia media del hato por vuelta" />
      ) : (
        <p className="tendencias__vacio">{texto}</p>
      )}
    </section>
  )
}

function Meses({
  meses,
  nacimientosSinFecha,
  salidasSinFecha,
}: {
  readonly meses: NonNullable<ReturnType<typeof useTendencias>['data']>['meses']
  readonly nacimientosSinFecha: number
  readonly salidasSinFecha: number
}) {
  const texto = textoDeMeses(meses.length)
  const notas = [notaSinFecha(nacimientosSinFecha, 'nacimiento'), notaSinFecha(salidasSinFecha, 'salida')].filter(
    (nota) => nota !== null,
  )

  return (
    <section className="tendencias__bloque" aria-label="Nacimientos y salidas">
      <h2>Nacimientos y salidas</h2>
      {texto === null ? (
        <GraficaDeMeses meses={meses} etiqueta="Nacimientos y salidas por mes" />
      ) : (
        <p className="tendencias__vacio">{texto}</p>
      )}
      {notas.map((nota) => (
        <p key={nota} className="tendencias__nota">
          {nota}
        </p>
      ))}
    </section>
  )
}
