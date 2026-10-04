import {
  areaFilterOptions,
  type ToBeAreaSelection,
  type ToBeHorizonFilter,
} from '../../../types/toBe.ts'

const horizonButtons: { id: ToBeHorizonFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'minimum', label: 'Mínimo útil' },
  { id: 'desirable', label: 'Deseable' },
  { id: 'pending_method', label: 'Pendiente' },
  { id: 'conditional', label: 'Condicional' },
]

interface ToBeFiltersProps {
  horizon: ToBeHorizonFilter
  area: ToBeAreaSelection
  helpOpen: boolean
  onHorizon: (value: ToBeHorizonFilter) => void
  onArea: (value: ToBeAreaSelection) => void
  onReset: () => void
  onHelp: () => void
  legendOpen: boolean
  onLegend: (open: boolean) => void
}

export function ToBeFilters({
  horizon,
  area,
  helpOpen,
  onHorizon,
  onArea,
  onReset,
  onHelp,
  legendOpen,
  onLegend,
}: ToBeFiltersProps) {
  return (
    <div className="tobe-toolbar">
      <div className="tobe-toolbar__group" aria-label="Horizonte">
        <span className="tobe-toolbar__label">Horizonte</span>
        {horizonButtons.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`map-filter${horizon === option.id ? ' is-active' : ''}`}
            aria-pressed={horizon === option.id}
            onClick={() => onHorizon(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <label className="tobe-toolbar__area">
        <span className="tobe-toolbar__label">Área</span>
        <select
          aria-label="Área del rancho"
          value={area}
          onChange={(event) => onArea(event.target.value as ToBeAreaSelection)}
        >
          {areaFilterOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.id === 'todos' ? 'Todas' : option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="tobe-toolbar__actions">
        <button type="button" className="map-filter" onClick={onReset}>
          Restablecer
        </button>
        <button
          type="button"
          className={`map-filter${legendOpen ? ' is-active' : ''}`}
          aria-expanded={legendOpen}
          onClick={() => onLegend(!legendOpen)}
        >
          Leyenda
        </button>
        <button
          type="button"
          className={`map-filter${helpOpen ? ' is-active' : ''}`}
          aria-expanded={helpOpen}
          onClick={onHelp}
        >
          Cómo leer
        </button>
      </div>
      {legendOpen ? <EdgeLegend /> : null}
    </div>
  )
}

function EdgeLegend() {
  return (
    <div className="tobe-legend" role="note" aria-label="Significado de las líneas">
      <p>
        <span className="edge-legend__swatch is-sequence" />
        Línea continua: el proceso deseado va después.
      </p>
      <p>
        <span className="edge-legend__swatch is-association" />
        Línea punteada: relación o el mismo evento, sin orden.
      </p>
    </div>
  )
}
