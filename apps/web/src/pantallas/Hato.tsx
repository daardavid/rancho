import type { FilaDeCrecimiento } from '@rancho/api-contracts'
import { useMemo, useState } from 'react'

import { useHato, useResumenDelHato } from '../api/hato'
import { useUltimaSesion } from '../api/pesajes'
import { useSalir } from '../api/sesion'
import { areteVigente, coincide, normalizar, nombreVisible } from '../dominio/animal'
import { diaLegible, diasLegibles, kilosLegibles } from '../dominio/fechas'
import { CATEGORIAS, categoria as nombreDeCategoria, tipoDeMarca } from '../dominio/etiquetas'
import { etiquetaDeGanancia, type TonoDeGanancia } from '../dominio/revision'
import type { Animal } from '../dominio/tipos'
import { irA } from '../ruta'
import { Aviso } from '../ui/Aviso'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { BotonFlotante, BotonPrincipal } from '../ui/Botones'
import { Encabezado } from '../ui/Encabezado'
import { FilaDeAnimal, type CategoriaVisual } from '../ui/FilaDeAnimal'
import { Filtros } from '../ui/Filtros'
import { IconoBascula, IconoBuscar, IconoMas, IconoMenu } from '../ui/iconos'
import { Tarjeta } from '../ui/Tarjeta'

/**
 * El hato: cuántos animales hay, quién va bien, a quién revisar y quién no se
 * pesó, en una sola pantalla ([Hato](../../../../../docs/design/maqueta/Hato.dc.html)).
 *
 * La búsqueda corre sobre lo que ya está en pantalla. El hato son unas 21
 * cabezas hoy: traerlo completo y filtrar en el celular responde al instante y
 * encuentra también los aretes anteriores, que la ficha ya trae con su
 * historia.
 *
 * La ganancia no se calcula aquí: viene calculada del servidor como texto y la
 * pantalla solo decide la etiqueta con la regla de «Revisar primero» de
 * [INC-003](../../../../../docs/product/increments/INC-003-rediseno.md)
 * ([`revision.ts`](../dominio/revision.ts)). No hay meta de ganancia del rancho
 * y ninguna se inventa: un animal se revisa solo por sus propios datos.
 *
 * Una sola acción por pantalla: el «+» da de alta, el menú guarda «Salir» y el
 * botón flotante registra el pesaje. «Salir» vive solo en el menú de esta
 * pantalla; el resto de las pantallas conservan su barra de sesión hasta que
 * les toque su rediseño.
 */
