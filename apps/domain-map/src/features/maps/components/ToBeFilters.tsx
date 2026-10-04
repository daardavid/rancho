import {
  areaFilterOptions,
  horizonFilterOptions,
  type ToBeAreaSelection,
  type ToBeHorizonFilter,
} from '../../../types/toBe.ts'

interface ToBeFiltersProps {
  horizon: ToBeHorizonFilter
  area: ToBeAreaSelection
  onHorizon: (value: ToBeHorizonFilter) => void
  onArea: (value: ToBeAreaSelection) => void
}

export function ToBeFilters({ horizon, area, onHorizon, onArea }: ToBeFiltersProps) {
  return (
    <div className="tobe-filters">
      <div className="map-filters" aria-label="Horizonte">
        {horizonFilterOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`map-filter${horizon === option.id ? ' is-active' : ''}`}
            onClick={() => onHorizon(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="map-filters" aria-label="Área del rancho">
        {areaFilterOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`map-filter${area === option.id ? ' is-active' : ''}`}
            onClick={() => onArea(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
