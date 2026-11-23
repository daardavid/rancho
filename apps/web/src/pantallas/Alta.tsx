import { useRef, useState } from 'react'

import { useRegistrarAnimal } from '../api/hato'
import { CATEGORIAS, PARTICIPACIONES, SEXOS, TENENCIAS } from '../dominio/etiquetas'
import { irA } from '../ruta'
import { AvisoDeError, BotonGrande } from '../ui/Avisos'
import { CampoDeArea, CampoDeOpciones, CampoDeTexto, Seccion } from '../ui/Campos'

/**
 * Dar de alta un animal.
 *
 * Corto por decisión, no por prisa: lo único que se crea es la identidad
 * interna del animal, y todo lo demás puede quedar en «No sé» con un toque
 * ([UX-03](../../../../../docs/product/ux-principles.md),
 * [UX-04](../../../../../docs/product/ux-principles.md)). Las preguntas ya
 * vienen contestadas con «No sé», así que quien no sabe algo —o no lo tiene a
 * mano— no pelea con el formulario ni ve un error.
 *
 * El arete se pone después, desde la ficha: son dos hechos distintos y el
 * arete tiene su propia historia de cambios.
 */
export function Alta() {
  const [nombre, setNombre] = useState('')
  const [sexo, setSexo] = useState('unknown')
  const [categoria, setCategoria] = useState('unknown')
  const [detalleCategoria, setDetalleCategoria] = useState('')
  const [tenencia, setTenencia] = useState('unknown')
  const [participacion, setParticipacion] = useState('unknown')
  const [notaDelArreglo, setNotaDelArreglo] = useState('')
  const [nota, setNota] = useState('')
  const [mostrarMas, setMostrarMas] = useState(false)

  const registrar = useRegistrarAnimal()
  /**
   * El id del comando y el id del animal se generan juntos, una sola vez, y se
   * reusan mientras el envío no salga bien. Reintentar por mala señal manda el
   * mismo cuerpo con el mismo id de comando: la API devuelve el animal que ya
   * guardó en vez de crear otro.
   */
  const envio = useRef<{ commandId: string; id: string } | null>(null)

  const enviar = (evento: React.FormEvent<HTMLFormElement>): void => {
    evento.preventDefault()
    if (registrar.isPending) {
      return
    }

    envio.current ??= { commandId: crypto.randomUUID(), id: crypto.randomUUID() }
    const { commandId, id } = envio.current

    const textoNombre = limpiarOpcional(nombre)
    const textoDetalle = categoria === 'other' ? limpiarOpcional(detalleCategoria) : undefined
    const textoArreglo = tenencia === 'a_la_parte' ? limpiarOpcional(notaDelArreglo) : undefined
    const textoNota = limpiarOpcional(nota)

    registrar.mutate(
      {
        commandId,
        id,
        ...(textoNombre === undefined ? {} : { nombre: textoNombre }),
        sexo: sexo as 'female' | 'male' | 'unknown',
        categoria: categoria as 'calf' | 'cow' | 'bull' | 'other' | 'unknown',
        ...(textoDetalle === undefined ? {} : { detalleCategoria: textoDetalle }),
        tenencia: tenencia as 'ranch' | 'a_la_parte' | 'third_party' | 'unknown',
        participacionEconomica: participacion as 'known' | 'partially_known' | 'unknown',
        ...(textoArreglo === undefined ? {} : { notaDelArreglo: textoArreglo }),
        ...(textoNota === undefined ? {} : { nota: textoNota }),
      },
      {
        onSuccess: (ficha) => {
          envio.current = null
          irA({ nombre: 'ficha', animalId: ficha.id })
        },
      },
    )
  }

  return (
    <main className="pantalla">
      <header className="encabezado">
        <p className="saludo">RANCHO</p>
        <h1>Dar de alta un animal</h1>
        <p className="subtitulo">Con lo que sepas basta. Lo que no sepas se queda en «No sé».</p>
      </header>

      <form className="formulario" onSubmit={enviar}>
        <CampoDeTexto
          etiqueta="Nombre o seña"
          valor={nombre}
          alCambiar={setNombre}
          ayuda="Si todavía no tiene nombre, déjalo vacío."
        />

        <CampoDeOpciones etiqueta="Sexo" opciones={SEXOS} valor={sexo} alCambiar={setSexo} />

        <CampoDeOpciones
          etiqueta="Categoría"
          opciones={CATEGORIAS}
          valor={categoria}
          alCambiar={setCategoria}
        />

        {categoria === 'other' ? (
          <CampoDeTexto
            etiqueta="¿Cuál?"
            valor={detalleCategoria}
            alCambiar={setDetalleCategoria}
            ayuda="Por ejemplo, un semental joven o un animal de otro tipo."
          />
        ) : null}

        <CampoDeOpciones
          etiqueta="¿De quién es?"
          opciones={TENENCIAS}
          valor={tenencia}
          alCambiar={setTenencia}
        />

        {tenencia === 'a_la_parte' ? (
          <CampoDeArea
            etiqueta="Nota del arreglo"
            valor={notaDelArreglo}
            alCambiar={setNotaDelArreglo}
            ayuda="Lo que se sepa del arreglo, en tus palabras. No se calcula ninguna parte."
          />
        ) : null}

        {mostrarMas ? (
          <Seccion titulo="Si lo sabes">
            <CampoDeOpciones
              etiqueta="Participación económica"
              opciones={PARTICIPACIONES}
              valor={participacion}
              alCambiar={setParticipacion}
            />
            <CampoDeArea
              etiqueta="Nota"
              valor={nota}
              alCambiar={setNota}
              ayuda="Cualquier cosa que convenga recordar de este animal."
            />
          </Seccion>
        ) : (
          <BotonGrande
            secundario
            alTocar={() => {
              setMostrarMas(true)
            }}
          >
            Agregar más datos
          </BotonGrande>
        )}

        {registrar.isError ? <AvisoDeError error={registrar.error} /> : null}

        <BotonGrande tipo="submit" deshabilitado={registrar.isPending}>
          {registrar.isPending ? 'Guardando…' : 'Dar de alta'}
        </BotonGrande>

        <BotonGrande
          secundario
          alTocar={() => {
            irA({ nombre: 'hato' })
          }}
        >
          Regresar al hato
        </BotonGrande>
      </form>
    </main>
  )
}

function limpiarOpcional(texto: string): string | undefined {
  const recortado = texto.trim()
  return recortado === '' ? undefined : recortado
}
