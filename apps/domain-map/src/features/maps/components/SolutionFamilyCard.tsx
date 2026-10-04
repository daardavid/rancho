import { useState } from 'react'
import { capabilityById, solutionOptionById } from '../../../data/toBe/lookups.ts'
import {
  bandLabels,
  costLabels,
  dependencyLabels,
  recommendationLabels,
  shelfLabels,
  solutionTypeLabels,
  type SolutionFamilyData,
  type SolutionOptionData,
  type SolutionShelves,
} from '../../../types/toBe.ts'

export function SolutionFamilyCard({ family }: { family: SolutionFamilyData }) {
  const [openShelves, setOpenShelves] = useState<Record<keyof SolutionShelves, boolean>>({
    recommendedNow: false,
    investigate: false,
    scale: false,
    notRecommendedNow: false,
  })

  const primary = family.primarySolutionIds.map((id) => solutionOptionById[id]).filter(Boolean)
  const alternatives = family.visibleAlternativeIds.map((id) => solutionOptionById[id]).filter(Boolean)

  return (
    <section className="family-card">
      <h4 className="family-card__title">
        <span className="mono">{family.id}</span> {family.title}
      </h4>
      <p>{sentence(family.intro)}</p>
      {family.honestyLines?.map((line) => (
        <p key={line} className="family-card__honesty">
          {line}
        </p>
      ))}
      {primary.length > 0 ? (
        <div className="family-card__block">
          <p className="family-card__kicker">Enfoque principal</p>
          {primary.map((option) => (
            <SolutionOptionBlock key={option.id} option={option} />
          ))}
        </div>
      ) : (
        <p className="family-card__honesty">Ninguna opción es el enfoque principal.</p>
      )}
      {alternatives.length > 0 ? (
        <div className="family-card__block">
          <p className="family-card__kicker">Alternativa visible</p>
          {alternatives.map((option) => (
            <SolutionOptionBlock key={option.id} option={option} marker={alternativeMarker(option)} />
          ))}
        </div>
      ) : null}
      {(Object.keys(shelfLabels) as (keyof SolutionShelves)[]).map((shelf) => {
        const ids = family.shelves[shelf]
        if (ids.length === 0) return null
        const open = openShelves[shelf]
        return (
          <div key={shelf} className="family-shelf">
            <button
              type="button"
              className="family-shelf__toggle"
              aria-expanded={open}
              onClick={() => setOpenShelves((current) => ({ ...current, [shelf]: !current[shelf] }))}
            >
              {shelfLabels[shelf]} ({ids.length})
            </button>
            {open ? (
              <div className="family-shelf__body">
                {ids.map((id) => {
                  const option = solutionOptionById[id]
                  return option ? <SolutionOptionBlock key={id} option={option} /> : null
                })}
              </div>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}

function SolutionOptionBlock({ option, marker }: { option: SolutionOptionData; marker?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="solution-option">
      <button type="button" className="solution-option__toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="mono">{option.id}</span>
        <span>{option.title}</span>
        {marker ? <span className="solution-option__marker">{marker}</span> : null}
      </button>
      {open ? <SolutionOptionDetails option={option} /> : null}
    </article>
  )
}

function SolutionOptionDetails({ option }: { option: SolutionOptionData }) {
  return (
    <div className="solution-option__body">
      <p>{sentence(option.description)}</p>
      {option.packageNote ? <p className="detail-panel__note">Paquete: {sentence(option.packageNote)}</p> : null}
      <dl>
        <div>
          <dt>Tipo</dt>
          <dd>{option.types.map((type) => solutionTypeLabels[type]).join(', ')}</dd>
        </div>
        <div>
          <dt>Cómo ayuda</dt>
          <dd>{sentence(option.howItHelps)}</dd>
        </div>
        <div>
          <dt>Ventajas</dt>
          <dd>{sentence(option.pros)}</dd>
        </div>
        <div>
          <dt>Desventajas</dt>
          <dd>{sentence(option.cons)}</dd>
        </div>
        <div>
          <dt>Costo</dt>
          <dd>{costLabels[option.cost]}</dd>
        </div>
        <div>
          <dt>Complejidad</dt>
          <dd>{bandLabels[option.complexity]}</dd>
        </div>
        <div>
          <dt>Fricción operativa</dt>
          <dd>{bandLabels[option.operationalFriction]}</dd>
        </div>
        <div>
          <dt>Confiabilidad del dato</dt>
          <dd>{bandLabels[option.dataReliability]}</dd>
        </div>
        <div>
          <dt>Dependencia humana</dt>
          <dd>{bandLabels[option.humanDependency]}</dd>
        </div>
        <div>
          <dt>Dependencia de conectividad</dt>
          <dd>{dependencyLabels[option.connectivityDependency]}</dd>
        </div>
        <div>
          <dt>Dependencia de hardware</dt>
          <dd>{dependencyLabels[option.hardwareDependency]}</dd>
        </div>
        <div>
          <dt>Escalabilidad</dt>
          <dd>{bandLabels[option.scalability]}</dd>
        </div>
        <div>
          <dt>Auditabilidad</dt>
          <dd>{bandLabels[option.auditability]}</dd>
        </div>
        <div>
          <dt>Factibilidad actual</dt>
          <dd>{bandLabels[option.currentFeasibility]}</dd>
        </div>
        <div>
          <dt>Recomendado ahora</dt>
          <dd>{recommendationLabels[option.recommendedNow]}</dd>
        </div>
        <div>
          <dt>A escala</dt>
          <dd>
            {recommendationLabels[option.recommendedAtScale]}. A escala no significa adopción obligatoria más adelante.
          </dd>
        </div>
      </dl>
      <p>
        <strong>Razón. </strong>
        {sentence(option.rationale)}
      </p>
      <p>
        <strong>Precondiciones. </strong>
        {sentence(option.preconditions)}
      </p>
      <p>
        <strong>Preguntas para validar. </strong>
        {sentence(option.questionsToValidate)}
      </p>
      {option.capabilityNote ? (
        <p>Capacidades: {sentence(option.capabilityNote)}</p>
      ) : option.capabilityIds.length > 0 ? (
        <p>
          Capacidades:{' '}
          {option.capabilityIds.map((id) => capabilityById[id]?.title ?? id).join('; ')}
        </p>
      ) : null}
      <p className="detail-panel__note">Evaluación inicial. Estas lecturas no son porcentajes ni mediciones del rancho.</p>
    </div>
  )
}

function alternativeMarker(option: SolutionOptionData): string {
  if (option.recommendedNow === 'investigate') return 'Investigar'
  if (option.recommendedNow === 'yes') return 'Recomendado ahora'
  if (option.recommendedNow === 'no') return 'No recomendado ahora'
  return 'Alternativa'
}

function sentence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}
