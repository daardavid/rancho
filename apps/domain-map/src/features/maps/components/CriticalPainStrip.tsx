import { effectivenessByPainId } from '../../../data/toBe/lookups.ts'
import { criticalPainIds } from '../../../data/toBe/painEffectiveness.ts'
import { effectivenessLabels } from '../../../types/toBe.ts'

const criticalLabels: Record<string, string> = {
  'PP-FEED-001': 'Alimentación',
  'PP-FIN-001': 'Rentabilidad',
  'PP-SEC-001': 'Faltantes de ganado',
}

interface CriticalPainStripProps {
  activePainId: string | null
  onToggle: (painId: string) => void
}

export function CriticalPainStrip({ activePainId, onToggle }: CriticalPainStripProps) {
  return (
    <div className="pain-strip" aria-label="Dolores críticos">
      <p className="pain-strip__label">Evaluación inicial</p>
      {criticalPainIds.map((id) => {
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
            <span className="pain-strip__title">{criticalLabels[id] ?? id}</span>
            <span className={`effect-chip is-${effect?.effectiveness ?? 'not_addressed'}`}>
              {effect ? effectivenessLabels[effect.effectiveness] : 'Sin lectura'}
            </span>
            <span className="mono pain-strip__id">{id}</span>
          </button>
        )
      })}
    </div>
  )
}
