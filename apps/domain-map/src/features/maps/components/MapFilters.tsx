import { filterLabels, type MapFilter } from '../../../types/map.ts'

interface MapFiltersProps {
  active: MapFilter
  onChange: (filter: MapFilter) => void
}

export function MapFilters({ active, onChange }: MapFiltersProps) {
  return (
    <div className="map-filters" role="toolbar" aria-label="Filtrar procesos">
      {filterLabels.map((filter) => {
        const isActive = filter.id === active
        return (
          <button
            key={filter.id}
            type="button"
            className={isActive ? 'map-filter is-active' : 'map-filter'}
            aria-pressed={isActive}
            onClick={() => onChange(filter.id)}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}
