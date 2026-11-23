import { useSaludDeLaApi } from './api/salud'

type EstadoApi = {
  readonly titulo: string
  readonly detalle: string
  readonly tono: 'bien' | 'mal' | 'espera'
}

function estadoDeLaApi(
  estaCargando: boolean,
  hayError: boolean,
  responde: boolean | undefined,
): EstadoApi {
  if (estaCargando) {
    return { titulo: 'Revisando la conexión…', detalle: '', tono: 'espera' }
  }

  if (hayError) {
    return {
      titulo: 'No se pudo hablar con la API',
      detalle: 'Revisa que la API esté corriendo y vuelve a intentar.',
      tono: 'mal',
    }
  }

  if (responde === true) {
    return { titulo: 'La API responde', detalle: 'Todo listo para empezar.', tono: 'bien' }
  }

  return {
    titulo: 'La API contestó algo que no entendemos',
    detalle: 'El servicio está arriba, pero su respuesta no es la esperada.',
    tono: 'mal',
  }
}

export function App() {
  const { data, isPending, isError, refetch, isFetching } = useSaludDeLaApi()
  const estado = estadoDeLaApi(isPending, isError, data?.ok)

  return (
    <main className="pantalla">
      <header className="encabezado">
        <p className="saludo">RANCHO</p>
        <h1>Ficha del hato y pesaje</h1>
        <p className="subtitulo">Balancán, Tabasco</p>
      </header>

      <section className={`tarjeta tarjeta--${estado.tono}`} aria-live="polite">
        <h2>{estado.titulo}</h2>
        {estado.detalle === '' ? null : <p>{estado.detalle}</p>}

        {isError ? (
          <button type="button" className="boton" onClick={() => void refetch()}>
            {isFetching ? 'Reintentando…' : 'Reintentar'}
          </button>
        ) : null}
      </section>

      <p className="nota">
        Todavía no hay pantallas del rancho. Esta es la base de la aplicación.
      </p>
    </main>
  )
}
