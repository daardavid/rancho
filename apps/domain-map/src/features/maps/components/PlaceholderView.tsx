interface PlaceholderViewProps {
  title: string
  message: string
}

export function PlaceholderView({ title, message }: PlaceholderViewProps) {
  return (
    <section className="placeholder">
      <p className="placeholder__kicker">Not defined yet</p>
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  )
}
