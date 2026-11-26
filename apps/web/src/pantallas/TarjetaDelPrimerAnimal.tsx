import { irA } from '../ruta'
import { BotonPrincipal } from '../ui/Botones'
import { Tarjeta } from '../ui/Tarjeta'

/**
 * La invitación del hato vacío, una sola vez.
 *
 * La comparten el hato y el inicio: sin animales no hay nada que revisar, y
 * decir «nadie está sin una asignación» o «todos tienen un pesaje» sobre un
 * hato vacío es afirmar algo que no se midió. Se dice lo que pasa —todavía no
 * hay animales— y se ofrece darlos de alta.
 */
export function TarjetaDelPrimerAnimal() {
  return (
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
  )
}
