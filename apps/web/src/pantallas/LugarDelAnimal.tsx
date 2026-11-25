import { useLugar } from '../api/lugar'
import { diaLegible } from '../dominio/fechas'
import type { AsignacionDeLugar, LugarDelAnimal, Potrero } from '@rancho/api-contracts'
import { Aviso } from '../ui/Aviso'
import { Desplegable } from '../ui/Desplegable'

/**
 * Dónde se espera a este animal y desde cuándo.
 *
 * Es una asignación, no una observación: aquí no se dice que alguien lo vio, y
 * no alimenta la última observación ni el pesaje. «No sé» es un lugar válido y
 * se lee como tal. Si nunca se le anotó uno, se dice eso, sin inventar un
 * potrero.
 */
export function LugarDelAnimalEnLaFicha({
  animalId,
  potreros,
}: {
  readonly animalId: string
  readonly potreros: readonly Pick<Potrero, 'id' | 'nombre'>[]
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

  return <ContenidoDelLugar lugar={lugar.data} potreros={potreros} />
}

function ContenidoDelLugar({
  lugar,
  potreros,
}: {
  readonly lugar: LugarDelAnimal
  readonly potreros: readonly Pick<Potrero, 'id' | 'nombre'>[]
}) {
  const nombres = new Map(potreros.map((potrero) => [potrero.id, potrero.nombre]))

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
      : (nombres.get(vigente.potreroId) ?? 'Potrero sin nombre')

  return (
    <>
      <Aviso
        titulo={destino}
        detalle={`Desde el ${diaLegible(vigente.desde)}. Es dónde se le espera, no una observación.`}
      />
      {vigente.nota === null ? null : <p className="campo__ayuda">{vigente.nota}</p>}

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
                  <span className="arete__valor">{textoDe(asignacion, nombres)}</span>
                  <span className="arete__estado">Desde el {diaLegible(asignacion.desde)}</span>
                  {asignacion.nota === null ? null : (
                    <span className="arete__estado">{asignacion.nota}</span>
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
): string {
  if (asignacion.potreroId === null) {
    return 'No sé'
  }
  return nombres.get(asignacion.potreroId) ?? 'Potrero sin nombre'
}
