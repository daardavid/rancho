import type { MapView } from '../../types/map.ts'

const views: { id: MapView; label: string }[] = [
  { id: 'as-is', label: 'AS-IS' },
  { id: 'to-be', label: 'TO-BE' },
  { id: 'architecture', label: 'ARCHITECTURE' },
]

interface TopNavProps {
  activeView: MapView
  onChange: (view: MapView) => void
}

export function TopNav({ activeView, onChange }: TopNavProps) {
  return (
    <header className="top-nav">
      <p className="brand">RANCHO</p>
      <nav className="nav-tabs" aria-label="Map views">
        {views.map((view) => {
          const isActive = view.id === activeView
          return (
            <button
              key={view.id}
              type="button"
              className={isActive ? 'nav-tab is-active' : 'nav-tab'}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChange(view.id)}
            >
              {view.label}
            </button>
          )
        })}
      </nav>
    </header>
  )
}
