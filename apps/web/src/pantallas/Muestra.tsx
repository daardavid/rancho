import { useState } from 'react'

import { Aviso } from '../ui/Aviso'
import { BarraDeAccion } from '../ui/BarraDeAccion'
import { BarraDeAvance } from '../ui/BarraDeAvance'
import { BarraInferior } from '../ui/BarraInferior'
import { BotonFlotante, BotonPrincipal, BotonSecundario } from '../ui/Botones'
import { CampoDeKilos } from '../ui/CampoDeKilos'
import { Encabezado } from '../ui/Encabezado'
import { Etiqueta } from '../ui/Etiqueta'
import { FilaDeAnimal } from '../ui/FilaDeAnimal'
import { Filtros } from '../ui/Filtros'
import {
  IconoAbajo,
  IconoAviso,
  IconoBascula,
  IconoBuscar,
  IconoCamara,
  IconoCerrar,
  IconoCrecimiento,
  IconoHato,
  IconoMas,
  IconoMenu,
  IconoRegresar,
} from '../ui/iconos'
import { Mosaicos } from '../ui/Mosaicos'
import { Resumen } from '../ui/Resumen'
import { Segmentado } from '../ui/Segmentado'
import { Tarjeta } from '../ui/Tarjeta'

const SEXOS = [
  { valor: 'male', texto: 'Macho' },
  { valor: 'female', texto: 'Hembra' },
  { valor: 'unknown', texto: 'No sé' },
] as const

const TIPOS = [
  { valor: 'calf', texto: 'Becerro' },
  { valor: 'cow', texto: 'Vaca' },
  { valor: 'bull', texto: 'Toro' },
  { valor: 'unknown', texto: 'No sé' },
] as const

const FILTROS = [
  { valor: 'todos', texto: 'Todos 21' },
  { valor: 'calf', texto: 'Becerros 9' },
  { valor: 'cow', texto: 'Vacas 10' },
  { valor: 'bull', texto: 'Toro 1' },
] as const

/**
 * Catálogo de la guía, solo en desarrollo. Los nombres son de la maqueta,
 * inventados: no son animales del rancho.
 */
