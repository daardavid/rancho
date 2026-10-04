import type { ReactNode } from 'react'
import { openQuestionById } from '../../../data/openQuestions.ts'
import { painPointById } from '../../../data/painPoints.ts'
import {
  capabilityById,
  effectivenessByPainId,
  solutionFamilyById,
  targetProcessById,
} from '../../../data/toBe/lookups.ts'
import type { ToBeFlowNode } from '../../../data/toBe/toBeMap.ts'
import type { SectionNodeData } from '../../../types/map.ts'
import {
  actorLabels,
  effectivenessLabels,
  horizonLabels,
  roleLabels,
  type TargetProcessData,
} from '../../../types/toBe.ts'
import { SolutionFamilyCard } from './SolutionFamilyCard.tsx'

interface ToBeDetailPanelProps {
  node: ToBeFlowNode | null
}

export function ToBeDetailPanel({ node }: ToBeDetailPanelProps) {
  if (node?.type === 'toBeProcess') {
    const process = targetProcessById[node.data.processId]
    return (
      <aside className="detail-panel" aria-label="Detalle del mapa TO-BE">
        {process ? <ProcessDetail process={process} /> : null}
      </aside>
    )
  }

  if (node?.type === 'section') {
    return (
      <aside className="detail-panel" aria-label="Detalle del mapa TO-BE">
        <SectionDetail data={node.data} />
      </aside>
    )
  }

  return (
    <aside className="detail-panel" aria-label="Detalle del mapa TO-BE">
      <EmptyDetail />
    </aside>
  )
}

function EmptyDetail() {
  return (
    <div className="detail-panel__content">
      <p className="detail-panel__kicker">TO-BE</p>
      <h2>Modelo operativo deseado</h2>
      <p>Este mapa muestra cómo se quiere operar el rancho. No significa que cada solución ya se haya adoptado.</p>
      <ul>
        <li>Las familias de solución contienen alternativas. Ver una familia no es elegirla.</li>
        <li>Algunos controles siguen parciales, o con el método pendiente.</li>
        <li>La efectividad es una evaluación inicial del proyecto, no un cierre.</li>
      </ul>
      <h3>Cómo leer el mapa</h3>
      <ul>
        <li>Cada tarjeta es un proceso objetivo. Las capacidades y las opciones no son nodos.</li>
        <li>Línea continua: un proceso está pensado para ocurrir después de otro.</li>
        <li>Línea punteada: se relacionan, o el mismo evento produce otro hecho, sin orden de tiempo.</li>
        <li>A escala, en una opción, no significa que haya que adoptarla después.</li>
      </ul>
      <p className="detail-panel__note">Seleccione un proceso para ver el objetivo, la efectividad y las alternativas.</p>
    </div>
  )
}