export function Hato() {
  const hato = useHato()
  const resumen = useResumenDelHato()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos')

  const porAnimal = useMemo(() => {
    const mapa = new Map<string, FilaDeCrecimiento>()
    for (const fila of resumen.data?.animales ?? []) {
      mapa.set(fila.animalId, fila)
    }
    return mapa
  }, [resumen.data])

  const animales = useMemo(() => hato.data?.animales ?? [], [hato.data])
  const filas = resumen.data?.animales ?? []
  const huecos = filas.filter((fila) => fila.fueHuecoEnLaUltimaSesion)

  // La fecha del aviso es la de la vuelta donde se esperaba a los que faltaron.
  // Es una consulta, no un dato derivado: la sesión más reciente del rancho.
  const ultimaSesion = useUltimaSesion({ habilitada: huecos.length > 0 })

  const conteos = useMemo(() => contarPorCategoria(animales), [animales])
  const filtros = useMemo(() => opcionesDeFiltro(conteos), [conteos])

  const visibles = useMemo(() => {
    const limpio = normalizar(busqueda)
    return animales.filter((animal) => {
      if (!pasaElFiltro(animal, filtro)) {
        return false
      }
      return limpio === '' || coincide(animal, limpio)
    })
  }, [animales, busqueda, filtro])

  if (hato.isPending) {
    return (
      <main className="pantalla">
        <Cargando que="Trayendo el hato…" />
      </main>
    )
  }

  if (hato.isError) {
    return (
      <main className="pantalla">
        <AvisoDeError error={hato.error} />
        <BotonPrincipal alTocar={() => void hato.refetch()}>Volver a intentar</BotonPrincipal>
      </main>
    )
  }

  const total = animales.length
  const vacio = total === 0

  return (
    <main className="pantalla pantalla--hato">
      <MenuYEncabezado
        total={total}
        ultimoPesaje={textoDelUltimoPesaje(filas)}
        // En el hato vacío el alta se ofrece una sola vez, en la tarjeta.
        conAlta={!vacio}
      />

      {vacio ? (
        <Tarjeta>
          <h2 className="hato__vacio-titulo">Empieza con el primer animal</h2>
          <p className="hato__vacio-texto">
            Con el nombre o la seña basta. Si no sabes algo, déjalo en «No sé»: se completa después.
          </p>
          <BotonPrincipal
            alTocar={() => {
              irA({ nombre: 'alta' })
            }}
          >
            Dar de alta el primer animal
          </BotonPrincipal>
        </Tarjeta>
      ) : (
        <>
          <div className="ui-buscador">
            <IconoBuscar />
            <label className="ui-sr" htmlFor="buscar">
              Buscar
            </label>
            <input
              id="buscar"
              className="ui-buscador__entrada"
              type="search"
              value={busqueda}
              placeholder="Buscar por nombre o arete"
              onChange={(evento) => {
                setBusqueda(evento.target.value)
              }}
            />
          </div>

          <div className="hato__filtros">
            <Filtros
              etiqueta="Filtrar el hato"
              opciones={filtros}
              valor={filtro}
              alElegir={setFiltro}
            />
          </div>

          {huecos.length === 0 ? null : (
            <div className="hato__aviso">
              <Aviso
                titulo={
                  huecos.length === 1
                    ? '1 animal no se pesó'
                    : `${String(huecos.length)} animales no se pesaron`
                }
                {...(ultimaSesion.data == null
                  ? {}
                  : { detalle: `En la vuelta del ${diaLegible(ultimaSesion.data.fecha)}` })}
                enlace={{ texto: 'Ver', href: '#/crecimiento' }}
              />
            </div>
          )}

          {resumen.isError ? (
            <p className="campo__ayuda hato__sin-peso" role="status">
              No se pudo traer el último peso. La lista sigue; vuelve a abrir la pantalla para
              intentarlo otra vez.
            </p>
          ) : null}

          {visibles.length === 0 ? (
            <section className="vacio">
              <h2 className="vacio__titulo">Ningún animal coincide</h2>
              <p>Revisa cómo se escribe o cambia el filtro.</p>
            </section>
          ) : (
            <ul className="hato__lista">
              {visibles.map((animal) => (
                <li key={animal.id}>
                  <FilaDeHato animal={animal} fila={porAnimal.get(animal.id)} />
                </li>
              ))}
            </ul>
          )}

          <BotonFlotante icono={<IconoBascula />} href="#/pesaje">
            Registrar pesaje
          </BotonFlotante>
        </>
      )}
    </main>
  )
}

/**
 * El encabezado y su menú. «Salir» vive aquí: es la única salida de la sesión
 * en esta pantalla, no se repite arriba.
 */