export function Muestra() {
  const [sexo, setSexo] = useState('male')
  const [tipo, setTipo] = useState('calf')
  const [filtro, setFiltro] = useState('todos')
  const [kilos, setKilos] = useState('158')
  const [foto, setFoto] = useState('sin foto')

  return (
    <div className="con-navegacion">
      <main className="pantalla">
        <Encabezado
          etiqueta="DESARROLLO"
          titulo="Muestra"
          subtitulo="Cada componente de la guía, para verlos de un vistazo."
        />

        <section className="muestra-seccion">
          <h2>Encabezado</h2>
          <Encabezado
            etiqueta="MI RANCHO"
            titulo="Hato"
            subtitulo="21 animales · último pesaje hace 3 días"
            acciones={[
              { etiqueta: 'Dar de alta un animal', icono: <IconoMas />, destacado: true, href: '#/alta' },
              { etiqueta: 'Menú', icono: <IconoMenu /> },
            ]}
          />
        </section>

        <section className="muestra-seccion">
          <h2>Encabezado con regreso</h2>
          <Encabezado
            titulo="Pesaje"
            subtitulo="Lunes 24 de noviembre"
            hrefRegresar="#/"
            etiquetaRegresar="Regresar al hato"
          />
        </section>

        <section className="muestra-seccion">
          <h2>Botones</h2>
          <div className="muestra-pila">
            <BotonPrincipal>Guardar pesaje (6)</BotonPrincipal>
            <BotonSecundario>Guardar y dar de alta otro</BotonSecundario>
            <BotonSecundario tono="tinta">
              Más datos
              <IconoAbajo />
            </BotonSecundario>
            <BotonFlotante anclaje="flujo" icono={<IconoBascula />}>
              Registrar pesaje
            </BotonFlotante>
          </div>
        </section>

        <section className="muestra-seccion">
          <h2>Filtros</h2>
          <Filtros etiqueta="Filtrar el hato" opciones={FILTROS} valor={filtro} alElegir={setFiltro} />
        </section>

        <section className="muestra-seccion">
          <h2>Aviso</h2>
          <Aviso
            titulo="2 becerros no se pesaron"
            detalle="En la vuelta del 21 de noviembre"
            enlace={{ texto: 'Ver', href: '#/crecimiento' }}
          />
        </section>

        <section className="muestra-seccion">
          <h2>Fila de animal</h2>
          <div className="muestra-pila">
            <FilaDeAnimal
              nombre="Canela"
              detalle="Becerra · SINIIGA …4471"
              peso="184 kg"
              ganancia="+0.92 kg/día"
              tono="bien"
              categoria="calf"
              href="#/muestra"
            />
            <FilaDeAnimal
              nombre="Pinto"
              detalle="Becerro · A la parte"
              peso="158 kg"
              ganancia="+0.34 kg/día"
              tono="revisar"
              categoria="calf"
            />
            <FilaDeAnimal
              nombre="La Pajarita"
              detalle="Vaca · SINIIGA …3310"
              peso="—"
              ganancia="Sin pesajes"
              tono="sinDatos"
              categoria="cow"
            />
          </div>
        </section>

        <section className="muestra-seccion">
          <h2>Etiquetas y tarjeta</h2>
          <Tarjeta>
            <p className="ui-fila__nombre">Tarjeta</p>
            <p className="ui-fila__detalle">
              <Etiqueta tono="bien">Va bien</Etiqueta> <Etiqueta tono="revisar">Revisar</Etiqueta>{' '}
              <Etiqueta tono="sinDatos">Sin datos</Etiqueta>
            </p>
          </Tarjeta>
          <div className="muestra-seccion">
            <Tarjeta activa>
              <p className="ui-fila__nombre">Tarjeta activa</p>
            </Tarjeta>
          </div>
        </section>

        <section className="muestra-seccion">
          <h2>Mosaicos</h2>
          <Mosaicos etiqueta="¿Qué es?" opciones={TIPOS} valor={tipo} alElegir={setTipo} />
        </section>

        <section className="muestra-seccion">
          <h2>Segmentado</h2>
          <Segmentado etiqueta="Sexo" opciones={SEXOS} valor={sexo} alElegir={setSexo} />
        </section>

        <section className="muestra-seccion">
          <h2>Campo de kilos</h2>
          <CampoDeKilos
            etiqueta="Kilos de Pinto"
            valor={kilos}
            alCambiar={setKilos}
            alTomarFoto={() => {
              setFoto(foto === 'sin foto' ? 'foto tomada' : 'sin foto')
            }}
          />
          <p className="subtitulo">{foto}</p>
        </section>

        <section className="muestra-seccion">
          <h2>Barra de avance</h2>
          <Tarjeta>
            <BarraDeAvance
              texto="6 de 9 pesados"
              detalle="1 no se pesó · 2 faltan"
              pesados={6}
              sinPeso={1}
              total={9}
            />
          </Tarjeta>
        </section>

        <section className="muestra-seccion">
          <h2>Resumen</h2>
          <Resumen
            tarjetas={[
              { etiqueta: 'Ganancia media', valor: '0.78', detalle: 'kg por día', tono: 'principal' },
              { etiqueta: 'Pesados', valor: '7 / 9', detalle: 'becerros', tono: 'neutro' },
              { etiqueta: 'Van atrás', valor: '3', detalle: 'revisar', tono: 'aviso' },
            ]}
          />
        </section>

        <section className="muestra-seccion">
          <h2>Íconos</h2>
          <div className="muestra-iconos">
            <IconoMas />
            <IconoMenu />
            <IconoBuscar />
            <IconoAviso />
            <IconoBascula />
            <IconoHato />
            <IconoCrecimiento />
            <IconoRegresar />
            <IconoCerrar />
            <IconoCamara />
            <IconoAbajo />
          </div>
        </section>

        <section className="muestra-seccion">
          <h2>Hato: botón flotante y barra</h2>
          <div className="muestra-marco">
            <BotonFlotante anclaje="marco" icono={<IconoBascula />} href="#/pesaje">
              Registrar pesaje
            </BotonFlotante>
            <BarraInferior ruta={{ nombre: 'hato' }} anclaje="marco" />
          </div>
        </section>

        <section className="muestra-seccion">
          <h2>Pesaje: barra de acción</h2>
          <div className="muestra-marco">
            <BarraDeAccion anclaje="marco" nota="Se guarda en el celular mientras capturas">
              <BotonPrincipal>Guardar pesaje (6)</BotonPrincipal>
            </BarraDeAccion>
          </div>
        </section>
      </main>
      <BarraInferior ruta={{ nombre: 'hato' }} />
    </div>
  )
}
