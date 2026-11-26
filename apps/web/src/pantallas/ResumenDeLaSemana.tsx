import { useMemo, useState } from 'react'

import { useResumenDelHato } from '../api/hato'
import { useResumenSemanal } from '../api/resumen'
import { categoria } from '../dominio/etiquetas'
import { diaLegible, diaMas, numeroLegible } from '../dominio/fechas'
import { haceCuantosDias } from '../dominio/observacion'
import {
  animalesQueVanAtras,
  frasesDeLoQueNoSeSabe,
  motivoDeSalida,
  resultadoDePrenez,
  textoDelResumen,
} from '../dominio/resumen'
import { irA } from '../ruta'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { CampoDeFecha } from '../ui/Campos'
import { Desplegable } from '../ui/Desplegable'
import { EncabezadoDelRancho } from './EncabezadoDelRancho'

/**
 * El resumen de la semana para compartir (INC-007, R-38).
 *
 * Es la revisión semanal hecha documento: el mismo periodo que Inicio, con los
 * conteos de los modelos de lectura y sin cifras inventadas. Se comparte con la
 * API del navegador cuando existe; si no, se copia el texto. Se guarda como PDF
 * con la impresión del navegador y una hoja de estilos que deja solo el
 * resumen.
 *
 * Lo que no se sabe va en su propia sección y no se esconde detrás de un cero.
 * No se muestra ni se comparte un identificador interno ni un dato de la
 * sesión: lo que la familia lee es el nombre del rancho, los días y los conteos.
 */
export function ResumenDeLaSemana({ desde }: { readonly desde: string | null }) {
  const semana = useResumenSemanal(desde)
  const crecimiento = useResumenDelHato()
  const [copiado, setCopiado] = useState<'nada' | 'copiado' | 'error'>('nada')

  if (semana.isPending) {
    return (
      <main className="pantalla pantalla--pestana">
        <Cargando que="Armando el resumen de la semana…" />
      </main>
    )
  }

  if (semana.isError) {
    return (
      <main className="pantalla pantalla--pestana">
        <EncabezadoDelRancho titulo="Resumen de la semana" />
        <AvisoDeError error={semana.error} />
        <BotonPrincipal alTocar={() => void semana.refetch()}>Volver a intentar</BotonPrincipal>
      </main>
    )
  }

  return (
    <Contenido
      datos={semana.data}
      crecimiento={crecimiento.data ?? null}
      cargandoPesos={crecimiento.isPending}
      copiado={copiado}
      alCopiar={setCopiado}
    />
  )
}

