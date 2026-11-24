import { useRef, useState } from 'react'

import { useAgregarMarca, useMarcarPerdida, useReemplazarMarca } from '../api/hato'
import { diaLegible } from '../dominio/fechas'
import { TIPOS_DE_MARCA, estadoDeMarca, tipoDeMarca } from '../dominio/etiquetas'
import type { MarcaAnimal } from '../dominio/tipos'
import { AvisoDeError, BotonGrande } from '../ui/Avisos'
import { CampoDeOpciones, CampoDeTexto } from '../ui/Campos'

/**
 * Los aretes del animal y su historia.
 *
 * Un arete no es un campo de la ficha: es un registro hermano con su propia
 * vida. Ponerlo, cambiarlo y perderlo son tres hechos distintos y los tres se
 * guardan con su fecha. Un arete cambiado no se borra: se cierra y sigue
 * encontrando al animal cuando alguien busca el número viejo.
 */
export function Aretes({
  animalId,
  marcas,
}: {
  readonly animalId: string
  readonly marcas: readonly MarcaAnimal[]
}) {
  const puestos = marcas.filter((marca) => marca.estado === 'active')
  /**
   * Una sola cosa a la vez: o se está mirando la lista, o se está poniendo un
   * arete, o se está cambiando uno. Sin arete puesto, la pantalla abre directo
   * el alta del arete.
   */
  const [formulario, setFormulario] = useState<{ anterior: MarcaAnimal | null } | null>(
    marcas.length === 0 ? { anterior: null } : null,
  )

  return (
    <>
      {marcas.length === 0 ? (
        <p className="campo__ayuda">Todavía no tiene ningún arete registrado.</p>
      ) : (
        <ul className="lista lista--planas">
          {marcas.map((marca) => (
            <li key={marca.id} className="arete">
              <span className="arete__valor">
                {tipoDeMarca(marca.tipo)} {marca.valor}
              </span>
              <span className="arete__estado">
                {estadoDeMarca(marca.estado)}
                {marca.estado === 'active'
                  ? marca.desde === null
                    ? ''
                    : ` desde el ${diaLegible(marca.desde)}`
                  : marca.cambiadaEl === null
                    ? ''
                    : ` el ${diaLegible(marca.cambiadaEl)}`}
              </span>
              {marca.estado === 'active' ? (
                <span className="arete__acciones">
                  <button
                    type="button"
                    className="enlace"
                    onClick={() => {
                      setFormulario({ anterior: marca })
                    }}
                  >
                    Cambiar arete
                  </button>
                  <PerdidaDelArete animalId={animalId} marca={marca} />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {formulario === null ? (
        puestos.length === 0 ? null : (
          <BotonGrande secundario alTocar={() => setFormulario({ anterior: null })}>
            Poner otro arete
          </BotonGrande>
        )
      ) : (
        <FormularioDeArete
          animalId={animalId}
          anterior={formulario.anterior}
          alTerminar={() => setFormulario(null)}
        />
      )}
    </>
  )
}

function PerdidaDelArete({
  animalId,
  marca,
}: {
  readonly animalId: string
  readonly marca: MarcaAnimal
}) {
  const marcarPerdida = useMarcarPerdida(animalId)
  const comandos = useRef<string | null>(null)

  return (
    <button
      type="button"
      className="enlace"
      disabled={marcarPerdida.isPending}
      onClick={() => {
        // Un id para este «se cayó». Si el envío se repite, la API devuelve el
        // mismo cierre y no se pierde dos veces.
        comandos.current ??= crypto.randomUUID()
        marcarPerdida.mutate({ marcaId: marca.id, cuerpo: { commandId: comandos.current } })
      }}
    >
      {marcarPerdida.isPending ? 'Guardando…' : 'Se cayó'}
    </button>
  )
}

/**
 * Poner un arete, nuevo o en lugar de uno viejo.
 *
 * Cuando reemplaza, el arete anterior se cierra como `replaced` en el mismo
 * comando: no hay un arete que quede puesto y otro que quede suelto.
 */
function FormularioDeArete({
  animalId,
  anterior,
  alTerminar,
}: {
  readonly animalId: string
  readonly anterior: MarcaAnimal | null
  readonly alTerminar: () => void
}) {
  const [tipo, setTipo] = useState<string>(anterior === null ? 'siniiga' : anterior.tipo)
  const [valor, setValor] = useState('')
  const [desde, setDesde] = useState('')

  const agregar = useAgregarMarca(animalId)
  const reemplazar = useReemplazarMarca(animalId)
  const comandos = useRef<{ id: string; contenido: string } | null>(null)
  /**
   * El id del arete se genera una sola vez. Si sale un reintento, viaja el
   * mismo id y el mismo comando, así que la API devuelve el arete que ya
   * guardó en vez de crear otro.
   */
  const idDelArete = useRef<string | null>(null)

  const enviando = agregar.isPending || reemplazar.isPending
  const faltaValor = valor.trim() === ''

  const enviar = (evento: React.FormEvent<HTMLFormElement>): void => {
    evento.preventDefault()
    if (faltaValor || enviando) {
      return
    }

    idDelArete.current ??= crypto.randomUUID()
    const cuerpo = {
      marcaId: idDelArete.current,
      tipo: tipo as 'siniiga' | 'other',
      valor: valor.trim(),
      ...(desde === '' ? {} : { desde }),
    }

    const contenido = JSON.stringify(cuerpo)
    if (comandos.current === null || comandos.current.contenido !== contenido) {
      comandos.current = { id: crypto.randomUUID(), contenido }
    }

    if (anterior === null) {
      agregar.mutate({ commandId: comandos.current.id, ...cuerpo }, { onSuccess: alTerminar })
      return
    }

    reemplazar.mutate(
      { marcaAnteriorId: anterior.id, cuerpo: { commandId: comandos.current.id, ...cuerpo } },
      { onSuccess: alTerminar },
    )
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <p className="campo__ayuda">
        {anterior === null
          ? 'El arete que trae puesto ahora.'
          : `Reemplaza el ${tipoDeMarca(anterior.tipo)} ${anterior.valor}. El anterior queda en la historia.`}
      </p>

      <CampoDeOpciones
        etiqueta="Tipo de arete"
        opciones={TIPOS_DE_MARCA}
        valor={tipo}
        alCambiar={setTipo}
        valorDesconocido={null}
      />

      <CampoDeTexto
        etiqueta="Número del arete"
        valor={valor}
        alCambiar={setValor}
        ayuda="Tal como viene en el arete."
        requerido
      />

      <CampoDeTexto
        etiqueta="Desde cuándo lo trae"
        valor={desde}
        alCambiar={setDesde}
        ayuda="Si no te acuerdas, déjalo vacío. Es un día, no una hora."
      />

      {agregar.isError ? <AvisoDeError error={agregar.error} /> : null}
      {reemplazar.isError ? <AvisoDeError error={reemplazar.error} /> : null}

      <BotonGrande tipo="submit" deshabilitado={faltaValor || enviando}>
        {enviando ? 'Guardando…' : anterior === null ? 'Guardar el arete' : 'Guardar el cambio'}
      </BotonGrande>

      <BotonGrande secundario alTocar={alTerminar}>
        Cancelar
      </BotonGrande>
    </form>
  )
}