function SectionDetail({ data }: { data: SectionNodeData }) {
  return (
    <div className="detail-panel__content">
      <p className="detail-panel__kicker">Grupo</p>
      <h2>{data.title}</h2>
      <p>{data.summary}</p>
      <h3>Procesos</h3>
      <ul>
        {data.processIds.map((processId) => (
          <li key={processId}>
            <span className="mono">{processId}</span> {targetProcessById[processId]?.title}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProcessDetail({ process }: { process: TargetProcessData }) {
  return (
    <div className="detail-panel__content">
      <p className="detail-panel__kicker">Proceso objetivo</p>
      <h2>{process.title}</h2>
      <p className="mono">{process.id}</p>
      <p>
        {horizonLabels[process.horizon]}
        {process.visualRole === 'supporting' || process.visualRole === 'derived'
          ? ` · ${roleLabels[process.visualRole]}`
          : ''}
      </p>
      <Section title="Objetivo">
        <p>{process.objective}</p>
      </Section>
      <Section title="Disparador">
        <p>{process.trigger}</p>
      </Section>
      <Section title="Actores">
        <ul>
          {process.actors.map((id) => (
            <li key={id}>
              {actorLabels[id] ?? id} <span className="mono">{id}</span>
            </li>
          ))}
        </ul>
        <p className="detail-panel__note">Participar no implica una cuenta.</p>
      </Section>
      {process.tenureOptions ? (
        <Section title="Tenencia">
          <ul>
            {process.tenureOptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {process.participationOptions ? (
            <>
              <p>Participación económica:</p>
              <ul>
                {process.participationOptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
          {process.ownershipNote ? <p className="family-card__honesty">{process.ownershipNote}</p> : null}
        </Section>
      ) : null}
      {process.parentageCertainties ? (
        <Section title="Certeza de filiación">
          <ul>
            {process.parentageCertainties.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {process.inferenceReasons ? (
            <>
              <p>Motivos de inferencia, cuando están documentados:</p>
              <ul>
                {process.inferenceReasons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
          {process.parentageNote ? <p className="family-card__honesty">{process.parentageNote}</p> : null}
        </Section>
      ) : null}
      {process.exitReasons ? (
        <Section title="Salida del activo">
          <ul>
            {process.exitReasons.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {process.exitNote ? <p className="family-card__honesty">{process.exitNote}</p> : null}
        </Section>
      ) : null}
      {process.locationNote ? (
        <Section title="Lugar esperado">
          <p>{process.locationNote}</p>
        </Section>
      ) : null}
      {process.feedQuantities ? (
        <Section title="Cantidades de alimento">
          <ul>
            {process.feedQuantities.map((item) => (
              <li key={item.name}>
                <strong>{item.name}. </strong>
                {item.meaning}
              </li>
            ))}
          </ul>
          <p>Calidad de la fuente, cuando aplica: declarado, observado o medido.</p>
          {process.feedNote ? <p className="family-card__honesty">{process.feedNote}</p> : null}
        </Section>
      ) : null}
      {process.profitNote ? (
        <Section title="Lectura económica provisional">
          <p className="family-card__honesty">{process.profitNote}</p>
          {process.profitCanInclude ? (
            <>
              <p>Puede llegar a incluir:</p>
              <ul>
                {process.profitCanInclude.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
          {process.profitCannotClaim ? (
            <>
              <p>Todavía no puede afirmar:</p>
              <ul>
                {process.profitCannotClaim.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
        </Section>
      ) : null}
      {process.presenceNote ? (
        <Section title="Presencia">
          <p className="family-card__honesty">{process.presenceNote}</p>
        </Section>
      ) : null}
      <Section title="Pasos deseados">
        <ol>
          {process.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Section>
      <Section title="Información que produce">
        <ul>
          {process.informationProduced.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
      <Section title="Evidencia que produce">
        <ul>
          {process.evidenceProduced.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
      {process.captureOnce ? (
        <Section title="Capturar una vez, aprovechar varias veces">
          <p>Un evento operativo puede dejar varios hechos. No se capturan otra vez.</p>
          <ul>
            {process.captureOnce.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      ) : null}
      <Section title="Capacidades objetivo">
        <ul>
          {process.capabilityIds.map((id) => {
            const capability = capabilityById[id]
            return (
              <li key={id}>
                <span className="mono">{id}</span> {capability?.title}
                {capability?.blocked ? ' — bloqueada' : ''}
                {capability?.transversal ? ' — transversal, no es un nodo del mapa' : ''}
                {capability ? <span className="detail-panel__note"> {capability.purpose}</span> : null}
              </li>
            )
          })}
        </ul>
      </Section>
      <Section title="Dolores y efectividad">
        <p className="detail-panel__note">Evaluación inicial. No es un estado de cierre del proyecto.</p>
        <div className="pain-list">
          {process.painPointIds.map((id) => {
            const pain = painPointById[id]
            const effect = effectivenessByPainId[id]
            return (
              <article key={id} className="pain-card">
                <p className="pain-card__header">
                  <span className="mono">{id}</span>
                  <span>{pain?.title}</span>
                </p>
                <p className={`pain-strip__effect is-${effect?.effectiveness ?? 'not_addressed'}`}>
                  {effect ? effectivenessLabels[effect.effectiveness] : 'Sin lectura'}
                </p>
                {effect ? <p>{effect.remainingExposure}</p> : null}
              </article>
            )
          })}
        </div>
      </Section>
      <Section title="Qué sigue sin resolverse">
        <ul>
          {process.unresolved.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
      <Section title="Familias de solución">
        <p className="detail-panel__note">
          Una familia muestra un enfoque y alternativas. Abrir una opción no significa que el rancho la haya adoptado.
        </p>
        {process.familyIds.map((id) => {
          const family = solutionFamilyById[id]
          return family ? <SolutionFamilyCard key={id} family={family} /> : null
        })}
      </Section>
      {process.openQuestionIds.length > 0 ? (
        <Section title="Preguntas abiertas">
          <ul>
            {process.openQuestionIds.map((id) => (
              <li key={id}>
                <span className="mono">{id}</span> {openQuestionById[id] ?? 'Sigue abierta.'}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  )
}
