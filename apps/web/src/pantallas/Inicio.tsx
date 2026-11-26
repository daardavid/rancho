import type {
  AnimalDelInicio,
  AnimalSinVerse,
  CambioDelPeriodo,
  FilaDeCrecimiento,
  NotaDelPeriodo,
  PendienteDelInicio,
} from '@rancho/api-contracts'
import { useMemo, useState } from 'react'

import { useResumenDelHato } from '../api/hato'
import { useInicio } from '../api/inicio'
import { ordenarCrecimiento } from '../dominio/crecimiento'
import { textoDePrecision, textoDeTipo } from '../dominio/bitacora'
import { categoria } from '../dominio/etiquetas'
import { diaLegible, diaMas, hoyEnElRancho } from '../dominio/fechas'
import { eventoDelOrigen, haceCuantosDias } from '../dominio/observacion'
import { lecturaDeCrecimiento } from '../dominio/revision'
import { rutaAHash } from '../ruta'
import { AvisoDeError, Cargando } from '../ui/Avisos'
import { BotonPrincipal } from '../ui/Botones'
import { CampoDeFecha } from '../ui/Campos'
import { Desplegable } from '../ui/Desplegable'
import {
  IconoBascula,
  IconoNacimiento,
  IconoSalida,
  IconoSanidad,
} from '../ui/iconos'
import { Resumen, type TarjetaDeResumen } from '../ui/Resumen'
import { EncabezadoDelRancho } from './EncabezadoDelRancho'
import { TarjetaDelPrimerAnimal } from './TarjetaDelPrimerAnimal'

/**
 * Inicio: lo que hay que revisar, como pide el North Star del MVP
 * ([mvp-framing](../../../../docs/product/mvp-framing.md)) y el incremento
 * ([INC-005](../../../../docs/product/increments/INC-005-listo-para-uso-real.md)).
 *
 * El orden lo puso la prueba de David del 2026-11-25: primero los accesos a las
 * capturas, después lo que hay que revisar, y hasta abajo el resumen del
 * periodo. La fecha del periodo va plegada —«Últimos 7 días»— porque es un
 * control técnico: el dueño abre la app a ver qué atender, no a escoger fechas.
 *
 * «Para revisar» usa la misma regla de «Revisar primero» de Crecimiento
 * ([`revision.ts`](../dominio/revision.ts)): no hay umbral de ganancia ni de
 * días sin verse, y no se inventa uno. Un hueco de la última vuelta tiene su
 * propio grupo y no se repite en «Van atrás».
 *
 * Sin animales no se afirma nada de «todos» ni de «nadie»: se dice que todavía
 * no hay animales y se ofrece darlos de alta, igual que en el hato.
 */
