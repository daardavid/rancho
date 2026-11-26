/**
 * La foto chica del animal.
 *
 * La lista y los buscadores piden esta, no la foto completa.
 */
export function Miniatura({ id }: { readonly id: string | null | undefined }) {
  if (id === null || id === undefined) {
    return null
  }
  return <img className="ui-miniatura" alt="" src={`/api/evidencia/${id}`} />
}