function Contenido({
  datos,
  crecimiento,
  cargandoPesos,
  copiado,
  alCopiar,
}: {
  readonly datos: NonNullable<ReturnType<typeof useResumenSemanal>['data']>
  readonly crecimiento: NonNullable<ReturnType<typeof useResumenDelHato>['data']> | null
  readonly cargandoPesos: boolean
  readonly copiado: 'nada' | 'copiado' | 'error'
  readonly alCopiar: (estado: 'nada' | 'copiado' | 'error') => void
}) {
  const texto = useMemo(() => textoDelResumen(datos, crecimiento), [datos, crecimiento])
  const atras = animalesQueVanAtras(crecimiento)
  const faltantes = frasesDeLoQueNoSeSabe(datos)
  const compartir = compartidor()

  return (
    <main className="pantalla pantalla--pestana resumen">
      <EncabezadoDelRancho titulo="Resumen de la semana" subtitulo={datos.rancho} />

      <section className="resumen__hoja" aria-label="Resumen para compartir">
        <p className="resumen__rancho">{datos.rancho}</p>
        <p className="resumen__periodo">
          Del {diaLegible(datos.desde)} al {diaLegible(datos.hoy)}
        </p>

        <h2 className="resumen__titulo">Animales activos</h2>
        {datos.activos.total === 0 ? (
          <p className="resumen__dato">Ninguno.</p>
        ) : (
          <>
            <p className="resumen__dato">
              {datos.activos.total === 1 ? '1 activo' : `${String(datos.activos.total)} activos`}
            </p>
            <p className="resumen__detalle">
              {datos.activos.porCategoria.map((fila) => `${categoria(fila.categoria)} ${String(fila.cantidad)}`).join(' · ')}
            </p>
          </>
        )}

        <h2 className="resumen__titulo">En el periodo</h2>
        <ul className="resumen__lista">
          <li>Nacimientos: {String(datos.nacimientos.total)}</li>
          <li>
            Salidas: {String(datos.salidas.total)}
            {datos.salidas.porMotivo.length === 0
              ? ''
              : ` (${datos.salidas.porMotivo
                  .map((fila) => `${motivoDeSalida(fila.motivo)} ${String(fila.cantidad)}`)
                  .join(', ')})`}
          </li>
          <li>
            Destetes: {String(datos.destetes.total)}
            {datos.destetes.conPeso === 0 ? '' : `, ${String(datos.destetes.conPeso)} con peso`}
          </li>
          <li>
            Diagnósticos de preñez: {String(datos.prenez.total)}
            {datos.prenez.porResultado.length === 0
              ? ''
              : ` (${datos.prenez.porResultado
                  .map((fila) => `${resultadoDePrenez(fila.resultado)} ${String(fila.cantidad)}`)
                  .join(', ')})`}
          </li>
        </ul>

        <h2 className="resumen__titulo">Última vuelta de pesaje</h2>
        {cargandoPesos ? (
          <p className="resumen__dato">Trayendo los pesos…</p>
        ) : crecimiento === null || crecimiento.fechaDeLaUltimaVuelta === null ? (
          <p className="resumen__dato">Todavía no hay una vuelta de pesaje.</p>
        ) : (
          <>
            <p className="resumen__dato">
              {String(crecimiento.pesadosEnLaUltimaVuelta)} de{' '}
              {String(crecimiento.esperadosEnLaUltimaVuelta)} pesados, el{' '}
              {diaLegible(crecimiento.fechaDeLaUltimaVuelta)}
            </p>
            <p className="resumen__detalle">
              {crecimiento.gananciaMediaKilosPorDia === null
                ? 'Ganancia media: sin dos pesos que comparar.'
                : `Ganancia media: ${conSigno(crecimiento.gananciaMediaKilosPorDia)} kg/día`}
            </p>
            <h3 className="resumen__subtitulo">Van atrás</h3>
            {atras.length === 0 ? (
              <p className="resumen__detalle">Ninguno con sus propios pesos.</p>
            ) : (
              <ul className="resumen__lista">
                {atras.map((animal) => (
                  <li key={animal.nombre}>
                    {animal.nombre}: {animal.motivo}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <h2 className="resumen__titulo">Días sin verse</h2>
        {datos.revisar.porDiasSinVerse.length === 0 ? (
          <p className="resumen__dato">Nadie tiene una observación todavía.</p>
        ) : (
          <ul className="resumen__lista">
            {datos.revisar.porDiasSinVerse.map((animal) => (
              <li key={`${animal.nombre ?? 'sin-nombre'}-${String(animal.dias)}`}>
                {animal.nombre ?? 'Sin nombre o seña'}: {haceCuantosDias(animal.dias)}
              </li>
            ))}
          </ul>
        )}

        <h2 className="resumen__titulo">Lo que no se sabe</h2>
        {faltantes.length === 0 ? (
          <p className="resumen__dato">No falta ningún dato en este resumen.</p>
        ) : (
          <ul className="resumen__lista">
            {faltantes.map((frase) => (
              <li key={frase}>{frase}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="resumen__acciones">
        {compartir === 'compartir' ? (
          <BotonPrincipal
            alTocar={() => {
              void navegadorComparte(texto).then((resultado) => {
                // Cancelar el diálogo del sistema no es un error: no se avisa nada.
                alCopiar(resultado === 'cancelado' ? 'nada' : resultado === 'hecho' ? 'nada' : 'error')
              })
            }}
          >
            Compartir
          </BotonPrincipal>
        ) : (
          <BotonPrincipal
            alTocar={() => {
              void copiarAlPortapapeles(texto).then((hecho) => {
                alCopiar(hecho ? 'copiado' : 'error')
              })
            }}
          >
            Copiar texto
          </BotonPrincipal>
        )}
        <BotonSecundario
          alTocar={() => {
            window.print()
          }}
        >
          Guardar como PDF
        </BotonSecundario>
      </div>

      <section className="ficha__seccion" aria-label="Periodo">
        <Desplegable titulo={tituloDelPeriodo(datos)}>
          <CampoDeFecha
            etiqueta="Desde"
            valor={datos.desde}
            alCambiar={(dia) => {
              if (dia !== '' && dia <= datos.hoy) {
                irA({ nombre: 'resumen', desde: dia })
              }
            }}
            ayuda="El día de hoy entra en la cuenta. Sirve para mandar otra semana."
          />
        </Desplegable>
      </section>

      {copiado === 'copiado' ? (
        <p className="resumen__aviso" role="status">
          El texto quedó en el portapapeles. Pégalo en WhatsApp.
        </p>
      ) : null}
      {copiado === 'error' ? (
        <p className="resumen__aviso" role="status">
          No se pudo copiar. Selecciona el texto de arriba y cópialo a mano.
        </p>
      ) : null}
    </main>
  )
}

/**
 * «Compartir» solo si el navegador lo ofrece. En una computadora o en un
 * navegador sin la API de compartir se copia el texto, que es lo que el dueño
 * haría igual.
 */
function compartidor(): 'compartir' | 'copiar' {
  const navegador = globalThis.navigator as Navigator | undefined
  return typeof navegador?.share === 'function' ? 'compartir' : 'copiar'
}

async function navegadorComparte(texto: string): Promise<'hecho' | 'cancelado' | 'error'> {
  try {
    await navigator.share({ text: texto })
    return 'hecho'
  } catch (error) {
    // `AbortError` es que el dueño cerró el diálogo del sistema sin mandarlo.
    if (error instanceof Error && error.name === 'AbortError') {
      return 'cancelado'
    }
    return 'error'
  }
}

async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

/**
 * El periodo de la pantalla se puede recorrer con el desplegable: no hay un
 * rango fijo y el dueño a veces quiere mandar días anteriores. La etiqueta dice
 * el rango, sin el «por omisión» técnico.
 */
function tituloDelPeriodo(datos: { readonly desde: string; readonly hoy: string }): string {
  return datos.desde === diaMas(datos.hoy, -7)
    ? 'Últimos 7 días'
    : `Desde el ${diaLegible(datos.desde)}`
}

function conSigno(valor: string): string {
  const legible = numeroLegible(valor)
  return legible.startsWith('-') ? legible : `+${legible}`
}
