import { useState } from 'react'

import { useEntrar } from '../api/sesion'
import { mensajeDeError } from '../dominio/mensajes'
import { BotonGrande } from '../ui/Avisos'
import { CampoDeTexto } from '../ui/Campos'

/**
 * Entrar. Es la única pantalla sin sesión.
 *
 * No hay registro abierto: la cuenta del propietario se crea con
 * `npm run cuenta:crear -w @rancho/api`. La pantalla no lo explica en grande
 * porque el dueño no crea su cuenta: alguien se la deja lista.
 */
export function IniciarSesion() {
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const entrar = useEntrar()

  const falta = usuario.trim() === '' || contrasena === ''

  const enviar = (evento: React.FormEvent<HTMLFormElement>): void => {
    evento.preventDefault()
    if (falta || entrar.isPending) {
      return
    }
    entrar.mutate({ usuario: usuario.trim(), contrasena })
  }

  return (
    <main className="pantalla pantalla--entrar">
      <header className="encabezado">
        <p className="saludo">RANCHO</p>
        <h1>Entra para ver tu hato</h1>
        <p className="subtitulo">Balancán, Tabasco</p>
      </header>

      <form className="formulario" onSubmit={enviar}>
        <CampoDeTexto
          etiqueta="Usuario"
          valor={usuario}
          alCambiar={setUsuario}
          autoComplete="username"
          requerido
        />
        <CampoDeTexto
          etiqueta="Contraseña"
          valor={contrasena}
          alCambiar={setContrasena}
          tipo="password"
          autoComplete="current-password"
          requerido
        />

        {entrar.isError ? (
          <div className="aviso aviso--mal" role="alert">
            <p className="aviso__titulo">{mensajeDeError(entrar.error).quePaso}</p>
            <p className="aviso__quehacer">{mensajeDeError(entrar.error).queHacer}</p>
          </div>
        ) : null}

        <BotonGrande tipo="submit" deshabilitado={falta || entrar.isPending}>
          {entrar.isPending ? 'Entrando…' : 'Entrar'}
        </BotonGrande>
      </form>
    </main>
  )
}