export function Inicio() {
  const [desde, setDesde] = useState(() => diaMas(hoyEnElRancho(), -7))
  const inicio = useInicio(desde)
  const resumen = useResumenDelHato()

  const filas = useMemo(() => resumen.data?.animales ?? [], [resumen.data])
  const atras = useMemo(
    () =>
      ordenarCrecimiento(filas).filter(
        (fila) =>
          !fila.fueHuecoEnLaUltimaSesion && lecturaDeCrecimiento(fila).lugar === 'revisar',
      ),
    [filas],
  )

  if (inicio.isPending) {
    return (
      <main className="pantalla pantalla--pestana">
        <Cargando que="Armando el inicio…" />
      </main>
    )
  }

  if (inicio.isError) {
    return (
      <main className="pantalla pantalla--pestana">
        <EncabezadoDelRancho titulo="Inicio" />
        <AvisoDeError error={inicio.error} />
        <BotonPrincipal alTocar={() => void inicio.refetch()}>Volver a intentar</BotonPrincipal>
      </main>
    )
  }

  const datos = inicio.data
  const revisar = datos.paraRevisar
  const total = datos.activosPorCategoria.reduce((suma, fila) => suma + fila.cantidad, 0)

  /*
    Un hato sin animales activos no siempre es un hato que nunca tuvo: puede
    haberse vaciado. Si en el periodo hubo salidas o nacimientos, hay algo que
    revisar y no se puede decir «todavía no hay animales» ni esconder el
    resumen. Es la misma distinción que hace el hato con `haySalidas`.
  */
  const hayMovimientos = datos.cambios.salidas.length > 0 || datos.cambios.nacimientos.length > 0

  if (total === 0 && !hayMovimientos) {
    // «Todavía no hay animales» es lo que pasa, y no afirma nada de «nadie» ni
    // de «todos» sobre un hato que no se está mirando. La invitación es la
    // misma del hato: dar de alta el primero.
    return (
      <main className="pantalla pantalla--pestana">
        <EncabezadoDelRancho titulo="Inicio" subtitulo="Todavía no hay animales en el hato" />
        <TarjetaDelPrimerAnimal />
        <section className="ficha__seccion" aria-label="Para revisar">
          <h2 className="ficha__titulo">Para revisar</h2>
          <p className="inicio__vacio">
            Cuando haya animales, aquí se ve a quién hay que revisar.
          </p>
          <PendientesDelInicio pendientes={revisar.pendientes} />
        </section>
        {datos.cambios.notasDeBitacora.length === 0 ? null : (
          <section className="ficha__seccion" aria-label="Bitácora del periodo">
            <h2 className="ficha__titulo">Bitácora</h2>
            <ListaDeBitacora notas={datos.cambios.notasDeBitacora} />
          </section>
        )}
      </main>
    )
  }

  const delPeriodo = desde === diaMas(datos.hoy, -7)
  // Solo la fecha va en el desplegable: los contadores del periodo se quedan a
  // la vista. La etiqueta es la del rango, sin el «por omisión» técnico.
  const tituloDelPeriodo = delPeriodo ? 'Últimos 7 días' : `Desde el ${diaLegible(desde)}`
  const hayAnimales = total > 0

  return (
    <main className="pantalla pantalla--pestana">
      <EncabezadoDelRancho
        titulo="Inicio"
        subtitulo={
          hayAnimales ? 'Primero lo que hay que revisar.' : 'En el hato activo no queda nadie.'
        }
      />

      <section className="inicio__accesos" aria-label="Accesos directos">
        <a
          className="inicio__acceso"
          href={rutaAHash({ nombre: 'pesaje' })}
          aria-label="Registrar pesaje"
        >
          <IconoBascula />
          <span>Registrar pesaje</span>
        </a>
        <a
          className="inicio__acceso"
          href={rutaAHash({ nombre: 'nacimiento', madreId: null })}
          aria-label="Nacimiento"
        >
          <IconoNacimiento />
          <span>Nacimiento</span>
        </a>
        <a
          className="inicio__acceso"
          href={rutaAHash({ nombre: 'hato', modo: 'sanidad' })}
          aria-label="Nota de sanidad"
        >
          <IconoSanidad />
          <span>Nota de sanidad</span>
        </a>
        <a className="inicio__acceso" href={rutaAHash({ nombre: 'salida' })} aria-label="Salida">
          <IconoSalida />
          <span>Salida</span>
        </a>
      </section>

      {hayAnimales ? (
        <p className="campo__ayuda">
          <a href={rutaAHash({ nombre: 'vacas' })}>Vacas por último parto</a>
        </p>
      ) : null}

      <section className="ficha__seccion" aria-label="Para revisar">
        <h2 className="ficha__titulo">Para revisar</h2>
        <PendientesDelInicio pendientes={revisar.pendientes} />

        {hayAnimales ? (
          <>
            <h3 className="inicio__grupo">Van atrás</h3>
            {resumen.isPending ? (
              <p className="inicio__vacio">Trayendo los pesos…</p>
            ) : resumen.isError ? (
              <p className="inicio__vacio" role="status">
                No se pudieron traer los pesos. Vuelve a abrir Inicio para intentarlo otra vez.
              </p>
            ) : atras.length === 0 ? (
              <p className="inicio__vacio">Ninguno va atrás con sus propios pesos.</p>
            ) : (
              <ListaVanAtras filas={atras} />
            )}

            <h3 className="inicio__grupo">Huecos de la última vuelta</h3>
            {revisar.fechaDeLaUltimaVuelta === null ? (
              <p className="inicio__vacio">Todavía no hay una vuelta de pesaje.</p>
            ) : revisar.huecosDeLaUltimaVuelta.length === 0 ? (
              <p className="inicio__vacio">
                La última vuelta, del {diaLegible(revisar.fechaDeLaUltimaVuelta)}, no dejó huecos.
              </p>
            ) : (
              <Lista animales={revisar.huecosDeLaUltimaVuelta} />
            )}

            <h3 className="inicio__grupo">Sin lugar asignado</h3>
            {revisar.sinLugar.length === 0 ? (
              <p className="inicio__vacio">Nadie está sin una asignación.</p>
            ) : (
              <Lista animales={revisar.sinLugar} />
            )}

            {revisar.lugarDesconocido.length === 0 ? null : (
              <>
                <h3 className="inicio__grupo">Lugar desconocido</h3>
                <p className="inicio__vacio">Se anotó «No sé». No es un potrero.</p>
                <Lista animales={revisar.lugarDesconocido} />
              </>
            )}

            <h3 className="inicio__grupo">Sin observación</h3>
            {revisar.sinObservacion.length === 0 ? (
              <p className="inicio__vacio">
                Todos tienen un pesaje o una nota en la que se les vio.
              </p>
            ) : (
              <Lista animales={revisar.sinObservacion} />
            )}

            <section aria-label="Días sin verse">
              <h3 className="inicio__grupo">Días sin verse</h3>
              <p className="inicio__vacio">
                Sin un límite: se ordenan por los días, de más a menos.
              </p>
              {revisar.porDiasSinVerse.length === 0 ? (
                <p className="inicio__vacio">Nadie tiene una observación todavía.</p>
              ) : (
                <ul className="inicio__lista">
                  {revisar.porDiasSinVerse.map((animal) => (
                    <li key={animal.animalId}>
                      <a
                        href={rutaAHash({ nombre: 'ficha', animalId: animal.animalId })}
                        aria-label={`${nombreDe(animal)}, ${detalleDeDias(animal)}`}
                      >
                        <span>{nombreDe(animal)}</span>
                        <span className="inicio__meta">{detalleDeDias(animal)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          // Sin animales activos no se afirma nada de «todos» ni de «nadie»:
          // no hay a quién revisar, aunque el periodo sí tenga movimientos.
          <p className="inicio__vacio">En el hato activo no queda nadie que revisar.</p>
        )}
      </section>

      <section className="ficha__seccion" aria-label="Resumen del periodo">
        <h2 className="ficha__titulo">Resumen del periodo</h2>
        {/* Los contadores se quedan a la vista; solo la fecha va plegada. */}
        <Resumen
          tarjetas={[
            cuenta('Nacimientos', datos.cambios.nacimientos.length, 'Con fecha'),
            cuenta('Salidas', datos.cambios.salidas.length, 'Se supo en estos días'),
            cuenta('Pesajes', datos.cambios.pesajes, 'Animales pesados'),
            cuenta('Notas', datos.cambios.notasDeSanidad, 'De sanidad'),
          ]}
        />
        <section aria-label="Bitácora">
          <h3 className="inicio__grupo">Bitácora</h3>
          {datos.cambios.notasDeBitacora.length === 0 ? (
            <p className="inicio__vacio">Ninguna nota en este periodo.</p>
          ) : (
            <ListaDeBitacora notas={datos.cambios.notasDeBitacora} />
          )}
        </section>
        {datos.cambios.nacimientosSinFecha === 0 ? null : (
          <p className="inicio__vacio">
            {datos.cambios.nacimientosSinFecha === 1
              ? 'Hay 1 nacimiento sin fecha. No entra en la cuenta.'
              : `Hay ${String(datos.cambios.nacimientosSinFecha)} nacimientos sin fecha. No entran en la cuenta.`}
          </p>
        )}
        <Desplegable titulo={tituloDelPeriodo}>
          <CampoDeFecha
            etiqueta="Desde"
            valor={desde}
            alCambiar={(dia) => {
              if (dia !== '') {
                setDesde(dia)
              }
            }}
            ayuda="El día de hoy entra en la cuenta."
          />
          <p className="inicio__vacio">
            Del {diaLegible(datos.desde)} al {diaLegible(datos.hoy)}.
          </p>
          <section aria-label="Nacimientos">
            <h3 className="inicio__grupo">Nacimientos</h3>
            {datos.cambios.nacimientos.length === 0 ? (
              <p className="inicio__vacio">Ninguno con fecha en este periodo.</p>
            ) : (
              <ListaCambios cambios={datos.cambios.nacimientos} />
            )}
          </section>
          <section aria-label="Salidas">
            <h3 className="inicio__grupo">Salidas</h3>
            {datos.cambios.salidas.length === 0 ? (
              <p className="inicio__vacio">Ninguna en este periodo.</p>
            ) : (
              <ListaCambios cambios={datos.cambios.salidas} />
            )}
          </section>
        </Desplegable>
        {/*
          El resumen de la semana se arma con el mismo periodo que se está
          viendo: se comparte lo de esta pantalla y no otro rango
          ([INC-007](../../../../docs/product/increments/INC-007-cria-resumen-y-bitacora.md)).
        */}
        <p className="inicio__compartir">
          <a href={rutaAHash({ nombre: 'resumen', desde: datos.desde })}>
            Compartir resumen
          </a>
        </p>
      </section>

      <section className="ficha__seccion" aria-label="Activos">
        <h2 className="ficha__titulo">Activos</h2>
        {hayAnimales ? (
          <>
            <p className="inicio__vacio">
              {total === 1 ? '1 animal activo' : `${String(total)} animales activos`}
            </p>
            <Resumen
              tarjetas={datos.activosPorCategoria.map(
                (fila): TarjetaDeResumen => ({
                  etiqueta: categoria(fila.categoria),
                  valor: String(fila.cantidad),
                  detalle: fila.categoria === 'unknown' ? 'Sin categoría' : 'En el hato',
                  tono: fila.categoria === 'unknown' ? 'neutro' : 'principal',
                }),
              )}
            />
          </>
        ) : (
          // El hato activo quedó vacío: la misma invitación que en el hato.
          <TarjetaDelPrimerAnimal />
        )}
      </section>
    </main>
  )
}
function cuenta(etiqueta: string, cantidad: number, detalle: string): TarjetaDeResumen {
  return {
    etiqueta,
    valor: String(cantidad),
    detalle,
    tono: 'neutro',
  }
}

/**
 * Los que van atrás según su propio intervalo. Se dice por qué: perdió kilos,
 * bajó contra su vuelta anterior o su último peso no se midió en la báscula.
 */
function ListaVanAtras({ filas }: { readonly filas: readonly FilaDeCrecimiento[] }) {
  return (
    <ul className="inicio__lista">
      {filas.map((fila) => {
        const lectura = lecturaDeCrecimiento(fila)
        const nombre = fila.nombre ?? 'Sin nombre o seña'
        const motivo = lectura.nota ?? lectura.valor
        return (
          <li key={fila.animalId}>
            <a
              href={rutaAHash({ nombre: 'ficha', animalId: fila.animalId })}
              aria-label={`${nombre}, ${motivo}`}
            >
              <span>{nombre}</span>
              <span className="inicio__meta">{motivo}</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function ListaCambios({ cambios }: { readonly cambios: readonly CambioDelPeriodo[] }) {
  return (
    <ul className="inicio__lista">
      {cambios.map((animal) => (
        <li key={animal.animalId}>
          <a
            href={rutaAHash({ nombre: 'ficha', animalId: animal.animalId })}
            aria-label={`${nombreDe(animal)}, ${diaLegible(animal.fecha)}`}
          >
            <span>{nombreDe(animal)}</span>
            <span className="inicio__meta">{diaLegible(animal.fecha)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function Lista({ animales }: { readonly animales: readonly AnimalDelInicio[] }) {
  return (
    <ul className="inicio__lista">
      {animales.map((animal) => (
        <li key={animal.animalId}>
          <a
            href={rutaAHash({ nombre: 'ficha', animalId: animal.animalId })}
            aria-label={`${nombreDe(animal)}, ${categoria(animal.categoria)}`}
          >
            <span>{nombreDe(animal)}</span>
            <span className="inicio__meta">{categoria(animal.categoria)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function PendientesDelInicio({
  pendientes,
}: {
  readonly pendientes: readonly PendienteDelInicio[]
}) {
  return (
    <>
      <h3 className="inicio__grupo">Pendientes</h3>
      {pendientes.length === 0 ? (
        <p className="inicio__vacio">Ninguno vencido ni para hoy.</p>
      ) : (
        <ul className="inicio__lista">
          {pendientes.map((pendiente) => (
            <li key={pendiente.id}>
              <a
                href={rutaAHash({ nombre: 'pendientes' })}
                aria-label={`${pendiente.texto}, ${pendiente.vencido ? 'venció' : 'hoy'} el ${diaLegible(pendiente.fecha)}`}
              >
                <span>{pendiente.texto}</span>
                <span className="inicio__meta">
                  {pendiente.vencido ? `Venció el ${diaLegible(pendiente.fecha)}` : 'Para hoy'}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function ListaDeBitacora({ notas }: { readonly notas: readonly NotaDelPeriodo[] }) {
  return (
    <ul className="inicio__lista">
      {notas.map((nota) => (
        <li key={nota.id}>
          <a href={rutaAHash({ nombre: 'bitacora' })}>
            <span>
              {textoDeTipo(nota.tipo)}
              {nota.precision === 'approximate' ? `, ${textoDePrecision(nota.precision)}` : ''}
            </span>
            <span className="inicio__meta">{nota.texto}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function nombreDe(animal: AnimalDelInicio): string {
  return animal.nombre ?? 'Sin nombre o seña'
}

function detalleDeDias(animal: AnimalSinVerse): string {
  return `${haceCuantosDias(animal.dias)} · ${eventoDelOrigen(animal.origen)}`
}
