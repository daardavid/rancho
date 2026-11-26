import { irA } from '../ruta'
import { BotonSecundario } from '../ui/Botones'
import { Encabezado } from '../ui/Encabezado'

/**
 * Bajar el hato, los pesos y los eventos para abrirlos en Excel.
 *
 * Cada botón es un archivo. La cookie de la sesión viaja con el enlace, en el
 * mismo origen. El nombre del archivo lo pone el servidor: el del rancho y el
 * día. No hay que elegir formato ni columnas.
 */
export function Exportar() {
  return (
    <main className="pantalla pantalla--pestana">
      <Encabezado
        etiqueta="MI RANCHO"
        titulo="Exportar"
        subtitulo="Para abrir en Excel"
        alRegresar={() => {
          irA({ nombre: 'inicio' })
        }}
        etiquetaRegresar="Regresar al inicio"
      />

      <p className="campo__ayuda">
        Lo que no se sabe sale en blanco y la nota dice «No sé». Un hueco de pesaje no es un peso
        y no va en el archivo.
      </p>

      <section className="exportar__acciones" aria-label="Archivos">
        <BotonSecundario href="/api/exports/herd">Bajar el hato</BotonSecundario>
        <BotonSecundario href="/api/exports/weights">Bajar los pesos</BotonSecundario>
        <BotonSecundario href="/api/exports/events">Bajar los eventos</BotonSecundario>
      </section>
    </main>
  )
}
