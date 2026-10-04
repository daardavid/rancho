import { painPointById } from '../../../data/painPoints.ts'
import { effectivenessByPainId } from '../../../data/toBe/lookups.ts'
import { criticalPainIds } from '../../../data/toBe/painEffectiveness.ts'
import { effectivenessLabels } from '../../../types/toBe.ts'

interface CriticalPainStripProps {
  activePainId: string | null
  onToggle: (painId: string) => void
}

export function CriticalPainStrip({ activePainId, onToggle }: CriticalPainStripProps) {
  return (
    <div className="pain-strip" aria-label="Dolores críticos">
      <p className="pain-strip__label">Evaluación inicial</p>
      {criticalPainIds.map((id) => {
        const pain = painPointById[id]
        const effect = effectivenessByPainId[id]
        const active = activePainId === id
        return (
          <button
            key={id}
            type="button"
            className={`pain-strip__card${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onToggle(id)}
          >
            <span className="mono">{id}</span>
            <span className="pain-strip__title">{pain?.title}</span>
            <span className={`pain-strip__effect is-${effect?.effectiveness ?? 'not_addressed'}`}>
              {effect ? effectivenessLabels[effect.effectiveness] : 'Sin lectura'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