function MenuYEncabezado({
  total,
  ultimoPesaje,
  conAlta,
}: {
  readonly total: number
  readonly ultimoPesaje: string
  readonly conAlta: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const salir = useSalir()

  const subtitulo =
    total === 0
      ? 'Todavía no hay animales'
      : `${String(total)} ${total === 1 ? 'animal activo' : 'animales activos'} · ${ultimoPesaje}`

  return (
    <div className="hato__encabezado">
      <Encabezado
        etiqueta="MI RANCHO"
        titulo="Hato"
        subtitulo={subtitulo}
        acciones={[
          ...(conAlta
            ? [
                {
                  etiqueta: 'Dar de alta un animal',
                  icono: <IconoMas />,
                  href: '#/alta',
                  destacado: true,
                },
              ]
            : []),
          {
            etiqueta: 'Menú',
            icono: <IconoMenu />,
            alTocar: () => {
              setAbierto(!abierto)
            },
          },
        ]}
      />

      {abierto ? (
        <div className="hato__menu">
          <button
            type="button"
            className="hato__menu-opcion"
            disabled={salir.isPending}
            onClick={() => {
              setAbierto(false)
              salir.mutate()
            }}
          >
            {salir.isPending ? 'Saliendo…' : 'Salir'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

/** Una fila del hato con lo que la API ya sabe: aquí no se calcula ningún peso. */
function FilaDeHato({
  animal,
  fila,
}: {
  readonly animal: Animal
  readonly fila: FilaDeCrecimiento | undefined
}) {
  const arete = areteVigente(animal)
  const ultimo = fila?.ultimoPeso ?? null
  const ganancia: { readonly tono: TonoDeGanancia; readonly texto: string } =
    fila === undefined ? { tono: 'sinDatos', texto: 'Sin pesajes' } : etiquetaDeGanancia(fila)

  return (
    <FilaDeAnimal
      nombre={nombreVisible(animal)}
      detalle={`${nombreDeCategoria(animal.categoria)} · ${
        arete === null ? 'sin arete' : `${tipoDeMarca(arete.tipo)} ${arete.valor}`
      }`}
      peso={ultimo === null ? '—' : kilosLegibles(ultimo.kilos)}
      ganancia={ganancia.texto}
      tono={ganancia.tono}
      categoria={categoriaVisual(animal.categoria)}
      alTocar={() => {
        irA({ nombre: 'ficha', animalId: animal.id })
      }}
    />
  )
}

/**
 * Los conteos se hacen sobre el hato completo, no sobre lo que dejó la
 * búsqueda: el número de la píldora dice cuántos animales hay de esa categoría.
 */
function contarPorCategoria(animales: readonly Animal[]): ReadonlyMap<string, number> {
  const conteos = new Map<string, number>()
  for (const animal of animales) {
    conteos.set(animal.categoria, (conteos.get(animal.categoria) ?? 0) + 1)
  }
  return conteos
}

/**
 * «Todos» siempre, y después solo las categorías que tienen animales. Se usa el
 * nombre del dominio de cada categoría: «No sé» es una categoría válida del
 * rancho y se filtra con su propio nombre, no se mete en «Otras».
 */
function opcionesDeFiltro(
  conteos: ReadonlyMap<string, number>,
): readonly { readonly valor: string; readonly texto: string }[] {
  const opciones = [{ valor: 'todos', texto: `Todos ${String(sumar(conteos))}` }]
  const enPlural: Record<string, string> = {
    calf: 'Becerros',
    cow: 'Vacas',
    bull: 'Toros',
    other: 'Otras',
    unknown: 'No sé',
  }

  for (const categoria of CATEGORIAS) {
    const cuantos = conteos.get(categoria.codigo) ?? 0
    const etiqueta = enPlural[categoria.codigo]
    if (cuantos > 0 && etiqueta !== undefined) {
      opciones.push({ valor: categoria.codigo, texto: `${etiqueta} ${String(cuantos)}` })
    }
  }

  return opciones
}

function sumar(conteos: ReadonlyMap<string, number>): number {
  let total = 0
  for (const cuantos of conteos.values()) {
    total += cuantos
  }
  return total
}

function pasaElFiltro(animal: Animal, filtro: string): boolean {
  return filtro === 'todos' || animal.categoria === filtro
}

function categoriaVisual(categoria: string): CategoriaVisual {
  switch (categoria) {
    case 'calf':
      return 'calf'
    case 'cow':
      return 'cow'
    case 'bull':
      return 'bull'
    case 'other':
      return 'other'
    default:
      return 'unknown'
  }
}

/**
 * «Hace cuánto fue el último pesaje» del hato entero: el mínimo de los días que
 * cada animal tiene desde su último peso. Sin ningún peso se dice, no se deja
 * en blanco ni se inventa una fecha.
 */
function textoDelUltimoPesaje(filas: readonly FilaDeCrecimiento[]): string {
  let menosDias: number | null = null
  for (const fila of filas) {
    const dias = fila.diasDesdeElUltimoPesaje
    if (dias === null) {
      continue
    }
    if (menosDias === null || dias < menosDias) {
      menosDias = dias
    }
  }
  if (menosDias === null) {
    return 'sin pesajes todavía'
  }
  return `último pesaje ${diasLegibles(menosDias)}`
}
