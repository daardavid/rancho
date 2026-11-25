import { useLugar } from '../api/lugar'
import { diaLegible } from '../dominio/fechas'
import type { AsignacionDeLugar, LugarDelAnimal, Potrero } from '@rancho/api-contracts'
import { Aviso } from '../ui/Aviso'
import { Desplegable } from '../ui/Desplegable'

/** Cómo va la lista de potreros que la ficha necesita para poner el nombre. */
export type EstadoDePotreros = 'cargando' | 'error' | 'listo'

/**
 * Dónde se espera a este animal y desde cuándo.
 *
 * Es una asignación, no una observación: aquí no se dice que alguien lo vio, y
 * no alimenta la última observación ni el pesaje. «No sé» es un lugar válido y
 * se lee como tal. Si nunca se le anotó uno, se dice eso, sin inventar un
 * potrero.
 *
 * El nombre del potrero viene de la lista de potreros. Mientras esa lista carga
 * o si falla, la ficha **no** dice «Potrero sin nombre»: un potrero puede
 * llamarse «El Zapote» y la lista no haber llegado. Se dice que el nombre no se
 * pudo traer, que es lo que de verdad pasó; un potrero sin nombre de verdad es
 * otro caso y se dice solo cuando la lista llegó y el potrero viene sin nombre.
 */
export function LugarDelAnimalEnLaFicha({
  animalId,
  potreros,
  estadoDePotreros,
  alRecargarPotreros,
}: {
  readonly animalId: string
  readonly potreros: readonly Pick<Potrero, 'id' | 'nombre'>[]
  readonly estadoDePotreros: EstadoDePotreros
  readonly alRecargarPotreros: () => void
}) {
  const lugar = useLugar(animalId)

  if (lugar.isPending) {
    return <p className="campo__ayuda">Trayendo dónde se le espera…</p>
  }

  if (lugar.isError) {
    return (
      <p className="campo__ayuda" role="status">
        No se pudo traer dónde se le espera. Vuelve a abrir la ficha para intentarlo otra vez.
      </p>
    )
  }

  return (
    <ContenidoDelLugar
      lugar={lugar.data}
      potreros={potreros}
      estadoDePotreros={estadoDePotreros}
      alRecargarPotreros={alRecargarPotreros}
    />
  )
}

function ContenidoDelLugar({
  lugar,
  potreros,
  estadoDePotreros,
  alRecargarPotreros,
}: {
  readonly lugar: LugarDelAnimal
  readonly potreros: readonly Pick<Potrero, 'id' | 'nombre'>[]
  readonly estadoDePotreros: EstadoDePotreros
  readonly alRecargarPotreros: () => void
}) {
  const nombres = new Map(potreros.map((potrero) => [potrero.id, potrero.nombre]))
  const sinNombreConocido = estadoDePotreros !== 'listo'

  if (lugar.vigente === null) {
    return (
      <p className="campo__ayuda">
        Todavía no se le anotó un potrero. En el hato se elige el animal y se usa «Mover a…».
      </p>
    )
  }

  const vigente = lugar.vigente
  const destino =
    vigente.potreroId === null
      ? 'No sé dónde se le espera'
      : textoDePotrero(vigente.potreroId, nombres, estadoDePotreros)

  return (
    <>
      <Aviso
        titulo={destino}
        detalle={`Desde el ${diaLegible(vigente.desde)}. Es dónde se le espera, no una observación.`}
      />
      {vigente.nota === null ? null : <p className="campo__ayuda">{vigente.nota}</p>}
      {/* Quién lo dijo no es la cuenta que lo registró: es el trabajador o el canal. */}
      {vigente.reportedBy === null ? null : (
        <p className="campo__ayuda">Lo dijo: {vigente.reportedBy}</p>
      )}

      {sinNombreConocido && vigente.potreroId !== null ? (
        <p className="campo__ayuda" role="status">
          {estadoDePotreros === 'error'
            ? 'No se pudo traer el nombre del potrero.'
            : 'Trayendo el nombre del potrero…'}
          {' '}
          <button type="button" className="enlace" onClick={alRecargarPotreros}>
            Ver los potreros
          </button>
        </p>
      ) : null}

      {lugar.historia.length <= 1 ? null : (
        <Desplegable
          titulo="Dónde se le esperaba antes"
          resumen={
            lugar.historia.length === 2 ? '1 movimiento' : `${String(lugar.historia.length - 1)} movimientos`
          }
        >
          <ul className="lista lista--planas">
            {[...lugar.historia]
              .reverse()
              .filter((asignacion) => asignacion.id !== vigente.id)
              .map((asignacion) => (
                <li key={asignacion.id} className="arete">
                  <span className="arete__valor">
                    {textoDe(asignacion, nombres, estadoDePotreros)}
                  </span>
                  <span className="arete__estado">Desde el {diaLegible(asignacion.desde)}</span>
                  {asignacion.nota === null ? null : (
                    <span className="arete__estado">{asignacion.nota}</span>
                  )}
                  {asignacion.reportedBy === null ? null : (
                    <span className="arete__estado">Lo dijo: {asignacion.reportedBy}</span>
                  )}
                </li>
              ))}
          </ul>
        </Desplegable>
      )}
    </>
  )
}

function textoDe(
  asignacion: AsignacionDeLugar,
  nombres: ReadonlyMap<string, string | null>,
  estadoDePotreros: EstadoDePotreros,
): string {
  if (asignacion.potreroId === null) {
    return 'No sé'
  }
  return textoDePotrero(asignacion.potreroId, nombres, estadoDePotreros)
}

/**
 * El nombre del potrero, o lo que de verdad se sabe.
 *
 * Tres cosas distintas: el potrero tiene nombre; el potrero existe y el rancho
 * no le puso nombre todavía; o la lista no llegó (o falló) y el nombre no se
 * pudo leer. Las tres se dicen distinto: las dos últimas no son lo mismo.
 */
function textoDePotrero(
  potreroId: string,
  nombres: ReadonlyMap<string, string | null>,
  estadoDePotreros: EstadoDePotreros,
): string {
  if (nombres.has(potreroId)) {
    return nombres.get(potreroId) ?? 'Potrero sin nombre'
  }
  if (estadoDePotreros === 'error') {
    return 'Un potrero (no se pudo traer su nombre)'
  }
  if (estadoDePotreros === 'cargando') {
    return 'Un potrero (trayendo su nombre…)'
  }
  // La lista llegó y el potrero no viene: no se afirma que no tenga nombre.
  return 'Un potrero que no aparece en la lista'
}
